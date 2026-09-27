import { DataSourceMeta, SeverityLevel } from "./index";

export interface CurrentWeatherReport {
  time: string;
  temperature: number; // °C
  relativeHumidity: number; // %
  precipitation: number; // mm
  rain: number; // mm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windDirectionCompass: string; // e.g. "WSW"
  weatherCode: number;
  weatherDescription: string;
}

export interface HourlyForecastPoint {
  time: string;
  temperature: number; // °C
  relativeHumidity: number; // %
  precipitationProbability: number; // %
  precipitation: number; // mm
  rain: number; // mm
  showers?: number; // mm
  snowfall?: number; // cm
  windSpeed: number; // km/h
  windGusts?: number; // km/h (wind_gusts_10m)
  cloudCover?: number; // % (cloud_cover)
  visibility?: number; // meters (visibility)
  cape?: number; // J/kg (convective available potential energy)
  liftedIndex?: number; // K (atmospheric instability index)
  convectiveInhibition?: number; // J/kg (CIN - convective inhibition)
  freezingLevelHeight?: number; // meters (freezing_level_height)
  weatherCode?: number;
  weatherDescription?: string;
}

export interface PrecipitationAccumulations {
  next3h: number;
  next6h: number;
  next12h: number;
  next24h: number;
}

export interface DailyForecastSummary {
  date: string;
  maxTemp: number;
  minTemp: number;
  totalPrecipitation: number;
  rainSum?: number; // mm (rain_sum)
  precipitationHours?: number; // hours
  precipitationProbability: number;
  maxWindSpeed: number;
  maxWindGusts?: number; // km/h (wind_gusts_10m_max)
  shortwaveRadiationSum?: number; // MJ/m²
  et0FaoEvapotranspiration?: number; // mm (reference evapotranspiration)
  weatherCode?: number;
}

export interface Past7DaysRainfallPoint {
  date: string;
  precipitationSum: number;
  rainSum?: number;
  precipitationHours?: number;
  weatherCode?: number;
}

export interface WeatherForecastData {
  districtName?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeatherReport;
  hourly: HourlyForecastPoint[];
  accumulations: PrecipitationAccumulations;
  daily?: DailyForecastSummary[];
  past7DaysPrecipitation?: Past7DaysRainfallPoint[];
  past7DaysTotalMm?: number;
  metadata: DataSourceMeta;
}

export interface ImdManualEntry {
  id: string;
  created_at: string;
  entry_datetime: string;
  district_rainfall_today: number;
  district_rainfall_yesterday: number;
  district_rainfall_week: number;
  normal_rainfall: number;
  imd_color_code: "Green" | "Yellow" | "Orange" | "Red";
  forecast_narrative: string;
  data_source: string;
  entered_by: string;
  district?: string;
}

export interface HistoricalPrecipitationPoint {
  time: string;
  precipitation: number; // mm
  rain: number; // mm
  temperature?: number; // °C
  relativeHumidity?: number; // %
}

export type SoilMoistureCategory = "DRY" | "MODERATE" | "SATURATED" | "CRITICAL_SATURATION";

export interface AntecedentRainfallSummary {
  precip24h: number; // Total mm in prior 24 hours
  precip48h: number; // Total mm in prior 48 hours
  precip72h: number; // Total mm in prior 72 hours
  soilMoistureIndex: SoilMoistureCategory;
  soilMoistureDescription: string;
  runoffRiskMultiplier: number; // Hydrological factor 1.0 (baseline) to 2.5 (super-saturated)
  hourlyHistory: HistoricalPrecipitationPoint[];
}

export interface HistoricalWeatherResponse {
  districtName?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  startDate: string;
  endDate: string;
  antecedent: AntecedentRainfallSummary;
  dailyPrecipitation: { date: string; totalMm: number }[];
  metadata: DataSourceMeta;
}

export interface WeatherApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  metadata?: DataSourceMeta;
}

/**
 * Maps WMO Weather Interpretation Codes (WW) to human-readable weather descriptions,
 * emergency severity levels, and UI icon hints.
 * Reference: World Meteorological Organization (WMO) Code Table 4677.
 */
