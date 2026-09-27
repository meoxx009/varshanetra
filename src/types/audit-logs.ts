/**
 * VarshaNetra - Audit Logging Types
 * Captures immutable operational and governance events across the system.
 */

export type AuditEntityType =
  | 'alert'
  | 'incident'
  | 'response_team'
  | 'resource'
  | 'field_report'
  | 'auth'
  | 'system';

export type AuditAction =
  // Auth actions
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  // Alert actions
  | 'ALERT_CREATED'
  | 'ALERT_STATUS_CHANGED'
  | 'ALERT_UPDATED'
  // Incident actions
  | 'INCIDENT_CREATED'
  | 'INCIDENT_STATUS_CHANGED'
  | 'INCIDENT_UPDATED'
  // Response team actions
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_ASSIGNED'
  | 'ASSIGNMENT_STATUS_CHANGED'
  // Resource actions
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_DEPLOYED'
  | 'RESOURCE_RETURNED'
  // Field report actions
  | 'FIELD_REPORT_CREATED'
  | 'FIELD_REPORT_VERIFIED'
  // System actions
  | 'SYSTEM_HEALTH_CHECK'
  | 'SYSTEM_ACTION';

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateAuditLogInput {
  actor_id?: string | null;
  actor_name?: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AuditLogFilterOptions {
  entity_type?: AuditEntityType;
  action?: AuditAction;
  actor_id?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
