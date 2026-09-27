/**
 * VarshaNetra - Weather Provider Factory & Fusion Priority Engine
 * VN-TASK-8.3: Dynamic provider resolution based on app_config & lead time.
 * 
 * Rules:
 * - Nowcast (0-6h): Tomorrow.io (1km/1-min) if configured & rate limit ok -> Fallback to Open-Meteo.
 * - Forecast (6h-72h): Open-Meteo Seamless Ensemble (ECMWF/GFS).
 * - Multi-Model Fusion: Tomorrow.io carries 40% (0.4) weight at T+1h, decaying to 10% by T+3h.
 */

import {
  WeatherProvider,
  AppWeatherProviderConfig,
  FusionWeights,
} from "@/lib/weather/types";
import { TomorrowIoProvider } from "@/lib/weather/providers/TomorrowIoProvider";
import { OpenMeteoProvider } from "@/lib/weather/providers/OpenMeteoProvider";
import { createAdminClient } from "@/lib/supabase/server";

// Singleton provider instances
const tomorrowProvider = new TomorrowIoProvider();
const openMeteoProvider = new OpenMeteoProvider();

// In-memory cache for app_config to avoid unnecessary database trips on high traffic
let cachedConfig: AppWeatherProviderConfig | null = null;
let lastConfigFetchTime = 0;
const CONFIG_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Loads the active weather provider configuration from public.app_config.
 */
export async function getAppWeatherConfig(): Promise<AppWeatherProviderConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastConfigFetchTime < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "weather_provider")
      .maybeSingle();

    if (!error && data?.value) {
      cachedConfig = data.value as AppWeatherProviderConfig;
      lastConfigFetchTime = now;
      return cachedConfig;
    }
  } catch (err) {
    console.warn("[WeatherFactory] Unable to read app_config.weather_provider, using defaults:", err);
  }

  // Sensible default fallback
  const defaultConfig: AppWeatherProviderConfig = {
    primary: "openmeteo",
    nowcast: "tomorrowio",
    fallback: ["openmeteo"],
    rate_limit: {
      daily_quota: 500,
      calls_today: 0,
      remaining: 500,
      last_checked_at: new Date().toISOString(),
    },
  };

  cachedConfig = defaultConfig;
  lastConfigFetchTime = now;
  return defaultConfig;
}

/**
 * Primary Factory Method: Resolves the appropriate weather provider based on app_config.
 */
export async function getWeatherProvider(type: "nowcast" | "forecast" = "nowcast"): Promise<WeatherProvider> {
  const config = await getAppWeatherConfig();

  if (type === "nowcast") {
    // If Admin enabled Tomorrow.io for Nowcast and not rate-limited
    if (config.nowcast === "tomorrowio" && !tomorrowProvider.isRateLimited()) {
      return tomorrowProvider;
    }
    // Fallback to Open-Meteo
    return openMeteoProvider;
  }

  // Standard Forecast (6h - 72h) uses Open-Meteo
  return openMeteoProvider;
}

/**
 * Helper: getBestProviderForTime(leadTimeHours)
 * - leadTimeHours <= 6h: Tomorrow.io (if available & rate limit intact) -> Open-Meteo
 * - leadTimeHours > 6h: Open-Meteo Multi-Model Ensemble
 */
export async function getBestProviderForTime(leadTimeHours: number): Promise<WeatherProvider> {
  if (leadTimeHours <= 6) {
    const config = await getAppWeatherConfig();
    if (config.nowcast === "tomorrowio" && !tomorrowProvider.isRateLimited()) {
      return tomorrowProvider;
    }
  }

  return openMeteoProvider;
}

/**
 * Multi-Model Fusion Priority Engine (Prompt F1)
 * Computes weight percentage contributions across numerical models:
 * - At T+0 to T+1h: Tomorrow.io has highest weight (40%), GFS (30%), ECMWF (20%), Radar (10%)
 * - At T+2h: Tomorrow.io decays to 25%, GFS (35%), ECMWF (30%), Radar (10%)
 * - At T+3h: Tomorrow.io decays to 10%, GFS (45%), ECMWF (40%), Radar (5%)
 * - Beyond T+3h: Tomorrow.io 0%, ECMWF & GFS dominate
 */
export function computeFusionWeights(leadTimeHours: number, isTomorrowConfigured = true): FusionWeights {
  let weights: Record<string, number>;
  let primarySource = "openmeteo";

  if (isTomorrowConfigured && !tomorrowProvider.isRateLimited()) {
    if (leadTimeHours <= 1) {
      weights = { tomorrowio: 40, gfs: 30, ecmwf: 20, radar: 10 };
      primarySource = "tomorrowio";
    } else if (leadTimeHours <= 2) {
      weights = { tomorrowio: 25, gfs: 35, ecmwf: 30, radar: 10 };
      primarySource = "gfs";
    } else if (leadTimeHours <= 3) {
      weights = { tomorrowio: 10, gfs: 45, ecmwf: 40, radar: 5 };
      primarySource = "gfs";
    } else {
      weights = { tomorrowio: 0, gfs: 50, ecmwf: 50 };
      primarySource = "ecmwf";
    }
  } else {
    // When Tomorrow.io is not configured or rate-limited
    if (leadTimeHours <= 1) {
      weights = { gfs: 50, ecmwf: 35, radar: 15 };
    } else {
      weights = { gfs: 50, ecmwf: 50 };
    }
  }

  // Acceptance Criteria #3: Log fusion engine contribution
  console.log(`[FusionEngine] T+${leadTimeHours}h source_contribution:`, JSON.stringify(weights));

  return {
    source_contribution: weights,
    lead_time_hours: leadTimeHours,
    primary_source: primarySource,
  };
}
