"use strict";

import fs from "fs";
import path from "path";
import {
  ResponseTeam,
  ResponseTeamStatus,
  IncidentAssignment,
  CreateTeamInput,
  UpdateTeamInput,
  CreateAssignmentInput,
  UpdateAssignmentStatusInput,
  ResponseTeamsFilter,
  MapFeatureItem,
  DataSourceMeta,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { getIncidentById } from "./incidents";
import { createNotification } from "@/lib/services/notifications";
import { recordAuditLog } from "@/lib/services/audit-logs";
import { sanitizePostgrestSearchTerm } from "@/lib/security/validation";

const RESPONSE_TEAMS_DATA_SOURCE_META: DataSourceMeta = {
  provider: "District EOC Tactical Force Dispatch & SDRF/NDRF Grid",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Tactical response units and incident tasking roster. Coordinates represent user-reported staging posts.",
};

const INITIAL_RESPONSE_TEAMS: ResponseTeam[] = [
  {
    id: "team-00000000-0000-0000-0000-000000000001",
    name: "SDRF Unit 1 (5th Bn.)",
    agency: "SDRF",
    personnel_count: 14,
    status: "ON_SITE",
    latitude: 18.4985,
    longitude: 73.8345,
    location_name: "Sinhagad Road Staging Depot, Haveli",
    contact_number: "+91 98220 11201",
    equipment: "2 Inflatable Gemini Boats with 40HP OBM, 4 Submersible Dewatering Pumps, Lifejackets",
    notes: "Specialized in urban flash flood evacuation and swiftwater navigation.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "team-00000000-0000-0000-0000-000000000002",
    name: "NDRF 5th Battalion Unit Bravo",
    agency: "NDRF",
    personnel_count: 22,
    status: "EN_ROUTE",
    latitude: 18.5315,
    longitude: 73.8648,
    location_name: "Sangamwadi Boat Ghat, Bund Garden",
    contact_number: "+91 94220 55432",
    equipment: "3 Heavy Inflatable Rafts, Hydraulic Cutters, Satellite Comm Gear, Medical First Aid Kit",
    notes: "Pre-positioned for major river catchment surge and low-lying bridge monitoring.",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
  },
  {
    id: "team-00000000-0000-0000-0000-000000000003",
    name: "PMC Fire & Water Rescue Squad #3",
    agency: "Fire Brigade",
    personnel_count: 8,
    status: "AVAILABLE",
    latitude: 18.5168,
    longitude: 73.8412,
    location_name: "Erandwane Fire Station Depot",
    contact_number: "020-25443322",
    equipment: "High-Capacity Dewatering Truck, 1 Aluminum Rescue Boat, Cutting Torches",
    notes: "Reserve standby ready for underpass waterlogging and fallen tree clearance.",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "team-00000000-0000-0000-0000-000000000004",
    name: "Pune Police Disaster Quick Response Team",
    agency: "Police",
    personnel_count: 10,
    status: "AVAILABLE",
    latitude: 18.5204,
    longitude: 73.8567,
    location_name: "Police Commissionerate HQ",
    contact_number: "112 / 100",
    equipment: "4 Patrol Cruisers, Wireless Trunking Radios, Traffic Barricades & Flood Warning Signage",
    notes: "Traffic diversions, bridge causeway cordons, and law & order security in evacuated sectors.",
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

const INITIAL_ASSIGNMENTS: IncidentAssignment[] = [
  {
    id: "asgn-00000000-0000-0000-0000-000000000001",
    incident_id: "inc-00000000-0000-0000-0000-000000000001",
    team_id: "team-00000000-0000-0000-0000-000000000001",
    assigned_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    assignment_status: "ON_SITE",
    notes: "Deployed to Sinhagad Road outfall. Pumping out basements and evacuating ground floor residents.",
    assigned_by: "District EOC Duty Officer",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// Persistent File Store for Sandbox Fallback
const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "response_teams_store.json");

interface PersistedResponseStore {
  teams: ResponseTeam[];
  assignments: IncidentAssignment[];
}

function loadPersistedResponseStore(): PersistedResponseStore {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.teams) && Array.isArray(parsed.assignments)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[VarshaNetra:ResponseTeams] Could not read store file, using in-memory default:", err);
  }

  const initial: PersistedResponseStore = {
    teams: [...INITIAL_RESPONSE_TEAMS],
    assignments: [...INITIAL_ASSIGNMENTS],
  };
  savePersistedResponseStore(initial);
  return initial;
}

function savePersistedResponseStore(store: PersistedResponseStore): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra:ResponseTeams] Failed to save store file:", err);
  }
}

