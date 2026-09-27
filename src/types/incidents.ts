import { SeverityLevel, DataSourceMeta } from "./index";

export type IncidentType =
  | "Flooding"
  | "Urban Waterlogging"
  | "Road Block"
  | "Rescue Required"
  | "Medical Emergency"
  | "Infrastructure Damage"
  | "Other";

export const INCIDENT_TYPES: IncidentType[] = [
  "Flooding",
  "Urban Waterlogging",
  "Road Block",
  "Rescue Required",
  "Medical Emergency",
  "Infrastructure Damage",
  "Other",
];

export type IncidentStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESPONDING"
  | "RESOLVED"
  | "CLOSED";

export interface IncidentItem {
  id: string;
  incident_number: string;
  type: IncidentType;
  title: string;
  description: string;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  status: IncidentStatus;
  created_by?: string | null;
  reporter_name?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentAuditLog {
  id: string;
  incident_id: string;
  from_status?: IncidentStatus | null;
  to_status: IncidentStatus;
  changed_by?: string | null;
  changer_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateIncidentInput {
  type: IncidentType;
  title: string;
  description: string;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  assigned_to?: string;
  reporter_name?: string;
}

export interface UpdateIncidentInput {
  type?: IncidentType;
  title?: string;
  description?: string;
  severity?: SeverityLevel;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  assigned_to?: string;
  reporter_name?: string;
}

export interface IncidentFilters {
  status?: IncidentStatus | "ALL";
  severity?: SeverityLevel | "ALL";
  type?: IncidentType | "ALL";
  search?: string;
  limit?: number;
}

export interface IncidentsResponse {
  success: boolean;
  data: IncidentItem[];
  count: number;
  metadata: DataSourceMeta;
  error?: string;
}

export interface SingleIncidentResponse {
  success: boolean;
  data?: IncidentItem;
  auditLogs?: IncidentAuditLog[];
  metadata?: DataSourceMeta;
  error?: string;
}
