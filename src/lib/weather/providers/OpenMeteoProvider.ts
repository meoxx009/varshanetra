/**
 * VarshaNetra - OpenMeteo Weather Provider (Adapter)
 * Implements WeatherProvider interface for Open-Meteo ECMWF/GFS seamless multi-model data.
 */

import {
  WeatherProvider,
  WeatherProviderMeta,
  WeatherProviderResult,
  NormalizedCurrentWeather,
  NormalizedForecastPoint,
  WeatherCondition,
} from "@/lib/weather/types";
import { fetchCurrentWeather, fetchWeatherForecast } from "@/lib/services/weather";

function mapWmoToCondition(code: number): WeatherCondition {
  switch (code) {
    case 0:
      return "clear";
    case 1:
      return "mostly_clear";
    case 2:
      return "partly_cloudy";
    case 3:
      return "cloudy";
    case 45:
    case 48:
      return "fog";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 61:
    case 63:
      return "rain";
    case 65:
      return "heavy_rain";
    case 80:
    case 81:
    case 82:
      return "rain";
    case 95:
      return "thunderstorm";
    case 96:
    case 99:
      return "severe_storm";
    case 71:
    case 73:
    case 75:
      return "snow";
    default:
      return "cloudy";
  }
}

export class OpenMeteoProvider implements WeatherProvider {
  public readonly id = "openmeteo";
  public readonly name = "Open-Meteo Multi-Model";
  public readonly meta: WeatherProviderMeta = {
    id: "openmeteo",
    name: "Open-Meteo Seamless Forecast",
    resolution_km: 11,
    latency_sec: 180,
    type: "FORECAST",
    isOfficial: false,
    rateLimitRemaining: 10000,
    isDegraded: false,
  };

  public isRateLimited(): boolean {
    return false;
  }

  public getRateLimitRemaining(): number {
    return 10000;
  }

  public async getRealtimeWeather(
    lat: number,
    lon: number
  ): Promise<WeatherProviderResult<NormalizedCurrentWeather>> {
    try {
      const res = await fetchCurrentWeather({ latitude: lat, longitude: lon });
      if (!res.success || !res.data) {
        return {
          success: false,
          meta: this.meta,
          error: res.error || "Failed to fetch current weather from Open-Meteo",
          errorCode: "PROVIDER_ERROR",
        };
      }

      const d = res.data;
      const normalized: NormalizedCurrentWeather = {
        temperature: d.temperature,
        humidity: d.relativeHumidity,
        windSpeed: d.windSpeed,
        windDirection: d.windDirection,
        precipitationIntensity: d.precipitation,
        precipitationProbability: 0,
        precipitationType: d.precipitation > 0 ? "Rain" : "None",
        condition: mapWmoToCondition(d.weatherCode),
        weatherCode: d.weatherCode,
        timestamp: d.time || new Date().toISOString(),
      };

      return {
        success: true,
        data: normalized,
        meta: this.meta,
      };
    } catch (err: unknown) {
      return {
        success: false,
        meta: this.meta,
        error: err instanceof Error ? err.message : "Open-Meteo fetch failed",
        errorCode: "PROVIDER_ERROR",
      };
    }
  }

  public async getNowcast(
    lat: number,
    lon: number
  ): Promise<WeatherProviderResult<NormalizedForecastPoint[]>> {
    try {
      const res = await fetchWeatherForecast({ latitude: lat, longitude: lon, days: 1 });
      if (!res.success || !res.data) {
        return {
          success: false,
          meta: this.meta,
          error: res.error || "Failed to fetch nowcast from Open-Meteo",
          errorCode: "PROVIDER_ERROR",
        };
      }

      const points: NormalizedForecastPoint[] = (res.data.hourly || [])
        .slice(0, 6)
        .map((h) => ({
          time: h.time,
          temperature: h.temperature,
          humidity: h.relativeHumidity,
          precipitationIntensity: h.precipitation,
          precipitationProbability: h.precipitationProbability || 0,
          condition: mapWmoToCondition(h.weatherCode || 0),
          windSpeed: h.windSpeed,
          weatherCode: h.weatherCode,
        }));

      return {
        success: true,
        data: undefined,
        forecast: points,
        meta: {
          ...this.meta,
          type: "NOWCAST",
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        meta: this.meta,
        error: err instanceof Error ? err.message : "Open-Meteo nowcast failed",
        errorCode: "PROVIDER_ERROR",
      };
    }
  }

  public async getForecast(
    lat: number,
    lon: number,
    days = 3
  ): Promise<WeatherProviderResult<NormalizedForecastPoint[]>> {
    try {
      const res = await fetchWeatherForecast({ latitude: lat, longitude: lon, days });
      if (!res.success || !res.data) {
        return {
          success: false,
          meta: this.meta,
          error: res.error || "Failed to fetch forecast from Open-Meteo",
          errorCode: "PROVIDER_ERROR",
        };
      }

      const points: NormalizedForecastPoint[] = (res.data.hourly || []).map((h) => ({
        time: h.time,
        temperature: h.temperature,
        humidity: h.relativeHumidity,
        precipitationIntensity: h.precipitation,
        precipitationProbability: h.precipitationProbability || 0,
        condition: mapWmoToCondition(h.weatherCode || 0),
        windSpeed: h.windSpeed,
        weatherCode: h.weatherCode,
      }));

      return {
        success: true,
        data: undefined,
        forecast: points,
        meta: this.meta,
      };
    } catch (err: unknown) {
      return {
        success: false,
        meta: this.meta,
        error: err instanceof Error ? err.message : "Open-Meteo forecast failed",
        errorCode: "PROVIDER_ERROR",
      };
    }
  }
}