/**
 * Validates team coordinates if provided. Coordinates are optional for teams.
 */
export function validateTeamCoordinates(
  lat?: unknown,
  lon?: unknown
): { valid: boolean; latitude: number | null; longitude: number | null; error?: string } {
  if (lat === null || lat === undefined || lat === "" || lon === null || lon === undefined || lon === "") {
    return { valid: true, latitude: null, longitude: null };
  }

  const latitude = typeof lat === "number" ? lat : parseFloat(String(lat));
  const longitude = typeof lon === "number" ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      valid: false,
      latitude: null,
      longitude: null,
      error: "Coordinates must be valid numbers when provided.",
    };
  }

  if (latitude < -90.0 || latitude > 90.0) {
    return {
      valid: false,
      latitude: null,
      longitude: null,
      error: `Latitude ${latitude} is out of range [-90.0, 90.0].`,
    };
  }

  if (longitude < -180.0 || longitude > 180.0) {
    return {
      valid: false,
      latitude: null,
      longitude: null,
      error: `Longitude ${longitude} is out of range [-180.0, 180.0].`,
    };
  }

  return { valid: true, latitude, longitude };
}

/**
 * Returns list of response teams with active assignment metadata.
 */
export async function getResponseTeams(
  filters: ResponseTeamsFilter = {}
): Promise<{ teams: ResponseTeam[]; count: number; metadata: DataSourceMeta }> {
  const store = loadPersistedResponseStore();
  let teams = [...store.teams];

  // Supabase postgrest query if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let q = supabase.from("response_teams").select("*");

      if (filters.status && filters.status !== "ALL") {
        q = q.eq("status", filters.status);
      }
      if (filters.agency && filters.agency !== "ALL") {
        q = q.eq("agency", filters.agency);
      }
      if (filters.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filters.search);
        if (cleanSearch) {
          q = q.or(`name.ilike.%${cleanSearch}%,location_name.ilike.%${cleanSearch}%,equipment.ilike.%${cleanSearch}%`);
        }
      }

      const { data, error } = await q.order("name", { ascending: true });
      if (!error && Array.isArray(data)) {
        teams = data as ResponseTeam[];
      }
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase query failed, falling back to persistent store:", err);
    }
  } else {
    // In-memory / file filter
    if (filters.status && filters.status !== "ALL") {
      teams = teams.filter((t) => t.status === filters.status);
    }
    if (filters.agency && filters.agency !== "ALL") {
      teams = teams.filter((t) => t.agency === filters.agency);
    }
    if (filters.search?.trim()) {
      const s = filters.search.toLowerCase().trim();
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.agency.toLowerCase().includes(s) ||
          (t.location_name && t.location_name.toLowerCase().includes(s)) ||
          (t.equipment && t.equipment.toLowerCase().includes(s))
      );
    }
  }

  // Attach active assignment context
  const activeAssignments = store.assignments.filter(
    (a) => a.assignment_status !== "COMPLETED" && a.assignment_status !== "STAND_DOWN"
  );

  const enrichedTeams = teams.map((team) => {
    const active = activeAssignments.filter((a) => a.team_id === team.id);
    return {
      ...team,
      active_assignment_count: active.length,
      current_assignment: active.length > 0 ? active[0] : null,
    };
  });

  return {
    teams: enrichedTeams,
    count: enrichedTeams.length,
    metadata: RESPONSE_TEAMS_DATA_SOURCE_META,
  };
}

