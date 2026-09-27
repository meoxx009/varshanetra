import { DataSourceMeta } from "./index";

export type FloodRiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type InundationSusceptibilityClass = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type DataCompletenessLevel = "HIGH" | "MEDIUM" | "LIMITED";

export type InundationFactorKey =
  | "FORECAST_PRECIPITATION"
  | "ANTECEDENT_RAINFALL"
  | "RELATIVE_ELEVATION"
  | "TERRAIN_SLOPE"
  | "WATERWAY_PROXIMITY";

export interface InundationFactorBreakdown {
  key: InundationFactorKey;
  label: string;
  labelHi?: string;
  rawValue: number | string;
  unit: string;
  normalizedScore: number; // 0 to 100
  weight: number; // configured baseline weight (e.g. 0.30)
  activeWeight: number; // re-scaled weight among available factors
  weightedContribution: number; // normalizedScore * activeWeight
  available: boolean;
  rationale: string;
  rationaleHi?: string;
  source: string;
}

export interface InundationSusceptibilityInputs {
  forecastRainMm: number;
  forecastWindow?: ForecastWindow;
  antecedent24hMm: number;
  antecedent48hMm: number;
  elevationMeters?: number;
  relativeElevationMeters?: number;
  slopePercent?: number;
  distanceToWaterwayMeters?: number;
}

export interface InundationSusceptibilityResult {
  score: number; // 0 to 100 (1 decimal place)
  susceptibilityClass: InundationSusceptibilityClass;
  dataCompleteness: number; // percentage 0 to 100
  completenessLevel: DataCompletenessLevel;
  missingFactors: string[];
  contributingFactors: InundationFactorBreakdown[];
  summaryReasons: string[];
  summaryReasonsHi: string[];
  plainLanguageExplanation: string;
  plainLanguageExplanationHi: string;
  calculatedAt: string;
  validUntil: string;
  isExperimental: true;
  disclaimer: string;
  disclaimerHi: string;
  metadata?: DataSourceMeta;
}

export type FloodRiskFactorKey =
  | "FORECAST_RAIN_24H"
  | "ANTECEDENT_24H"
  | "ANTECEDENT_48H"
  | "TERRAIN_SLOPE"
  | "RIVER_PROXIMITY"
  | "ISRO_MOSDAC_RAINFALL"
  | "NASA_GPM_SATELLITE_RAINFALL";

export interface FloodRiskFactorBreakdown {
  key: FloodRiskFactorKey;
  label: string;
  rawValue: number | string;
  unit: string;
  normalizedScore: number; // 0 to 100
  weight: number; // e.g. 0.35 (35%)
  weightedContribution: number; // normalizedScore * weight
  available: boolean;
  rationale: string;
  isSatellite?: boolean;
  badgeText?: string;
}

export type ForecastWindow = "3h" | "6h" | "12h" | "24h";

export interface FloodRiskEngineInputs {
  forecastRain24h: number; // mm in next 24h
  antecedent24h: number; // mm in previous 24h
  antecedent48h: number; // mm in previous 48h
  elevationOrSlope?: number; // slope gradient in % or elevation deficit in m
  distanceToRiverMeters?: number; // distance in meters to nearest mapped river/stream
  forecastWindow?: ForecastWindow;
  mosdacRainfallRate?: number; // mm/hr from ISRO INSAT-3D Hydroestimator
  mosdacCloudTempKelvin?: number; // Kelvin from ISRO INSAT-3D Imager/Sounder
  nasaGpmRainfallMm?: number | null; // mm from NASA GPM IMERG satellite
  satelliteRainfallMm?: number | null; // Alias for satellite observation
  imdOfficialRainfallMm?: number | null; // Official IMD District Rainfall from data.gov.in (LIVE-005)
}

export interface RiskAssessmentInput {
  districtName: string;
  nwpRainfallMm: number;
  riverWaterLevelMeters: number;
  soilMoistureIndex: number;
  satelliteRainfallMm?: number | null; // Added NASA GPM Satellite Rainfall Factor
  includeTerrain?: boolean; // Set true to integrate pre-processed DEM terrain risk
  imdOfficialRainfallMm?: number | null; // Official IMD Rainfall via data.gov.in (LIVE-005)
  openMeteoRainfallMm?: number | null; // Optional model comparison baseline
  isOfficialGovtData?: boolean;
  radarActive?: boolean; // RainViewer Live Radar active status (RADAR-001)
  radarLastFrameTime?: string | null; // Timestamp of latest radar frame
  capeJkg?: number | null; // Convective Available Potential Energy from NWP (SOURCES-002)
  recentEarthquakeMagnitude?: number | null; // USGS Earthquake magnitude (SOURCES-003)
  recentEarthquakeDistanceKm?: number | null; // Distance to quake epicenter in km
  recentEarthquakePlace?: string | null; // Location description of earthquake
}

export interface RiskFactorResult {
  name: string;
  nameHi: string;
  value: string;
  category: string;
  pointsAdded: number;
  badgeText?: string;
  isSatellite?: boolean;
  isTerrain?: boolean;
  isOfficialGovt?: boolean;
  isRadar?: boolean;
  isConvective?: boolean;
  isSeismic?: boolean;
  subFactors?: string[];
  subFactorsHi?: string[];
  comparisonNote?: string;
  comparisonNoteHi?: string;
}

