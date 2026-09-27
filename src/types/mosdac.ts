/**
 * VarshaNetra - LIVE-003: ISRO MOSDAC (INSAT-3D) Satellite Types
 * Meteorological & Oceanographic Satellite Data Archival Centre (MOSDAC) - ISRO
 */

import { DataSourceMeta } from "./index";

export type MosdacStormIntensity = "SEVERE" | "MODERATE" | "WEAK";

export interface MosdacRainfallResponse {
  status: "live" | "demo" | "cached" | "stale";
  isConfigured: boolean;
  message: string;
  district: string;
  rainfall_rate_mmhr: number; // Current rainfall rate from INSAT-3D in mm/hr
  three_hour_accum: number; // Hydroestimator 3-hour accumulation in mm
  six_hour_accum: number; // Hydroestimator 6-hour accumulation in mm
  cloud_top_temperature: number; // Kelvin (<220K = deep convection / flash flood risk)
  outgoing_longwave_radiation: number; // OLR in W/m^2 (<200 = deep convection)
  satellite_name: "INSAT-3D" | "INSAT-3DR";
  sensor: string;
  product: string;
  storm_intensity: MosdacStormIntensity;
  storm_intensity_reason: {
    en: string;
    hi: string;
  };
  fetched_at: string;
  sourceMeta: DataSourceMeta;
  sample_data?: {
    rainfall_rate_mmhr: number;
    three_hour_accum: number;
    six_hour_accum: number;
    cloud_top_temperature: number;
  };
}

export interface MosdacCacheRow {
  id?: string;
  fetched_at: string;
  district: string;
  rainfall_rate_mmhr: number;
  three_hour_accum: number;
  six_hour_accum: number;
  cloud_temp_kelvin: number;
  raw_data?: Record<string, unknown>;
}
