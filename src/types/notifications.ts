/**
 * Operational In-App Notification Domain Types
 * VarshaNetra Emergency Early Warning System (VARSHANETRA-21)
 */

import { SeverityLevel } from "./index";

export type NotificationEventType =
  | "ALERT_ISSUED"
  | "INCIDENT_ASSIGNED"
  | "RESPONSE_TEAM_ASSIGNMENT"
  | "NEW_FIELD_REPORT"
  | "CRITICAL_DATA_SOURCE_FAILURE";

export interface NotificationItem {
  id: string;
  event_type: NotificationEventType;
  title: string;
  message: string;
  severity: SeverityLevel;
  deep_link: string;
  related_id?: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  event_type: NotificationEventType;
  title: string;
  message: string;
  severity: SeverityLevel;
  deep_link: string;
  related_id?: string | null;
}

export interface NotificationFilterOptions {
  read?: boolean;
  event_type?: NotificationEventType;
  severity?: SeverityLevel;
  limit?: number;
}