/**
 * Returns single team with full assignment history.
 */
export async function getResponseTeamById(
  id: string
): Promise<{ team?: ResponseTeam; assignments: IncidentAssignment[]; error?: string }> {
  const store = loadPersistedResponseStore();
  let team: ResponseTeam | undefined = store.teams.find((t) => t.id === id);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("response_teams").select("*").eq("id", id).single();
      if (!error && data) {
        team = data as ResponseTeam;
      }
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase find team failed:", err);
    }
  }

  if (!team) {
    return { assignments: [], error: "Response team not found." };
  }

  const assignments = store.assignments.filter((a) => a.team_id === id);

  return { team, assignments };
}

/**
 * Creates a new tactical response team.
 */
export async function createResponseTeam(
  input: CreateTeamInput
): Promise<{ success: boolean; team?: ResponseTeam; error?: string }> {
  if (!input.name?.trim()) {
    return { success: false, error: "Team name is required." };
  }
  if (!input.agency?.trim()) {
    return { success: false, error: "Agency designation is required." };
  }
  if (!input.personnel_count || input.personnel_count < 1) {
    return { success: false, error: "Personnel count must be at least 1." };
  }

  const coordCheck = validateTeamCoordinates(input.latitude, input.longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const now = new Date().toISOString();
  const newTeam: ResponseTeam = {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    agency: input.agency.trim(),
    personnel_count: Number(input.personnel_count),
    status: input.status || "AVAILABLE",
    latitude: coordCheck.latitude,
    longitude: coordCheck.longitude,
    location_name: input.location_name?.trim() || null,
    contact_number: input.contact_number?.trim() || null,
    equipment: input.equipment?.trim() || null,
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("response_teams").insert(newTeam).select().single();
      if (error) throw error;
      if (data) return { success: true, team: data as ResponseTeam };
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase insert failed, persisting to store:", err);
    }
  }

  const store = loadPersistedResponseStore();
  store.teams.unshift(newTeam);
  savePersistedResponseStore(store);

  return { success: true, team: newTeam };
}

/**
 * Updates an existing tactical response team.
 */
export async function updateResponseTeam(
  id: string,
  input: UpdateTeamInput
): Promise<{ success: boolean; team?: ResponseTeam; error?: string }> {
  const { team: existing } = await getResponseTeamById(id);
  if (!existing) {
    return { success: false, error: "Response team not found." };
  }

  const coordCheck = validateTeamCoordinates(
    input.latitude !== undefined ? input.latitude : existing.latitude,
    input.longitude !== undefined ? input.longitude : existing.longitude
  );
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const updated: ResponseTeam = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    agency: input.agency !== undefined ? input.agency.trim() : existing.agency,
    personnel_count:
      input.personnel_count !== undefined ? Number(input.personnel_count) : existing.personnel_count,
    status: input.status !== undefined ? input.status : existing.status,
    latitude: coordCheck.latitude,
    longitude: coordCheck.longitude,
    location_name: input.location_name !== undefined ? input.location_name : existing.location_name,
    contact_number: input.contact_number !== undefined ? input.contact_number : existing.contact_number,
    equipment: input.equipment !== undefined ? input.equipment : existing.equipment,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("response_teams").update(updated).eq("id", id).select().single();
      if (!error && data) return { success: true, team: data as ResponseTeam };
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase update failed, updating persistent store:", err);
    }
  }

  const store = loadPersistedResponseStore();
  const idx = store.teams.findIndex((t) => t.id === id);
  if (idx !== -1) {
    store.teams[idx] = updated;
    savePersistedResponseStore(store);
  }

  return { success: true, team: updated };
}

/**
 * Deletes a response team (if no active assignments).
 */
