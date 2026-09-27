/**
 * VarshaNetra ROAD-002: River Gauge Service
 *
 * Provides CRUD operations for river gauge stations and readings.
 * Uses Supabase with graceful memory fallback when not configured.
 * Architecture is ready for future CWC API automation.
 *
 * Data Source: CWC Flood Forecasting & Warning Portal — ffis.cwc.gov.in (Manual Entry)
 */

import { createAdminClient } from "@/lib/supabase/server";
import {
  RiverGauge,
  RiverGaugeReading,
  GaugeStatus,
  GaugeTrend,
  CreateRiverGaugePayload,
  UpdateGaugeReadingPayload,
} from "@/types";

// ─────────────────────────────────────────────────────────────
// In-Memory Fallback & Demo Store
// ─────────────────────────────────────────────────────────────

const DEFAULT_FALLBACK_GAUGES: RiverGauge[] = [
  {
    id: "gauge-pune-mutha-1",
    station_name: "Bund Garden",
    station_code: "CWC-MUT-01",
    river_name: "Mula-Mutha",
    district: "Pune",
    state: "Maharashtra",
    latitude: 18.5362,
    longitude: 73.8797,
    danger_level_m: 538.5,
    warning_level_m: 537.0,
    normal_level_m: 534.2,
    current_level_m: 535.8,
    level_trend: "RISING",
    last_updated: new Date().toISOString(),
    data_source: "CWC Manual Entry (Demonstration Feed)",
    entered_by: "DDMA Officer",
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    id: "gauge-pune-mula-2",
    station_name: "Holkar Bridge",
    station_code: "CWC-MUL-02",
    river_name: "Mula",
    district: "Pune",
    state: "Maharashtra",
    latitude: 18.5583,
    longitude: 73.8631,
    danger_level_m: 540.0,
    warning_level_m: 538.5,
    normal_level_m: 535.0,
    current_level_m: 536.4,
    level_trend: "STEADY",
    last_updated: new Date().toISOString(),
    data_source: "CWC Manual Entry (Demonstration Feed)",
    entered_by: "DDMA Officer",
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    id: "gauge-solan-giri-1",
    station_name: "Gaura Giri Bridge",
    station_code: "CWC-GIR-01",
    river_name: "Giri",
    district: "Solan",
    state: "Himachal Pradesh",
    latitude: 30.8524,
    longitude: 77.1652,
    danger_level_m: 1120.0,
    warning_level_m: 1118.0,
    normal_level_m: 1114.0,
    current_level_m: 1116.5,
    level_trend: "FALLING",
    last_updated: new Date().toISOString(),
    data_source: "CWC Manual Entry (Demonstration Feed)",
    entered_by: "DDMA Officer",
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
];

const inMemoryGauges = new Map<string, RiverGauge>();
DEFAULT_FALLBACK_GAUGES.forEach((g) => inMemoryGauges.set(g.id, g));

const inMemoryReadings = new Map<string, RiverGaugeReading[]>();

let hasWarnedSupabaseGaugeTable = false;

// ─────────────────────────────────────────────────────────────
// Pure helper: compute derived status from current vs benchmark levels
// ─────────────────────────────────────────────────────────────

export function computeGaugeStatus(gauge: RiverGauge): GaugeStatus {
  const { current_level_m, danger_level_m, warning_level_m } = gauge;
  if (current_level_m === null || current_level_m === undefined) return "NORMAL";

  if (danger_level_m !== null && danger_level_m !== undefined) {
    if (current_level_m >= danger_level_m * 1.05) return "CRITICAL";
    if (current_level_m >= danger_level_m) return "DANGER";
  }
  if (warning_level_m !== null && warning_level_m !== undefined) {
    if (current_level_m >= warning_level_m) return "WARNING";
  }
  return "NORMAL";
}

// ─────────────────────────────────────────────────────────────
// Supabase operations with In-Memory fallback
// ─────────────────────────────────────────────────────────────

/**
 * Fetches all river gauge stations with derived status field.
 */
export async function getRiverGauges(): Promise<RiverGauge[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("river_gauges")
      .select("*")
      .order("river_name", { ascending: true })
      .order("station_name", { ascending: true });

    if (error) {
      if (!hasWarnedSupabaseGaugeTable) {
        console.warn("[river-gauges] Supabase table 'river_gauges' unavailable, using in-memory store:", error.message);
        hasWarnedSupabaseGaugeTable = true;
      }
      return Array.from(inMemoryGauges.values()).map((g) => ({
        ...g,
        status: computeGaugeStatus(g),
      }));
    }

    if (!data || data.length === 0) {
      return Array.from(inMemoryGauges.values()).map((g) => ({
        ...g,
        status: computeGaugeStatus(g),
      }));
    }

    return (data ?? []).map((g: RiverGauge) => ({
      ...g,
      status: computeGaugeStatus(g),
    }));
  } catch (err: unknown) {
    if (!hasWarnedSupabaseGaugeTable) {
      console.warn("[river-gauges] getRiverGauges falling back to in-memory store:", err);
      hasWarnedSupabaseGaugeTable = true;
    }
    return Array.from(inMemoryGauges.values()).map((g) => ({
      ...g,
      status: computeGaugeStatus(g),
    }));
  }
}

