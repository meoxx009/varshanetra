"use strict";

import fs from "fs";
import path from "path";
import {
  FieldReport,
  CreateFieldReportInput,
  VerifyFieldReportInput,
  FieldReportsFilter,
  MapFeatureItem,
  DataSourceMeta,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notifications";
import { recordAuditLog } from "@/lib/services/audit-logs";
import { sanitizePostgrestSearchTerm } from "@/lib/security/validation";

const FIELD_REPORTS_DATA_SOURCE_META: DataSourceMeta = {
  provider: "Ground Field Truth Inspection Desk & Talathi Ingress",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Direct on-site field observation reports submitted by revenue officers and municipal inspectors. Visually verified ground truth; not a mathematical forecast.",
};

const INITIAL_FIELD_REPORTS: FieldReport[] = [
  {
    id: "rep-00000000-0000-0000-0000-000000000001",
    report_number: "REP-2026-001",
    report_type: "Road Block",
    severity: "ALERT",
    latitude: 18.4985,
    longitude: 73.8345,
    location_name: "Sinhagad Road Culvert Crossing, Haveli",
    observed_water_depth_cm: 65,
    people_requiring_assistance: 12,
    road_status: "IMPASSABLE_CLOSED",
    description:
      "Water overflowing embankment by 65cm. Silt and plastic waste blocking twin 900mm Hume pipes. 12 residents in low-lying chawl require evacuation to higher ground.",
    photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    photo_thumbnail_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=300&q=80",
    verification_status: "VERIFIED",
    observer_name: "V. R. Kulkarni",
    observer_role: "Talathi (Haveli Circle)",
    observer_contact: "+91 98220 14455",
    verified_by: "District EOC Duty Tehsildar",
    verified_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    verification_notes: "Confirmed on VHF radio. SDRF unit dispatched with inflatable boat.",
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "rep-00000000-0000-0000-0000-000000000002",
    report_number: "REP-2026-002",
    report_type: "Waterlogging",
    severity: "CRITICAL",
    latitude: 18.5785,
    longitude: 73.8182,
    location_name: "Dapodi Railway Underpass, Old Pune-Mumbai Highway",
    observed_water_depth_cm: 110,
    people_requiring_assistance: 4,
    road_status: "IMPASSABLE_CLOSED",
    description:
      "Underpass fully submerged to 1.10 meters. One state transport bus stranded inside with 4 passengers trapped on roof. Traffic completely diverted to Harris Bridge.",
    photo_url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80",
    photo_thumbnail_url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=300&q=80",
    verification_status: "VERIFIED",
    observer_name: "A. S. More",
    observer_role: "Municipal Ward Inspector",
    observer_contact: "+91 94220 33881",
    verified_by: "PMC Disaster Management Cell",
    verified_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    verification_notes: "Traffic police barricades established. Rescue boat team arriving on scene.",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: "rep-00000000-0000-0000-0000-000000000003",
    report_number: "REP-2026-003",
    report_type: "River Breach",
    severity: "ALERT",
    latitude: 18.5315,
    longitude: 73.8648,
    location_name: "Sangamwadi Boat Ghat, Bund Garden",
    observed_water_depth_cm: 40,
    people_requiring_assistance: 0,
    road_status: "SUBMERGED_PASSABLE",
    description:
      "Mula-Mutha confluence river swell breaching left bank retaining wall by 40cm. Riverside promenade inundated. Caution sirens sounded.",
    photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    photo_thumbnail_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=300&q=80",
    verification_status: "UNVERIFIED",
    observer_name: "P. N. Shinde",
    observer_role: "Junior Engineer (Irrigation Dept)",
    observer_contact: "+91 97650 99221",
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

const LOCAL_DATA_FILE = path.join(process.cwd(), ".data", "field_reports_store.json");

interface FieldReportsStore {
  reports: FieldReport[];
  updatedAt: string;
}

function ensureDataFile(): FieldReportsStore {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      const initialStore: FieldReportsStore = {
        reports: INITIAL_FIELD_REPORTS,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(initialStore, null, 2), "utf8");
      return initialStore;
    }
    const raw = fs.readFileSync(LOCAL_DATA_FILE, "utf8");
    return JSON.parse(raw) as FieldReportsStore;
  } catch (err) {
    console.warn("[VarshaNetra] Could not read field reports local file store, using initial data:", err);
    return {
      reports: INITIAL_FIELD_REPORTS,
      updatedAt: new Date().toISOString(),
    };
  }
}

function persistDataFile(store: FieldReportsStore) {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra] Failed to persist field reports file store:", err);
  }
}