export async function deleteResponseTeam(id: string): Promise<{ success: boolean; error?: string }> {
  const store = loadPersistedResponseStore();
  const hasActiveAssignment = store.assignments.some(
    (a) => a.team_id === id && a.assignment_status !== "COMPLETED" && a.assignment_status !== "STAND_DOWN"
  );

  if (hasActiveAssignment) {
    return {
      success: false,
      error: "Cannot delete team with ongoing active incident assignments. Complete or stand-down assignments first.",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("response_teams").delete().eq("id", id);
      return { success: true };
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase delete failed, removing from store:", err);
    }
  }

  store.teams = store.teams.filter((t) => t.id !== id);
  store.assignments = store.assignments.filter((a) => a.team_id !== id);
  savePersistedResponseStore(store);

  return { success: true };
}

/**
 * Creates an incident assignment with conflict prevention.
 */
export async function createIncidentAssignment(
  input: CreateAssignmentInput
): Promise<{
  success: boolean;
  assignment?: IncidentAssignment;
  error?: string;
  conflict?: {
    isConflicting: boolean;
    conflictingIncidentNumber: string;
    conflictingIncidentTitle: string;
    teamName: string;
    currentStatus: ResponseTeamStatus;
  };
}> {
  if (!input.incident_id?.trim()) {
    return { success: false, error: "Incident ID is required." };
  }
  if (!input.team_id?.trim()) {
    return { success: false, error: "Team ID is required." };
  }

  const store = loadPersistedResponseStore();
  const team = store.teams.find((t) => t.id === input.team_id);
  if (!team) {
    return { success: false, error: "Selected response team not found." };
  }

  const { incident } = await getIncidentById(input.incident_id);
  if (!incident) {
    return { success: false, error: "Target incident not found." };
  }

  // Conflict Checking: Check if team is currently in an active deployment
  const activeAssignment = store.assignments.find(
    (a) =>
      a.team_id === input.team_id &&
      (a.assignment_status === "ASSIGNED" ||
        a.assignment_status === "EN_ROUTE" ||
        a.assignment_status === "ON_SITE")
  );

  if (activeAssignment && !input.allow_conflict_override) {
    const conflictingIncident = await getIncidentById(activeAssignment.incident_id);
    const incidentNum = conflictingIncident.incident?.incident_number || "Existing Incident";
    const incidentTitle = conflictingIncident.incident?.title || "Active Mission";

    return {
      success: false,
      error: `Team "${team.name}" is already actively deployed on ${incidentNum} ("${incidentTitle}"). Confirmation required to override and double-assign.`,
      conflict: {
        isConflicting: true,
        conflictingIncidentNumber: incidentNum,
        conflictingIncidentTitle: incidentTitle,
        teamName: team.name,
        currentStatus: team.status,
      },
    };
  }

  const now = new Date().toISOString();
  const newAssignment: IncidentAssignment = {
    id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    incident_id: input.incident_id,
    team_id: input.team_id,
    assigned_at: now,
    assignment_status: input.assignment_status || "ASSIGNED",
    notes: input.notes?.trim() || null,
    assigned_by: input.assigned_by || "EOC Tactical Dispatcher",
    created_at: now,
    updated_at: now,
    team,
    incident,
  };

  // Update team status to ASSIGNED or EN_ROUTE
  const targetStatus: ResponseTeamStatus =
    input.assignment_status === "ON_SITE"
      ? "ON_SITE"
      : input.assignment_status === "EN_ROUTE"
      ? "EN_ROUTE"
      : "ASSIGNED";

  const updatedTeam: ResponseTeam = {
    ...team,
    status: targetStatus,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("incident_assignments").insert({
        id: newAssignment.id,
        incident_id: newAssignment.incident_id,
        team_id: newAssignment.team_id,
        assigned_at: newAssignment.assigned_at,
        assignment_status: newAssignment.assignment_status,
        notes: newAssignment.notes,
        assigned_by: newAssignment.assigned_by,
      });

      await supabase.from("response_teams").update({ status: targetStatus }).eq("id", team.id);

      // Add audit log on the incident
      await supabase.from("incident_audit_logs").insert({
        incident_id: incident.id,
        from_status: incident.status,
        to_status: incident.status,
        changer_name: input.assigned_by || "EOC Tactical Dispatcher",
        notes: `Assigned tactical response team: ${team.name} (${team.agency}). Status: ${newAssignment.assignment_status}. ${input.notes ? 'Notes: ' + input.notes : ''}`,
      });
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase assignment insert failed:", err);
    }
  }

  // Update persistent store
  store.assignments.unshift(newAssignment);
  const teamIdx = store.teams.findIndex((t) => t.id === team.id);
  if (teamIdx !== -1) {
    store.teams[teamIdx] = updatedTeam;
  }
  savePersistedResponseStore(store);

  createNotification({
    event_type: "RESPONSE_TEAM_ASSIGNMENT",
    title: `Team Dispatched: ${team.name}`,
    message: `${team.name} (${team.agency}) assigned to ${incident.incident_number} at ${incident.location_name}.`,
    severity: incident.severity || "ALERT",
    deep_link: `/response?teamId=${team.id}`,
    related_id: newAssignment.id,
  }).catch((err) => console.warn("Failed to dispatch team assignment notification:", err));

  void recordAuditLog({
    actor_id: null,
    actor_name: input.assigned_by || "EOC Tactical Dispatcher",
    action: "TEAM_ASSIGNED",
    entity_type: "response_team",
    entity_id: team.id,
    description: `Tactical team '${team.name}' assigned to incident ${incident.incident_number} (${incident.location_name})`,
    metadata: {
      team_id: team.id,
      team_name: team.name,
      agency: team.agency,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      assignment_status: newAssignment.assignment_status,
    },
  }).catch(() => {});

  return { success: true, assignment: newAssignment };
}

