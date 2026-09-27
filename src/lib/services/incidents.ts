"use strict";

import fs from "fs";
import path from "path";
import {
  IncidentItem,
  IncidentStatus,
  IncidentType,
  IncidentAuditLog,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentFilters,
  MapFeatureItem,
  DataSourceMeta,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notifications";
import { recordAuditLog } from "@/lib/services/audit-logs";
import { sanitizePostgrestSearchTerm } from "@/lib/security/validation";

const INCIDENTS_DATA_SOURCE_META: DataSourceMeta = {
  provider: "District EOC 112 / Municipal Incident Dispatch",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Emergency field distress incidents linked to District Command Room and Dial 112 dispatch network.",
};

const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "CLOSED"],
  ACKNOWLEDGED: ["RESPONDING", "RESOLVED", "CLOSED"],
  RESPONDING: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "RESPONDING"],
  CLOSED: ["OPEN"],
};

export const INCIDENT_TYPES: IncidentType[] = [
  "Flooding",
  "Urban Waterlogging",
  "Road Block",
  "Rescue Required",
  "Medical Emergency",
  "Infrastructure Damage",
  "Other",
];

const INITIAL_SEED_INCIDENTS: IncidentItem[] = [
  {
    id: "inc-00000000-0000-0000-0000-000000000001",
    incident_number: "INC-2026-001",
    type: "Urban Waterlogging",
    title: "Deep Waterlogging at Sinhagad Road Outfall",
    description:
      "Riverbed backwater has backed up through storm outfall culverts into Ekta Nagari ground floors. Water depth over 0.8m on service lanes.",
    severity: "CRITICAL",
    latitude: 18.4982,
    longitude: 73.8341,
    location_name: "Sinhagad Road, Near Vitthalwadi Temple, Haveli",
    status: "RESPONDING",
    reporter_name: "Citizen SOS Call via Dial 112",
    assigned_to: "PMC Drainage Squad & SDRF Unit 1",
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
  },
  {
    id: "inc-00000000-0000-0000-0000-000000000002",
    incident_number: "INC-2026-002",
    type: "Road Block",
    title: "Uprooted Banyan Tree Blocking FC Road Dual Carriageway",
    description:
      "Strong wind gusts uprooted mature avenue tree across Fergusson College Road. Both carriageways blocked; high-tension wire entanglement suspected.",
    severity: "ALERT",
    latitude: 18.5236,
    longitude: 73.8412,
    location_name: "FC Road, Near Goodluck Chowk, Deccan",
    status: "ACKNOWLEDGED",
    reporter_name: "Traffic Police Beat Marshal #4",
    assigned_to: "PMC Tree Authority & Fire Tender #2",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: "inc-00000000-0000-0000-0000-000000000003",
    incident_number: "INC-2026-003",
    type: "Flooding",
    title: "Riverbed Causeway Overtopped: Bhide Bridge",
    description:
      "Khadakwasla dam spillway discharge has overtopped Bhide low-level bridge causeway. Police barricades placed; pedestrian cordon enforced.",
    severity: "CRITICAL",
    latitude: 18.5175,
    longitude: 73.8488,
    location_name: "Bhide Bridge Causeway, Narayan Peth",
    status: "RESPONDING",
    reporter_name: "Pune City Traffic Control",
    assigned_to: "Traffic Police Division & Irrigation Dept.",
    created_at: new Date(Date.now() - 3600000 * 5.2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
  },
  {
    id: "inc-00000000-0000-0000-0000-000000000004",
    incident_number: "INC-2026-004",
    type: "Rescue Required",
    title: "Stranded Commuters in Low-Lying Sump Pocket",
    description:
      "Three occupants stranded in light motor vehicle stalled in flooded depression subway near Shanti Nagar alluvial pocket.",
    severity: "CRITICAL",
    latitude: 18.5521,
    longitude: 73.8824,
    location_name: "Yerawada Shanti Nagar Low-Lying Depression",
    status: "OPEN",
    reporter_name: "Citizen SOS Call",
    assigned_to: "SDRF Inflatable Boat Team (Dispatched)",
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
  },
];

const INITIAL_INCIDENT_AUDIT_LOGS: IncidentAuditLog[] = [
  {
    id: "inc-audit-001",
    incident_id: "inc-00000000-0000-0000-0000-000000000001",
    from_status: null,
    to_status: "OPEN",
    changer_name: "112 Dispatch Operator",
    notes: "Distress ticket logged from citizen SOS call.",
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
  {
    id: "inc-audit-002",
    incident_id: "inc-00000000-0000-0000-0000-000000000001",
    from_status: "OPEN",
    to_status: "ACKNOWLEDGED",
    changer_name: "Municipal Control Room Duty Officer",
    notes: "Acknowledged by PMC drainage engineering team.",
    created_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
  },
  {
    id: "inc-audit-003",
    incident_id: "inc-00000000-0000-0000-0000-000000000001",
    from_status: "ACKNOWLEDGED",
    to_status: "RESPONDING",
    changer_name: "EOC Incident Dispatcher",
    notes: "SDRF boat team and 2 high-capacity dewatering pumps deployed on site.",
    created_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
  },
  {
    id: "inc-audit-004",
    incident_id: "inc-00000000-0000-0000-0000-000000000002",
    from_status: null,
    to_status: "OPEN",
    changer_name: "Traffic Beat Marshal",
    notes: "Reported via wireless wireless trunking net.",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "inc-audit-005",
    incident_id: "inc-00000000-0000-0000-0000-000000000002",
    from_status: "OPEN",
    to_status: "ACKNOWLEDGED",
    changer_name: "PMC Garden Dept Dispatcher",
    notes: "Tree cutting squad and crane dispatched.",
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
];

// Persistent File Store for Sandbox Fallback
const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "incidents_store.json");

interface PersistedIncidentsStore {
  incidents: IncidentItem[];
  auditLogs: IncidentAuditLog[];
  nextSequence: number;
}

function loadPersistedIncidentsStore(): PersistedIncidentsStore {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.incidents) && Array.isArray(parsed.auditLogs)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[VarshaNetra:Incidents] Could not read store file, using in-memory default:", err);
  }

  const initial = {
    incidents: [...INITIAL_SEED_INCIDENTS],
    auditLogs: [...INITIAL_INCIDENT_AUDIT_LOGS],
    nextSequence: 5,
  };
  savePersistedIncidentsStore(initial);
  return initial;
}