export interface FloodRiskScoreResult {
  totalRiskScore: number;
  factors: RiskFactorResult[];
  warningMessage: string | null;
}


export interface FloodRiskCalculationResult {
  riskScore: number; // 0 to 100 (1 decimal place)
  riskLevel: FloodRiskLevel;
  dataCompleteness: number; // percentage (0 to 100)
  validUntil: string; // ISO date string
  calculatedAt: string; // ISO date string
  contributingFactors: FloodRiskFactorBreakdown[];
  summaryReasons: string[];
  technicalExplanation: string;
  isExperimental: true;
  disclaimer: string;
  susceptibility?: InundationSusceptibilityResult;
  metadata?: DataSourceMeta;
  snapshotId?: string;
  assessmentTimestamp?: string;
  modelVersion?: string;
  canonicalAssessment?: import("@/types").CanonicalAssessment;
  canonicalSnapshotId?: string;
}

export interface FloodRiskApiResponse {
  success: boolean;
  data?: FloodRiskCalculationResult;
  error?: string;
  cached?: boolean;
  metadata?: DataSourceMeta;
}

export interface SpatialRiskCellProperties {
  cellId: string;
  centerLat: number;
  centerLon: number;
  riskScore: number;
  riskLevel: FloodRiskLevel;
  color: string;
  forecastRainMm: number;
  forecastWindow: ForecastWindow;
  antecedent24hMm: number;
  antecedent48hMm: number;
  elevationMeters: number;
  slopePercent: number;
  terrainClassification: string;
  distanceToRiverMeters?: number;
  dataCompleteness: number;
  dataCompletenessLevel?: DataCompletenessLevel;
  susceptibilityScore?: number;
  susceptibilityClass?: InundationSusceptibilityClass;
  relativeElevationMeters?: number;
  contributingFactors?: InundationFactorBreakdown[];
  calculatedAt: string;
  isWithinPilot: boolean;
  summaryReasons: string[];
  summaryReasonsHi?: string[];
  plainLanguageExplanation?: string;
  plainLanguageExplanationHi?: string;
}

export interface SpatialRiskGridFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][]; // GeoJSON format: [[[lon, lat], [lon, lat], ...]]
  };
  properties: SpatialRiskCellProperties;
}

export interface SpatialRiskGridFeatureCollection {
  type: "FeatureCollection";
  features: SpatialRiskGridFeature[];
  summary: {
    totalCells: number;
    forecastWindow: ForecastWindow;
    calculatedAt: string;
    meanRiskScore: number;
    riskDistribution: Record<FloodRiskLevel, number>;
    colorMap: Record<FloodRiskLevel, string>;
  };
  metadata: DataSourceMeta;
}

export interface SpatialFloodGridResponse {
  success: boolean;
  data?: SpatialRiskGridFeatureCollection;
  error?: string;
  cached?: boolean;
  metadata?: DataSourceMeta;
}

export type TimelineHorizon = "now" | "3h" | "6h" | "12h" | "24h";

export type HydraulicModelStatus =
  | "NOT_CONFIGURED"
  | "CALIBRATING"
  | "ACTIVE"
  | "OFFLINE";

export interface HydraulicModelConfig {
  modelType: "HEC_RAS_2D" | "LISFLOOD_FP" | "ML_SURROGATE" | "NONE";
  status: HydraulicModelStatus;
  statusText: string;
  meshResolutionMeters?: number;
  validationStatus: string;
  lastCalibrationDate?: string;
  description: string;
}

export interface HydraulicDepthResult {
  isConfigured: boolean;
  depthMeters: number | null;
  statusText: string;
  modelType: string;
  timestamp: string;
  uncertaintyMarginMeters?: number;
}

export interface HydraulicInundationAdapter {
  isConfigured(): boolean;
  getModelConfig(): HydraulicModelConfig;
  getInundationDepth(latitude: number, longitude: number): Promise<HydraulicDepthResult>;
}

export interface MunicipalInundationHotspot {
  id: string;
  location: string;
  taluk: string;
  riskLevel: FloodRiskLevel;
  pumpsDeployed: number;
  operationalStatus: string;
  hydraulicStatus: string;
  fieldObservation: string;
  reportedWaterloggingRisk: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
}

export interface CanonicalAssessmentKeyDriver {
  key: string;
  label: string;
  labelHi?: string;
  rawValue: number | string;
  unit: string;
  normalizedScore: number;
  weightedContribution: number;
  rationale: string;
  rationaleHi?: string;
  status: "MEASURED" | "UNMEASURED";
}

export interface CanonicalAssessment {
  snapshotId: string;
  locationId: string;
  riskCategory: FloodRiskLevel; // "LOW" | "MODERATE" | "HIGH" | "SEVERE"
  riskScore: number;            // 0-100
  confidence: number;           // 0-100 based on verified inputs
  keyDrivers: CanonicalAssessmentKeyDriver[];
  dataCompleteness: number;
  assessmentTimestamp: string;
  calculatedAt: string;
  modelVersion: string; // e.g., "V1.2-CANONICAL"
  plainLanguageExplanationEn: string;
  plainLanguageExplanationHi: string;
  forecastHorizon: "24h";
  isOfficial: false;
}


