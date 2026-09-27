/**
 * VarshaNetra - Historical Event Replay & Model Evaluation Types
 *
 * Types supporting historical rainfall playback, timeline scrubbing,
 * synchronized experimental flood risk recalculation, and empirical model evaluation.
 */

import {
  FloodRiskCalculationResult,
  FloodRiskLevel,
  RoadStatus,
  SoilMoistureCategory,
  DataSourceMeta,
} from "@/types";

export type ReplayPlaybackSpeed = 1 | 2 | 5;

export interface HistoricalEventPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  districtName: string;
  state: string;
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  peakRainfallMm: number;
  historicalContext: string;
  benchmark?: ModelEvaluationBenchmark;
}

export interface ModelEvaluationBenchmark {
  eventDate: string;
  observedWaterDepthCm?: number;
  observedRoadStatus?: RoadStatus;
  observedCiviliansAffected?: number;
  observedIncidentsSummary?: string;
  verificationSource: string;
  evaluationAlignment: "MATCH" | "UNDERESTIMATED" | "OVERESTIMATED" | "UNLABELLED";
  analysisNotes: string;
}

export interface ReplayTimestep {
  hourIndex: number; // 0 to N-1
  timeIso: string;
  formattedTime: string;
  relativeHourLabel: string; // e.g. "T+00h", "T+24h"
  hourlyPrecipitationMm: number;
  cumulativeRainfallMm: number;
  antecedent24hMm: number;
  antecedent48hMm: number;
  soilMoistureCategory: SoilMoistureCategory;
  soilMoistureDescription: string;
  runoffRiskMultiplier: number;
  temperatureC?: number;
  relativeHumidityPct?: number;
  riskCalculation: FloodRiskCalculationResult;
}

export interface HistoricalReplaySession {
  eventId: string;
  title: string;
  districtName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  totalDurationHours: number;
  peakHourlyRateMm: number;
  totalAccumulatedMm: number;
  peakRiskScore: number;
  peakRiskLevel: FloodRiskLevel;
  timesteps: ReplayTimestep[];
  benchmark?: ModelEvaluationBenchmark;
  metadata: DataSourceMeta;
}
