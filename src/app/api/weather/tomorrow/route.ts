/**
 * VarshaNetra - Tomorrow.io Weather API Route Handler
 * Endpoint: /api/weather/tomorrow?lat=...&lon=...&district=...
 * Rules:
 * - Read TOMORROW_API_KEY only on the server
 * - Never expose key to client
 * - No fake weather values masquerading as real
 * - Precise failure statuses: NOT_CONFIGURED, CONFIGURED_UNVERIFIED, AUTH_ERROR, RATE_LIMITED, PROVIDER_ERROR, TIMEOUT, UNAVAILABLE
 * - LIVE status only after successful real authenticated response
 */

import { NextRequest, NextResponse } from "next/server";
import {
  TomorrowApiResponse,
  TomorrowHourlyPoint,
  TomorrowDailySummary,
  TomorrowCurrentConditions,
  TomorrowPrecipitationType,
} from "@/types/tomorrow";
import { TomorrowIoProvider, mapPrecipitationType } from "@/lib/weather/providers/TomorrowIoProvider";
import { recordSuccessfulFetch } from "@/lib/services/data-sources";
import { createAdminClient } from "@/lib/supabase/server";

// In-memory server cache to preserve free tier quota (500 calls/day)
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
interface CacheEntry {
  data: TomorrowApiResponse;
  timestamp: number;
}
const tomorrowCache = new Map<string, CacheEntry>();

const tomorrowProvider = new TomorrowIoProvider();

function getQuantizedKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat") || searchParams.get("latitude");
  const lonStr = searchParams.get("lon") || searchParams.get("lng") || searchParams.get("longitude");
  const districtName = searchParams.get("district") || undefined;
  const bypassCache = searchParams.get("refresh") === "true";
  const mode = searchParams.get("mode") || "all"; // 'realtime' | 'all'

  const lat = parseFloat(latStr || "");
  const lon = parseFloat(lonStr || "");

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      {
        success: false,
        api_status: "UNAVAILABLE",
        errorClass: "INVALID_PARAMETERS",
        error: "Valid numeric latitude and longitude query parameters are required.",
      },
      { status: 400 }
    );
  }

  const cacheKey = getQuantizedKey(lat, lon);

  // Check in-memory server cache
  if (!bypassCache) {
    const cached = tomorrowCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache-Status": "HIT" },
      });
    }
  }

  // Server-side secret resolution (TOMORROW_API_KEY takes strict priority)
  const rawEnvKey = process.env.TOMORROW_API_KEY;
  const apiKey = rawEnvKey ? rawEnvKey.trim() : (await tomorrowProvider.getApiKey());

  // Failure state 1: Missing Key -> NOT_CONFIGURED
  if (!apiKey || apiKey.trim().length === 0) {
    const notConfiguredPayload: TomorrowApiResponse = {
      success: false,
      is_live: false,
      is_demo: false,
      api_status: "NOT_CONFIGURED",
      errorClass: "CONFIG_MISSING",
      model_name: "Tomorrow.io Proprietary Model",
      error: "Tomorrow.io API key is not configured. Set TOMORROW_API_KEY in server environment.",
      location: {
        latitude: lat,
        longitude: lon,
        districtName,
      },
      current: {
        temperature: 0,
        temperatureApparent: 0,
        humidity: 0,
        windSpeed: 0,
        precipitationIntensity: 0,
        rainIntensity: 0,
        precipitationProbability: 0,
        precipitationType: "None",
      },
      next24h: {
        precipitationTotalMm: 0,
        precipitationProbabilityMax: 0,
        maxWindSpeedKmH: 0,
        precipitationType: "None",
      },
      hourly: [],
      daily: [],
      metadata: {
        provider: "Tomorrow.io Hyper-Local",
        lastUpdated: new Date().toISOString(),
        origin: "DEMO_SANDBOX",
        attributionNotice: "Tomorrow.io API key not configured. Fallback to Open-Meteo active.",
        url: "https://www.tomorrow.io/",
      },
    };

    return NextResponse.json(notConfiguredPayload, {
      headers: { "X-Cache-Status": "NOT_CONFIGURED" },
    });
  }

  const startTime = Date.now();

  // Attempt live call to Tomorrow.io API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let rawHourly: Array<{
      time?: string;
      startTime?: string;
      values?: Record<string, number>;
    }> = [];
    let rawDaily: Array<{
      time?: string;
      startTime?: string;
      values?: Record<string, number>;
    }> = [];
    let realtimeValues: Record<string, number> | null = null;
    const cleanApiKey = apiKey.trim();
    const encodedKey = encodeURIComponent(cleanApiKey);

    // 1. Always call realtime endpoint first to authenticate and verify live status across all plans
    const realtimeEndpoint = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=metric`;
    let realtimeRes = await fetch(realtimeEndpoint, {
      headers: {
        Accept: "application/json",
        apikey: cleanApiKey,
        "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
      },
      signal: controller.signal,
    });

    // Query parameter fallback if header alone is rejected
    if (realtimeRes.status === 401) {
      const realtimeQueryEndpoint = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=metric&apikey=${encodedKey}`;
      const retryRes = await fetch(realtimeQueryEndpoint, {
        headers: {
          Accept: "application/json",
          apikey: cleanApiKey,
          "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
        },
        signal: controller.signal,
      });
      if (retryRes.status !== 401) {
        realtimeRes = retryRes;
      }
    }

    const remainingHeader = realtimeRes.headers.get("x-ratelimit-remaining");
    const rateLimitRemaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;

    if (realtimeRes.status === 401) {
      clearTimeout(timeoutId);
      return handleAuthError(lat, lon, districtName, Date.now() - startTime);
    }
    if (realtimeRes.status === 403) {
      clearTimeout(timeoutId);
      return handlePermissionError(lat, lon, districtName, Date.now() - startTime);
    }
    if (realtimeRes.status === 429) {
      clearTimeout(timeoutId);
      return handleRateLimited(lat, lon, districtName, Date.now() - startTime);
    }
    if (!realtimeRes.ok) {
      clearTimeout(timeoutId);
      return handleProviderError(realtimeRes.status, await realtimeRes.text().catch(() => ""), lat, lon, districtName, Date.now() - startTime);
    }

    const rtJson = await realtimeRes.json();
    realtimeValues = rtJson?.data?.values || null;

    // 2. If mode !== "realtime", fetch hourly & daily forecast data
    if (mode !== "realtime") {
      try {
        const forecastEndpoint = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&timesteps=1h&units=metric&apikey=${encodedKey}`;
        const forecastRes = await fetch(forecastEndpoint, {
          headers: {
            Accept: "application/json",
            apikey: cleanApiKey,
            "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
          },
          signal: controller.signal,
        });

        if (forecastRes.ok) {
          const fcJson = await forecastRes.json();
          rawHourly = fcJson?.timelines?.hourly || fcJson?.data?.timelines?.[0]?.intervals || [];
          rawDaily = fcJson?.timelines?.daily || fcJson?.data?.timelines?.[1]?.intervals || [];
        }
      } catch {
        // Non-fatal if forecast endpoint fails or is throttled; we already have verified realtimeValues!
      }
    }

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    // Failure state: Empty response -> UNAVAILABLE
    if (!realtimeValues && (!Array.isArray(rawHourly) || rawHourly.length === 0)) {
      return NextResponse.json({
        success: false,
        is_live: false,
        is_demo: false,
        api_status: "UNAVAILABLE",
        errorClass: "EMPTY_PAYLOAD",
        model_name: "Tomorrow.io Proprietary Model",
        error: "Tomorrow.io returned empty timeline intervals for this location.",
        location: { latitude: lat, longitude: lon, districtName },
        latencyMs,
        current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
        next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
        hourly: [],
        daily: [],
        metadata: {
          provider: "Tomorrow.io",
          lastUpdated: new Date().toISOString(),
          origin: "DEMO_SANDBOX",
          attributionNotice: "Telemetry unavailable from Tomorrow.io.",
          url: "https://www.tomorrow.io/",
        },
      });
    }

    // Success State: Parse and normalize real metrics
    const hourly: TomorrowHourlyPoint[] = rawHourly.slice(0, 24).map((interval) => {
      const v = interval.values || {};
      const rainIntensity = Number(v.rainIntensity ?? v.precipitationIntensity ?? 0);
      const precipIntensity = Number(v.precipitationIntensity ?? v.rainIntensity ?? 0);
      const precipType = mapPrecipitationType(v.precipitationType) as TomorrowPrecipitationType;

      return {
        time: interval.time || interval.startTime || new Date().toISOString(),
        temperature: Number(v.temperature ?? 0),
        temperatureApparent: v.temperatureApparent !== undefined ? Number(v.temperatureApparent) : undefined,
        humidity: Number(v.humidity ?? 0),
        precipitationIntensity: precipIntensity,
        rainIntensity: rainIntensity,
        precipitationProbability: Number(v.precipitationProbability ?? 0),
        precipitationType: precipType,
        windSpeed: Number(v.windSpeed ?? 0),
        windDirection: v.windDirection !== undefined ? Number(v.windDirection) : undefined,
        windGust: v.windGust !== undefined ? Number(v.windGust) : undefined,
        weatherCode: v.weatherCode !== undefined ? Number(v.weatherCode) : undefined,
        cloudCover: v.cloudCover !== undefined ? Number(v.cloudCover) : undefined,
      };
    });

    const daily: TomorrowDailySummary[] = rawDaily.slice(0, 5).map((interval) => {
      const v = interval.values || {};
      const dateStr = (interval.time || interval.startTime || new Date().toISOString()).split("T")[0];
      return {
        date: dateStr,
        maxTemp: Number(v.temperatureMax ?? v.temperature ?? 0),
        minTemp: Number(v.temperatureMin ?? v.temperature ?? 0),
        precipitationTotal: Number(v.precipitationAccumulation ?? (v.precipitationIntensity ? v.precipitationIntensity * 24 : 0)),
        precipitationProbabilityMax: Number(v.precipitationProbability ?? 0),
        maxWindSpeed: Number(v.windSpeed ?? 0),
        weatherCode: v.weatherCode !== undefined ? Number(v.weatherCode) : undefined,
      };
    });

    // Derive current conditions from realtime endpoint or first hourly observation
    const firstHourly = hourly[0];
    const sourceVals = realtimeValues || (firstHourly ? {
      temperature: firstHourly.temperature,
      temperatureApparent: firstHourly.temperatureApparent,
      humidity: firstHourly.humidity,
      windSpeed: firstHourly.windSpeed,
      windDirection: firstHourly.windDirection,
      windGust: firstHourly.windGust,
      precipitationIntensity: firstHourly.precipitationIntensity,
      rainIntensity: firstHourly.rainIntensity,
      precipitationProbability: firstHourly.precipitationProbability,
      weatherCode: firstHourly.weatherCode,
      cloudCover: firstHourly.cloudCover,
    } : {});

    const current: TomorrowCurrentConditions = {
      temperature: Number(sourceVals.temperature ?? 0),
      temperatureApparent: sourceVals.temperatureApparent !== undefined ? Number(sourceVals.temperatureApparent) : undefined,
      humidity: Number(sourceVals.humidity ?? 0),
      windSpeed: Number(sourceVals.windSpeed ?? 0),
      windDirection: sourceVals.windDirection !== undefined ? Number(sourceVals.windDirection) : undefined,
      windGust: sourceVals.windGust !== undefined ? Number(sourceVals.windGust) : undefined,
      precipitationIntensity: Number(sourceVals.precipitationIntensity ?? sourceVals.rainIntensity ?? 0),
      rainIntensity: Number(sourceVals.rainIntensity ?? sourceVals.precipitationIntensity ?? 0),
      precipitationProbability: Number(sourceVals.precipitationProbability ?? 0),
      precipitationType: (firstHourly?.precipitationType || "None") as TomorrowPrecipitationType,
      weatherCode: sourceVals.weatherCode !== undefined ? Number(sourceVals.weatherCode) : undefined,
      cloudCover: sourceVals.cloudCover !== undefined ? Number(sourceVals.cloudCover) : undefined,
    };

    const next24hPrecipTotal = hourly.reduce((sum, h) => sum + (h.precipitationIntensity || 0), 0);
    const next24hProbMax = hourly.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);
    const next24hWindMax = hourly.reduce((max, h) => Math.max(max, h.windSpeed || 0), 0);
    const primaryPrecipType = hourly.find((h) => h.precipitationType !== "None")?.precipitationType || "None";

    const nowIso = new Date().toISOString();
    const livePayload: TomorrowApiResponse = {
      success: true,
      is_live: true,
      is_demo: false,
      api_status: "LIVE",
      model_name: "Tomorrow.io Proprietary Model",
      location: {
        latitude: lat,
        longitude: lon,
        districtName,
      },
      current,
      next24h: {
        precipitationTotalMm: Number(next24hPrecipTotal.toFixed(1)),
        precipitationProbabilityMax: Math.round(next24hProbMax),
        maxWindSpeedKmH: Number(next24hWindMax.toFixed(1)),
        precipitationType: primaryPrecipType,
      },
      hourly,
      daily,
      rateLimitRemaining,
      latencyMs,
      lastSuccessfulFetch: nowIso,
      metadata: {
        provider: "Tomorrow.io (Real-Time Weather)",
        lastUpdated: nowIso,
        origin: "LIVE_API",
        attributionNotice: "Weather data provided by Tomorrow.io.",
        url: "https://www.tomorrow.io/",
      },
    };

    // Record provenance and save to cache
    recordSuccessfulFetch("tomorrowio-nowcast", nowIso);
    tomorrowCache.set(cacheKey, { data: livePayload, timestamp: Date.now() });

    // Persist health record to Supabase
    try {
      const supabase = createAdminClient();
      await supabase.from("provider_health").upsert(
        {
          provider: "tomorrowio",
          status: "LIVE",
          last_success_at: nowIso,
          rate_limit_remaining: rateLimitRemaining ?? 500,
          updated_at: nowIso,
        },
        { onConflict: "provider" }
      );
    } catch {
      // Non-fatal
    }

    return NextResponse.json(livePayload, {
      headers: { "X-Cache-Status": "MISS" },
    });
  } catch (err: unknown) {
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      (err instanceof Error && err.message.toLowerCase().includes("timeout"));

    const apiStatus = isTimeout ? "TIMEOUT" : "PROVIDER_ERROR";
    const errorClass = isTimeout ? "TIMEOUT" : "NETWORK_ERROR";
    const msg = isTimeout
      ? "Tomorrow.io request timed out."
      : (err instanceof Error ? err.message : "Failed to retrieve Tomorrow.io telemetry");

    return NextResponse.json({
      success: false,
      is_live: false,
      is_demo: false,
      api_status: apiStatus,
      errorClass,
      model_name: "Tomorrow.io Proprietary Model",
      error: msg,
      location: { latitude: lat, longitude: lon, districtName },
      latencyMs: Date.now() - startTime,
      current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
      next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
      hourly: [],
      daily: [],
      metadata: {
        provider: "Tomorrow.io",
        lastUpdated: new Date().toISOString(),
        origin: "DEMO_SANDBOX",
        attributionNotice: "Tomorrow.io request failed.",
        url: "https://www.tomorrow.io/",
      },
    });
  }
}

function handleAuthError(lat: number, lon: number, districtName?: string, latencyMs = 0) {
  try {
    const supabase = createAdminClient();
    supabase
      .from("provider_health")
      .upsert(
        {
          provider: "tomorrowio",
          status: "AUTH_ERROR",
          rate_limit_remaining: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider" }
      )
      .then(() => {});
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    success: false,
    is_live: false,
    is_demo: false,
    api_status: "AUTH_ERROR",
    errorClass: "HTTP_401",
    model_name: "Tomorrow.io Proprietary Model",
    error: "Tomorrow.io rejected the configured API key (HTTP 401 Invalid Key). Verify TOMORROW_API_KEY in server environment.",
    location: { latitude: lat, longitude: lon, districtName },
    latencyMs,
    current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
    next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
    hourly: [],
    daily: [],
    metadata: {
      provider: "Tomorrow.io",
      lastUpdated: new Date().toISOString(),
      origin: "DEMO_SANDBOX",
      attributionNotice: "Tomorrow.io rejected the configured API key (HTTP 401 Invalid Key). Open-Meteo fallback active.",
      url: "https://www.tomorrow.io/",
    },
  });
}

function handlePermissionError(lat: number, lon: number, districtName?: string, latencyMs = 0) {
  return NextResponse.json({
    success: false,
    is_live: false,
    is_demo: false,
    api_status: "PERMISSION_ERROR",
    errorClass: "HTTP_403",
    model_name: "Tomorrow.io Proprietary Model",
    error: "Permission denied: Tomorrow.io returned HTTP 403 Forbidden. Your account plan or key lacks permissions for this endpoint.",
    location: { latitude: lat, longitude: lon, districtName },
    latencyMs,
    current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
    next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
    hourly: [],
    daily: [],
    metadata: {
      provider: "Tomorrow.io",
      lastUpdated: new Date().toISOString(),
      origin: "DEMO_SANDBOX",
      attributionNotice: "Permission denied by Tomorrow.io (HTTP 403 Forbidden).",
      url: "https://www.tomorrow.io/",
    },
  });
}

function handleRateLimited(lat: number, lon: number, districtName?: string, latencyMs = 0) {
  return NextResponse.json({
    success: false,
    is_live: false,
    is_demo: false,
    api_status: "RATE_LIMITED",
    errorClass: "HTTP_429",
    model_name: "Tomorrow.io Proprietary Model",
    error: "Tomorrow.io API rate limit reached (500 calls/day free tier quota exhausted).",
    rateLimitRemaining: 0,
    location: { latitude: lat, longitude: lon, districtName },
    latencyMs,
    current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
    next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
    hourly: [],
    daily: [],
    metadata: {
      provider: "Tomorrow.io",
      lastUpdated: new Date().toISOString(),
      origin: "DEMO_SANDBOX",
      attributionNotice: "Tomorrow.io rate limit reached.",
      url: "https://www.tomorrow.io/",
    },
  });
}

function handleProviderError(httpStatus: number, errText: string, lat: number, lon: number, districtName?: string, latencyMs = 0) {
  return NextResponse.json({
    success: false,
    is_live: false,
    is_demo: false,
    api_status: "PROVIDER_ERROR",
    errorClass: `HTTP_${httpStatus}`,
    model_name: "Tomorrow.io Proprietary Model",
    error: `Tomorrow.io upstream service returned HTTP ${httpStatus}: ${errText || "Service Error"}`,
    location: { latitude: lat, longitude: lon, districtName },
    latencyMs,
    current: { temperature: 0, humidity: 0, windSpeed: 0, precipitationIntensity: 0, precipitationProbability: 0, precipitationType: "None" },
    next24h: { precipitationTotalMm: 0, precipitationProbabilityMax: 0, maxWindSpeedKmH: 0, precipitationType: "None" },
    hourly: [],
    daily: [],
    metadata: {
      provider: "Tomorrow.io",
      lastUpdated: new Date().toISOString(),
      origin: "DEMO_SANDBOX",
      attributionNotice: "Tomorrow.io service error.",
      url: "https://www.tomorrow.io/",
    },
  });
}
