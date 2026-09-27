/**
 * Historical Weather & Antecedent Rainfall Service
 * VarshaNetra Emergency Early Warning System
 *
 * Provides verified historical precipitation and antecedent rainfall telemetry
 * using Open-Meteo archive and forecast past-days reanalysis models.
 * Complies with Open-Meteo CC BY 4.0 usage and attribution policies.
 */

import {
  DataSourceMeta,
  HistoricalPrecipitationPoint,
  AntecedentRainfallSummary,
  HistoricalWeatherResponse,
  SoilMoistureCategory,
} from "@/types";
import { validateCoordinates } from "./weather";

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

// Historical data is static or slow-changing: 1 hour cache for antecedent, 6 hours for historical archives
const ANTECEDENT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ARCHIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 9000; // 9 seconds

export interface AntecedentFetchOptions {
  latitude: number;
  longitude: number;
  districtName?: string;
  days?: number; // default 3 days (72h)
  bypassCache?: boolean;
}

export interface HistoryArchiveFetchOptions {
  latitude: number;
  longitude: number;
  districtName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  bypassCache?: boolean;
}

export interface HistoricalServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  metadata?: DataSourceMeta;
}

// In-memory cache structures
const antecedentCache = new Map<string, { data: AntecedentRainfallSummary; timestamp: number }>();
const archiveCache = new Map<string, { data: HistoricalWeatherResponse; timestamp: number }>();

/**
 * Standard CC BY 4.0 compliant attribution for Open-Meteo historical observations.
 */
function createHistoricalMetadata(lastUpdated?: string): DataSourceMeta {
  return {
    provider: "Open-Meteo Historical Archive (ECMWF ERA5 / IFS Seamless Reanalysis)",
    lastUpdated: lastUpdated || new Date().toISOString(),
    origin: "LIVE_API",
    attributionNotice: "Historical weather data provided by Open-Meteo.com under CC BY 4.0 license.",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
  };
}

/**
 * Calculates Antecedent Soil Moisture status and hydrologic Runoff Risk Multiplier
 * based on standard Indian disaster management & watershed engineering criteria.
 *
 * In watershed hydrology (SCS-CN method / AMC - Antecedent Moisture Condition):
 * - AMC I (Dry): < 15mm in 5 days (Dry soil, low runoff risk, high infiltration capacity)
 * - AMC II (Moderate): 15 - 40mm in 5 days (Average soil moisture)
 * - AMC III (Saturated): > 40mm in 5 days / > 35mm in 72h (High runoff potential)
 * - Critical Saturation: > 80mm in 72h (Immediate flash flood / overland flow risk)
 */
export function calculateSoilMoistureCondition(
  precip24h: number,
  precip48h: number,
  precip72h: number
): {
  category: SoilMoistureCategory;
  description: string;
  multiplier: number;
} {
  if (precip72h > 100 || precip24h > 65) {
    return {
      category: "CRITICAL_SATURATION",
      description: "Critical Saturation (AMC-III Extreme): Infiltration capacity exhausted; near 100% surface runoff efficiency.",
      multiplier: 2.5,
    };
  }
  if (precip72h > 45 || precip48h > 35 || precip24h > 25) {
    return {
      category: "SATURATED",
      description: "Saturated Soil (AMC-III High): Heavy antecedent recharge; rapid flash flood and inundation runoff expected.",
      multiplier: 1.8,
    };
  }
  if (precip72h > 15 || precip24h > 10) {
    return {
      category: "MODERATE",
      description: "Moderate Moisture (AMC-II): Normal soil absorption; standard stormwater drainage behavior.",
      multiplier: 1.3,
    };
  }
  return {
    category: "DRY",
    description: "Dry Soil Bed (AMC-I): High initial infiltration; ground will absorb early precipitation before major runoff.",
    multiplier: 1.0,
  };
}

interface OpenMeteoHourlyPayload {
  hourly?: {
    time: string[];
    precipitation?: number[];
    rain?: number[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
  };
  timezone?: string;
  elevation?: number;
}

/**
 * Fetches recent antecedent precipitation (preceding 24h, 48h, 72h up to the current hour)
 * using the verified past_days reanalysis parameter from Open-Meteo.
 */
export async function fetchAntecedentPrecipitation({
  latitude,
  longitude,
  days = 3,
  bypassCache = false,
}: AntecedentFetchOptions): Promise<HistoricalServiceResult<AntecedentRainfallSummary>> {
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const { lat, lon } = coordCheck;
  const safeDays = Math.min(Math.max(days, 3), 7);
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:antecedent:${safeDays}`;

  if (!bypassCache) {
    const cached = antecedentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ANTECEDENT_CACHE_TTL_MS) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        metadata: createHistoricalMetadata(new Date(cached.timestamp).toISOString()),
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      past_days: safeDays.toString(),
      forecast_days: "1",
      hourly: "precipitation,rain,temperature_2m,relative_humidity_2m",
      timezone: "auto",
    });

    const url = `${FORECAST_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "VarshaNetra-Disaster-Command/1.0 (https://varshanetra.gov.in)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Open-Meteo responded with HTTP ${response.status}: ${errorText.slice(0, 150)}`,
      };
    }

    const payload: OpenMeteoHourlyPayload = await response.json();
    const hourly = payload.hourly;

