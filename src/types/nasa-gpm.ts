/**
 * VarshaNetra - LIVE-002: NASA GPM IMERG Satellite Rainfall Types
 *
 * NASA Global Precipitation Measurement (GPM) Integrated Multi-satellitE
 * Retrievals for GPM (IMERG) Late Run Product.
 */

export interface GpmRainfallPoint {
  lat: number;
  lon: number;
  value: number; // rainfall in mm
  cellId?: string;
  category?: "LIGHT" | "MODERATE" | "HEAVY" | "VERY_HEAVY";
}

export type GpmAgreementLevel = "HIGH_AGREEMENT" | "SIGNIFICANT_DIFFERENCE";

export interface GpmModelComparison {
  nwpForecastMm: number;
  satelliteObservedMm: number;
  absoluteDifferenceMm: number;
  differencePercent: number;
  isSignificantDifference: boolean; // > 20%
  agreementLevel: GpmAgreementLevel;
  recommendationEn: string;
  recommendationHi: string;
}

export interface SatelliteRainfallResponse {
  status: "live" | "demo" | "cached" | "stale";
  isConfigured: boolean;
  message: string;
  district: string;
  total_rainfall_mm: number; // area average
  max_rainfall_mm: number; // maximum in grid
  rainfall_spatial_distribution: GpmRainfallPoint[];
  startDate: string;
  endDate: string;
  latencyHours: number; // typically 4-6 hours for Late Run
  lastUpdated: string;
  source: "NASA_GPM_IMERG";
  product: string;
  comparison?: GpmModelComparison;
  sample_data?: {
    total_rainfall_mm: number;
    max_rainfall_mm: number;
    rainfall_spatial_distribution: GpmRainfallPoint[];
  };
}