export function getWmoWeatherInfo(code: number): {
  description: string;
  severity: SeverityLevel;
  iconName: "Sun" | "CloudSun" | "Cloud" | "CloudFog" | "CloudDrizzle" | "CloudRain" | "CloudSnow" | "CloudLightning";
} {
  switch (code) {
    case 0:
      return { description: "Clear Sky", severity: "NORMAL", iconName: "Sun" };
    case 1:
      return { description: "Mainly Clear", severity: "NORMAL", iconName: "CloudSun" };
    case 2:
      return { description: "Partly Cloudy", severity: "NORMAL", iconName: "CloudSun" };
    case 3:
      return { description: "Overcast", severity: "NORMAL", iconName: "Cloud" };
    case 45:
    case 48:
      return { description: "Fog & Depositing Rime Fog", severity: "ADVISORY", iconName: "CloudFog" };
    case 51:
      return { description: "Light Drizzle", severity: "NORMAL", iconName: "CloudDrizzle" };
    case 53:
      return { description: "Moderate Drizzle", severity: "ADVISORY", iconName: "CloudDrizzle" };
    case 55:
      return { description: "Dense Drizzle", severity: "ADVISORY", iconName: "CloudDrizzle" };
    case 56:
    case 57:
      return { description: "Freezing Drizzle", severity: "ADVISORY", iconName: "CloudDrizzle" };
    case 61:
      return { description: "Slight Rain", severity: "NORMAL", iconName: "CloudRain" };
    case 63:
      return { description: "Moderate Rain", severity: "ADVISORY", iconName: "CloudRain" };
    case 65:
      return { description: "Heavy Continuous Rain", severity: "ALERT", iconName: "CloudRain" };
    case 66:
    case 67:
      return { description: "Freezing Rain", severity: "ALERT", iconName: "CloudRain" };
    case 71:
    case 73:
    case 75:
      return { description: "Snowfall", severity: "ADVISORY", iconName: "CloudSnow" };
    case 77:
      return { description: "Snow Grains", severity: "ADVISORY", iconName: "CloudSnow" };
    case 80:
      return { description: "Slight Rain Showers", severity: "NORMAL", iconName: "CloudRain" };
    case 81:
      return { description: "Moderate Rain Showers", severity: "ADVISORY", iconName: "CloudRain" };
    case 82:
      return { description: "Violent Rain Showers", severity: "CRITICAL", iconName: "CloudRain" };
    case 85:
    case 86:
      return { description: "Snow Showers", severity: "ADVISORY", iconName: "CloudSnow" };
    case 95:
      return { description: "Thunderstorm", severity: "ALERT", iconName: "CloudLightning" };
    case 96:
    case 99:
      return { description: "Severe Thunderstorm with Hail", severity: "CRITICAL", iconName: "CloudLightning" };
    default:
      return { description: "Atmospheric Telemetry Active", severity: "NORMAL", iconName: "Cloud" };
  }
}

/**
 * Converts wind direction in degrees (0°-360°) to 16-point cardinal compass string.
 */
export function getWindDirectionCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Classifies 24-hour rainfall according to official India Meteorological Department (IMD) standard thresholds.
 */
export function getImdRainfallCategory(mmIn24h: number): {
  category: string;
  severity: SeverityLevel;
  badgeClass: string;
} {
  if (mmIn24h <= 0.0) {
    return { category: "No Rain (0.0 mm)", severity: "NORMAL", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" };
  }
  if (mmIn24h <= 2.4) {
    return { category: "Very Light Rain (<2.5 mm)", severity: "NORMAL", badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300" };
  }
  if (mmIn24h <= 15.5) {
    return { category: "Light Rain (2.5 - 15.5 mm)", severity: "NORMAL", badgeClass: "bg-blue-50 text-blue-800 border-blue-300" };
  }
  if (mmIn24h <= 64.4) {
    return { category: "Moderate Rain (15.6 - 64.4 mm)", severity: "ADVISORY", badgeClass: "bg-amber-50 text-amber-800 border-amber-300" };
  }
  if (mmIn24h <= 115.5) {
    return { category: "Heavy Rain (64.5 - 115.5 mm)", severity: "ALERT", badgeClass: "bg-orange-50 text-orange-800 border-orange-300" };
  }
  if (mmIn24h <= 204.4) {
    return { category: "Very Heavy Rain (115.6 - 204.4 mm)", severity: "CRITICAL", badgeClass: "bg-red-50 text-red-800 border-red-300" };
  }
  return { category: "Extremely Heavy Rain (>204.4 mm)", severity: "CRITICAL", badgeClass: "bg-purple-50 text-purple-900 border-purple-400" };
}

/**
 * Interprets WMO weather codes from Open-Meteo with English text, Hindi translation, and emoji.
 * Mapping requirement (SOURCES-002 PART 2):
 * - 0: Clear sky (☀️)
 * - 1-3: Mainly clear to overcast (⛅)
 * - 45-48: Fog (🌫️)
 * - 51-67: Drizzle and rain (🌧️)
 * - 71-77: Snow (❄️)
 * - 80-82: Rain showers (🌦️)
 * - 85-86: Snow showers (🌨️)
 * - 95: Thunderstorm (⛈️)
 * - 96-99: Thunderstorm with hail (⛈️🧊)
 */
export function weatherCodeToDescription(code: number): {
  textEn: string;
  textHi: string;
  emoji: string;
} {
  if (code === 0) {
    return { textEn: "Clear sky", textHi: "साफ़ आसमान", emoji: "☀️" };
  }
  if (code >= 1 && code <= 3) {
    return { textEn: "Mainly clear to overcast", textHi: "आंशिक रूप से बादल छाए रहेंगे", emoji: "⛅" };
  }
  if (code >= 45 && code <= 48) {
    return { textEn: "Fog", textHi: "कोहरा", emoji: "🌫️" };
  }
  if (code >= 51 && code <= 67) {
    return { textEn: "Drizzle and rain", textHi: "बूंदाबांदी और बारिश", emoji: "🌧️" };
  }
  if (code >= 71 && code <= 77) {
    return { textEn: "Snow", textHi: "बर्फबारी", emoji: "❄️" };
  }
  if (code >= 80 && code <= 82) {
    return { textEn: "Rain showers", textHi: "वर्षा की फुहारें", emoji: "🌦️" };
  }
  if (code >= 85 && code <= 86) {
    return { textEn: "Snow showers", textHi: "हिमपात", emoji: "🌨️" };
  }
  if (code === 95) {
    return { textEn: "Thunderstorm", textHi: "गरज के साथ तूफान", emoji: "⛈️" };
  }
  if (code >= 96 && code <= 99) {
    return { textEn: "Thunderstorm with hail", textHi: "ओलावृष्टि के साथ तूफान", emoji: "⛈️🧊" };
  }
  return { textEn: "Overcast / Cloudy", textHi: "बादल छाए रहेंगे", emoji: "☁️" };
}
