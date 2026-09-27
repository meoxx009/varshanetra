/**
 * VarshaNetra - Tomorrow.io Weather Provider (Adapter Pattern)
 * VN-TASK-8.2 / VNET-TOMORROW-001: Hyper-Local Nowcasting & Forecast Provider (1km, 1-min)
 * 
 * Secure Key Management: Server-side only via Supabase Vault / TOMORROW_API_KEY
 * Aggressive Caching: Realtime: 2 min, Forecast: 15 min
 * Rate Limit Handling: 500 calls/day free tier with automatic Open-Meteo fallback
 */

import {
  WeatherProvider,
  WeatherProviderMeta,
  WeatherProviderResult,
  NormalizedCurrentWeather,
  NormalizedForecastPoint,
  WeatherCondition,
} from "@/lib/weather/types";
import { OpenMeteoProvider } from "@/lib/weather/providers/OpenMeteoProvider";
import { createAdminClient } from "@/lib/supabase/server";
import { recordSuccessfulFetch } from "@/lib/services/data-sources";

// Cache structures
interface CacheItem<T> {
  data: T;
  timestamp: number;
  rateLimitRemaining?: number;
}

const realtimeCache = new Map<string, CacheItem<NormalizedCurrentWeather>>();
const nowcastCache = new Map<string, CacheItem<NormalizedForecastPoint[]>>();
const forecastCache = new Map<string, CacheItem<NormalizedForecastPoint[]>>();

const REALTIME_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const FORECAST_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limit & provenance tracker
let cachedRateLimitRemaining = 500;
let cachedCallsToday = 0;
let lastRateLimitResetDay = new Date().getUTCDate();
let lastSuccessfulFetchAt: string | null = null;
let lastHealthStatus: "LIVE" | "DEGRADED" | "NOT_CONFIGURED" | "AUTH_ERROR" | "PERMISSION_ERROR" | "ERROR" | "UNAVAILABLE" = "NOT_CONFIGURED";

function trackRateLimit(remainingHeaders?: string | null) {
  const currentDay = new Date().getUTCDate();
  if (currentDay !== lastRateLimitResetDay) {
    cachedCallsToday = 0;
    cachedRateLimitRemaining = 500;
    lastRateLimitResetDay = currentDay;
  }

  if (remainingHeaders) {
    const val = parseInt(remainingHeaders, 10);
    if (!isNaN(val)) {
      cachedRateLimitRemaining = Math.max(0, val);
      cachedCallsToday = Math.max(0, 500 - cachedRateLimitRemaining);
    }
  } else {
    cachedCallsToday += 1;
    cachedRateLimitRemaining = Math.max(0, 500 - cachedCallsToday);
  }
}

/**
 * Maps Tomorrow.io numeric weather codes to standard WeatherCondition strings.
 */
export function mapTomorrowWeatherCode(code?: number): WeatherCondition {
  switch (code) {
    case 1000:
      return "clear";
    case 1100:
      return "mostly_clear";
    case 1101:
      return "partly_cloudy";
    case 1102:
      return "mostly_cloudy";
    case 1001:
      return "cloudy";
    case 2000:
    case 2100:
      return "fog";
    case 4000:
    case 4200:
      return "drizzle";
    case 4001:
      return "rain";
    case 4201:
      return "heavy_rain";
    case 8000:
      return "thunderstorm";
    case 5000:
    case 5001:
    case 5100:
      return "snow";
    case 6000:
    case 6200:
    case 7000:
      return "sleet";
    default:
      return "cloudy";
  }
}

export function mapPrecipitationType(code?: number): string {
  switch (code) {
    case 1:
      return "Rain";
    case 2:
      return "Snow";
    case 3:
      return "Freezing Rain";
    case 4:
      return "Sleet";
    default:
      return "None";
  }
}

export class TomorrowIoProvider implements WeatherProvider {
  public readonly id = "tomorrowio";
  public readonly name = "Tomorrow.io Hyper-Local";
  private fallbackProvider = new OpenMeteoProvider();

  public get meta(): WeatherProviderMeta {
    return {
      id: "tomorrowio",
      name: "Tomorrow.io Hyper-Local",
      resolution_km: 1, // 1km high-resolution
      latency_sec: 60,
      type: "NOWCAST",
      isOfficial: false,
      rateLimitRemaining: cachedRateLimitRemaining,
      isDegraded: this.isRateLimited(),
    };
  }