function savePersistedIncidentsStore(store: PersistedIncidentsStore): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra:Incidents] Failed to save store file:", err);
  }
}

/**
 * Validates coordinate inputs strictly.
 */
export function validateIncidentCoordinates(
  lat: unknown,
  lon: unknown
): { valid: boolean; latitude: number; longitude: number; error?: string } {
  const latitude = typeof lat === "number" ? lat : parseFloat(String(lat));
  const longitude = typeof lon === "number" ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      valid: false,
      latitude: 0,
      longitude: 0,
      error: "Latitude and longitude must be valid floating-point numbers.",
    };
  }

  if (latitude < -90.0 || latitude > 90.0) {
    return {
      valid: false,
      latitude,
      longitude,
      error: `Latitude ${latitude} is out of range [-90.0, 90.0].`,
    };
  }

  if (longitude < -180.0 || longitude > 180.0) {
    return {
      valid: false,
      latitude,
      longitude,
      error: `Longitude ${longitude} is out of range [-180.0, 180.0].`,
    };
  }

  return { valid: true, latitude, longitude };
}

/**
 * Validates status transition against incident lifecycle state machine.
 */
export function isValidIncidentStatusTransition(
  current: IncidentStatus,
  target: IncidentStatus
): boolean {
  const allowed = VALID_INCIDENT_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Converts an IncidentItem to a MapFeatureItem for direct GIS map rendering.
 */
export function incidentToMapFeatureItem(incident: IncidentItem): MapFeatureItem {
  return {
    id: incident.id,
    name: `[${incident.incident_number}] ${incident.title}`,
    category: "INCIDENT",
    latitude: incident.latitude,
    longitude: incident.longitude,
    address: incident.location_name,
    status: incident.status,
    severity: incident.severity,
    details: `Type: ${incident.type} • Status: ${incident.status} • Assigned: ${incident.assigned_to || "Pending Dispatch"}`,
    reportedAt: incident.created_at,
    operator: incident.assigned_to || "EOC Incident Cell",
    metadata: {
      provider: "VarshaNetra Incident Dispatch 112",
      lastUpdated: incident.updated_at,
      origin: "LIVE_API",
      attributionNotice: "Emergency distress ticket geolocated by district EOC.",
    },
  };
}

/**
 * Fetches all incidents with optional multi-factor filters.
 */
export async function getIncidents(filters: IncidentFilters = {}): Promise<{
  incidents: IncidentItem[];
  count: number;
  metadata: DataSourceMeta;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("incidents").select("*", { count: "exact" });

      if (filters.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters.severity && filters.severity !== "ALL") {
        query = query.eq("severity", filters.severity);
      }
      if (filters.type && filters.type !== "ALL") {
        query = query.eq("type", filters.type);
      }
      if (filters.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filters.search);
        if (cleanSearch) {
          query = query.or(
            `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,location_name.ilike.%${cleanSearch}%,incident_number.ilike.%${cleanSearch}%`
          );
        }
      }

      query = query.order("created_at", { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          incidents: data as IncidentItem[],
          count: count ?? data.length,
          metadata: INCIDENTS_DATA_SOURCE_META,
        };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase query failed, falling back to persistent store:", err);
    }
  }

  // Persistent Store Fallback
  const store = loadPersistedIncidentsStore();
  let list = [...store.incidents];

  if (filters.status && filters.status !== "ALL") {
    list = list.filter((i) => i.status === filters.status);
  }
  if (filters.severity && filters.severity !== "ALL") {
    list = list.filter((i) => i.severity === filters.severity);
  }
  if (filters.type && filters.type !== "ALL") {
    list = list.filter((i) => i.type === filters.type);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location_name.toLowerCase().includes(q) ||
        i.incident_number.toLowerCase().includes(q) ||
        (i.assigned_to && i.assigned_to.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filters.limit) {
    list = list.slice(0, filters.limit);
  }

  return {
    incidents: list,
    count: list.length,
    metadata: {
      ...INCIDENTS_DATA_SOURCE_META,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Fetches an incident by ID with full audit log history.
 */
export async function getIncidentById(id: string): Promise<{
  incident: IncidentItem | null;
  auditLogs: IncidentAuditLog[];
  metadata: DataSourceMeta;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const [incRes, auditRes] = await Promise.all([
        supabase.from("incidents").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("incident_audit_logs")
          .select("*")
          .eq("incident_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!incRes.error && incRes.data) {
        return {
          incident: incRes.data as IncidentItem,
          auditLogs: (auditRes.data || []) as IncidentAuditLog[],
          metadata: INCIDENTS_DATA_SOURCE_META,
        };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase getIncidentById failed, using persistent store:", err);
    }
  }

  const store = loadPersistedIncidentsStore();
  const incident = store.incidents.find((i) => i.id === id) || null;
  const auditLogs = store.auditLogs
    .filter((log) => log.incident_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    incident,
    auditLogs,
    metadata: INCIDENTS_DATA_SOURCE_META,
  };
}

/**
 * Creates a new incident with strict coordinate and payload validation.
 */
export async function createIncident(
  input: CreateIncidentInput,
  user?: { id?: string; name?: string }
): Promise<{ success: boolean; incident?: IncidentItem; error?: string }> {
  // 1. Coordinate Validation
  const coordCheck = validateIncidentCoordinates(input.latitude, input.longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  // 2. Text Validation
  if (!input.title || input.title.trim().length < 3) {
    return { success: false, error: "Incident title must be at least 3 characters." };
  }
  if (!input.location_name || input.location_name.trim().length < 2) {
    return { success: false, error: "Location name is required." };
  }
  if (!input.description || input.description.trim().length < 5) {
    return { success: false, error: "Detailed incident description is required." };
  }

  const store = loadPersistedIncidentsStore();
  const seqNum = store.nextSequence || 5;
  const incidentNumber = `INC-2026-${String(seqNum).padStart(3, "0")}`;

  const newIncident: IncidentItem = {
    id: `inc-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`,
    incident_number: incidentNumber,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    latitude: coordCheck.latitude,
    longitude: coordCheck.longitude,
    location_name: input.location_name.trim(),
    status: "OPEN",
    created_by: user?.id || null,
    reporter_name: input.reporter_name || user?.name || "EOC Incident Dispatch",
    assigned_to: input.assigned_to || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const initialAudit: IncidentAuditLog = {
    id: `inc-audit-${Date.now()}`,
    incident_id: newIncident.id,
    from_status: null,
    to_status: "OPEN",
    changed_by: user?.id || null,
    changer_name: user?.name || "EOC Incident Dispatch",
    notes: `Incident logged at ${newIncident.location_name} (${coordCheck.latitude.toFixed(4)}, ${coordCheck.longitude.toFixed(4)}).`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("incidents").insert(newIncident).select().single();
      if (!error && data) {
        await supabase.from("incident_audit_logs").insert(initialAudit);
        return { success: true, incident: data as IncidentItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase insert failed, saving to persistent store:", err);
    }
  }

  store.incidents.unshift(newIncident);
  store.auditLogs.unshift(initialAudit);
  store.nextSequence = seqNum + 1;
  savePersistedIncidentsStore(store);

  void recordAuditLog({
    actor_id: user?.id || null,
    actor_name: user?.name || "EOC Incident Dispatch",
    action: "INCIDENT_CREATED",
    entity_type: "incident",
    entity_id: newIncident.id,
    description: `Incident ${newIncident.incident_number} (${newIncident.type}) logged at ${newIncident.location_name} with severity ${newIncident.severity}`,
    metadata: {
      incident_number: newIncident.incident_number,
      type: newIncident.type,
      severity: newIncident.severity,
      location_name: newIncident.location_name,
      latitude: newIncident.latitude,
      longitude: newIncident.longitude,
    },
  }).catch(() => {});

  return { success: true, incident: newIncident };
}

/**
 * Updates editable fields of an incident.
 */
export async function updateIncident(
  id: string,
  input: UpdateIncidentInput
): Promise<{ success: boolean; incident?: IncidentItem; error?: string }> {
  const { incident } = await getIncidentById(id);
  if (!incident) {
    return { success: false, error: "Incident not found." };
  }

  let lat = incident.latitude;
  let lon = incident.longitude;

  if (input.latitude !== undefined || input.longitude !== undefined) {
    const coordCheck = validateIncidentCoordinates(
      input.latitude ?? incident.latitude,
      input.longitude ?? incident.longitude
    );
    if (!coordCheck.valid) {
      return { success: false, error: coordCheck.error };
    }
    lat = coordCheck.latitude;
    lon = coordCheck.longitude;
  }

  const updated: IncidentItem = {
    ...incident,
    type: input.type || incident.type,
    title: input.title !== undefined ? input.title.trim() : incident.title,
    description: input.description !== undefined ? input.description.trim() : incident.description,
    severity: input.severity || incident.severity,
    latitude: lat,
    longitude: lon,
    location_name: input.location_name !== undefined ? input.location_name.trim() : incident.location_name,
    assigned_to: input.assigned_to !== undefined ? input.assigned_to : incident.assigned_to,
    reporter_name: input.reporter_name !== undefined ? input.reporter_name : incident.reporter_name,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("incidents").update(updated).eq("id", id).select().single();
      if (!error && data) {
        return { success: true, incident: data as IncidentItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase updateIncident failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedIncidentsStore();
  const idx = store.incidents.findIndex((i) => i.id === id);
  if (idx !== -1) {
    store.incidents[idx] = updated;
    savePersistedIncidentsStore(store);
  }

  if (input.assigned_to) {
    createNotification({
      event_type: "INCIDENT_ASSIGNED",
      title: `Incident Assigned: ${incident.incident_number}`,
      message: `${incident.type} at ${incident.location_name} assigned to ${input.assigned_to}.`,
      severity: incident.severity,
      deep_link: `/incidents?id=${id}`,
      related_id: id,
    }).catch((err) => console.warn("Failed to dispatch incident assigned notification:", err));
  }

  return { success: true, incident: updated };
}

/**
 * Transitions incident status and writes an audit log entry.
 */
export async function transitionIncidentStatus(
  id: string,
  newStatus: IncidentStatus,
  user?: { id?: string; name?: string },
  notes?: string
): Promise<{ success: boolean; incident?: IncidentItem; error?: string }> {
  const { incident } = await getIncidentById(id);
  if (!incident) {
    return { success: false, error: "Incident not found." };
  }

  if (incident.status === newStatus) {
    return { success: true, incident };
  }

  if (!isValidIncidentStatusTransition(incident.status, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from '${incident.status}' to '${newStatus}'. Permitted next states: ${(
        VALID_INCIDENT_TRANSITIONS[incident.status] || []
      ).join(", ") || "None"}.`,
    };
  }

  const updated: IncidentItem = {
    ...incident,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const auditEntry: IncidentAuditLog = {
    id: `inc-audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    incident_id: id,
    from_status: incident.status,
    to_status: newStatus,
    changed_by: user?.id || null,
    changer_name: user?.name || "Command Dispatch Officer",
    notes: notes || `Status transitioned to ${newStatus}.`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("incidents").update(updated).eq("id", id).select().single();
      if (!error && data) {
        await supabase.from("incident_audit_logs").insert(auditEntry);
        return { success: true, incident: data as IncidentItem };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase transition failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedIncidentsStore();
  const idx = store.incidents.findIndex((i) => i.id === id);
  if (idx !== -1) {
    store.incidents[idx] = updated;
    store.auditLogs.unshift(auditEntry);
    savePersistedIncidentsStore(store);
  }

  void recordAuditLog({
    actor_id: user?.id || null,
    actor_name: user?.name || "Command Dispatch Officer",
    action: "INCIDENT_STATUS_CHANGED",
    entity_type: "incident",
    entity_id: id,
    description: `Incident ${incident.incident_number} status changed from ${incident.status} to ${newStatus}`,
    metadata: {
      incident_number: incident.incident_number,
      from_status: incident.status,
      to_status: newStatus,
      notes: notes || null,
    },
  }).catch(() => {});

  return { success: true, incident: updated };
}

/**
 * Deletes an incident record (permitted for OPEN status or testing).
 */
export async function deleteIncident(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { incident } = await getIncidentById(id);
  if (!incident) {
    return { success: false, error: "Incident not found." };
  }

  if (incident.status !== "OPEN" && incident.status !== "CLOSED") {
    return {
      success: false,
      error: "Only OPEN or CLOSED incidents can be purged. Ongoing operations must be tracked.",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("incidents").delete().eq("id", id);
      return { success: true };
    } catch (err) {
      console.warn("[VarshaNetra:Incidents] Supabase delete failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedIncidentsStore();
  store.incidents = store.incidents.filter((i) => i.id !== id);
  store.auditLogs = store.auditLogs.filter((l) => l.incident_id !== id);
  savePersistedIncidentsStore(store);

  return { success: true };
}

/**
 * Returns active incidents mapped as MapFeatureItem[] for GIS map rendering.
 */
export async function getActiveIncidentsAsMapFeatures(): Promise<MapFeatureItem[]> {
  const res = await getIncidents();
  const active = res.incidents.filter(
    (i) => i.status === "OPEN" || i.status === "ACKNOWLEDGED" || i.status === "RESPONDING"
  );
  return active.map(incidentToMapFeatureItem);
}
