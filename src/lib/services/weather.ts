import {
  DistrictWeatherSummary,
  DataSourceMeta,
  CurrentWeatherReport,
  HourlyForecastPoint,
  PrecipitationAccumulations,
  DailyForecastSummary,
  WeatherForecastData,
  getWmoWeatherInfo,
  getWindDirectionCompass,
} from "@/types";
import { recordSuccessfulFetch } from "@/lib/services/data-sources";

const DEFAULT_BASE_URL = "https://api.open-meteo.com/v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
const FETCH_TIMEOUT_MS = 8000; // 8 seconds timeout

export interface WeatherFetchOptions {
  latitude: number;
  longitude: number;
  districtName?: string;
  bypassCache?: boolean;
}

export interface WeatherForecastOptions extends WeatherFetchOptions {
  days?: number;
}

export interface WeatherServiceResult<T = DistrictWeatherSummary> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  metadata?: DataSourceMeta;
}

// In-memory server cache for current weather and forecast responses
const currentCache = new Map<string, { data: CurrentWeatherReport; timestamp: number }>();
const forecastCache = new Map<string, { data: WeatherForecastData; timestamp: number }>();

/**
 * Validates latitude and longitude values within standard Earth geocoordinates.
 */
export function validateCoordinates(
  latitude: unknown,
  longitude: unknown
): { valid: boolean; lat: number; lon: number; error?: string } {
  const lat = typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
  const lon = typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return {
      valid: false,
      lat: 0,
      lon: 0,
      error: "Latitude and longitude must be valid numerical coordinates.",
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      lat,
      lon,
      error: `Latitude (${lat}) is out of bounds. Must be between -90 and +90 degrees.`,
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      valid: false,
      lat,
      lon,
      error: `Longitude (${lon}) is out of bounds. Must be between -180 and +180 degrees.`,
    };
  }

  return { valid: true, lat, lon };
}

/**
 * Generates an in-memory cache key quantized to 0.01 degree resolution (~1.1 km).
 */
function getQuantizedKey(lat: number, lon: number, suffix = ""): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}${suffix ? `:${suffix}` : ""}`;
}

/**
 * Standard Open-Meteo metadata generator complying with CC BY 4.0 license attribution.
 */
function createOpenMeteoMetadata(lastUpdated?: string): DataSourceMeta {
  return {
    provider: "Open-Meteo (ECMWF & GFS Seamless Multi-Model)",
    lastUpdated: lastUpdated || new Date().toISOString(),
    origin: "LIVE_API",
    attributionNotice: "Weather forecast provided by Open-Meteo.com under CC BY 4.0 license.",
    url: "https://open-meteo.com/",
  };
}

/**
 * Fetches real-time current weather conditions from Open-Meteo.
 */
export async function fetchCurrentWeather({
  latitude,
  longitude,
  bypassCache = false,
}: WeatherFetchOptions): Promise<WeatherServiceResult<CurrentWeatherReport>> {
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const { lat, lon } = coordCheck;
  const cacheKey = getQuantizedKey(lat, lon, "current");

  if (!bypassCache) {
    const cached = currentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        metadata: createOpenMeteoMetadata(new Date(cached.timestamp).toISOString()),
      };
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_OPEN_METEO_BASE_URL || DEFAULT_BASE_URL;
  const currentParams = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "rain",
    "wind_speed_10m",
    "wind_direction_10m",
    "weather_code",
  ].join(",");

  const endpoint = `${baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=${currentParams}&timezone=auto`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // 5-minute Next.js fetch revalidation
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Open-Meteo current weather API error: HTTP ${res.status} ${res.statusText}`,
      };
    }

    const payload = await res.json();
    const cur = payload.current;

    if (!cur || typeof cur.temperature_2m === "undefined") {
      return {
        success: false,
        error: "Malformed current weather payload received from Open-Meteo.",
      };
    }

    const weatherCode = Number(cur.weather_code ?? 0);
    const windDirection = Number(cur.wind_direction_10m ?? 0);
    const wmoInfo = getWmoWeatherInfo(weatherCode);

    const report: CurrentWeatherReport = {
      time: String(cur.time),
      temperature: Number(cur.temperature_2m),
      relativeHumidity: Number(cur.relative_humidity_2m ?? 0),
      precipitation: Number(cur.precipitation ?? 0),
      rain: Number(cur.rain ?? 0),
      windSpeed: Number(cur.wind_speed_10m ?? 0),
      windDirection,
      windDirectionCompass: getWindDirectionCompass(windDirection),
      weatherCode,
      weatherDescription: wmoInfo.description,
    };

    // Store in server cache
    currentCache.set(cacheKey, { data: report, timestamp: Date.now() });
    recordSuccessfulFetch("open-meteo");

    return {
      success: true,
      data: report,
      cached: false,
      metadata: createOpenMeteoMetadata(),
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return {
        success: false,
        error: "Open-Meteo current telemetry request timed out (limit: 8s).",
      };
    }
    const message = err instanceof Error ? err.message : "Network communication error";
    return {
      success: false,
      error: `Failed to fetch current weather: ${message}`,
    };
  }
}