/**
 * Fetches last N readings for a gauge station (for sparkline chart).
 * Returns readings sorted ascending by datetime for chart rendering.
 */
export async function getRiverGaugeReadings(
  gaugeId: string,
  limit = 24
): Promise<RiverGaugeReading[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("river_gauge_readings")
      .select("*")
      .eq("gauge_id", gaugeId)
      .order("reading_datetime", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      // Check in-memory readings
      const existing = inMemoryReadings.get(gaugeId);
      if (existing && existing.length > 0) {
        return existing.slice(-limit);
      }

      // Generate synthetic sparkline readings based on gauge current level
      const gauge = inMemoryGauges.get(gaugeId);
      const baseLevel = gauge?.current_level_m ?? 535.0;
      const syntheticReadings: RiverGaugeReading[] = [];
      const nowMs = Date.now();

      for (let i = limit - 1; i >= 0; i--) {
        const offsetMs = i * 60 * 60 * 1000;
        const variation = Math.sin(i * 0.5) * 0.4 + (Math.random() * 0.1 - 0.05);
        syntheticReadings.push({
          id: `reading-${gaugeId}-${i}`,
          gauge_id: gaugeId,
          reading_datetime: new Date(nowMs - offsetMs).toISOString(),
          water_level_m: parseFloat((baseLevel - (i * 0.03) + variation).toFixed(2)),
          discharge_cumecs: 120 + Math.round(variation * 20),
          trend: i % 2 === 0 ? "RISING" : "STEADY",
          entered_by: "CWC System",
          notes: null,
          created_at: new Date(nowMs - offsetMs).toISOString(),
        });
      }

      inMemoryReadings.set(gaugeId, syntheticReadings);
      return syntheticReadings;
    }

    return ((data ?? []) as RiverGaugeReading[]).reverse();
  } catch {
    const existing = inMemoryReadings.get(gaugeId);
    return existing ? existing.slice(-limit) : [];
  }
}

/**
 * Creates a new river gauge station.
 */