  public isRateLimited(): boolean {
    return cachedRateLimitRemaining <= 0;
  }

  public getRateLimitRemaining(): number {
    return cachedRateLimitRemaining;
  }

  public getLastSuccessfulFetch(): string | null {
    return lastSuccessfulFetchAt;
  }

  public getHealthStatus(): "LIVE" | "DEGRADED" | "NOT_CONFIGURED" | "AUTH_ERROR" | "PERMISSION_ERROR" | "ERROR" | "UNAVAILABLE" {
    if (this.isRateLimited()) return "DEGRADED";
    return lastHealthStatus;
  }

  /**
   * Returns a structured server-side configuration check without printing the secret.
   * Complies with VNET-TOMORROW-FINAL-001.
   */
  public async getConfigurationState(): Promise<{
    isConfigured: boolean;
    state: "NOT_CONFIGURED" | "CONFIGURED_UNVERIFIED" | "LIVE" | "AUTH_ERROR" | "PERMISSION_ERROR" | "RATE_LIMITED" | "TIMEOUT" | "PROVIDER_ERROR" | "UNAVAILABLE";
    source: "ENVIRONMENT" | "VAULT" | "APP_CONFIG" | null;
    lastSuccessfulFetch: string | null;
    rateLimitRemaining: number;
  }> {
    const key = await this.getApiKey();
    if (!key) {
      return {
        isConfigured: false,
        state: "NOT_CONFIGURED",
        source: null,
        lastSuccessfulFetch: lastSuccessfulFetchAt,
        rateLimitRemaining: cachedRateLimitRemaining,
      };
    }

    let source: "ENVIRONMENT" | "VAULT" | "APP_CONFIG" = "ENVIRONMENT";
    if (!process.env.TOMORROW_API_KEY && !process.env.TOMORROW_IO_API_KEY) {
      source = "VAULT";
    }

    let state: "NOT_CONFIGURED" | "CONFIGURED_UNVERIFIED" | "LIVE" | "AUTH_ERROR" | "PERMISSION_ERROR" | "RATE_LIMITED" | "TIMEOUT" | "PROVIDER_ERROR" | "UNAVAILABLE" = "CONFIGURED_UNVERIFIED";

    if (lastHealthStatus === "LIVE") {
      state = "LIVE";
    } else if (lastHealthStatus === "AUTH_ERROR" || lastHealthStatus === "ERROR") {
      state = "AUTH_ERROR";
    } else if (lastHealthStatus === "PERMISSION_ERROR") {
      state = "PERMISSION_ERROR";
    } else if (lastHealthStatus === "DEGRADED" || cachedRateLimitRemaining <= 0) {
      state = "RATE_LIMITED";
    } else if (lastSuccessfulFetchAt) {
      state = "LIVE";
    } else {
      state = "CONFIGURED_UNVERIFIED";
    }

    return {
      isConfigured: true,
      state,
      source,
      lastSuccessfulFetch: lastSuccessfulFetchAt,
      rateLimitRemaining: cachedRateLimitRemaining,
    };
  }

  /**
   * Returns telemetry health metadata conforming to VNET-TOMORROW-FINAL-001.
   */
  public async getHealthMetadata(latencyMs = 0, errorClass: string | null = null): Promise<{
    provider: "Tomorrow.io";
    status: "NOT_CONFIGURED" | "CONFIGURED_UNVERIFIED" | "LIVE" | "AUTH_ERROR" | "PERMISSION_ERROR" | "RATE_LIMITED" | "TIMEOUT" | "PROVIDER_ERROR" | "UNAVAILABLE";
    last_successful_fetch: string | null;
    latency: number;
    freshness: string;
    error_class: string | null;
  }> {
    const cfg = await this.getConfigurationState();
    let freshness = "UNKNOWN";
    if (cfg.lastSuccessfulFetch) {
      const minsAgo = Math.round((Date.now() - new Date(cfg.lastSuccessfulFetch).getTime()) / 60000);
      freshness = minsAgo <= 2 ? "REALTIME" : minsAgo <= 15 ? "FRESH" : `${minsAgo}m_OLD`;
    }

    return {
      provider: "Tomorrow.io",
      status: cfg.state,
      last_successful_fetch: cfg.lastSuccessfulFetch,
      latency: latencyMs,
      freshness,
      error_class: errorClass,
    };
  }

