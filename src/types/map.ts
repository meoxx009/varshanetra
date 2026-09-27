import { DataSourceMeta, SeverityLevel } from "./index";

export type ActiveMapLayerId =
  | "basemap"
  | "floodRisk"
  | "hospitals"
  | "clinics"
  | "police"
  | "fire"
  | "schools"
  | "rivers"
  | "fieldReports"
  | "incidents"
  | "responseTeams"
  | "shelters"
  | "riverGauges"
  | "floodSusceptibility"
  | "nasaGpmRainfall"
  | "radar"
  | "copernicusWms"
  | "earthquakes"
  | "firmsFire";

export type FutureMapLayerId =
  | "rainfallOverlay"
  | "inundationExtent"
  | "responseTeams";


export type FacilityCategory =
  | "HOSPITAL"
  | "CLINIC"
  | "POLICE"
  | "FIRE_STATION"
  | "SCHOOL"
  | "RIVER"
  | "FIELD_REPORT"
  | "INCIDENT"
  | "RESPONSE_TEAM"
  | "SHELTER"
  | "RIVER_GAUGE";

export type SupportedOsmType =
  | "hospital"
  | "clinic"
  | "police"
  | "fire_station"
  | "school"
  | "river"
  | "stream";

export interface MapFeatureItem {
  id: string;
  name: string;
  category: FacilityCategory;
  latitude: number;
  longitude: number;
  address?: string;
  contactNumber?: string;
  status?: string;
  severity?: SeverityLevel;
  details?: string;
  reportedAt?: string;
  // OSM-specific attributes for VARSHANETRA-06
  osmType?: "node" | "way" | "relation";
  osmId?: number;
  osmUrl?: string;
  geometry?: [number, number][]; // Line coordinates [lat, lon][] for rivers & linear waterways
  tags?: Record<string, string>;
  operator?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  metadata: DataSourceMeta;
}

export interface MapInspectorData {
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  nearestFacility?: MapFeatureItem;
  elevationMeters?: number;
  slopePercent?: number;
  terrainClassification?: string;
  isWithinPilotTerrain?: boolean;
}

export interface FacilitiesGroupedResponse {
  hospitals: MapFeatureItem[];
  clinics: MapFeatureItem[];
  police: MapFeatureItem[];
  fire: MapFeatureItem[];
  schools: MapFeatureItem[];
  rivers: MapFeatureItem[];
  fieldReports: MapFeatureItem[];
  incidents: MapFeatureItem[];
  responseTeams?: MapFeatureItem[];
  shelters?: MapFeatureItem[];
  totalCount: number;
  cached?: boolean;
  metadata: DataSourceMeta;
}

export interface InfrastructureApiResponse {
  success: boolean;
  data?: MapFeatureItem[];
  byCategory?: Partial<Record<FacilityCategory, MapFeatureItem[]>>;
  queryMeta?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    types: SupportedOsmType[];
    totalCount: number;
  };
  metadata?: DataSourceMeta;
  cached?: boolean;
  error?: string;
}
