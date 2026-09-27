import { DataSourceMeta } from "./index";
import { IncidentItem } from "./incidents";

export type ResponseTeamStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "UNAVAILABLE";

export type AssignmentStatus =
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "STAND_DOWN"
  | "COMPLETED";

export type ResponseTeamAgency =
  | "SDRF"
  | "NDRF"
  | "Fire Brigade"
  | "Police"
  | "PMC / Municipal"
  | "Health / EMT"
  | "Civil Defense"
  | "Other";

export const RESPONSE_TEAM_AGENCIES: ResponseTeamAgency[] = [
  "SDRF",
  "NDRF",
  "Fire Brigade",
  "Police",
  "PMC / Municipal",
  "Health / EMT",
  "Civil Defense",
  "Other",
];

export const RESPONSE_TEAM_STATUSES: ResponseTeamStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SITE",
  "UNAVAILABLE",
];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SITE",
  "STAND_DOWN",
  "COMPLETED",
];

export interface ResponseTeam {
  id: string;
  name: string;
  agency: string;
  personnel_count: number;
  status: ResponseTeamStatus;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  contact_number?: string | null;
  equipment?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  active_assignment_count?: number;
  current_assignment?: IncidentAssignment | null;
}

export interface IncidentAssignment {
  id: string;
  incident_id: string;
  team_id: string;
  assigned_at: string;
  assignment_status: AssignmentStatus;
  notes?: string | null;
  assigned_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  team?: ResponseTeam;
  incident?: IncidentItem;
}

export interface CreateTeamInput {
  name: string;
  agency: string;
  personnel_count: number;
  status?: ResponseTeamStatus;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  contact_number?: string | null;
  equipment?: string | null;
  notes?: string | null;
}

export interface UpdateTeamInput {
  name?: string;
  agency?: string;
  personnel_count?: number;
  status?: ResponseTeamStatus;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  contact_number?: string | null;
  equipment?: string | null;
  notes?: string | null;
}

export interface CreateAssignmentInput {
  incident_id: string;
  team_id: string;
  assignment_status?: AssignmentStatus;
  notes?: string;
  assigned_by?: string;
  allow_conflict_override?: boolean;
}

export interface UpdateAssignmentStatusInput {
  assignment_status: AssignmentStatus;
  notes?: string;
  changer_name?: string;
}

export interface ResponseTeamsFilter {
  status?: ResponseTeamStatus | "ALL";
  agency?: string | "ALL";
  search?: string;
}

export interface ResponseTeamsResponse {
  success: boolean;
  data: ResponseTeam[];
  count: number;
  metadata: DataSourceMeta;
  error?: string;
}

export interface SingleTeamResponse {
  success: boolean;
  data?: ResponseTeam;
  assignments?: IncidentAssignment[];
  metadata?: DataSourceMeta;
  error?: string;
}

export interface AssignmentsResponse {
  success: boolean;
  data: IncidentAssignment[];
  count: number;
  metadata: DataSourceMeta;
  error?: string;
  conflict?: {
    isConflicting: boolean;
    conflictingIncidentNumber: string;
    conflictingIncidentTitle: string;
    teamName: string;
    currentStatus: ResponseTeamStatus;
  };
}
