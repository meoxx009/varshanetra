import { DataSourceMeta } from "./index";

export type TerrainClassification =
  | "BASIN_DEPRESSION"
  | "FLAT_PLAIN"
  | "GENTLE_SLOPE"
  | "MODERATE_SLOPE"
  | "STEEP_RIDGE";

export interface TerrainAttributes {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  slopePercent: number; // e.g. 1.8%
  slopeDegrees: number; // e.g. 1.03°
  classification: TerrainClassification;
  description: string;
  isWithinPilot: boolean;
  pilotRegionName?: string;
  metadata?: DataSourceMeta;
}

export interface TerrainServiceResult {
  success: boolean;
  data?: TerrainAttributes;
  error?: string;
  isWithinPilot: boolean;
  metadata: DataSourceMeta;
}

export interface TerrainGridPoint {
  lat: number;
  lon: number;
  elevation: number;
  slopePercent: number;
  slopeDegrees: number;
  classification: TerrainClassification;
}

export interface PreprocessedTerrainDataset {
  region: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  gridResolutionDeg: number;
  generatedAt: string;
  source: string;
  elevationStats: {
    minMeters: number;
    maxMeters: number;
    meanMeters: number;
  };
  points: TerrainGridPoint[];
}