/**
 * Updates assignment status and automatically updates team status.
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  input: UpdateAssignmentStatusInput
): Promise<{ success: boolean; assignment?: IncidentAssignment; error?: string }> {
  const store = loadPersistedResponseStore();
  const assignment = store.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { success: false, error: "Incident assignment not found." };
  }

  const now = new Date().toISOString();
  const prevStatus = assignment.assignment_status;
  const newStatus = input.assignment_status;

  const updatedAssignment: IncidentAssignment = {
    ...assignment,
    assignment_status: newStatus,
    notes: input.notes !== undefined ? input.notes : assignment.notes,
    updated_at: now,
  };

  // Sync Team Status
  const team = store.teams.find((t) => t.id === assignment.team_id);
  let newTeamStatus: ResponseTeamStatus = team ? team.status : "AVAILABLE";

  if (team) {
    if (newStatus === "ON_SITE") {
      newTeamStatus = "ON_SITE";
    } else if (newStatus === "EN_ROUTE") {
      newTeamStatus = "EN_ROUTE";
    } else if (newStatus === "COMPLETED" || newStatus === "STAND_DOWN") {
      // Check if team has any OTHER active assignments
      const otherActive = store.assignments.some(
        (a) =>
          a.id !== assignmentId &&
          a.team_id === team.id &&
          (a.assignment_status === "ASSIGNED" ||
            a.assignment_status === "EN_ROUTE" ||
            a.assignment_status === "ON_SITE")
      );
      newTeamStatus = otherActive ? "ASSIGNED" : "AVAILABLE";
    }

    team.status = newTeamStatus;
    team.updated_at = now;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase
        .from("incident_assignments")
        .update({
          assignment_status: newStatus,
          notes: updatedAssignment.notes,
          updated_at: now,
        })
        .eq("id", assignmentId);

      if (team) {
        await supabase.from("response_teams").update({ status: newTeamStatus }).eq("id", team.id);
      }

      // Record audit log on the incident
      await supabase.from("incident_audit_logs").insert({
        incident_id: assignment.incident_id,
        from_status: null,
        to_status: null,
        changer_name: input.changer_name || "Tactical Unit Commander",
        notes: `Team "${team?.name || 'Unit'}" mission status updated: ${prevStatus} -> ${newStatus}. ${input.notes ? 'Notes: ' + input.notes : ''}`,
      });
    } catch (err) {
      console.warn("[VarshaNetra:ResponseTeams] Supabase update assignment failed:", err);
    }
  }

  // Update persistent file store
  const asgnIdx = store.assignments.findIndex((a) => a.id === assignmentId);
  if (asgnIdx !== -1) {
    store.assignments[asgnIdx] = updatedAssignment;
  }
  savePersistedResponseStore(store);

  void recordAuditLog({
    actor_id: null,
    actor_name: input.changer_name || "Tactical Unit Commander",
    action: "ASSIGNMENT_STATUS_CHANGED",
    entity_type: "response_team",
    entity_id: assignment.team_id,
    description: `Assignment status for team '${team?.name || 'Unit'}' changed from ${prevStatus} to ${newStatus}`,
    metadata: {
      assignment_id: assignmentId,
      team_id: assignment.team_id,
      incident_id: assignment.incident_id,
      prev_status: prevStatus,
      new_status: newStatus,
      notes: input.notes || null,
    },
  }).catch(() => {});

  return { success: true, assignment: updatedAssignment };
}

/**
 * Returns assignments, optionally filtered by incident_id or team_id.
 */