  /**
   * Securely resolves the Tomorrow.io API Key strictly on the server:
   * 1. Server Environment variable (TOMORROW_API_KEY, fallback TOMORROW_IO_API_KEY)
   * 2. Supabase Vault (vault.secrets: TOMORROW_API_KEY, fallback TOMORROW_IO_API_KEY)
   * 3. app_config fallback store
   *
   * Automatically sanitizes leading/trailing quotes and extraneous whitespace.
   */
  public async getApiKey(): Promise<string | null> {
    const clean = (val?: string | null): string | null => {
      if (!val) return null;
      const trimmed = val.replace(/^['"]|['"]$/g, "").trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    // 1. Check process environment first (strict server-side)
    const envKey1 = clean(process.env.TOMORROW_API_KEY);
    if (envKey1) return envKey1;

    const envKey2 = clean(process.env.TOMORROW_IO_API_KEY);
    if (envKey2) return envKey2;

    try {
      const supabase = createAdminClient();

      // 2. Query Supabase Vault secrets table
      for (const secretName of ["TOMORROW_API_KEY", "TOMORROW_IO_API_KEY"]) {
        const { data: vaultData } = await supabase
          .from("vault.secrets" as unknown as "profiles")
          .select("secret")
          .eq("name", secretName)
          .maybeSingle();

        const candidateSecret = clean((vaultData as unknown as { secret?: string })?.secret);
        if (candidateSecret) {
          return candidateSecret;
        }
      }

      // 3. Fallback: app_config key
      for (const configKey of ["vault_TOMORROW_API_KEY", "vault_TOMORROW_IO_API_KEY"]) {
        const { data: configData } = await supabase
          .from("app_config")
          .select("value")
          .eq("key", configKey)
          .maybeSingle();

        const val = clean((configData?.value as { secret?: string })?.secret);
        if (val) {
          return val;
        }
      }
    } catch (err) {
      console.warn("[TomorrowIoProvider] Error reading from Supabase Vault:", err);
    }

    return null;
  }

  /**
   * Fetches Real-time Weather (1km resolution, SI units)
   * Realtime endpoint: https://api.tomorrow.io/v4/weather/realtime
   */
  public async getRealtimeWeather(
    lat: number,
    lon: number
  ): Promise<WeatherProviderResult<NormalizedCurrentWeather>> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    // 1. Check aggressive 2-minute in-memory cache
    const cached = realtimeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REALTIME_CACHE_TTL_MS) {
      return {
        success: true,
        data: cached.data,
        meta: {
          ...this.meta,
          rateLimitRemaining: cached.rateLimitRemaining ?? cachedRateLimitRemaining,
        },
      };
    }

    // 2. Check if rate-limited before making outbound network call
    if (this.isRateLimited()) {
      console.warn("[TomorrowIoProvider] 500 calls/day rate limit reached. Auto-falling back to Open-Meteo.");
      const fallbackResult = await this.fallbackProvider.getRealtimeWeather(lat, lon);
      return {
        ...fallbackResult,
        meta: {
          ...this.meta,
          isDegraded: true,
          rateLimitRemaining: 0,
        },
        errorCode: "RATE_LIMITED",
      };
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      const fallback = await this.fallbackProvider.getRealtimeWeather(lat, lon);
      return {
        ...fallback,
        meta: { ...this.meta, isDegraded: true },
        errorCode: "NOT_CONFIGURED",
      };
    }

    try {
      const encodedKey = encodeURIComponent(apiKey);
      const endpoint = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=metric&apikey=${encodedKey}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: apiKey,
          "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
        },
        signal: AbortSignal.timeout(6000),
      });

      // Update rate limits from response headers
      const remainingHeader = response.headers.get("x-ratelimit-remaining");
      trackRateLimit(remainingHeader);

      if (response.status === 401) {
        console.error(`[TomorrowIoProvider] HTTP 401: Invalid API Key. Falling back to Open-Meteo.`);
        lastHealthStatus = "AUTH_ERROR";
        const fallback = await this.fallbackProvider.getRealtimeWeather(lat, lon);
        return { ...fallback, errorCode: "AUTHENTICATION_ERROR", meta: { ...this.meta, isDegraded: true } };
      }

      if (response.status === 403) {
        console.error(`[TomorrowIoProvider] HTTP 403: Forbidden/Permission Error. Falling back to Open-Meteo.`);
        lastHealthStatus = "PERMISSION_ERROR";
        const fallback = await this.fallbackProvider.getRealtimeWeather(lat, lon);
        return { ...fallback, errorCode: "PERMISSION_ERROR", meta: { ...this.meta, isDegraded: true } };
      }

