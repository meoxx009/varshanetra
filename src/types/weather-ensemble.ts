/**
 * VarshaNetra - LIVE-001: Multi-Model NWP Weather Ensemble Domain Types
 * Strict TypeScript types for ECMWF IFS, GFS, and ICON multi-model integration.
 */

import { DataSourceMeta } from "./index";

export type ModelAgreementLevel = "HIGH" | "MODERATE" | "LOW";

export interface ModelMetrics {
  name: string;
  shortName: string;
  agency: string;
  modelId: "ecmwf_ifs025" | "gfs_seamless" | "icon_seamless";
  available: boolean;
  unavailableReason?: string;
  rainfall24h: number; // mm
  precipitationProbability: number; // %
  maxWindSpeed: number; // km/h
}

export interface EnsembleForecastMetrics {
  rainfall24h: number; // mm average
  precipitationProbability: number; // %
  maxWindSpeed: number; // km/h
  minRainfall24h: number;
  maxRainfall24h: number;
  spread: number;
  agreement: ModelAgreementLevel;
}

export interface EnsembleComparison {
  ecmwf: ModelMetrics;
  gfs: ModelMetrics;
  icon: ModelMetrics;
  ensemble: EnsembleForecastMetrics;
}

export interface DayForecastPoint {
  date: string;
  dayLabel: string; // e.g. "Sat 26 Sep"
  isoDate: string;
  ecmwf: number | null;
  gfs: number | null;
  icon: number | null;
  ensembleAverage: number;
  maxProb: number;
}

export interface PastDayRainfallPoint {
  date: string;
  dayLabel: string; // e.g. "Sat 19 Sep"
  isoDate: string;
  rainfall: number;
}

export interface CapeMetrics {
  currentCape: number; // J/kg
  peakCape24h: number; // J/kg
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  descriptionEn: string;
  descriptionHi: string;
}

export interface MultiModelEnsembleResponse {
  success: boolean;
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  comparison: EnsembleComparison;
  forecast10Days: DayForecastPoint[];
  past7Days: {
    days: PastDayRainfallPoint[];
    totalRainfallMm: number;
  };
  cape: CapeMetrics;
  metadata: DataSourceMeta;
  cachedAt?: number;
  error?: string;
}