export async function getAssignments(filters?: {
  incident_id?: string;
  team_id?: string;
}): Promise<IncidentAssignment[]> {
  const store = loadPersistedResponseStore();
  let assignments = store.assignments;

  if (filters?.incident_id) {
    assignments = assignments.filter((a) => a.incident_id === filters.incident_id);
  }
  if (filters?.team_id) {
    assignments = assignments.filter((a) => a.team_id === filters.team_id);
  }

  return assignments.map((a) => ({
    ...a,
    team: store.teams.find((t) => t.id === a.team_id),
  }));
}

/**
 * Returns all assignments linked to a specific incident ID.
 */
export async function getAssignmentsForIncident(
  incidentId: string
): Promise<IncidentAssignment[]> {
  return getAssignments({ incident_id: incidentId });
}

/**
 * Converts a ResponseTeam with valid coordinates into a MapFeatureItem for GIS display.
 * Truthfulness Directive: Coordinates are labeled "User-Reported Staging Coordinates".
 */
export function teamToMapFeatureItem(team: ResponseTeam): MapFeatureItem | null {
  if (team.latitude === null || team.longitude === null) {
    return null;
  }

  return {
    id: team.id,
    name: `[${team.agency}] ${team.name}`,
    category: "RESPONSE_TEAM",
    latitude: team.latitude,
    longitude: team.longitude,
    address: team.location_name || `Staging Base (${team.latitude.toFixed(4)}° N, ${team.longitude.toFixed(4)}° E)`,
    contactNumber: team.contact_number || undefined,
    status: team.status,
    details: `Agency: ${team.agency} • Personnel: ${team.personnel_count} • Status: ${team.status} • Equipment: ${team.equipment || "Standard kit"}`,
    operator: `${team.agency} Command`,
    metadata: {
      provider: "VarshaNetra EOC Response Dispatch (User-Reported Coordinates)",
      lastUpdated: team.updated_at,
      origin: "LIVE_API",
      attributionNotice:
        "Tactical staging coordinates manually configured by EOC dispatcher. Not a live satellite GPS transponder beacon.",
    },
  };
}

/**
 * Returns all active response teams that have coordinates as GIS map features.
 */
export async function getActiveResponseTeamsAsMapFeatures(): Promise<MapFeatureItem[]> {
  const { teams } = await getResponseTeams();
  const features: MapFeatureItem[] = [];

  for (const team of teams) {
    const feat = teamToMapFeatureItem(team);
    if (feat) {
      features.push(feat);
    }
  }

  return features;
}