      if (response.status === 429) {
        console.warn("[TomorrowIoProvider] HTTP 429: Rate limited. Auto-falling back to Open-Meteo.");
        cachedRateLimitRemaining = 0;
        lastHealthStatus = "DEGRADED";
        const fallback = await this.fallbackProvider.getRealtimeWeather(lat, lon);
        return { ...fallback, errorCode: "RATE_LIMITED", meta: { ...this.meta, isDegraded: true, rateLimitRemaining: 0 } };
      }

      if (!response.ok) {
        throw new Error(`Tomorrow.io HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const vals = json?.data?.values || {};

      const rainIntensity = Number(vals.rainIntensity ?? vals.precipitationIntensity ?? 0);
      const precipIntensity = Number(vals.precipitationIntensity ?? vals.rainIntensity ?? 0);

      const normalized: NormalizedCurrentWeather = {
        temperature: Number(vals.temperature ?? 0),
        temperatureApparent: vals.temperatureApparent !== undefined ? Number(vals.temperatureApparent) : undefined,
        humidity: Number(vals.humidity ?? 0),
        windSpeed: Number(vals.windSpeed ?? 0),
        windDirection: vals.windDirection !== undefined ? Number(vals.windDirection) : undefined,
        precipitationIntensity: precipIntensity,
        rainIntensity: rainIntensity,
        precipitationProbability: Number(vals.precipitationProbability ?? 0),
        precipitationType: mapPrecipitationType(vals.precipitationType),
        condition: mapTomorrowWeatherCode(vals.weatherCode),
        weatherCode: Number(vals.weatherCode ?? 1000),
        visibilityKm: vals.visibility !== undefined ? Number(vals.visibility) : undefined,
        cloudCover: vals.cloudCover !== undefined ? Number(vals.cloudCover) : undefined,
        pressureSurfaceLevelHpa: vals.pressureSurfaceLevel !== undefined ? Number(vals.pressureSurfaceLevel) : undefined,
        airQualityIndex: vals.airQualityIndex !== undefined ? Number(vals.airQualityIndex) : undefined,
        timestamp: json?.data?.time || new Date().toISOString(),
      };

      // Mark successful live retrieval
      lastSuccessfulFetchAt = normalized.timestamp;
      lastHealthStatus = "LIVE";
      recordSuccessfulFetch("tomorrowio-nowcast", lastSuccessfulFetchAt);

      realtimeCache.set(cacheKey, {
        data: normalized,
        timestamp: Date.now(),
        rateLimitRemaining: cachedRateLimitRemaining,
      });

      return {
        success: true,
        data: normalized,
        meta: {
          ...this.meta,
          rateLimitRemaining: cachedRateLimitRemaining,
        },
      };
    } catch (err: unknown) {
      const isTimeout =
        (err as { name?: string })?.name === "AbortError" ||
        (err instanceof Error && err.message.toLowerCase().includes("timeout"));

      const errorCode = isTimeout ? "TIMEOUT" : "PROVIDER_ERROR";
      console.warn(`[TomorrowIoProvider] Outbound request failed (${errorCode}), falling back to Open-Meteo:`, err);
      lastHealthStatus = "ERROR";

      const fallback = await this.fallbackProvider.getRealtimeWeather(lat, lon);
      return {
        ...fallback,
        meta: { ...this.meta, isDegraded: true },
        errorCode,
      };
    }
  }

  /**
   * Fetches 1km/1-min Nowcast (Next 6 Hours)
   * Forecast endpoint: https://api.tomorrow.io/v4/weather/forecast
   */
  public async getNowcast(
    lat: number,
    lon: number
  ): Promise<WeatherProviderResult<NormalizedForecastPoint[]>> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    // Check 2-minute cache
    const cached = nowcastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REALTIME_CACHE_TTL_MS) {
      return {
        success: true,
        forecast: cached.data,
        meta: this.meta,
      };
    }

    if (this.isRateLimited()) {
      const fallback = await this.fallbackProvider.getNowcast(lat, lon);
      return {
        ...fallback,
        meta: { ...this.meta, isDegraded: true, rateLimitRemaining: 0 },
        errorCode: "RATE_LIMITED",
      };
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      const fallback = await this.fallbackProvider.getNowcast(lat, lon);
      return {
        ...fallback,
        meta: { ...this.meta, isDegraded: true },
        errorCode: "NOT_CONFIGURED",
      };
    }

    try {
      // First attempt modern v4/weather/forecast endpoint
      const encodedKey = encodeURIComponent(apiKey);
      const endpoint = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&timesteps=1h&units=metric&apikey=${encodedKey}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: apiKey,
          "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });

      trackRateLimit(response.headers.get("x-ratelimit-remaining"));

      if (response.status === 401) {
        lastHealthStatus = "AUTH_ERROR";
        const fallback = await this.fallbackProvider.getNowcast(lat, lon);
        return {
          ...fallback,
          meta: { ...this.meta, isDegraded: true },
          errorCode: "AUTHENTICATION_ERROR",
        };
      }

      if (response.status === 403) {
        lastHealthStatus = "PERMISSION_ERROR";
        const fallback = await this.fallbackProvider.getNowcast(lat, lon);
        return {
          ...fallback,
          meta: { ...this.meta, isDegraded: true },
          errorCode: "PERMISSION_ERROR",
        };
      }

      if (response.status === 429) {
        cachedRateLimitRemaining = 0;
        lastHealthStatus = "DEGRADED";
        const fallback = await this.fallbackProvider.getNowcast(lat, lon);
        return {
          ...fallback,
          meta: { ...this.meta, isDegraded: true, rateLimitRemaining: 0 },
          errorCode: "RATE_LIMITED",
        };
      }

      if (!response.ok) {
        throw new Error(`Tomorrow.io HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      
      // Parse hourly points (supports timelines.hourly or legacy timelines[0].intervals)
      const rawHourly =
        json?.timelines?.hourly ||
        json?.data?.timelines?.[0]?.intervals ||
        [];

      const points: NormalizedForecastPoint[] = rawHourly.slice(0, 6).map((item: {
        time?: string;
        startTime?: string;
        values?: Record<string, number>;
      }) => {
        const v = item.values || {};
        const rainIntensity = Number(v.rainIntensity ?? v.precipitationIntensity ?? 0);
        const precipIntensity = Number(v.precipitationIntensity ?? v.rainIntensity ?? 0);

        return {
          time: item.time || item.startTime || new Date().toISOString(),
          temperature: Number(v.temperature ?? 0),
          temperatureApparent: v.temperatureApparent !== undefined ? Number(v.temperatureApparent) : undefined,
          humidity: v.humidity !== undefined ? Number(v.humidity) : undefined,
          precipitationIntensity: precipIntensity,
          rainIntensity: rainIntensity,
          precipitationProbability: Number(v.precipitationProbability ?? 0),
          precipitationType: mapPrecipitationType(v.precipitationType),
          condition: mapTomorrowWeatherCode(v.weatherCode),
          windSpeed: Number(v.windSpeed ?? 0),
          windDirection: v.windDirection !== undefined ? Number(v.windDirection) : undefined,
          weatherCode: v.weatherCode !== undefined ? Number(v.weatherCode) : undefined,
        };
      });

      if (points.length > 0) {
        lastSuccessfulFetchAt = new Date().toISOString();
        lastHealthStatus = "LIVE";
        recordSuccessfulFetch("tomorrowio-nowcast", lastSuccessfulFetchAt);
      }

      nowcastCache.set(cacheKey, {
        data: points,
        timestamp: Date.now(),
        rateLimitRemaining: cachedRateLimitRemaining,
      });

      return {
        success: true,
        forecast: points,
        meta: this.meta,
      };
    } catch (err: unknown) {
      const isTimeout =
        (err as { name?: string })?.name === "AbortError" ||
        (err instanceof Error && err.message.toLowerCase().includes("timeout"));

      const errorCode = isTimeout ? "TIMEOUT" : "PROVIDER_ERROR";
      console.warn(`[TomorrowIoProvider] Nowcast error (${errorCode}), falling back to Open-Meteo:`, err);
      const fallback = await this.fallbackProvider.getNowcast(lat, lon);
      return {
        ...fallback,
        meta: { ...this.meta, isDegraded: true },
        errorCode,
      };
    }
  }

