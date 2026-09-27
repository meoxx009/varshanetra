/**
 * VarshaNetra Meteorological Data Provider Abstraction Layer
 * 
 * Future-ready abstraction layer that routes weather data requests between
 * Open-Meteo (current live ECMWF/GFS multi-model telemetry) and the official
 * India Meteorological Department (IMD) API once statutory MOU access is granted.
 */

import {
  WeatherForecastOptions,
  WeatherServiceResult,
  fetchWeatherForecast,
} from "@/lib/services/weather";
import { WeatherForecastData, DataSourceMeta } from "@/types";

export type WeatherSourceConfig = "OPEN_METEO" | "IMD_API";

/**
 * Active weather source configuration.
 * Default is OPEN_METEO. Can be toggled via environment variable.
 */
export const WEATHER_SOURCE: WeatherSourceConfig =
  (process.env.NEXT_PUBLIC_WEATHER_SOURCE as WeatherSourceConfig) || "OPEN_METEO";

export interface WeatherSourceStatus {
  primarySource: WeatherSourceConfig;
  fallbackSource: WeatherSourceConfig;
  activeSource: WeatherSourceConfig;
  isImdConfigured: boolean;
  providerLabel: string;
  mouStatus: "PLANNED" | "INITIATED" | "ACTIVE";
  notes: string;
  notesHindi: string;
}

/**
 * Returns the current meteorological data provider architecture status.
 * Used by Data Health Monitor and Telemetry screens to transparently show
 * Primary vs Fallback sources and official IMD MOU readiness.
 */
export function getWeatherSourceStatus(): WeatherSourceStatus {
  const imdApiKey = process.env.IMD_API_KEY || process.env.NEXT_PUBLIC_IMD_API_KEY;
  const isImdConfigured = Boolean(imdApiKey && imdApiKey.trim().length > 0);

  const activeSource: WeatherSourceConfig =
    WEATHER_SOURCE === "IMD_API" && isImdConfigured ? "IMD_API" : "OPEN_METEO";

  return {
    primarySource: WEATHER_SOURCE,
    fallbackSource: "OPEN_METEO",
    activeSource,
    isImdConfigured,
    providerLabel:
      activeSource === "IMD_API"
        ? "India Meteorological Department (Official IMD API Feed)"
        : "Open-Meteo (ECMWF & GFS Seamless Multi-Model)",
    mouStatus: isImdConfigured ? "ACTIVE" : "PLANNED",
    notes:
      activeSource === "IMD_API"
        ? "Connected to official IMD API gateway with automatic Open-Meteo secondary fallback."
        : "Currently using Open-Meteo ECMWF multi-model telemetry. MOU process for direct IMD API integration is planned. Automatic fallback is active.",
    notesHindi:
      activeSource === "IMD_API"
        ? "आधिकारिक आईएमडी एपीआई गेटवे से जुड़ा हुआ है। ओपन-मेटियो बैकअप सक्रिय है।"
        : "वर्तमान में Open-Meteo ECMWF मॉडल डेटा उपयोग किया जा रहा है। IMD API एकीकरण के लिए MOU प्रक्रिया योजनाबद्ध है।",
  };
}

/**
 * Mock/Adapter function for future IMD API endpoint.
 * When official credentials and endpoint become active, this function communicates
 * with the National Data Center / IMD API gateway.
 */
async function fetchFromImdApi(
  options: WeatherForecastOptions,
  apiKey: string
): Promise<WeatherServiceResult<WeatherForecastData>> {
  const imdEndpoint = process.env.IMD_API_ENDPOINT || "https://api.imd.gov.in/v1/forecast";

  try {
    const res = await fetch(
      `${imdEndpoint}?lat=${options.latitude}&lon=${options.longitude}&days=${options.days || 7}`,
      {
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
          "User-Agent": "VarshaNetra-DDMA-Disaster-Command/1.0",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      throw new Error(`IMD API gateway returned HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();
    if (!payload || !payload.data) {
      throw new Error("Invalid payload structure from IMD API gateway.");
    }

    const metadata: DataSourceMeta = {
      provider: "India Meteorological Department (Official IMD Telemetry)",
      lastUpdated: new Date().toISOString(),
      origin: "LIVE_API",
      attributionNotice: "Official meteorological bulletin via IMD Government Gateway.",
      url: "https://mausam.imd.gov.in/",
    };

    return {
      success: true,
      data: {
        ...payload.data,
        metadata,
      },
      cached: false,
      metadata,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "IMD gateway connection error";
    return {
      success: false,
      error: `IMD API error: ${message}. Initiating automated fallback to Open-Meteo.`,
    };
  }
}

/**
 * Primary meteorological data query function.
 * Evaluates configured weather provider, executes live IMD API if configured,
 * and automatically falls back to Open-Meteo with zero disruption.
 */
export async function getWeatherData(
  options: WeatherForecastOptions
): Promise<WeatherServiceResult<WeatherForecastData>> {
  const imdApiKey = process.env.IMD_API_KEY || process.env.NEXT_PUBLIC_IMD_API_KEY;

  // Case 1: Configured for IMD API with active key
  if (WEATHER_SOURCE === "IMD_API" && imdApiKey) {
    const imdResult = await fetchFromImdApi(options, imdApiKey);
    if (imdResult.success && imdResult.data) {
      return imdResult;
    }
    // Graceful fallback to Open-Meteo if IMD gateway fails
    console.warn(
      `[VarshaNetra:WeatherProvider] IMD API unavailable (${imdResult.error}). Falling back to Open-Meteo.`
    );
  }

  // Case 2: Open-Meteo (Primary or Fallback)
  const openMeteoResult = await fetchWeatherForecast(options);
  return openMeteoResult;
}
