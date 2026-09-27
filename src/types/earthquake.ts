/**
 * VarshaNetra - SOURCES-003: USGS Earthquake & Landslide Risk Domain Types
 */

import { DataSourceMeta } from "./index";

export interface UsgsEarthquakeFeature {
  id: string;
  magnitude: number;
  place: string;
  time: string; // ISO string
  timestamp: number; // Unix epoch ms
  coordinates: [number, number, number]; // [longitude, latitude, depth_km]
  latitude: number;
  longitude: number;
  depthKm: number;
  distanceKm: number;
  url: string;
  shakemapUrl?: string;
}

export type LandslideRiskLevel = "ELEVATED" | "MODERATE" | "WATCH" | "LOW";

export interface LandslideRiskEvaluation {
  level: LandslideRiskLevel;
  titleEn: string;
  titleHi: string;
  badgeClass: string;
  descriptionEn: string;
  descriptionHi: string;
  hasRecentQuake: boolean;
  hasHeavyRain: boolean;
  isHillyTerrain: boolean;
}

export interface EarthquakeHazardResponse {
  success: boolean;
  total_count: number;
  earthquakes: UsgsEarthquakeFeature[];
  recent_significant: UsgsEarthquakeFeature[];
  nearest_earthquake: UsgsEarthquakeFeature | null;
  landslide_risk_elevated: boolean;
  district: {
    name: string;
    latitude: number;
    longitude: number;
  };
  metadata: DataSourceMeta;
  error?: string;
}
