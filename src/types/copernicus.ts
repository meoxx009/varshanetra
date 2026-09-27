export type CopernicusActivationStatus = "ONGOING" | "CLOSED";

export interface CopernicusActivation {
  activation_code: string; // e.g. "EMSR586"
  title: string;
  country: string;
  event_type: string; // "Flood", "Cyclone", etc.
  date: string;
  status: CopernicusActivationStatus;
  affected_area: string;
  map_url: string;
  centroid?: string;
  products_count?: number;
  is_historical?: boolean;
}

export interface GloFASRiverStatus {
  river_name: string;
  basin: string;
  forecast_horizon: string;
  alert_level: "NORMAL" | "WATCH" | "ALERT" | "SEVERE";
  return_period: string; // e.g. "5-year flood peak", "<2-year baseline"
  probability_percent: number;
}

export interface CopernicusApiResponse {
  success: boolean;
  is_live: boolean;
  last_checked: string;
  active_activations_count: number;
  activations: CopernicusActivation[];
  has_active_india_event: boolean;
  glofas: {
    status: "DEMO_AVAILABLE" | "CDS_CONFIGURED" | "NOT_CONFIGURED";
    is_key_configured: boolean;
    summary: string;
    summary_hi: string;
    portal_url: string;
    rivers: GloFASRiverStatus[];
  };
  static_resources: {
    all_india_url: string;
    risk_recovery_url: string;
    glofas_url: string;
  };
  attribution: string;
  error?: string;
}
