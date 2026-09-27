/**
 * VarshaNetra Situation Intelligence Domain Types
 * Deterministic, Auditable Operational Synthesis without paid LLM keys (VARSHANETRA-22)
 */

import { SeverityLevel, DataSourceMeta } from "./index";
import type { CanonicalAssessment } from "./flood";
import type { NormalizedOfficialAlerts } from "@/lib/services/canonical-telemetry";

export type SituationTopic =
  | "RAINFALL"
  | "FLOOD_RISK"
  | "ALERTS"
  | "INCIDENTS"
  | "INFRASTRUCTURE"
  | "RESOURCES"
  | "FIELD_REPORTS"
  | "RECOMMENDATION";

export interface EvidenceRecord {
  label: string;
  sourceTableOrProvider: string;
  value: string | number;
  deepLink?: string;
  recordId?: string;
  details?: string;
}

export interface SituationStatement {
  id: string;
  topic: SituationTopic;
  text: string;
  textHi?: string;
  severity: SeverityLevel;
  traceableMetrics: Record<string, string | number>;
  evidence: EvidenceRecord[];
}

export interface OperationalConsideration {
  id: string;
  suggestion: string;
  suggestionHi?: string;
  rationale: string;
  rationaleHi?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  topic: SituationTopic;
  deepLink?: string;
}

export interface SituationIntelligenceReport {
  summaryParagraph: string;
  summaryParagraphHi?: string;
  overallSeverity: SeverityLevel;
  generatedAt: string;
  locationName: string;
  canonicalSnapshotId?: string;
  canonicalAssessment?: CanonicalAssessment;
  officialAlerts?: NormalizedOfficialAlerts;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  keyStatistics: {
    forecastRain6hMm: number;
    forecastRain24hMm: number;
    floodRiskScore: number;
    floodRiskLevel: string;
    activeIncidentsCount: number;
    issuedAlertsCount: number;
    exposedInfrastructureCount: number;
    availableResponseTeamsCount: number;
    shelterOccupancyPercent: number;
    verifiedFieldReportsCount: number;
  };
  statements: SituationStatement[];
  considerations: OperationalConsideration[];
  dataSourcesQueried: Array<{
    source: string;
    status: "LIVE" | "CACHED" | "EMPTY" | "ERROR";
    recordCount: number;
    latencyMs?: number;
  }>;
  metadata: DataSourceMeta;
}

export interface SituationQueryOptions {
  latitude: number;
  longitude: number;
  locationName?: string;
}
