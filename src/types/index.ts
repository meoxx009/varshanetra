/**
 * VarshaNetra Domain Model Types
 * Enforces strict TypeScript across the disaster command architecture.
 */

export type SeverityLevel = "NORMAL" | "ADVISORY" | "ALERT" | "CRITICAL";

export type DistrictPersona =
  | "DM_COLLECTOR"
  | "DDMA"
  | "EOC"
  | "SDM_TEHSILDAR"
  | "MUNICIPAL_CONTROL"
  | "SDRF_NDRF"
  | "POLICE_FIRE"
  | "PWD"
  | "HEALTH_DEPT"
  | "IRRIGATION_DEPT";

export interface PersonaMetadata {
  id: DistrictPersona;
  title: string;
  department: string;
  jurisdiction: "District-Wide" | "Sub-Division" | "Municipal" | "Tactical" | "Line Department";
  description: string;
}

export type DataOrigin =
  | "LIVE_API"
  | "ESTIMATED"
  | "SIMULATED"
  | "DEMO_SANDBOX";

export interface DataSourceMeta {
  provider: string;
  lastUpdated: string;
  origin: DataOrigin;
  attributionNotice: string;
  url?: string;
  rateLimitRemaining?: number;
  resolution?: string;
}

export interface EarlyWarningAlert {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: "HEAVY_RAINFALL" | "INUNDATION" | "RIVER_BREACH" | "URBAN_WATERLOGGING" | "LANDSLIDE_RISK";
  targetAreas: string[];
  issuedAt: string;
  validUntil: string;
  instructions: string[];
  issuedBy: string;
  isSimulated: boolean;
}

export interface WeatherDataPoint {
  time: string;
  precipitationMm: number;
  precipitationProbability: number;
  temperatureCelsius: number;
  windSpeedKmh: number;
  soilMoistureIndex?: number;
}

export interface DistrictWeatherSummary {
  districtName: string;
  latitude: number;
  longitude: number;
  currentPrecipitationMm: number;
  past24hRainfallMm: number;
  forecast24hRainfallMm: number;
  hourlyForecast: WeatherDataPoint[];
  metadata: DataSourceMeta;
}

export interface GeocodeLocation {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
  metadata: DataSourceMeta;
}

export interface CriticalFacility {
  id: string;
  name: string;
  category: "HOSPITAL" | "RELIEF_SHELTER" | "FIRE_STATION" | "POLICE_STATION" | "BRIDGE";
  latitude: number;
  longitude: number;
  contactNumber?: string;
  capacity?: number;
  isOperational: boolean;
  metadata: DataSourceMeta;
}

export interface UserProfile {
  id: string;
  full_name: string;
  government_id: string;
  phone?: string | null;
  role: string;
  designation?: string | null;
  department?: string | null;
  state?: string | null;
  district?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CanonicalCityLocation {
  id?: string;
  cityId?: string;
  districtId?: string;
  name_en?: string;
  name_hi?: string;
  displayNameEn?: string;
  displayNameHi?: string;
  state?: string;
  stateHi?: string;
  district?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  active?: boolean;
}

export interface DistrictLocation {
  id?: string;
  cityId?: string;
  districtId?: string;
  name_en?: string;
  name_hi?: string;
  displayName: string;
  shortName: string;
  displayNameEn?: string;
  displayNameHi?: string;
  latitude: number;
  longitude: number;
  type: string;
  state?: string;
  stateHi?: string;
  district?: string;
  timezone?: string;
  active?: boolean;
}

export interface AuthResponseResult {
  success: boolean;
  error?: string;
  profile?: UserProfile;
}

export * from "./weather";
export * from "./map";
export * from "./flood";export * from "./terrain";

export * from "./alerts";

export * from "./incidents";

export * from "./response-teams";

export * from "./resources";

export * from "./field-reports";
export * from "./notifications";
export * from "./situation-intelligence";
export * from "./audit-logs";
export * from "./replay";
export * from "./river-gauges";
export * from "./sms";
export * from "./weather-ensemble";
export * from "./nasa-gpm";
export * from "./mosdac";
export * from "./radar";
export * from "./copernicus";
export * from "./tomorrow";
export * from "./earthquake";
export * from "./firms";