/**
 * Computes future precipitation accumulations (3h, 6h, 12h, 24h) from hourly forecast series.
 */
export function calculatePrecipitationAccumulations(
  hourlyTimes: string[],
  hourlyPrecipitations: number[],
  currentTimeIso?: string
): PrecipitationAccumulations {
  if (!hourlyTimes.length || !hourlyPrecipitations.length) {
    return { next3h: 0, next6h: 0, next12h: 0, next24h: 0 };
  }

  // Find index closest to or starting at the current time
  let startIndex = 0;
  if (currentTimeIso) {
    const currentTarget = new Date(currentTimeIso).getTime();
    const foundIdx = hourlyTimes.findIndex((t) => new Date(t).getTime() >= currentTarget);
    if (foundIdx !== -1) {
      startIndex = foundIdx;
    }
  }

  const sumWindow = (hours: number): number => {
    let sum = 0;
    const end = Math.min(startIndex + hours, hourlyPrecipitations.length);
    for (let i = startIndex; i < end; i++) {
      const val = Number(hourlyPrecipitations[i]);
      if (!isNaN(val)) sum += val;
    }
    return Math.round(sum * 10) / 10;
  };

  return {
    next3h: sumWindow(3),
    next6h: sumWindow(6),
    next12h: sumWindow(12),
    next24h: sumWindow(24),
  };
}

/**
 * Fetches comprehensive hourly and multi-day weather forecast from Open-Meteo.
 */
