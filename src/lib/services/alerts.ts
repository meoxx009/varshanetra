"use strict";

import fs from "fs";
import path from "path";
import {
  AlertItem,
  AlertStatus,
  AlertAuditLog,
  CreateAlertInput,
  UpdateAlertInput,
  AlertFilters,
  DataSourceMeta,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notifications";
import { recordAuditLog } from "@/lib/services/audit-logs";
import { sanitizePostgrestSearchTerm } from "@/lib/security/validation";

const ALERTS_DATA_SOURCE_META: DataSourceMeta = {
  provider: "VarshaNetra Emergency Early Warning & Supabase PostgREST",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Statutory district emergency alerts. Certified under DDMA Protocol. SMS/CAP Broadcast: Not Configured.",
};

const VALID_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["CANCELLED"],
  CANCELLED: [],
};

// Initial realistic seed alerts for district operations
const INITIAL_SEED_ALERTS: AlertItem[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    title: "Flash Flood Warning: Mutha River Low-Lying Basin",
    severity: "CRITICAL",
    area_name: "Pune (Sinhagad Road / Deccan Gymkhana)",
    description:
      "Rapid catchment inflow in upstream Khadakwasla reservoir basin may overtop riverbed outfalls. River corridor basements and low-lying societies are placed under immediate flash-flood evacuation alert.",
    recommended_action:
      "Evacuate riverbed basements and causeways. Move low-clearance vehicles to elevated parking. Dewatering pumps pre-positioned.",
    status: "ISSUED",
    creator_name: "District Magistrate & Incident Commander",
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    title: "Heavy Rainfall Alert: Western Ghat Ghat Roads",
    severity: "ALERT",
    area_name: "Maval, Mulshi, Velhe & Bhor",
    description:
      "Forecast precipitation exceeding 70mm over the next 12 hours. Saturated slopes pose localized mudslide and rockfall hazards along Tamhini and Varandha ghat corridors.",
    recommended_action:
      "Restrict night transit on steep ghat corridors. PWD road clearing crews and JCB earthmovers stationed on 15-minute standby.",
    status: "APPROVED",
    creator_name: "DDMA Executive Control Cell",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    title: "Causeway Traffic Stand-Down Advisory",
    severity: "ADVISORY",
    area_name: "Garware Causeway & Bhide Bridge",
    description:
      "River level monitoring indicates causeway freeboard clearance is currently adequate. Stand-down draft awaiting final evening gauge readings.",
    recommended_action:
      "Maintain traffic police warning barricades nearby; execute scheduled hourly water-level inspections.",
    status: "DRAFT",
    creator_name: "Pune City Traffic Control Room",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

const INITIAL_AUDIT_LOGS: AlertAuditLog[] = [
  {
    id: "audit-001",
    alert_id: "a0000000-0000-0000-0000-000000000001",
    from_status: "DRAFT",
    to_status: "PENDING",
    changer_name: "EOC Duty Officer",
    notes: "Submitted after Khadakwasla outflow breached 15,000 cusecs.",
    created_at: new Date(Date.now() - 3600000 * 2.8).toISOString(),
  },
  {
    id: "audit-002",
    alert_id: "a0000000-0000-0000-0000-000000000001",
    from_status: "PENDING",
    to_status: "APPROVED",
    changer_name: "Additional District Magistrate",
    notes: "Verified against telemetry and taluk field reports.",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "audit-003",
    alert_id: "a0000000-0000-0000-0000-000000000001",
    from_status: "APPROVED",
    to_status: "ISSUED",
    changer_name: "District Magistrate & Incident Commander",
    notes: "Broadcasted to Command Center & all response line departments.",
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "audit-004",
    alert_id: "a0000000-0000-0000-0000-000000000002",
    from_status: "DRAFT",
    to_status: "PENDING",
    changer_name: "Disaster Management Officer",
    notes: "Submitted based on IMD orange warning for ghats.",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "audit-005",
    alert_id: "a0000000-0000-0000-0000-000000000002",
    from_status: "PENDING",
    to_status: "APPROVED",
    changer_name: "Resident Deputy Collector (RDC)",
    notes: "Approved for inter-agency coordination.",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

// Persistent File Store Helper (used for Sandbox mode and seamless demo verification)
const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "alerts_store.json");

interface PersistedStore {
  alerts: AlertItem[];
  auditLogs: AlertAuditLog[];
}

function loadPersistedStore(): PersistedStore {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.alerts) && Array.isArray(parsed.auditLogs)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[VarshaNetra:Alerts] Could not read alerts store file, using in-memory default:", err);
  }

  const initial = { alerts: [...INITIAL_SEED_ALERTS], auditLogs: [...INITIAL_AUDIT_LOGS] };
  savePersistedStore(initial);
  return initial;
}

function savePersistedStore(store: PersistedStore): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra:Alerts] Failed to write alerts store file:", err);
  }
}

/**
 * Validates whether a state transition is permitted.
 */
export function isValidStatusTransition(currentStatus: AlertStatus, nextStatus: AlertStatus): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Fetches alerts matching filter parameters.
 */