export async function getFieldReports(filter?: FieldReportsFilter): Promise<FieldReport[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("field_reports").select("*").order("created_at", { ascending: false });

      if (filter?.verification_status) {
        query = query.eq("verification_status", filter.verification_status);
      }
      if (filter?.report_type) {
        query = query.eq("report_type", filter.report_type);
      }
      if (filter?.severity) {
        query = query.eq("severity", filter.severity);
      }
      if (filter?.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filter.search);
        if (cleanSearch) {
          query = query.or(
            `report_number.ilike.%${cleanSearch}%,location_name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,observer_name.ilike.%${cleanSearch}%`
          );
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as FieldReport[];
      }
      console.warn("[VarshaNetra] Supabase query for field_reports failed, falling back to local file:", error);
    } catch (e) {
      console.warn("[VarshaNetra] Error accessing Supabase for field_reports:", e);
    }
  }

  const store = ensureDataFile();
  let result = [...store.reports];

  if (filter?.verification_status) {
    result = result.filter((r) => r.verification_status === filter.verification_status);
  }
  if (filter?.report_type) {
    result = result.filter((r) => r.report_type === filter.report_type);
  }
  if (filter?.severity) {
    result = result.filter((r) => r.severity === filter.severity);
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.report_number.toLowerCase().includes(s) ||
        r.location_name.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.observer_name.toLowerCase().includes(s)
    );
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getFieldReportById(id: string): Promise<FieldReport | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("field_reports").select("*").eq("id", id).single();
      if (!error && data) return data as FieldReport;
    } catch (e) {
      console.warn("[VarshaNetra] Error fetching field report from Supabase:", e);
    }
  }

  const store = ensureDataFile();
  return store.reports.find((r) => r.id === id || r.report_number === id) || null;
}

export async function createFieldReport(input: CreateFieldReportInput): Promise<FieldReport> {
  // Validate coordinates within India
  if (input.latitude < 6.0 || input.latitude > 38.0 || input.longitude < 68.0 || input.longitude > 98.0) {
    throw new Error("Field report coordinates must be within India geographic bounds (Lat 6°-38° N, Lon 68°-98° E).");
  }

  if (input.observed_water_depth_cm !== undefined && input.observed_water_depth_cm < 0) {
    throw new Error("Observed water depth in centimetres cannot be negative.");
  }

  if (input.people_requiring_assistance !== undefined && input.people_requiring_assistance < 0) {
    throw new Error("Number of people requiring assistance cannot be negative.");
  }

  const store = ensureDataFile();
  const nextSeq = store.reports.length + 1;
  const reportNumber = `REP-2026-${String(nextSeq).padStart(3, "0")}`;

  const newReport: FieldReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    report_number: reportNumber,
    report_type: input.report_type,
    severity: input.severity,
    latitude: input.latitude,
    longitude: input.longitude,
    location_name: input.location_name.trim(),
    observed_water_depth_cm: input.observed_water_depth_cm !== undefined ? input.observed_water_depth_cm : null,
    people_requiring_assistance: input.people_requiring_assistance !== undefined ? input.people_requiring_assistance : 0,
    road_status: input.road_status || "CLEAR",
    description: input.description.trim(),
    photo_url: input.photo_url?.trim() || null,
    photo_thumbnail_url: input.photo_thumbnail_url?.trim() || input.photo_url?.trim() || null,
    verification_status: "UNVERIFIED",
    observer_name: input.observer_name.trim(),
    observer_role: input.observer_role?.trim() || null,
    observer_contact: input.observer_contact?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let finalReport = newReport;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("field_reports").insert([newReport]).select().single();
      if (!error && data) {
        finalReport = data as FieldReport;
      } else {
        console.warn("[VarshaNetra] Supabase insert failed for field_report, using local file:", error);
      }
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error inserting field_report:", e);
    }
  }

  if (finalReport === newReport) {
    store.reports.unshift(newReport);
    persistDataFile(store);
  }

  // Trigger operational notification for new ground report
  void createNotification({
    event_type: "NEW_FIELD_REPORT",
    title: `New Field Report: ${finalReport.report_number} (${finalReport.report_type})`,
    message: `Ground observation reported at ${finalReport.location_name} with severity ${finalReport.severity}. Observer: ${finalReport.observer_name}.`,
    severity: finalReport.severity === "CRITICAL" ? "CRITICAL" : finalReport.severity === "ALERT" ? "ALERT" : "ADVISORY",
    deep_link: `/field-reports`,
    related_id: finalReport.id,
  }).catch((err) => console.warn("[VarshaNetra] Failed to dispatch field report notification:", err));

  void recordAuditLog({
    actor_id: null,
    actor_name: finalReport.observer_name,
    action: "FIELD_REPORT_CREATED",
    entity_type: "field_report",
    entity_id: finalReport.id,
    description: `Field report ${finalReport.report_number} (${finalReport.report_type}) submitted at ${finalReport.location_name} with severity ${finalReport.severity}`,
    metadata: {
      report_id: finalReport.id,
      report_number: finalReport.report_number,
      report_type: finalReport.report_type,
      severity: finalReport.severity,
      location_name: finalReport.location_name,
      water_depth_cm: finalReport.observed_water_depth_cm,
      people_assistance: finalReport.people_requiring_assistance,
    },
  }).catch(() => {});

  return finalReport;
}