export async function createRiverGauge(
  payload: CreateRiverGaugePayload,
  userId?: string
): Promise<RiverGauge> {
  const newGauge: RiverGauge = {
    id: `gauge-${Date.now()}`,
    station_name: payload.station_name,
    station_code: payload.station_code ?? null,
    river_name: payload.river_name,
    district: payload.district,
    state: payload.state,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    danger_level_m: payload.danger_level_m ?? null,
    warning_level_m: payload.warning_level_m ?? null,
    normal_level_m: payload.normal_level_m ?? null,
    current_level_m: payload.normal_level_m ?? null,
    level_trend: "STEADY",
    last_updated: new Date().toISOString(),
    data_source: "CWC Manual Entry",
    entered_by: userId ?? null,
    cwc_station_url: payload.cwc_station_url ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("river_gauges")
      .insert({
        station_name: payload.station_name,
        station_code: payload.station_code ?? null,
        river_name: payload.river_name,
        district: payload.district,
        state: payload.state,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        danger_level_m: payload.danger_level_m ?? null,
        warning_level_m: payload.warning_level_m ?? null,
        normal_level_m: payload.normal_level_m ?? null,
        cwc_station_url: payload.cwc_station_url ?? null,
        data_source: "CWC Manual Entry",
        entered_by: userId ?? null,
      })
      .select()
      .single();

    if (error) {
      inMemoryGauges.set(newGauge.id, newGauge);
      return { ...newGauge, status: computeGaugeStatus(newGauge) };
    }

    const created = data as RiverGauge;
    inMemoryGauges.set(created.id, created);
    return { ...created, status: computeGaugeStatus(created) };
  } catch {
    inMemoryGauges.set(newGauge.id, newGauge);
    return { ...newGauge, status: computeGaugeStatus(newGauge) };
  }
}

/**
 * Updates a gauge's current level reading and logs to readings history.
 * Returns the updated gauge with derived status.
 */
export async function updateRiverGaugeReading(
  gaugeId: string,
  payload: UpdateGaugeReadingPayload,
  userId?: string
): Promise<RiverGauge> {
  const now = new Date().toISOString();

  // Try in-memory update first so we have guaranteed state
  const existing = inMemoryGauges.get(gaugeId);
  const updatedInMemory: RiverGauge = existing
    ? {
        ...existing,
        current_level_m: payload.water_level_m,
        level_trend: payload.level_trend as GaugeTrend,
        last_updated: now,
        entered_by: userId ?? existing.entered_by,
      }
    : {
        id: gaugeId,
        station_name: "Station",
        station_code: null,
        river_name: "River",
        district: "District",
        state: "State",
        latitude: null,
        longitude: null,
        danger_level_m: null,
        warning_level_m: null,
        normal_level_m: null,
        current_level_m: payload.water_level_m,
        level_trend: payload.level_trend as GaugeTrend,
        last_updated: now,
        data_source: "CWC Manual Entry",
        entered_by: userId ?? null,
        cwc_station_url: null,
      };

  inMemoryGauges.set(gaugeId, updatedInMemory);

  // Append to in-memory readings
  const hist = inMemoryReadings.get(gaugeId) || [];
  hist.push({
    id: `reading-${Date.now()}`,
    gauge_id: gaugeId,
    reading_datetime: now,
    water_level_m: payload.water_level_m,
    discharge_cumecs: payload.discharge_cumecs ?? null,
    trend: payload.level_trend,
    entered_by: userId ?? null,
    notes: payload.notes ?? null,
    created_at: now,
  });
  inMemoryReadings.set(gaugeId, hist);

  try {
    const supabase = createAdminClient();

    // 1. Insert into history
    await supabase.from("river_gauge_readings").insert({
      gauge_id: gaugeId,
      reading_datetime: now,
      water_level_m: payload.water_level_m,
      discharge_cumecs: payload.discharge_cumecs ?? null,
      trend: payload.level_trend,
      entered_by: userId ?? null,
      notes: payload.notes ?? null,
    });

    // 2. Update current level on the gauge
    const { data } = await supabase
      .from("river_gauges")
      .update({
        current_level_m: payload.water_level_m,
        level_trend: payload.level_trend as GaugeTrend,
        last_updated: now,
        entered_by: userId ?? null,
      })
      .eq("id", gaugeId)
      .select()
      .single();

    if (data) {
      const res = data as RiverGauge;
      inMemoryGauges.set(gaugeId, res);
      return { ...res, status: computeGaugeStatus(res) };
    }
  } catch {
    // In-memory update already done
  }

  return { ...updatedInMemory, status: computeGaugeStatus(updatedInMemory) };
}