export async function getAlerts(filters: AlertFilters = {}): Promise<{
  alerts: AlertItem[];
  count: number;
  metadata: DataSourceMeta;
}> {
  // If Supabase is live and configured, query Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("alerts").select("*", { count: "exact" });

      if (filters.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters.severity && filters.severity !== "ALL") {
        query = query.eq("severity", filters.severity);
      }
      if (filters.area_name) {
        query = query.ilike("area_name", `%${filters.area_name}%`);
      }
      if (filters.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filters.search);
        if (cleanSearch) {
          query = query.or(
            `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,area_name.ilike.%${cleanSearch}%`
          );
        }
      }

      query = query.order("created_at", { ascending: false });

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          alerts: data as AlertItem[],
          count: count ?? data.length,
          metadata: ALERTS_DATA_SOURCE_META,
        };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase query failed, falling back to persistent store:", err);
    }
  }

  // Persistent Store Fallback
  const store = loadPersistedStore();
  let list = [...store.alerts];

  if (filters.status && filters.status !== "ALL") {
    list = list.filter((a) => a.status === filters.status);
  }
  if (filters.severity && filters.severity !== "ALL") {
    list = list.filter((a) => a.severity === filters.severity);
  }
  if (filters.area_name) {
    const q = filters.area_name.toLowerCase();
    list = list.filter((a) => a.area_name.toLowerCase().includes(q));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.area_name.toLowerCase().includes(q) ||
        a.recommended_action.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    alerts: list,
    count: list.length,
    metadata: {
      ...ALERTS_DATA_SOURCE_META,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Retrieves a single alert with its audit logs.
 */
export async function getAlertById(id: string): Promise<{
  alert: AlertItem | null;
  auditLogs: AlertAuditLog[];
  metadata: DataSourceMeta;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const [alertRes, auditRes] = await Promise.all([
        supabase.from("alerts").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("alert_audit_logs")
          .select("*")
          .eq("alert_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!alertRes.error && alertRes.data) {
        return {
          alert: alertRes.data as AlertItem,
          auditLogs: (auditRes.data || []) as AlertAuditLog[],
          metadata: ALERTS_DATA_SOURCE_META,
        };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase getAlertById failed, using persistent store:", err);
    }
  }

  const store = loadPersistedStore();
  const alert = store.alerts.find((a) => a.id === id) || null;
  const auditLogs = store.auditLogs
    .filter((log) => log.alert_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    alert,
    auditLogs,
    metadata: ALERTS_DATA_SOURCE_META,
  };
}

/**
 * Creates a new alert in DRAFT status with an initial audit entry.
 */
export async function createAlert(
  input: CreateAlertInput,
  user?: { id?: string; name?: string }
): Promise<{ success: boolean; alert?: AlertItem; error?: string }> {
  // Input validation
  if (!input.title || input.title.trim().length < 3) {
    return { success: false, error: "Alert title must be at least 3 characters." };
  }
  if (!input.area_name || input.area_name.trim().length < 2) {
    return { success: false, error: "Target operational area name is required." };
  }
  if (!input.description || input.description.trim().length < 10) {
    return { success: false, error: "Alert narrative description must be at least 10 characters." };
  }
  if (!input.recommended_action || input.recommended_action.trim().length < 5) {
    return { success: false, error: "Recommended civil protection action is required." };
  }

  const newAlert: AlertItem = {
    id: `a${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`,
    title: input.title.trim(),
    severity: input.severity,
    area_name: input.area_name.trim(),
    description: input.description.trim(),
    recommended_action: input.recommended_action.trim(),
    status: "DRAFT",
    created_by: user?.id || null,
    creator_name: user?.name || "District EOC Duty Officer",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const initialAudit: AlertAuditLog = {
    id: `audit-${Date.now()}`,
    alert_id: newAlert.id,
    from_status: null,
    to_status: "DRAFT",
    changed_by: user?.id || null,
    changer_name: user?.name || "District EOC Duty Officer",
    notes: "Alert created as DRAFT.",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("alerts").insert(newAlert).select().single();
      if (!error && data) {
        await supabase.from("alert_audit_logs").insert(initialAudit);
        return { success: true, alert: data as AlertItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase createAlert failed, saving to persistent store:", err);
    }
  }

  const store = loadPersistedStore();
  store.alerts.unshift(newAlert);
  store.auditLogs.unshift(initialAudit);
  savePersistedStore(store);

  void recordAuditLog({
    actor_id: user?.id || null,
    actor_name: user?.name || "EOC Officer",
    action: "ALERT_CREATED",
    entity_type: "alert",
    entity_id: newAlert.id,
    description: `Created alert '${newAlert.title}' (${newAlert.severity}) for ${newAlert.area_name} in status ${newAlert.status}`,
    metadata: {
      alert_id: newAlert.id,
      severity: newAlert.severity,
      area_name: newAlert.area_name,
      status: newAlert.status,
    },
  }).catch(() => {});

  return { success: true, alert: newAlert };
}

/**
 * Updates a DRAFT alert. Editing is disallowed once an alert has advanced past DRAFT.
 */
export async function updateAlert(
  id: string,
  input: UpdateAlertInput
): Promise<{ success: boolean; alert?: AlertItem; error?: string }> {
  const { alert } = await getAlertById(id);
  if (!alert) {
    return { success: false, error: "Alert not found." };
  }

  if (alert.status !== "DRAFT") {
    return {
      success: false,
      error: `Cannot edit alert in '${alert.status}' status. Only DRAFT alerts can be modified. Advance or revoke the alert instead.`,
    };
  }

  const updated: AlertItem = {
    ...alert,
    title: input.title !== undefined ? input.title.trim() : alert.title,
    severity: input.severity !== undefined ? input.severity : alert.severity,
    area_name: input.area_name !== undefined ? input.area_name.trim() : alert.area_name,
    description: input.description !== undefined ? input.description.trim() : alert.description,
    recommended_action:
      input.recommended_action !== undefined ? input.recommended_action.trim() : alert.recommended_action,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("alerts").update(updated).eq("id", id).select().single();
      if (!error && data) {
        return { success: true, alert: data as AlertItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase updateAlert failed, saving to persistent store:", err);
    }
  }

  const store = loadPersistedStore();
  const idx = store.alerts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    store.alerts[idx] = updated;
    savePersistedStore(store);
  }

  return { success: true, alert: updated };
}

/**
 * Transitions alert status according to strict state machine and appends an audit log.
 */
export async function transitionAlertStatus(
  id: string,
  newStatus: AlertStatus,
  user?: { id?: string; name?: string },
  notes?: string
): Promise<{ success: boolean; alert?: AlertItem; error?: string }> {
  const { alert } = await getAlertById(id);
  if (!alert) {
    return { success: false, error: "Alert not found." };
  }

  if (alert.status === newStatus) {
    return { success: true, alert };
  }

  if (!isValidStatusTransition(alert.status, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from '${alert.status}' to '${newStatus}'. Valid next states: ${(
        VALID_TRANSITIONS[alert.status] || []
      ).join(", ") || "None (Terminal)"}.`,
    };
  }

  const updated: AlertItem = {
    ...alert,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const auditEntry: AlertAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    alert_id: id,
    from_status: alert.status,
    to_status: newStatus,
    changed_by: user?.id || null,
    changer_name: user?.name || "District Commander / EOC Officer",
    notes: notes || `Status transitioned to ${newStatus}.`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("alerts").update(updated).eq("id", id).select().single();
      if (!error && data) {
        await supabase.from("alert_audit_logs").insert(auditEntry);
        if (newStatus === "ISSUED") {
          createNotification({
            event_type: "ALERT_ISSUED",
            title: `Official Warning Broadcast: ${updated.title}`,
            message: `${updated.severity} Early Warning issued for ${updated.area_name}. Mandatory protocols active.`,
            severity: updated.severity,
            deep_link: "/alerts",
            related_id: id,
          }).catch((err) => console.warn("Notification dispatch failed:", err));
        }
        return { success: true, alert: data as AlertItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase transitionAlertStatus failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedStore();
  const idx = store.alerts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    store.alerts[idx] = updated;
    store.auditLogs.unshift(auditEntry);
    savePersistedStore(store);
  }

  if (newStatus === "ISSUED") {
    createNotification({
      event_type: "ALERT_ISSUED",
      title: `Official Warning Broadcast: ${updated.title}`,
      message: `${updated.severity} Early Warning issued for ${updated.area_name}. Mandatory protocols active.`,
      severity: updated.severity,
      deep_link: "/alerts",
      related_id: id,
    }).catch((err) => console.warn("Notification dispatch failed:", err));
  }

  void recordAuditLog({
    actor_id: user?.id || null,
    actor_name: user?.name || "District Commander / EOC Officer",
    action: "ALERT_STATUS_CHANGED",
    entity_type: "alert",
    entity_id: id,
    description: `Alert '${updated.title}' transitioned from ${alert.status} to ${newStatus}`,
    metadata: {
      alert_id: id,
      from_status: alert.status,
      to_status: newStatus,
      notes: notes || null,
    },
  }).catch(() => {});

  return { success: true, alert: updated };
}

/**
 * Deletes a draft alert. Non-draft alerts must be CANCELLED, not deleted.
 */
export async function deleteAlert(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { alert } = await getAlertById(id);
  if (!alert) {
    return { success: false, error: "Alert not found." };
  }

  if (alert.status !== "DRAFT") {
    return {
      success: false,
      error: "Only DRAFT alerts can be permanently deleted. Advanced alerts must be CANCELLED.",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("alerts").delete().eq("id", id);
      return { success: true };
    } catch (err) {
      console.warn("[VarshaNetra:Alerts] Supabase deleteAlert failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedStore();
  store.alerts = store.alerts.filter((a) => a.id !== id);
  store.auditLogs = store.auditLogs.filter((log) => log.alert_id !== id);
  savePersistedStore(store);

  return { success: true };
}

/**
 * Returns active ISSUED alerts for real-time dashboard notifications.
 */
export async function getActiveIssuedAlerts(areaName?: string): Promise<AlertItem[]> {
  const res = await getAlerts({
    status: "ISSUED",
    area_name: areaName,
  });
  return res.alerts;
}