export async function verifyFieldReport(id: string, input: VerifyFieldReportInput): Promise<FieldReport> {
  const existing = await getFieldReportById(id);
  if (!existing) {
    throw new Error(`Field report ${id} not found.`);
  }

  const updated: FieldReport = {
    ...existing,
    verification_status: input.verification_status,
    verified_by: input.verified_by.trim(),
    verified_at: new Date().toISOString(),
    verification_notes: input.verification_notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("field_reports").update(updated).eq("id", id).select().single();
      if (!error && data) return data as FieldReport;
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error verifying field_report:", e);
    }
  }

  const store = ensureDataFile();
  const idx = store.reports.findIndex((r) => r.id === id);
  if (idx !== -1) {
    store.reports[idx] = updated;
    persistDataFile(store);
  }

  void recordAuditLog({
    actor_id: null,
    actor_name: input.verified_by,
    action: "FIELD_REPORT_VERIFIED",
    entity_type: "field_report",
    entity_id: id,
    description: `Field report ${existing.report_number} assessment certified as ${input.verification_status} by ${input.verified_by}`,
    metadata: {
      report_id: id,
      report_number: existing.report_number,
      verification_status: input.verification_status,
      verified_by: input.verified_by,
      verification_notes: input.verification_notes || null,
      location_name: existing.location_name,
    },
  }).catch(() => {});

  return updated;
}

export async function deleteFieldReport(id: string): Promise<boolean> {
  const existing = await getFieldReportById(id);
  if (!existing) return false;

  if (existing.verification_status === "VERIFIED") {
    throw new Error("Certified VERIFIED ground reports cannot be deleted. Archive or reject instead.");
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("field_reports").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {
      console.warn("[VarshaNetra] Supabase delete error for field_report:", e);
    }
  }

  const store = ensureDataFile();
  const initLen = store.reports.length;
  store.reports = store.reports.filter((r) => r.id !== id);
  persistDataFile(store);
  return store.reports.length < initLen;
}

// -------------------------------------------------------------
// GIS / MAP INTEGRATION
// -------------------------------------------------------------

export function fieldReportToMapFeatureItem(report: FieldReport): MapFeatureItem {
  const depthText =
    report.observed_water_depth_cm !== null && report.observed_water_depth_cm !== undefined
      ? `Water Depth: ${report.observed_water_depth_cm} cm`
      : "Depth not recorded";

  const assistanceText =
    report.people_requiring_assistance && report.people_requiring_assistance > 0
      ? ` • ${report.people_requiring_assistance} People Need Assistance`
      : "";

  const roadText = `Road: ${report.road_status.replace(/_/g, " ")}`;

  return {
    id: report.id,
    name: `${report.report_number}: ${report.location_name}`,
    category: "FIELD_REPORT",
    latitude: report.latitude,
    longitude: report.longitude,
    address: `${report.report_type} • ${depthText}${assistanceText}`,
    contactNumber: report.observer_contact || undefined,
    status: report.verification_status,
    severity: report.severity,
    details: `[GROUND TRUTH OBSERVATION - NOT A MODEL ESTIMATE]\nType: ${report.report_type} • ${roadText}\n${depthText}${assistanceText}\nObserver: ${report.observer_name} (${report.observer_role || "Field Observer"})\nNotes: ${report.description}${report.verified_by ? `\nVerified by: ${report.verified_by}` : ""}`,
    reportedAt: report.created_at,
    photoUrl: report.photo_url || undefined,
    thumbnailUrl: report.photo_thumbnail_url || report.photo_url || undefined,
    metadata: FIELD_REPORTS_DATA_SOURCE_META,
  };
}

export async function getActiveFieldReportsAsMapFeatures(): Promise<MapFeatureItem[]> {
  try {
    const reports = await getFieldReports();
    return reports.map(fieldReportToMapFeatureItem);
  } catch (err) {
    console.warn("[VarshaNetra] Could not get field reports as map features:", err);
    return [];
  }
}
