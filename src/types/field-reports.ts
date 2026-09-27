import { SeverityLevel } from "./index";

export type FieldReportType =
  | "Waterlogging"
  | "River Breach"
  | "Road Block"
  | "Bridge Submergence"
  | "Landslide"
  | "Structure Damage"
  | "Rescue Needed"
  | "Other";

export const FIELD_REPORT_TYPES: readonly FieldReportType[] = [
  "Waterlogging",
  "River Breach",
  "Road Block",
  "Bridge Submergence",
  "Landslide",
  "Structure Damage",
  "Rescue Needed",
  "Other",
] as const;

export type RoadStatus =
  | "CLEAR"
  | "PARTIALLY_BLOCKED"
  | "SUBMERGED_PASSABLE"
  | "IMPASSABLE_CLOSED";

export const ROAD_STATUSES: readonly RoadStatus[] = [
  "CLEAR",
  "PARTIALLY_BLOCKED",
  "SUBMERGED_PASSABLE",
  "IMPASSABLE_CLOSED",
] as const;

export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "UNVERIFIED",
  "VERIFIED",
  "REJECTED",
] as const;

export interface FieldReport {
  id: string;
  report_number: string;
  report_type: FieldReportType;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  observed_water_depth_cm?: number | null;
  people_requiring_assistance?: number | null;
  road_status: RoadStatus;
  description: string;
  photo_url?: string | null;
  photo_thumbnail_url?: string | null;
  verification_status: VerificationStatus;
  observer_name: string;
  observer_role?: string | null;
  observer_contact?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFieldReportInput {
  report_type: FieldReportType;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  observed_water_depth_cm?: number;
  people_requiring_assistance?: number;
  road_status?: RoadStatus;
  description: string;
  photo_url?: string;
  photo_thumbnail_url?: string;
  observer_name: string;
  observer_role?: string;
  observer_contact?: string;
}

export interface VerifyFieldReportInput {
  verification_status: VerificationStatus;
  verified_by: string;
  verification_notes?: string;
}

export interface FieldReportsFilter {
  verification_status?: VerificationStatus;
  report_type?: FieldReportType;
  severity?: SeverityLevel;
  search?: string;
}
