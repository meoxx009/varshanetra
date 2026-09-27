/**
 * VarshaNetra - Historical Event Replay & Model Evaluation Service
 *
 * Provides curated historical extreme rainfall events, fetches Open-Meteo
 * archive weather telemetry, and runs the deterministic flood risk engine
 * hour-by-hour to generate synchronized playback timesteps and evaluation benchmarks.
 *
 * Complies with Directives #14, #15, #16, #18:
 * - Real historical data from Open-Meteo Archive.
 * - No fake or manufactured sample flood polygons.
 * - Explicit labeling and isolation from live operational dashboard.
 */

import {
  HistoricalEventPreset,
  HistoricalReplaySession,
  ReplayTimestep,
} from "@/types/replay";
import {
  HistoricalWeatherResponse,
  HistoricalPrecipitationPoint,
} from "@/types";
import {
  fetchHistoricalArchive,
  calculateSoilMoistureCondition,
} from "./historical-weather";
import { calculateFloodRisk } from "./flood-risk-engine";

import {
  HISTORICAL_EVENT_PRESETS,
  createReplayMetadata,
} from "./replay-presets";

export { HISTORICAL_EVENT_PRESETS, createReplayMetadata };

/**
 * Processes raw hourly historical weather series into a fully synchronized
 * historical replay session with hour-by-hour deterministic risk evaluations.
 */
export function processHistoricalWeatherToReplaySession({
  weatherData,
  preset,
  customTitle,
}: {
  weatherData: HistoricalWeatherResponse;
  preset?: HistoricalEventPreset;
  customTitle?: string;
}): HistoricalReplaySession {
  const points: HistoricalPrecipitationPoint[] = weatherData.antecedent?.hourlyHistory || [];
  const timesteps: ReplayTimestep[] = [];

  let runningCumulative = 0;
  let peakHourly = 0;
  let peakScore = 0;
  let peakLevel = "LOW" as ReplayTimestep["riskCalculation"]["riskLevel"];

  points.forEach((pt, idx) => {
    const hourlyMm = pt.precipitation || pt.rain || 0;
    runningCumulative = Number((runningCumulative + hourlyMm).toFixed(2));
    if (hourlyMm > peakHourly) {
      peakHourly = hourlyMm;
    }

    // Running antecedent calculations:
    // Past 24h prior to this step
    const past24Slice = points.slice(Math.max(0, idx - 24), idx);
    const ant24Mm = Number(
      past24Slice.reduce((sum, p) => sum + (p.precipitation || p.rain || 0), 0).toFixed(2)
    );

    // Past 48h prior to this step
    const past48Slice = points.slice(Math.max(0, idx - 48), idx);
    const ant48Mm = Number(
      past48Slice.reduce((sum, p) => sum + (p.precipitation || p.rain || 0), 0).toFixed(2)
    );

    // Forward 24h anticipated rainfall from this hour
    const forward24Slice = points.slice(idx, Math.min(points.length, idx + 24));
    const forward24Mm = Number(
      forward24Slice.reduce((sum, p) => sum + (p.precipitation || p.rain || 0), 0).toFixed(2)
    );

    // Soil moisture condition
    const past72Slice = points.slice(Math.max(0, idx - 72), idx);
    const ant72Mm = Number(
      past72Slice.reduce((sum, p) => sum + (p.precipitation || p.rain || 0), 0).toFixed(2)
    );
    const soilStatus = calculateSoilMoistureCondition(ant24Mm, ant48Mm, ant72Mm);

    // Run deterministic risk engine for this hour
    const riskResult = calculateFloodRisk({
      forecastRain24h: forward24Mm,
      antecedent24h: ant24Mm,
      antecedent48h: ant48Mm,
      elevationOrSlope: 2.5, // Representative low-lying urban/river corridor gradient
      distanceToRiverMeters: 450, // Proximity to major river canal
      forecastWindow: "24h",
    });

    if (riskResult.riskScore > peakScore) {
      peakScore = riskResult.riskScore;
      peakLevel = riskResult.riskLevel;
    }

    const dt = new Date(pt.time);
    const timeFormatted = dt.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    timesteps.push({
      hourIndex: idx,
      timeIso: pt.time,
      formattedTime: timeFormatted,
      relativeHourLabel: `T+${String(idx).padStart(2, "0")}h`,
      hourlyPrecipitationMm: hourlyMm,
      cumulativeRainfallMm: runningCumulative,
      antecedent24hMm: ant24Mm,
      antecedent48hMm: ant48Mm,
      soilMoistureCategory: soilStatus.category,
      soilMoistureDescription: soilStatus.description,
      runoffRiskMultiplier: soilStatus.multiplier,
      temperatureC: pt.temperature,
      relativeHumidityPct: pt.relativeHumidity,
      riskCalculation: riskResult,
    });
  });

  return {
    eventId: preset?.id || "custom-historical-event",
    title: preset?.title || customTitle || "Custom Historical Event Replay",
    districtName: preset?.districtName || weatherData.districtName || "Pilot District",
    latitude: weatherData.latitude,
    longitude: weatherData.longitude,
    startDate: weatherData.startDate,
    endDate: weatherData.endDate,
    totalDurationHours: timesteps.length,
    peakHourlyRateMm: Number(peakHourly.toFixed(2)),
    totalAccumulatedMm: Number(runningCumulative.toFixed(2)),
    peakRiskScore: Number(peakScore.toFixed(1)),
    peakRiskLevel: peakLevel,
    timesteps,
    benchmark: preset?.benchmark,
    metadata: createReplayMetadata(weatherData.metadata?.lastUpdated),
  };
}

/**
 * Fetches historical weather from Open-Meteo Archive API and packages
 * into a fully structured HistoricalReplaySession.
 */
export async function loadReplaySession({
  latitude,
  longitude,
  startDate,
  endDate,
  districtName,
  presetId,
}: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  districtName?: string;
  presetId?: string;
}): Promise<{
  success: boolean;
  data?: HistoricalReplaySession;
  error?: string;
  cached?: boolean;
}> {
  const preset = presetId
    ? HISTORICAL_EVENT_PRESETS.find((p) => p.id === presetId)
    : undefined;

  const archiveResult = await fetchHistoricalArchive({
    latitude,
    longitude,
    districtName,
    startDate,
    endDate,
  });

  if (!archiveResult.success || !archiveResult.data) {
    return {
      success: false,
      error: archiveResult.error || "Failed to load historical meteorological records.",
    };
  }

  const session = processHistoricalWeatherToReplaySession({
    weatherData: archiveResult.data,
    preset,
    customTitle: preset?.title || `Historical Replay (${startDate} to ${endDate})`,
  });

  return {
    success: true,
    data: session,
    cached: archiveResult.cached,
  };
}
