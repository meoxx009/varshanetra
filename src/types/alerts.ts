import { SeverityLevel, DataSourceMeta } from "./index";

export type AlertStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "ISSUED"
  | "CANCELLED";

export interface AlertItem {
  id: string;
  title: string;
  severity: SeverityLevel;
  area_name: string;
  description: string;
  recommended_action: string;
  status: AlertStatus;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertAuditLog {
  id: string;
  alert_id: string;
  from_status?: AlertStatus | null;
  to_status: AlertStatus;
  changed_by?: string | null;
  changer_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateAlertInput {
  title: string;
  severity: SeverityLevel;
  area_name: string;
  description: string;
  recommended_action: string;
}

export interface UpdateAlertInput {
  title?: string;
  severity?: SeverityLevel;
  area_name?: string;
  description?: string;
  recommended_action?: string;
}

export interface TransitionAlertInput {
  status: AlertStatus;
  notes?: string;
}

export interface AlertFilters {
  status?: AlertStatus | "ALL";
  severity?: SeverityLevel | "ALL";
  area_name?: string;
  search?: string;
}

export interface AlertsResponse {
  success: boolean;
  data: AlertItem[];
  count: number;
  metadata: DataSourceMeta;
  error?: string;
}

export interface SingleAlertResponse {
  success: boolean;
  data?: AlertItem;
  auditLogs?: AlertAuditLog[];
  metadata?: DataSourceMeta;
  error?: string;
}