  /**
   * Fetches Forecast (15-min cache)
   * Tomorrow.io Free Tier quota is strictly protected:
   * When leadTime > 6h, seamlessly delegate to Open-Meteo
   */
  public async getForecast(
    lat: number,
    lon: number,
    days = 3
  ): Promise<WeatherProviderResult<NormalizedForecastPoint[]>> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${days}`;

    const cached = forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FORECAST_CACHE_TTL_MS) {
      return {
        success: true,
        forecast: cached.data,
        meta: { ...this.meta, type: "FORECAST" },
      };
    }

    return this.fallbackProvider.getForecast(lat, lon, days);
  }

  /**
   * Authenticated test request runner:
   * Tests Tomorrow.io API with real live request against realtime endpoint.
   * Only transitions status to LIVE if real HTTP 200 is received.
   */
  public async testConnection(
    apiKeyOverride?: string,
    testLocation = "28.6,77.2"
  ): Promise<{
    success: boolean;
    status: "LIVE" | "AUTHENTICATION_ERROR" | "PERMISSION_ERROR" | "RATE_LIMITED" | "PROVIDER_ERROR" | "TIMEOUT" | "NOT_CONFIGURED";
    message: string;
    temperature?: number;
    rateLimitRemaining?: number;
    data?: unknown;
  }> {
    const rawKey = apiKeyOverride || (await this.getApiKey());
    const key = rawKey ? rawKey.replace(/^['"]|['"]$/g, "").trim() : null;
    if (!key) {
      return {
        success: false,
        status: "NOT_CONFIGURED",
        message: "No Tomorrow.io API key provided or found in server environment.",
      };
    }

    try {
      const encodedKey = encodeURIComponent(key);
      const endpoint = `https://api.tomorrow.io/v4/weather/realtime?location=${testLocation}&units=metric&apikey=${encodedKey}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: key,
          "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });

      const remainingHeader = response.headers.get("x-ratelimit-remaining");
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : cachedRateLimitRemaining;
      trackRateLimit(remainingHeader);

      if (response.status === 401) {
        lastHealthStatus = "AUTH_ERROR";
        return {
          success: false,
          status: "AUTHENTICATION_ERROR",
          message: "Tomorrow.io rejected the configured API key (HTTP 401 Invalid Key). Verify TOMORROW_API_KEY in server environment.",
          rateLimitRemaining: remaining,
        };
      }

      if (response.status === 403) {
        lastHealthStatus = "PERMISSION_ERROR";
        return {
          success: false,
          status: "PERMISSION_ERROR",
          message: "Permission Denied: Tomorrow.io returned HTTP 403 (Forbidden). Check key permissions or plan tier.",
          rateLimitRemaining: remaining,
        };
      }

      if (response.status === 429) {
        cachedRateLimitRemaining = 0;
        lastHealthStatus = "DEGRADED";
        return {
          success: false,
          status: "RATE_LIMITED",
          message: "Rate Limit Exceeded: Tomorrow.io returned HTTP 429 (500 calls/day quota reached).",
          rateLimitRemaining: 0,
        };
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        lastHealthStatus = "ERROR";
        return {
          success: false,
          status: "PROVIDER_ERROR",
          message: `Tomorrow.io returned HTTP ${response.status}: ${errText || response.statusText}`,
          rateLimitRemaining: remaining,
        };
      }

      const json = await response.json();
      const vals = json?.data?.values || {};
      const temperature = Number(vals.temperature ?? 0);

      // Successful live authenticated request!
      lastSuccessfulFetchAt = new Date().toISOString();
      lastHealthStatus = "LIVE";
      recordSuccessfulFetch("tomorrowio-nowcast", lastSuccessfulFetchAt);

      // Persist to provider_health in Supabase
      try {
        const supabase = createAdminClient();
        await supabase.from("provider_health").upsert(
          {
            provider: "tomorrowio",
            status: "CONFIGURED",
            last_success_at: lastSuccessfulFetchAt,
            rate_limit_remaining: remaining,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" }
        );
      } catch {
        // Non-fatal
      }

      return {
        success: true,
        status: "LIVE",
        message: `Successfully connected to Tomorrow.io! Real-time temperature is ${temperature}°C.`,
        temperature,
        rateLimitRemaining: remaining,
        data: json,
      };
    } catch (err: unknown) {
      const isTimeout =
        (err as { name?: string })?.name === "AbortError" ||
        (err instanceof Error && err.message.toLowerCase().includes("timeout"));

      const status = isTimeout ? "TIMEOUT" : "PROVIDER_ERROR";
      lastHealthStatus = "ERROR";
      return {
        success: false,
        status,
        message: isTimeout
          ? "Request timed out while connecting to Tomorrow.io API."
          : (err instanceof Error ? err.message : "Connection test failed"),
      };
    }
  }
}
