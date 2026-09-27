import { DataSourceMeta } from "./index";

export type FirmsConfidenceLevel = "high" | "nominal" | "low";

export interface FirmsFireFeature {
  id: string;
  latitude: number;
  longitude: number;
  brightness_ti4?: number;
  brightness_ti5?: number;
  frp?: number; // Fire Radiative Power (MW)
  confidence: FirmsConfidenceLevel | string;
  acq_date: string; // YYYY-MM-DD
  acq_time: string; // HHMM in UTC
  satellite?: string;
  instrument?: string; // VIIRS
  daynight?: "D" | "N" | string;
  distanceKm: number;
  detectedAtIso: string;
}

export interface FirmsHazardResponse {
  success: boolean;
  fire_count: number;
  high_confidence_fires: number;
  fires_within_20km_count: number;
  has_fires_near_district: boolean;
  nearest_fire_km: number | null;
  fire_locations: FirmsFireFeature[];
  district: {
    name: string;
    latitude: number;
    longitude: number;
  };
  metadata: DataSourceMeta;
  error?: string;
}
