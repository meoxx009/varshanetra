"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  History,
  Clock,
  MapPin,
  ShieldAlert,
  Send,
  UserCheck,
  CheckCircle2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/common/severity-badge";
import { useLocale } from "@/lib/i18n/context";
import { formatStatus } from "@/lib/i18n/formatters";
import {
  IncidentItem,
  IncidentAuditLog,
  IncidentAssignment,
  FieldReport,
} from "@/types";

export type TimelineEntryType =
  | "CREATION"
  | "STATUS_CHANGE"
  | "RESOURCE_ASSIGNMENT"
  | "FIELD_REPORT"
  | "OFFICER_NOTE";

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  actionTextHi: string;
  actionTextEn: string;
  details: string;
  officerName?: string;
  badgeColor: "blue" | "green" | "orange" | "purple";
  emoji: string;
  metaBadge?: string;
}

export interface LocalOfficerNote {
  id: string;
  incidentId: string;
  note: string;
  author: string;
  createdAt: string;
}

export interface IncidentTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentItem | null;
  initialAuditLogs?: IncidentAuditLog[];
  initialAssignments?: IncidentAssignment[];
  onIncidentUpdated?: () => void;
}

// Great-circle Haversine distance in km
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format duration from creation to now as "X hours Y minutes"
function formatTimeOpen(createdAt: string, locale: "hi" | "en"): string {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const totalMinutes = Math.max(0, Math.floor((now - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (locale === "hi") {
    if (hours === 0) return `${minutes} मिनट`;
    return `${hours} घंटे ${minutes} मिनट`;
  }
  if (hours === 0) return `${minutes} minutes`;
  return `${hours} hours ${minutes} minutes`;
}

// Format time as HH:MM
function formatTimeHHMM(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "--:--";
  }
}

// Format date as DD MMM YYYY
function formatDateShort(isoString: string, locale: "hi" | "en"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function IncidentTimelineModal({
  isOpen,
  onClose,
  incident,
  initialAuditLogs = [],
  initialAssignments = [],
}: IncidentTimelineModalProps) {
  const locale = useLocale();

  // Internal data states
  const [auditLogs, setAuditLogs] = useState<IncidentAuditLog[]>(initialAuditLogs);
  const [assignments, setAssignments] = useState<IncidentAssignment[]>(initialAssignments);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Officer note input state
  const [noteInput, setNoteInput] = useState<string>("");
  const [localNotes, setLocalNotes] = useState<LocalOfficerNote[]>([]);
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteSuccessToast, setNoteSuccessToast] = useState<boolean>(false);

  // Synchronize initial logs and assignments
  useEffect(() => {
    if (initialAuditLogs.length > 0) setAuditLogs(initialAuditLogs);
    if (initialAssignments.length > 0) setAssignments(initialAssignments);
  }, [initialAuditLogs, initialAssignments]);

  // Fetch full details and field reports when modal opens
  const fetchTimelineData = useCallback(async (incId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [incRes, reportsRes] = await Promise.all([
        fetch(`/api/incidents/${incId}`),
        fetch("/api/field-reports"),
      ]);

      if (incRes.ok) {
        const incData = await incRes.json();
        if (incData.success) {
          if (Array.isArray(incData.auditLogs)) setAuditLogs(incData.auditLogs);
          if (Array.isArray(incData.assignments)) setAssignments(incData.assignments);
        }
      }

      if (reportsRes.ok) {
        const repData = await reportsRes.json();
        if (repData.success && Array.isArray(repData.data)) {
          setFieldReports(repData.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load timeline history";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && incident?.id) {
      fetchTimelineData(incident.id);
    }
  }, [isOpen, incident?.id, fetchTimelineData]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter relevant field reports (within 10km of incident or created near incident window)
  const linkedFieldReports = useMemo(() => {
    if (!incident) return [];
    return fieldReports.filter((rep) => {
      const dist = calculateDistanceKm(
        incident.latitude,
        incident.longitude,
        rep.latitude,
        rep.longitude
      );
      // Link if within 10km distance radius
      if (dist <= 10.0) return true;

      // Or fallback: same location landmark keywords
      if (
        rep.location_name &&
        incident.location_name &&
        (rep.location_name.toLowerCase().includes(incident.location_name.toLowerCase()) ||
          incident.location_name.toLowerCase().includes(rep.location_name.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });
  }, [incident, fieldReports]);

  // Handle Add Note submission
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !incident) return;

    setIsSubmittingNote(true);
    const newNote: LocalOfficerNote = {
      id: `note-${Date.now()}`,
      incidentId: incident.id,
      note: noteInput.trim(),
      author: locale === "hi" ? "जिला ईओसी ड्यूटी अधिकारी" : "District EOC Duty Officer",
      createdAt: new Date().toISOString(),
    };

    setLocalNotes((prev) => [...prev, newNote]);
    setNoteInput("");
    setIsSubmittingNote(false);
    setNoteSuccessToast(true);
    setTimeout(() => setNoteSuccessToast(false), 3000);
  };

  // Compile all events into unified chronological timeline (oldest first)
  const timelineEntries = useMemo(() => {
    if (!incident) return [];

    const entries: TimelineEntry[] = [];

    // ENTRY 1 (ALWAYS FIRST): Incident Created
    entries.push({
      id: `incident-created-${incident.id}`,
      type: "CREATION",
      timestamp: incident.created_at,
      timeFormatted: formatTimeHHMM(incident.created_at),
      dateFormatted: formatDateShort(incident.created_at, locale),
      actionTextHi: "घटना दर्ज की गई",
      actionTextEn: "Incident Reported",
      details: `${locale === "hi" ? "श्रेणी" : "Type"}: ${incident.type} • ${locale === "hi" ? "प्रारंभिक गंभीरता" : "Initial Severity"}: ${incident.severity}. ${incident.description}`,
      officerName:
        incident.reporter_name ||
        incident.created_by ||
        (locale === "hi" ? "नागरिक एसओएस (डायल 112)" : "Citizen SOS (Dial 112)"),
      badgeColor: "blue",
      emoji: "📋",
      metaBadge: locale === "hi" ? "मूल रिपोर्ट" : "ORIGIN",
    });

    // ENTRY 2: Status Changes from Audit Logs
    auditLogs.forEach((log) => {
      const fromFormatted = log.from_status ? formatStatus(log.from_status, locale) : null;
      const toFormatted = formatStatus(log.to_status, locale);
      const transitionTextHi = fromFormatted
        ? `स्थिति परिवर्तन: ${fromFormatted} → ${toFormatted}`
        : `स्थिति निर्धारित: ${toFormatted}`;
      const transitionTextEn = log.from_status
        ? `Status Transition: ${log.from_status} → ${log.to_status}`
        : `Status Set: ${log.to_status}`;

      entries.push({
        id: `audit-${log.id}`,
        type: "STATUS_CHANGE",
        timestamp: log.created_at,
        timeFormatted: formatTimeHHMM(log.created_at),
        dateFormatted: formatDateShort(log.created_at, locale),
        actionTextHi: transitionTextHi,
        actionTextEn: transitionTextEn,
        details: log.notes || (locale === "hi" ? "प्रचालन स्थिति अद्यतित की गई।" : "Operational status updated."),
        officerName: log.changer_name || (locale === "hi" ? "ईओसी प्रेषण डेस्क" : "EOC Dispatch Desk"),
        badgeColor: "blue",
        emoji: "📋",
        metaBadge: log.to_status,
      });
    });

    // ENTRY 3: Resource Assignments
    assignments.forEach((asgn) => {
      const teamName = asgn.team?.name || (locale === "hi" ? "सामरिक इकाई" : "Tactical Unit");
      const agency = asgn.team?.agency ? ` (${asgn.team.agency})` : "";
      const personnel = asgn.team?.personnel_count
        ? ` • ${asgn.team.personnel_count} ${locale === "hi" ? "जवान" : "Personnel"}`
        : "";
      const equip = asgn.team?.equipment ? ` • ${asgn.team.equipment}` : "";

      entries.push({
        id: `assignment-${asgn.id}`,
        type: "RESOURCE_ASSIGNMENT",
        timestamp: asgn.assigned_at || asgn.created_at,
        timeFormatted: formatTimeHHMM(asgn.assigned_at || asgn.created_at),
        dateFormatted: formatDateShort(asgn.assigned_at || asgn.created_at, locale),
        actionTextHi: `संसाधन / प्रतिक्रिया दल तैनात: ${teamName}${agency}`,
        actionTextEn: `Tactical Resource Assigned: ${teamName}${agency}`,
        details: `${asgn.notes ? `"${asgn.notes}"` : ""}${personnel}${equip} [${asgn.assignment_status}]`,
        officerName: asgn.assigned_by || (locale === "hi" ? "ईओसी प्रेषक अधिकारी" : "EOC Dispatch Officer"),
        badgeColor: "green",
        emoji: "🚣",
        metaBadge: asgn.assignment_status,
      });
    });

    // ENTRY 4: Nearby Field Reports
    linkedFieldReports.forEach((rep) => {
      const depth = rep.observed_water_depth_cm
        ? ` • ${locale === "hi" ? "जलस्तर" : "Water Depth"}: ${rep.observed_water_depth_cm}cm`
        : "";
      const people = rep.people_requiring_assistance
        ? ` • ${rep.people_requiring_assistance} ${locale === "hi" ? "लोगों को सहायता चाहिए" : "persons require assistance"}`
        : "";

      entries.push({
        id: `field-report-${rep.id}`,
        type: "FIELD_REPORT",
        timestamp: rep.created_at,
        timeFormatted: formatTimeHHMM(rep.created_at),
        dateFormatted: formatDateShort(rep.created_at, locale),
        actionTextHi: `संबंधित क्षेत्र रिपोर्ट: ${rep.report_number} (${rep.report_type})`,
        actionTextEn: `Related Field Report: ${rep.report_number} (${rep.report_type})`,
        details: `${rep.location_name}: ${rep.description}${depth}${people}`,
        officerName: `${rep.observer_name || (locale === "hi" ? "मैदानी निरीक्षक" : "Field Inspector")}${
          rep.observer_role ? ` (${rep.observer_role})` : ""
        }`,
        badgeColor: "orange",
        emoji: "📍",
        metaBadge: rep.verification_status,
      });
    });

    // ENTRY 5: Local Officer Notes
    localNotes
      .filter((n) => n.incidentId === incident.id)
      .forEach((note) => {
        entries.push({
          id: note.id,
          type: "OFFICER_NOTE",
          timestamp: note.createdAt,
          timeFormatted: formatTimeHHMM(note.createdAt),
          dateFormatted: formatDateShort(note.createdAt, locale),
          actionTextHi: "अधिकारी की टिप्पणी दर्ज",
          actionTextEn: "Officer Note Recorded",
          details: note.note,
          officerName: note.author,
          badgeColor: "purple",
          emoji: "💬",
          metaBadge: locale === "hi" ? "सत्र टिप्पणी" : "SESSION NOTE",
        });
      });

    // Sort chronologically (oldest to newest)
    return entries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [incident, auditLogs, assignments, linkedFieldReports, localNotes, locale]);

  if (!isOpen || !incident) return null;

  // Normalized Incident ID with INC- prefix
  const formattedIncidentId = incident.incident_number?.startsWith("INC-")
    ? incident.incident_number
    : `INC-${incident.incident_number || incident.id.slice(0, 8)}`;

  // Status Styling
  let statusBadgeClass = "bg-slate-100 text-slate-700 border-slate-300";
  if (incident.status === "OPEN") {
    statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";
  } else if (incident.status === "ACKNOWLEDGED") {
    statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
  } else if (incident.status === "RESPONDING") {
    statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
  } else if (incident.status === "RESOLVED" || incident.status === "CLOSED") {
    statusBadgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <Card className="w-full max-w-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-[#0F3D66]/10 text-[#0F3D66] dark:text-sky-300 shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle
                  id="timeline-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap"
                >
                  <span>{locale === "hi" ? "घटना कालक्रम एवं प्रेषण विवरण" : "Incident Timeline & Detail View"}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                    {formattedIncidentId}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 truncate">
                  {incident.title}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchTimelineData(incident.id)}
                disabled={isLoading}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title={locale === "hi" ? "ताज़ा करें" : "Refresh Timeline"}
              >
                <RefreshCw className={isLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label={locale === "hi" ? "बंद करें" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Modal Content */}
        <CardContent className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* INCIDENT DETAIL HEADER SUMMARY CARD */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
            {/* Top row: ID, Status, Severity */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#0F3D66] text-white tracking-wide shadow-xs">
                  {formattedIncidentId}
                </span>
                <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${statusBadgeClass}`}>
                  {formatStatus(incident.status, locale)}
                </span>
                <SeverityBadge severity={incident.severity} size="sm" />
              </div>

              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {locale === "hi" ? "खुला समय:" : "Time Open:"}{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatTimeOpen(incident.created_at, locale)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Title and Type */}
            <div>
              <span className="text-[11px] font-bold text-[#2563EB] tracking-wide block uppercase">
                {incident.type}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {incident.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {incident.description}
              </p>
            </div>

            {/* Bottom details: Location, Assigned, Linked Reports count */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="flex items-start gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    {incident.location_name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {incident.latitude.toFixed(4)}° N, {incident.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-slate-500 block">
                    {locale === "hi" ? "सौंपी गई इकाई:" : "Assigned Unit:"}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    {incident.assigned_to || (locale === "hi" ? "अनावंटित" : "Unassigned")}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-slate-500 block">
                    {locale === "hi" ? "संबद्ध क्षेत्र रिपोर्ट:" : "Linked Field Reports:"}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    {linkedFieldReports.length}{" "}
                    {locale === "hi" ? "रिपोर्ट जुड़ी हैं" : "reports linked"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE SECTION HEADER */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>⏱️ {locale === "hi" ? "घटना कालक्रम (समयरेखा)" : "Chronological Incident Timeline"}</span>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {timelineEntries.length} {locale === "hi" ? "प्रविष्टियाँ" : "entries"}
              </span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              {locale === "hi" ? "प्राचीनतम से नवीनतम" : "Oldest to Newest"}
            </span>
          </div>

          {/* ERROR STATE */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchTimelineData(incident.id)}
                className="h-7 text-xs border-rose-300"
              >
                {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
              </Button>
            </div>
          )}

          {/* TIMELINE VERTICAL DISPLAY */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            {timelineEntries.map((entry) => {
              // Circle color styling
              let circleColorClass = "bg-blue-500 border-blue-200 ring-blue-100 text-white";
              if (entry.badgeColor === "blue") {
                circleColorClass = "bg-blue-600 border-blue-200 ring-blue-100 dark:ring-blue-900/60";
              } else if (entry.badgeColor === "green") {
                circleColorClass = "bg-emerald-600 border-emerald-200 ring-emerald-100 dark:ring-emerald-900/60";
              } else if (entry.badgeColor === "orange") {
                circleColorClass = "bg-orange-500 border-orange-200 ring-orange-100 dark:ring-orange-900/60";
              } else if (entry.badgeColor === "purple") {
                circleColorClass = "bg-purple-600 border-purple-200 ring-purple-100 dark:ring-purple-900/60";
              }

              return (
                <div key={entry.id} className="relative group">
                  {/* Colored circular icon on the left line */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs shadow-xs ring-4 border ${circleColorClass}`}
                    title={entry.type}
                  >
                    <span className="text-[12px] sm:text-[13px] leading-none select-none">
                      {entry.emoji}
                    </span>
                  </div>

                  {/* Right side content */}
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1.5 transition hover:border-slate-300 dark:hover:border-slate-600">
                    {/* Timestamp & Type Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {entry.timeFormatted}
                        </span>
                        <span>•</span>
                        <span>{entry.dateFormatted}</span>
                      </div>

                      {entry.metaBadge && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {entry.metaBadge}
                        </span>
                      )}
                    </div>

                    {/* Bold Action Text */}
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi" ? entry.actionTextHi : entry.actionTextEn}
                    </h5>

                    {/* Smaller gray text with additional details */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {entry.details}
                    </p>

                    {/* Officer name who performed the action */}
                    {entry.officerName && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>
                          {locale === "hi" ? "अधिकारी / स्रोत:" : "Officer / Source:"}{" "}
                          <strong className="not-italic text-slate-700 dark:text-slate-300">
                            {entry.officerName}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD NOTE FEATURE SECTION */}
          <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="officer-timeline-note"
                className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>{locale === "hi" ? "अधिकारी प्रचालन टिप्पणी जोड़ें" : "Add Officer Operational Note"}</span>
              </label>
              {noteSuccessToast && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {locale === "hi" ? "टिप्पणी जोड़ी गई!" : "Note added!"}
                </span>
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                id="officer-timeline-note"
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  locale === "hi"
                    ? "मैदानी स्थिति, समन्वय निर्देश या कानूनी रिकॉर्ड हेतु महत्वपूर्ण टिप्पणी यहाँ लिखें..."
                    : "Enter ground status observation, coordination order, or official incident notes..."
                }
                className="w-full px-3 py-2 min-h-[52px] rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-purple-700 dark:text-purple-300 italic">
                  {locale === "hi"
                    ? "* टिप्पणियाँ वर्तमान सत्र में सहेजी जाती हैं (सत्र रीसेट पर साफ़ हो जाएँगी)"
                    : "* Notes are preserved in the current session (cleared on page reload)"}
                </span>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!noteInput.trim() || isSubmittingNote}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold h-8 text-xs flex items-center gap-1.5 px-3"
                >
                  <Send className="w-3 h-3" />
                  <span>{locale === "hi" ? "टिप्पणी जोड़ें" : "Add Note"}</span>
                </Button>
              </div>
            </form>
          </div>
        </CardContent>

        {/* Modal Footer with Legal Notice */}
        <CardFooter className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          {/* LEGAL STATUTORY NOTE */}
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] leading-tight text-center sm:text-left">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
            <span>
              {locale === "hi"
                ? "यह रिकॉर्ड आपदा प्रबंधन अधिनियम 2005 के अंतर्गत आधिकारिक दस्तावेज है।"
                : "This record is official documentation under Disaster Management Act 2005."}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-4 font-semibold shrink-0"
          >
            {locale === "hi" ? "बंद करें" : "Close"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
