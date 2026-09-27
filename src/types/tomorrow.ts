/**
 * VarshaNetra - SOURCES-002: Tomorrow.io Weather API Types
 */

import { DataSourceMeta } from "./index";

export type TomorrowPrecipitationType = "Rain" | "Snow" | "Freezing Rain" | "Sleet" | "None";

export type TomorrowApiStatus =
  | "LIVE"
  | "CONFIGURED_UNVERIFIED"
  | "NOT_CONFIGURED"
  | "AUTH_ERROR"
  | "AUTHENTICATION_ERROR"
  | "PERMISSION_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "UNAVAILABLE"
  | "DEGRADED"
  | "DEMO";

export interface TomorrowHourlyPoint {
  time: string;
  temperature: number; // °C
  temperatureApparent?: number; // °C
  humidity: number; // %
  precipitationIntensity: number; // mm/hr
  rainIntensity?: number; // mm/hr
  precipitationProbability: number; // %
  precipitationType: TomorrowPrecipitationType;
  windSpeed: number; // km/h
  windDirection?: number; // degrees
  windGust?: number; // km/h
  weatherCode?: number;
  cloudCover?: number; // %
}

export interface TomorrowDailySummary {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationTotal: number; // mm
  precipitationProbabilityMax: number; // %
  maxWindSpeed: number; // km/h
  weatherCode?: number;
}

export interface TomorrowCurrentConditions {
  temperature: number; // °C
  temperatureApparent?: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection?: number; // degrees
  windGust?: number; // km/h
  precipitationIntensity: number; // mm/hr
  rainIntensity?: number; // mm/hr
  precipitationProbability: number; // %
  precipitationType: TomorrowPrecipitationType;
  weatherCode?: number;
  cloudCover?: number;
}

export interface TomorrowNext24hSummary {
  precipitationTotalMm: number;
  precipitationProbabilityMax: number;
  maxWindSpeedKmH: number;
  precipitationType: TomorrowPrecipitationType;
}

export interface TomorrowApiResponse {
  success: boolean;
  is_live: boolean;
  is_demo: boolean;
  api_status: TomorrowApiStatus;
  model_name: string; // "Tomorrow.io Proprietary Model"
  location: {
    latitude: number;
    longitude: number;
    districtName?: string;
  };
  current: TomorrowCurrentConditions;
  next24h: TomorrowNext24hSummary;
  hourly: TomorrowHourlyPoint[]; // Next 24 hours
  daily: TomorrowDailySummary[]; // Next 5 days
  metadata: DataSourceMeta;
  error?: string;
  errorClass?: string | null;
  rateLimitRemaining?: number;
  latencyMs?: number;
  lastSuccessfulFetch?: string | null;
}

export interface TomorrowHealthMetadata {
  provider: "Tomorrow.io";
  status: TomorrowApiStatus;
  last_successful_fetch: string | null;
  latency: number;
  freshness: string;
  error_class: string | null;
}