    if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
      return {
        success: false,
        error: "Open-Meteo returned an empty hourly precipitation series.",
      };
    }

    const allPoints: HistoricalPrecipitationPoint[] = hourly.time.map((timeStr, idx) => ({
      time: timeStr,
      precipitation: Number((hourly.precipitation?.[idx] ?? 0).toFixed(2)),
      rain: Number((hourly.rain?.[idx] ?? 0).toFixed(2)),
      temperature: hourly.temperature_2m?.[idx],
      relativeHumidity: hourly.relative_humidity_2m?.[idx],
    }));

    const nowUtcMs = Date.now();
    let pastIndex = allPoints.findIndex((pt) => {
      const ptTime = new Date(pt.time).getTime();
      return ptTime > nowUtcMs;
    });

    if (pastIndex === -1) {
      pastIndex = allPoints.length;
    }

    const pastSeries = allPoints.slice(0, pastIndex);
    const slice24 = pastSeries.slice(Math.max(0, pastSeries.length - 24));
    const slice48 = pastSeries.slice(Math.max(0, pastSeries.length - 48));
    const slice72 = pastSeries.slice(Math.max(0, pastSeries.length - 72));

    const sumPrecip = (pts: HistoricalPrecipitationPoint[]) =>
      Number(pts.reduce((acc, p) => acc + (p.precipitation || 0), 0).toFixed(2));

    const precip24h = sumPrecip(slice24);
    const precip48h = sumPrecip(slice48);
    const precip72h = sumPrecip(slice72);

    const soilStatus = calculateSoilMoistureCondition(precip24h, precip48h, precip72h);

    const result: AntecedentRainfallSummary = {
      precip24h,
      precip48h,
      precip72h,
      soilMoistureIndex: soilStatus.category,
      soilMoistureDescription: soilStatus.description,
      runoffRiskMultiplier: soilStatus.multiplier,
      hourlyHistory: pastSeries,
    };

    antecedentCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: result,
      cached: false,
      metadata: createHistoricalMetadata(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      success: false,
      error: `Failed to fetch antecedent weather telemetry: ${message}`,
    };
  }
}

/**
 * Fetches historical climate records across an arbitrary calendar window
 * using the verified Open-Meteo Historical Archive API (archive-api.open-meteo.com).
 */
export async function fetchHistoricalArchive({
  latitude,
  longitude,
  districtName,
  startDate,
  endDate,
  bypassCache = false,
}: HistoryArchiveFetchOptions): Promise<HistoricalServiceResult<HistoricalWeatherResponse>> {
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return {
      success: false,
      error: "startDate and endDate must be in ISO format YYYY-MM-DD.",
    };
  }

  if (new Date(startDate) > new Date(endDate)) {
    return {
      success: false,
      error: "startDate cannot be later than endDate.",
    };
  }

  const { lat, lon } = coordCheck;
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:archive:${startDate}:${endDate}`;

  if (!bypassCache) {
    const cached = archiveCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ARCHIVE_CACHE_TTL_MS) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        metadata: createHistoricalMetadata(new Date(cached.timestamp).toISOString()),
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: startDate,
      end_date: endDate,
      hourly: "precipitation,rain,temperature_2m,relative_humidity_2m",
      timezone: "auto",
    });

    const url = `${ARCHIVE_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "VarshaNetra-Disaster-Command/1.0 (https://varshanetra.gov.in)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Open-Meteo Archive API responded with HTTP ${response.status}: ${errorText.slice(0, 150)}`,
      };
    }

    const payload: OpenMeteoHourlyPayload = await response.json();
    const hourly = payload.hourly;

    if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
      return {
        success: false,
        error: "No historical observations found for this coordinate and date range.",
      };
    }

    const points: HistoricalPrecipitationPoint[] = hourly.time.map((timeStr, idx) => ({
      time: timeStr,
      precipitation: Number((hourly.precipitation?.[idx] ?? 0).toFixed(2)),
      rain: Number((hourly.rain?.[idx] ?? 0).toFixed(2)),
      temperature: hourly.temperature_2m?.[idx],
      relativeHumidity: hourly.relative_humidity_2m?.[idx],
    }));

    const dailyMap = new Map<string, number>();
    points.forEach((pt) => {
      const day = pt.time.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + pt.precipitation);
    });

    const dailyPrecipitation = Array.from(dailyMap.entries()).map(([date, totalMm]) => ({
      date,
      totalMm: Number(totalMm.toFixed(2)),
    }));

    const slice24 = points.slice(Math.max(0, points.length - 24));
    const slice48 = points.slice(Math.max(0, points.length - 48));
    const slice72 = points.slice(Math.max(0, points.length - 72));

    const sumPrecip = (pts: HistoricalPrecipitationPoint[]) =>
      Number(pts.reduce((acc, p) => acc + (p.precipitation || 0), 0).toFixed(2));

    const precip24h = sumPrecip(slice24);
    const precip48h = sumPrecip(slice48);
    const precip72h = sumPrecip(slice72);

    const soilStatus = calculateSoilMoistureCondition(precip24h, precip48h, precip72h);

    const antecedent: AntecedentRainfallSummary = {
      precip24h,
      precip48h,
      precip72h,
      soilMoistureIndex: soilStatus.category,
      soilMoistureDescription: soilStatus.description,
      runoffRiskMultiplier: soilStatus.multiplier,
      hourlyHistory: points,
    };

    const result: HistoricalWeatherResponse = {
      districtName,
      latitude: lat,
      longitude: lon,
      timezone: payload.timezone || "Asia/Kolkata",
      startDate,
      endDate,
      antecedent,
      dailyPrecipitation,
      metadata: createHistoricalMetadata(),
    };

    archiveCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: result,
      cached: false,
      metadata: createHistoricalMetadata(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      success: false,
      error: `Failed to fetch historical archive weather: ${message}`,
    };
  }
}
