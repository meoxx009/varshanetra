/**
 * VarshaNetra - Weather Provider Adapter Pattern Domain Types (VN-TASK-8.2 / 8.3)
 */

export type WeatherCondition =
  | "clear"
  | "mostly_clear"
  | "partly_cloudy"
  | "mostly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "severe_storm"
  | "snow"
  | "sleet"
  | "windy";

export interface NormalizedCurrentWeather {
  temperature: number; // °C
  temperatureApparent?: number; // °C (Feels Like)
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection?: number; // degrees
  precipitationIntensity: number; // mm/hr (directly mapped)
  rainIntensity?: number; // mm/hr
  precipitationProbability: number; // %
  precipitationType: string; // 'Rain' | 'Snow' | 'Freezing Rain' | 'Sleet' | 'None'
  condition: WeatherCondition;
  weatherCode: number;
  visibilityKm?: number;
  cloudCover?: number; // %
  pressureSurfaceLevelHpa?: number; // hPa
  airQualityIndex?: number;
  timestamp: string; // ISO
}

export interface NormalizedForecastPoint {
  time: string; // ISO
  temperature: number; // °C
  temperatureApparent?: number; // °C (Feels Like)
  humidity?: number; // %
  precipitationIntensity: number; // mm/hr
  rainIntensity?: number; // mm/hr
  precipitationProbability: number; // %
  precipitationType?: string;
  condition: WeatherCondition;
  windSpeed: number; // km/h
  windDirection?: number; // degrees
  weatherCode?: number;
}

export interface WeatherProviderMeta {
  id: string; // e.g. 'tomorrowio' | 'openmeteo'
  name: string; // e.g. 'Tomorrow.io Hyper-Local'
  resolution_km: number; // 1km for Tomorrow.io, 11km for Open-Meteo
  latency_sec: number; // 60s
  type: "NOWCAST" | "FORECAST" | "HYBRID";
  isOfficial: boolean; // false
  rateLimitRemaining?: number;
  isDegraded?: boolean;
}

export interface WeatherProviderResult<T = NormalizedCurrentWeather> {
  success: boolean;
  data?: T;
  forecast?: NormalizedForecastPoint[];
  meta: WeatherProviderMeta;
  error?: string;
  errorCode?:
    | "INVALID_KEY"
    | "RATE_LIMITED"
    | "NETWORK_TIMEOUT"
    | "PROVIDER_ERROR"
    | "NOT_CONFIGURED"
    | "AUTHENTICATION_ERROR"
    | "PERMISSION_ERROR"
    | "TIMEOUT"
    | "UNAVAILABLE";
  raw?: unknown;
}

export interface WeatherProvider {
  id: string;
  name: string;
  meta: WeatherProviderMeta;
  getRealtimeWeather(lat: number, lon: number): Promise<WeatherProviderResult<NormalizedCurrentWeather>>;
  getNowcast(lat: number, lon: number): Promise<WeatherProviderResult<NormalizedForecastPoint[]>>;
  getForecast(lat: number, lon: number, days?: number): Promise<WeatherProviderResult<NormalizedForecastPoint[]>>;
  isRateLimited(): boolean;
  getRateLimitRemaining(): number;
}

export interface AppWeatherProviderConfig {
  primary: "openmeteo" | "imd";
  nowcast: "tomorrowio" | "openmeteo" | "none";
  fallback: string[];
  rate_limit?: {
    daily_quota: number;
    calls_today: number;
    remaining: number;
    last_checked_at?: string;
  };
}

export interface FusionWeights {
  source_contribution: Record<string, number>;
  lead_time_hours: number;
  primary_source: string;
}