export async function fetchWeatherForecast({
  latitude,
  longitude,
  districtName,
  days = 7,
  bypassCache = false,
}: WeatherForecastOptions): Promise<WeatherServiceResult<WeatherForecastData>> {
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const { lat, lon } = coordCheck;
  const clampedDays = Math.min(Math.max(Number(days) || 7, 1), 7);
  const cacheKey = getQuantizedKey(lat, lon, `forecast_${clampedDays}d`);

  if (!bypassCache) {
    const cached = forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        metadata: createOpenMeteoMetadata(new Date(cached.timestamp).toISOString()),
      };
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_OPEN_METEO_BASE_URL || DEFAULT_BASE_URL;
  const currentParams = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "rain",
    "wind_speed_10m",
    "wind_direction_10m",
    "weather_code",
  ].join(",");

  const hourlyParams = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "weather_code",
    "cloud_cover",
    "visibility",
    "wind_speed_10m",
    "wind_gusts_10m",
    "cape",
    "lifted_index",
    "convective_inhibition",
    "freezing_level_height",
  ].join(",");

  const dailyParams = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "rain_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "shortwave_radiation_sum",
    "et0_fao_evapotranspiration",
    "weather_code",
  ].join(",");

  const endpoint = `${baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&forecast_days=${clampedDays}&past_days=7&timezone=auto`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
      next: { revalidate: 600 }, // 10-minute Next.js fetch revalidation
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Open-Meteo forecast API error: HTTP ${res.status} ${res.statusText}`,
      };
    }

    const payload = await res.json();
    const cur = payload.current;
    const hourly = payload.hourly;
    const daily = payload.daily;

    if (!cur || !hourly || !Array.isArray(hourly.time)) {
      return {
        success: false,
        error: "Malformed forecast payload received from Open-Meteo.",
      };
    }

    const weatherCode = Number(cur.weather_code ?? 0);
    const windDirection = Number(cur.wind_direction_10m ?? 0);
    const currentReport: CurrentWeatherReport = {
      time: String(cur.time),
      temperature: Number(cur.temperature_2m),
      relativeHumidity: Number(cur.relative_humidity_2m ?? 0),
      precipitation: Number(cur.precipitation ?? 0),
      rain: Number(cur.rain ?? 0),
      windSpeed: Number(cur.wind_speed_10m ?? 0),
      windDirection,
      windDirectionCompass: getWindDirectionCompass(windDirection),
      weatherCode,
      weatherDescription: getWmoWeatherInfo(weatherCode).description,
    };

    const hourlyPoints: HourlyForecastPoint[] = hourly.time.map((timeStr: string, idx: number) => {
      const code = hourly.weather_code ? Number(hourly.weather_code[idx]) : undefined;
      return {
        time: timeStr,
        temperature: Number(hourly.temperature_2m?.[idx] ?? 0),
        relativeHumidity: Number(hourly.relative_humidity_2m?.[idx] ?? 0),
        precipitationProbability: Number(hourly.precipitation_probability?.[idx] ?? 0),
        precipitation: Number(hourly.precipitation?.[idx] ?? 0),
        rain: Number(hourly.rain?.[idx] ?? 0),
        showers: Number(hourly.showers?.[idx] ?? 0),
        snowfall: Number(hourly.snowfall?.[idx] ?? 0),
        windSpeed: Number(hourly.wind_speed_10m?.[idx] ?? 0),
        windGusts: Number(hourly.wind_gusts_10m?.[idx] ?? 0),
        cloudCover: Number(hourly.cloud_cover?.[idx] ?? 0),
        visibility: Number(hourly.visibility?.[idx] ?? 0),
        cape: Number(hourly.cape?.[idx] ?? 0),
        liftedIndex: Number(hourly.lifted_index?.[idx] ?? 0),
        convectiveInhibition: hourly.convective_inhibition ? Number(hourly.convective_inhibition[idx] ?? 0) : undefined,
        freezingLevelHeight: hourly.freezing_level_height ? Number(hourly.freezing_level_height[idx] ?? 0) : undefined,
        weatherCode: code,
        weatherDescription: code !== undefined ? getWmoWeatherInfo(code).description : undefined,
      };
    });

    const precipValues = hourly.precipitation?.map((p: unknown) => Number(p ?? 0)) || [];
    const accumulations = calculatePrecipitationAccumulations(hourly.time, precipValues, cur.time);

    let dailySummaries: DailyForecastSummary[] | undefined;
    let past7DaysPrecipitation: Array<{
      date: string;
      precipitationSum: number;
      rainSum?: number;
      precipitationHours?: number;
      weatherCode?: number;
    }> | undefined;
    let past7DaysTotalMm = 0;

    if (daily && Array.isArray(daily.time)) {
      const todayDateStr = String(cur.time).split("T")[0];
      const pastItems: typeof past7DaysPrecipitation = [];
      const forecastItems: DailyForecastSummary[] = [];

      daily.time.forEach((dateStr: string, idx: number) => {
        const item = {
          date: dateStr,
          maxTemp: Number(daily.temperature_2m_max?.[idx] ?? 0),
          minTemp: Number(daily.temperature_2m_min?.[idx] ?? 0),
          totalPrecipitation: Number(daily.precipitation_sum?.[idx] ?? 0),
          rainSum: Number(daily.rain_sum?.[idx] ?? 0),
          precipitationHours: Number(daily.precipitation_hours?.[idx] ?? 0),
          precipitationProbability: Number(daily.precipitation_probability_max?.[idx] ?? 0),
          maxWindSpeed: Number(daily.wind_speed_10m_max?.[idx] ?? 0),
          maxWindGusts: Number(daily.wind_gusts_10m_max?.[idx] ?? 0),
          shortwaveRadiationSum: daily.shortwave_radiation_sum ? Number(daily.shortwave_radiation_sum[idx] ?? 0) : undefined,
          et0FaoEvapotranspiration: daily.et0_fao_evapotranspiration ? Number(daily.et0_fao_evapotranspiration[idx] ?? 0) : undefined,
          weatherCode: Number(daily.weather_code?.[idx] ?? 0),
        };

        if (dateStr < todayDateStr) {
          pastItems.push({
            date: item.date,
            precipitationSum: item.totalPrecipitation,
            rainSum: item.rainSum,
            precipitationHours: item.precipitationHours,
            weatherCode: item.weatherCode,
          });
          past7DaysTotalMm += item.totalPrecipitation;
        } else {
          forecastItems.push(item);
        }
      });

      past7DaysPrecipitation = pastItems;
      past7DaysTotalMm = Math.round(past7DaysTotalMm * 10) / 10;
      dailySummaries = forecastItems.length > 0 ? forecastItems : daily.time.map((dateStr: string, idx: number) => ({
        date: dateStr,
        maxTemp: Number(daily.temperature_2m_max?.[idx] ?? 0),
        minTemp: Number(daily.temperature_2m_min?.[idx] ?? 0),
        totalPrecipitation: Number(daily.precipitation_sum?.[idx] ?? 0),
        rainSum: Number(daily.rain_sum?.[idx] ?? 0),
        precipitationHours: Number(daily.precipitation_hours?.[idx] ?? 0),
        precipitationProbability: Number(daily.precipitation_probability_max?.[idx] ?? 0),
        maxWindSpeed: Number(daily.wind_speed_10m_max?.[idx] ?? 0),
        maxWindGusts: Number(daily.wind_gusts_10m_max?.[idx] ?? 0),
        shortwaveRadiationSum: daily.shortwave_radiation_sum ? Number(daily.shortwave_radiation_sum[idx] ?? 0) : undefined,
        et0FaoEvapotranspiration: daily.et0_fao_evapotranspiration ? Number(daily.et0_fao_evapotranspiration[idx] ?? 0) : undefined,
        weatherCode: Number(daily.weather_code?.[idx] ?? 0),
      }));
    }

    const forecastData: WeatherForecastData = {
      districtName,
      latitude: lat,
      longitude: lon,
      timezone: payload.timezone || "Asia/Kolkata",
      current: currentReport,
      hourly: hourlyPoints,
      accumulations,
      daily: dailySummaries,
      past7DaysPrecipitation,
      past7DaysTotalMm,
      metadata: createOpenMeteoMetadata(),
    };

    // Cache successful normalized response
    forecastCache.set(cacheKey, { data: forecastData, timestamp: Date.now() });
    recordSuccessfulFetch("open-meteo");

    return {
      success: true,
      data: forecastData,
      cached: false,
      metadata: forecastData.metadata,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return {
        success: false,
        error: "Open-Meteo forecast telemetry request timed out (limit: 8s).",
      };
    }
    const message = err instanceof Error ? err.message : "Network communication error";
    return {
      success: false,
      error: `Failed to fetch forecast telemetry: ${message}`,
    };
  }
}

/**
 * Legacy wrapper to preserve backward compatibility for existing callers.
 */
export async function getDistrictWeatherForecast({
  latitude,
  longitude,
  districtName = "District Headquarters",
}: WeatherFetchOptions): Promise<WeatherServiceResult<DistrictWeatherSummary>> {
  const result = await fetchWeatherForecast({ latitude, longitude, districtName, days: 3 });
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || "Unable to load district weather forecast",
    };
  }

  const { current, hourly, accumulations, metadata } = result.data;
  const hourlyLegacy = hourly.slice(0, 24).map((pt) => ({
    time: pt.time,
    precipitationMm: pt.precipitation,
    precipitationProbability: pt.precipitationProbability,
    temperatureCelsius: pt.temperature,
    windSpeedKmh: pt.windSpeed,
  }));

  return {
    success: true,
    data: {
      districtName,
      latitude,
      longitude,
      currentPrecipitationMm: current.precipitation,
      past24hRainfallMm: 0,
      forecast24hRainfallMm: accumulations.next24h,
      hourlyForecast: hourlyLegacy,
      metadata,
    },
    metadata,
  };
}
