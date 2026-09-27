/**
 * Data Source Health & Transparency Domain Types
 * VarshaNetra Emergency Early Warning System (VARSHANETRA-20)
 */

export type DataSourceStatusLevel =
  | "ONLINE"
  | "CONNECTED"
  | "CONFIGURED"
  | "DB_ERROR"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "DEGRADED"
  | "STALE"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED";

export type DataSourceId =
  | "open-meteo"
  | "osm-base-map"
  | "osm-nominatim"
  | "osm-overpass"
  | "supabase"
  | "terrain-dataset"
  | "risk-engine"
  | "nasa-gpm"
  | "tomorrowio-nowcast";

export type ApiKeySecurityStatus =
  | "NOT_REQUIRED"
  | "CONFIGURED_PROTECTED"
  | "NOT_CONFIGURED";

export type DiagnosticErrorClassification =
  | "CONFIG_MISSING"
  | "INVALID_URL"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "HTTP_401"
  | "HTTP_403"
  | "HTTP_404"
  | "HTTP_429"
  | "HTTP_500"
  | "HTTP_502"
  | "HTTP_503"
  | "DATABASE_QUERY_ERROR"
  | "RLS_PERMISSION_ERROR"
  | "UNKNOWN";

export interface SafeDiagnostics {
  status: DataSourceStatusLevel;
  http_status?: number | null;
  error_code?: string | null;
  error_type?: DiagnosticErrorClassification | null;
  latency_ms?: number;
  endpoint_host?: string;
  endpoint_path?: string;
  checked_at?: string;
}

export interface DataSourceHealth {
  id: DataSourceId;
  name: string;
  provider: string;
  purpose: string;
  status: DataSourceStatusLevel;
  statusReason?: string;
  latencyMs?: number;
  lastCheckedAt: string;
  lastSuccessfulFetchAt?: string | null;
  latestDataTimestamp?: string | null;
  isStale: boolean;
  staleThresholdMinutes: number;
  apiKeyRequired: boolean;
  apiKeyStatus: ApiKeySecurityStatus;
  endpoint: string;
  documentationUrl: string;
  attributionNotice: string;
  complianceNotes: string;
  controlledByBackend: boolean;
  diagnostics?: SafeDiagnostics;
}

export interface HealthCheckSummary {
  totalSources: number;
  onlineCount: number;
  degradedCount: number;
  staleCount: number;
  unavailableCount: number;
  notConfiguredCount: number;
  lastAuditedAt: string;
}

export interface HealthCheckApiResponse {
  success: boolean;
  summary: HealthCheckSummary;
  sources: DataSourceHealth[];
  timestamp: string;
  error?: string;
}
