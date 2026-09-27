"use strict";
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  LifeBuoy,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Edit3,
  Trash2,
  X,
  Send,
  Radio,
  Clock,
  Navigation,
  Layers,
  PhoneCall,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatStatus } from "@/lib/i18n/formatters";
import {
  ResponseTeam,
  ResponseTeamStatus,
  AssignmentStatus,
  IncidentAssignment,
  IncidentItem,
  DataSourceMeta,
  FacilitiesGroupedResponse,
  ActiveMapLayerId,
  RESPONSE_TEAM_AGENCIES,
  RESPONSE_TEAM_STATUSES,
  ASSIGNMENT_STATUSES,
  MapFeatureItem,
} from "@/types";

// Client-only Leaflet GIS Map Canvas
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Loading Tactical Staging Positions & Incident Hotspots...
      </span>
    </div>
  ),
});

const RESPONSE_SOURCE_META: DataSourceMeta = {
  provider: "District EOC Tactical Force Dispatch & SDRF/NDRF Command",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Multi-agency response coordination. Team locations are user-reported staging coordinates and do not represent live satellite GPS tracking.",
};

const MAP_LAYERS: Record<ActiveMapLayerId, boolean> = {
  basemap: true,
  floodRisk: false,
  hospitals: false,
  clinics: false,
  police: false,
  fire: false,
  schools: false,
  rivers: true,
  riverGauges: false,
  fieldReports: false,
  incidents: true,
  responseTeams: true,
  shelters: true,
  floodSusceptibility: false,
  nasaGpmRainfall: false,
  radar: false,
  copernicusWms: false,
  earthquakes: false,
  firmsFire: false,
};

function validateCoordinates(
  lat: unknown,
  lon: unknown
): { valid: boolean; latitude: number | null; longitude: number | null; error?: string } {
  if (lat === null || lat === undefined || lat === "" || lon === null || lon === undefined || lon === "") {
    return { valid: true, latitude: null, longitude: null };
  }
  const latitude = typeof lat === "number" ? lat : parseFloat(String(lat));
  const longitude = typeof lon === "number" ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, latitude: null, longitude: null, error: "Coordinates must be valid numbers." };
  }
  if (latitude < -90 || latitude > 90) {
    return { valid: false, latitude: null, longitude: null, error: `Latitude ${latitude} out of bounds [-90, 90].` };
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, latitude: null, longitude: null, error: `Longitude ${longitude} out of bounds [-180, 180].` };
  }
  return { valid: true, latitude, longitude };
}

export default function ResponsePage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const t = useTranslations("response");
  const tCommon = useTranslations("common");

  const [viewState, setViewState] = useState<ComponentViewState>("success");
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Map Controls
  const [showMap, setShowMap] = useState<boolean>(true);
  const [focusCoordinates, setFocusCoordinates] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ResponseTeamStatus | "ALL">("ALL");
  const [agencyFilter, setAgencyFilter] = useState<string | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<ResponseTeam | null>(null);
  const [assigningTeam, setAssigningTeam] = useState<ResponseTeam | null>(null);
  const [managingAssignment, setManagingAssignment] = useState<IncidentAssignment | null>(null);

  // Form States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Accessible Confirmation State & Toast Feedback
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    variant: "destructive" | "warning" | "default";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    variant: "destructive",
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Team Create/Edit Form Data
  const [teamForm, setTeamForm] = useState<{
    name: string;
    agency: string;
    personnel_count: string;
    status: ResponseTeamStatus;
    latitude: string;
    longitude: string;
    location_name: string;
    contact_number: string;
    equipment: string;
    notes: string;
  }>({
    name: "",
    agency: "SDRF",
    personnel_count: "12",
    status: "AVAILABLE",
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    location_name: location.displayName,
    contact_number: "",
    equipment: "2 Gemini Boats, 40HP OBM, Lifejackets, Dewatering Pumps",
    notes: "",
  });

  // Incident Assignment Form Data & Conflict Modal
  const [assignmentForm, setAssignmentForm] = useState<{
    incident_id: string;
    assignment_status: AssignmentStatus;
    notes: string;
    allow_conflict_override: boolean;
  }>({
    incident_id: "",
    assignment_status: "ASSIGNED",
    notes: "",
    allow_conflict_override: false,
  });

  const [conflictWarning, setConflictWarning] = useState<{
    isConflicting: boolean;
    conflictingIncidentNumber: string;
    conflictingIncidentTitle: string;
    teamName: string;
    currentStatus?: ResponseTeamStatus;
  } | null>(null);

  // Assignment Status Update Modal State
  const [statusUpdateForm, setStatusUpdateForm] = useState<{
    status: AssignmentStatus;
    notes: string;
  }>({
    status: "ON_SITE",
    notes: "",
  });

  // Fetch Data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage("");

    try {
      const [resTeams, resIncidents] = await Promise.all([
        fetch("/api/response-teams"),
        fetch("/api/incidents"),
      ]);

      const jsonTeams = await resTeams.json();
      const jsonIncidents = await resIncidents.json();

      if (!resTeams.ok || !jsonTeams.success) {
        throw new Error(jsonTeams.error || "Failed to load response teams.");
      }

      setTeams(jsonTeams.data || []);
      if (resIncidents.ok && jsonIncidents.success) {
        setIncidents(jsonIncidents.data || []);
      }
      setViewState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching response teams";
      setErrorMessage(msg);
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    const availableTeams = teams.filter((t) => t.status === "AVAILABLE").length;
    const deployedTeams = teams.filter(
      (t) => t.status === "ON_SITE" || t.status === "EN_ROUTE" || t.status === "ASSIGNED"
    ).length;
    const totalPersonnel = teams.reduce((acc, t) => acc + (t.personnel_count || 0), 0);
    const deployedPersonnel = teams
      .filter((t) => t.status !== "AVAILABLE" && t.status !== "UNAVAILABLE")
      .reduce((acc, t) => acc + (t.personnel_count || 0), 0);

    return { totalTeams, availableTeams, deployedTeams, totalPersonnel, deployedPersonnel };
  }, [teams]);

  // Filtered Roster
  const filteredTeams = useMemo(() => {
    let list = [...teams];
    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (agencyFilter !== "ALL") {
      list = list.filter((t) => t.agency === agencyFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.agency.toLowerCase().includes(q) ||
          (t.location_name && t.location_name.toLowerCase().includes(q)) ||
          (t.equipment && t.equipment.toLowerCase().includes(q))
      );
    }
    return list;
  }, [teams, statusFilter, agencyFilter, searchQuery]);

  // Facilities data for GIS map preview
  const mapFacilitiesData: FacilitiesGroupedResponse = useMemo(() => {
    const teamFeatures: MapFeatureItem[] = [];

    for (const t of teams) {
      if (t.latitude !== null && t.longitude !== null) {
        teamFeatures.push({
          id: t.id,
          name: `[${t.agency}] ${t.name}`,
          category: "RESPONSE_TEAM",
          latitude: t.latitude,
          longitude: t.longitude,
          address: t.location_name || "Staging Base",
          contactNumber: t.contact_number || undefined,
          status: t.status,
          severity: t.status === "ON_SITE" ? "CRITICAL" : t.status === "EN_ROUTE" ? "ALERT" : "NORMAL",
          details: `Status: ${t.status} • Personnel: ${t.personnel_count} • Equipment: ${t.equipment || "Standard kit"}`,
          operator: `${t.agency} Tactical Unit`,
          metadata: {
            provider: "VarshaNetra EOC Response Dispatch (User-Reported Coordinates)",
            lastUpdated: t.updated_at,
            origin: "LIVE_API",
            attributionNotice: "User-Reported Coordinates: Staging coordinates configured by EOC. Not live satellite beacon.",
          },
        });
      }
    }

    const incidentFeatures: MapFeatureItem[] = incidents
      .filter((i) => i.status !== "CLOSED")
      .map((i) => ({
        id: i.id,
        name: `[${i.incident_number}] ${i.title}`,
        category: "INCIDENT",
        latitude: i.latitude,
        longitude: i.longitude,
        address: i.location_name,
        status: i.status,
        severity: i.severity,
        details: `Type: ${i.type} • Assigned: ${i.assigned_to || "None"}`,
        operator: i.assigned_to || "EOC",
        metadata: {
          provider: "VarshaNetra Incident Dispatch 112",
          lastUpdated: i.updated_at,
          origin: "LIVE_API",
          attributionNotice: "Geolocated emergency distress ticket.",
        },
      }));

    return {
      hospitals: [],
      clinics: [],
      police: [],
      fire: [],
      schools: [],
      rivers: [],
      fieldReports: [],
      incidents: incidentFeatures,
      responseTeams: teamFeatures,
      totalCount: teamFeatures.length + incidentFeatures.length,
      metadata: RESPONSE_SOURCE_META,
    };
  }, [teams, incidents]);

  // Focus on team coordinates
  const handleFocusTeam = (team: ResponseTeam) => {
    if (team.latitude !== null && team.longitude !== null) {
      setShowMap(true);
      setFocusCoordinates({
        lat: team.latitude,
        lon: team.longitude,
        zoom: 15,
      });
    } else {
      setFeedbackToast({
        type: "error",
        message: "This response team does not have configured staging coordinates.",
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // Submit Create Team
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const coordCheck = validateCoordinates(teamForm.latitude, teamForm.longitude);
    if (!coordCheck.valid) {
      setFormError(coordCheck.error || "Invalid coordinates");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/response-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamForm.name,
          agency: teamForm.agency,
          personnel_count: parseInt(teamForm.personnel_count, 10),
          status: teamForm.status,
          latitude: coordCheck.latitude,
          longitude: coordCheck.longitude,
          location_name: teamForm.location_name,
          contact_number: teamForm.contact_number,
          equipment: teamForm.equipment,
          notes: teamForm.notes,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to register response team.");
      }

      setIsCreateModalOpen(false);
      setTeamForm({
        name: "",
        agency: "SDRF",
        personnel_count: "12",
        status: "AVAILABLE",
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        location_name: location.displayName,
        contact_number: "",
        equipment: "2 Gemini Boats, 40HP OBM, Lifejackets, Dewatering Pumps",
        notes: "",
      });
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating response team";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Update Team
  const handleUpdateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setFormError(null);

    const coordCheck = validateCoordinates(editingTeam.latitude, editingTeam.longitude);
    if (!coordCheck.valid) {
      setFormError(coordCheck.error || "Invalid coordinates");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/response-teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTeam.name,
          agency: editingTeam.agency,
          personnel_count: Number(editingTeam.personnel_count),
          status: editingTeam.status,
          latitude: coordCheck.latitude,
          longitude: coordCheck.longitude,
          location_name: editingTeam.location_name,
          contact_number: editingTeam.contact_number,
          equipment: editingTeam.equipment,
          notes: editingTeam.notes,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update team.");
      }

      setEditingTeam(null);
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating team";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Team
  const executeDeleteTeam = async (id: string) => {
    try {
      const res = await fetch(`/api/response-teams/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedbackToast({ type: "error", message: json.error || "Failed to delete team." });
        return;
      }

      setFeedbackToast({ type: "success", message: "Response team successfully decommissioned." });
      setTimeout(() => setFeedbackToast(null), 4000);
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setFeedbackToast({ type: "error", message: `Action failed: ${msg}` });
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  const requestDeleteTeam = (team: ResponseTeam) => {
    setConfirmDialog({
      isOpen: true,
      title: "Decommission Response Team",
      description: (
        <span>
          Are you sure you want to decommission and delete response team <strong>&quot;{team.name}&quot;</strong> ({team.agency})? Any staging telemetry and assignments will be archived.
        </span>
      ),
      confirmLabel: "Decommission Team",
      variant: "destructive",
      action: async () => {
        await executeDeleteTeam(team.id);
      },
    });
  };

  // Assign Team to Incident with Conflict Prevention
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeam) return;
    setFormError(null);

    if (!assignmentForm.incident_id) {
      setFormError("Please select a target emergency incident.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: assignmentForm.incident_id,
          team_id: assigningTeam.id,
          assignment_status: assignmentForm.assignment_status,
          notes: assignmentForm.notes,
          allow_conflict_override: assignmentForm.allow_conflict_override,
        }),
      });
      const json = await res.json();

      if (res.status === 409 && json.conflict) {
        // Show Conflict Confirmation
        setConflictWarning(json.conflict);
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to assign response team.");
      }

      setAssigningTeam(null);
      setConflictWarning(null);
      setAssignmentForm({
        incident_id: "",
        assignment_status: "ASSIGNED",
        notes: "",
        allow_conflict_override: false,
      });
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error dispatching team";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Conflict Override
  const handleConfirmConflictOverride = async () => {
    if (!assigningTeam) return;
    setConflictWarning(null);
    setAssignmentForm((prev) => ({ ...prev, allow_conflict_override: true }));

    // Re-trigger submit with override
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: assignmentForm.incident_id,
          team_id: assigningTeam.id,
          assignment_status: assignmentForm.assignment_status,
          notes: assignmentForm.notes,
          allow_conflict_override: true,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to assign response team.");
      }

      setAssigningTeam(null);
      setAssignmentForm({
        incident_id: "",
        assignment_status: "ASSIGNED",
        notes: "",
        allow_conflict_override: false,
      });
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during override";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Assignment Status
  const handleUpdateAssignmentStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAssignment) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${managingAssignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_status: statusUpdateForm.status,
          notes: statusUpdateForm.notes,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update assignment status.");
      }

      setManagingAssignment(null);
      await fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setFeedbackToast({ type: "error", message: `Action failed: ${msg}` });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("title", "Tactical Response & Search/Rescue Coordination")}
        description={locale === "hi"
          ? "एसडीआरएफ बटालियनों, एनडीआरएफ त्वरित जल बचाव दलों, नगर अग्निशामकों और पुलिस सुरक्षा घेरों का बहु-एजेंसी घटना कमान डैशबोर्ड।"
          : "Unified multi-agency incident command dashboard coordinating SDRF battalions, NDRF swiftwater rescue squads, Municipal fire brigades, and police cordons."}
        breadcrumbs={[
          { label: tCommon("overview", "Dashboard"), href: "/dashboard" },
          { label: t("title", "Tactical Response") },
        ]}
        sourceMeta={RESPONSE_SOURCE_META}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchData(true)}
              variant="outline"
              size="sm"
              disabled={isRefreshing || isLoading}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#2563EB]" : ""}`} />
              <span>{locale === "hi" ? "फ़्लीट रिफ्रेश करें" : "Refresh Fleet"}</span>
            </Button>

            <Button
              onClick={() => {
                setIsCreateModalOpen(true);
                setFormError(null);
              }}
              size="sm"
              className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("registerTeam", "Register Response Unit")}</span>
            </Button>
          </div>
        }
      />

      {/* Action Feedback Toast */}
      {feedbackToast && (
        <div
          role="status"
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedbackToast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="p-1 hover:bg-black/10 rounded" aria-label={locale === "hi" ? "संदेश हटाएँ" : "Dismiss message"}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "पंजीकृत सामरिक इकाइयाँ" : "Tactical Units Registered"}
          value={String(metrics.totalTeams)}
          unit={locale === "hi" ? "दस्ते" : "Squads"}
          subtext={locale === "hi" ? "बहु-एजेंसी एसडीआरएफ, एनडीआरएफ, अग्निशमन एवं पुलिस" : "Multi-agency SDRF, NDRF, Fire & Police"}
          icon={Users}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "ईओसी बल रजिस्टर" : "EOC Force Roster"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "रिज़र्व में उपलब्ध" : "Available in Reserve"}
          value={String(metrics.availableTeams)}
          unit={locale === "hi" ? "इकाइयाँ तैयार" : "Units Ready"}
          subtext={locale === "hi" ? "डिपो में तैनात, प्रेषण हेतु प्रतीक्षारत" : "Stationed at depots awaiting dispatch"}
          icon={CheckCircle2}
          severity={metrics.availableTeams > 0 ? "NORMAL" : "ADVISORY"}
          sourceLabel={locale === "hi" ? "डिपो स्टैंडबाय" : "Depot Standby"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "सक्रिय मैदानी तैनाती" : "Active Field Deployments"}
          value={String(metrics.deployedTeams)}
          unit={locale === "hi" ? "अभियान" : "Missions"}
          subtext={locale === "hi" ? "सौंपे गए, रास्ते में या कार्यस्थल पर" : "Assigned, en-route, or on-site"}
          icon={LifeBuoy}
          severity={metrics.deployedTeams > 0 ? "ALERT" : "NORMAL"}
          sourceLabel={locale === "hi" ? "कार्य आवंटन ग्रिड" : "Tasking Grid"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "तैनात कर्मी" : "Mobilized Personnel"}
          value={`${metrics.deployedPersonnel} / ${metrics.totalPersonnel}`}
          unit={locale === "hi" ? "अधिकारी / जवान" : "Officers"}
          subtext={locale === "hi" ? "सभी इकाइयों में कुल नफरी संख्या" : "Total strength across all units"}
          icon={Radio}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "कार्मिक रजिस्टर" : "Personnel Register"}
          isLoading={isLoading}
        />
      </div>

      {/* Truthfulness Banner */}
      <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            <strong>{locale === "hi" ? "स्थान सत्यता:" : "Location Truthfulness:"}</strong>{" "}
            {locale === "hi"
              ? "नीचे प्रदर्शित स्टेजिंग निर्देशांक जिला ईओसी प्रेषकों द्वारा मैन्युअल रूप से दर्ज किए गए हैं। इन्हें "
              : "Staging coordinates displayed below are manually entered by District EOC dispatchers. They are labeled "}
            <span className="font-mono font-semibold">{locale === "hi" ? "उपयोगकर्ता-दर्ज निर्देशांक" : "User-Reported Coordinates"}</span>
            {locale === "hi"
              ? " लेबल किया गया है और यह लाइव उपग्रह ट्रांसपोंडर या वास्तविक समय जीपीएस टेलीमेट्री का प्रतिनिधित्व नहीं करते हैं।"
              : " and do not represent live satellite transponders or real-time GPS telemetry."}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-200/60 dark:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold shrink-0">
          {locale === "hi" ? "उपयोगकर्ता-दर्ज निर्देशांक" : "User-Reported Coordinates"}
        </span>
      </div>

      {/* Main Container */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchData(false)}
        errorMessage={errorMessage || (locale === "hi" ? "सामरिक प्रतिक्रिया रोस्टर लोड करने में विफल।" : "Failed to load tactical response roster.")}
        emptyTitle={locale === "hi" ? "कोई सामरिक इकाई पंजीकृत नहीं" : "No Tactical Units Registered"}
        emptyDescription={locale === "hi" ? "इस जिले के लिए वर्तमान में कोई एसडीआरएफ, एनडीआरएफ या नगर निगम प्रतिक्रिया इकाई दर्ज नहीं है।" : "No SDRF, NDRF, or Municipal response units are currently logged for this district."}
      >
        <div className="space-y-6">
          {/* GIS Map Visualization */}
          {showMap && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                    <span>{locale === "hi" ? "सामरिक तैनाती एवं घटना मानचित्रण" : "Tactical Deployment & Incident Cartography"}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locale === "hi"
                      ? "सक्रिय आपदा संकट टिकटों के साथ जियोलोकेटेड सामरिक प्रतिक्रिया इकाइयाँ।"
                      : "Geolocated tactical response units layered with active distress incident tickets."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(!showMap)}
                  className="text-xs font-semibold"
                >
                  {locale === "hi" ? "मानचित्र कैनवास छिपाएँ" : "Hide Map Canvas"}
                </Button>
              </div>

              <GisMap
                location={location}
                facilities={mapFacilitiesData}
                activeLayers={MAP_LAYERS}
                inspectorData={null}
                onInspectLocation={() => {}}
                isFullscreen={false}
                onToggleFullscreen={() => {}}
                focusCoordinates={focusCoordinates}
                className="h-[360px] w-full"
              />
            </div>
          )}

          {/* Filters & Search */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div
                  role="tablist"
                  aria-label={locale === "hi" ? "परिचालन स्थिति अनुसार प्रतिक्रिया दल फ़िल्टर करें" : "Filter response teams by operational status"}
                  className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"
                >
                  <span className="text-slate-500 mr-1 flex items-center gap-1" aria-hidden="true">
                    <Filter className="w-3.5 h-3.5" /> {tCommon("status", "Status")}:
                  </span>
                  {[
                    { id: "ALL" as const, label: tCommon("all", "All"), count: teams.length },
                    { id: "AVAILABLE" as const, label: formatStatus("AVAILABLE", locale), count: metrics.availableTeams },
                    { id: "ASSIGNED" as const, label: formatStatus("ASSIGNED", locale), count: teams.filter((t) => t.status === "ASSIGNED").length },
                    { id: "EN_ROUTE" as const, label: formatStatus("EN_ROUTE", locale), count: teams.filter((t) => t.status === "EN_ROUTE").length },
                    { id: "ON_SITE" as const, label: formatStatus("ON_SITE", locale), count: teams.filter((t) => t.status === "ON_SITE").length },
                    { id: "UNAVAILABLE" as const, label: locale === "hi" ? "अनुपलब्ध" : "Unavailable", count: teams.filter((t) => t.status === "UNAVAILABLE").length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={statusFilter === tab.id}
                      aria-label={`${tab.label} (${tab.count})`}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                        statusFilter === tab.id
                          ? "bg-[#0F3D66] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">({tab.count})</span>
                    </button>
                  ))}
                </div>

                {!showMap && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap(true)}
                    className="text-xs font-semibold"
                  >
                    {locale === "hi" ? "मानचित्र कैनवास दिखाएँ" : "Show Map Canvas"}
                  </Button>
                )}
              </div>

              {/* Agency Filter & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={agencyFilter}
                    aria-label={locale === "hi" ? "एजेंसी एवं बटालियन अनुसार फ़िल्टर करें" : "Filter by agency and battalion"}
                    onChange={(e) => setAgencyFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  >
                    <option value="ALL">{locale === "hi" ? "सभी एजेंसियाँ एवं बटालियन" : "All Agencies & Battalions"}</option>
                    {RESPONSE_TEAM_AGENCIES.map((ag) => (
                      <option key={ag} value={ag}>
                        {ag}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label={locale === "hi" ? "इकाई का नाम, उपकरण या स्टेजिंग डिपो खोजें" : "Search response teams by name, equipment, or staging depot"}
                    placeholder={locale === "hi" ? "इकाई का नाम, उपकरण या डिपो खोजें..." : "Search unit name, equipment, or staging depot..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Teams Roster Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>{locale === "hi" ? "सामरिक तैनाती रजिस्टर" : "Tactical Deployment Register"}</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {filteredTeams.length} {locale === "hi" ? "इकाइयाँ" : "units"}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "hi"
                      ? "वास्तविक समय कार्य आवंटन लिंकिंग, टकराव जांच और स्टेजिंग स्थिति के साथ कमान रोस्टर।"
                      : "Command roster with real-time assignment linking, conflict checking, and staging positions."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredTeams.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "वर्तमान फ़िल्टर से कोई प्रतिक्रिया इकाई मेल नहीं खाती" : "No Response Units Match Current Filter"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {locale === "hi"
                      ? "फ़िल्टर टैब बदलने का प्रयास करें या टीम जोड़ने के लिए 'प्रतिक्रिया दल पंजीकृत करें' पर क्लिक करें।"
                      : "Try changing filter tabs or click \"Register Response Unit\" to add a team."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <th className="py-3 px-3.5 font-semibold">{locale === "hi" ? "इकाई का नाम एवं एजेंसी" : "Unit Name & Agency"}</th>
                        <th className="py-3 px-3 font-semibold">{locale === "hi" ? "कर्मी एवं उपकरण" : "Personnel & Equipment"}</th>
                        <th className="py-3 px-3 font-semibold">{locale === "hi" ? "स्टेजिंग स्थान एवं जीपीएस" : "Staging Location & GPS"}</th>
                        <th className="py-3 px-3 font-semibold">{locale === "hi" ? "वर्तमान अभियान स्थिति" : "Current Mission Status"}</th>
                        <th className="py-3 px-3.5 font-semibold text-right">{tCommon("actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredTeams.map((team) => {
                        let statusColor = "bg-slate-100 text-slate-700 border-slate-300";
                        if (team.status === "AVAILABLE") statusColor = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
                        else if (team.status === "ON_SITE") statusColor = "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";
                        else if (team.status === "EN_ROUTE") statusColor = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
                        else if (team.status === "ASSIGNED") statusColor = "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";

                        const hasCoordinates = team.latitude !== null && team.longitude !== null;
                        const currentAsgn = team.current_assignment;

                        return (
                          <tr key={team.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            {/* Unit Name & Agency */}
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {team.name}
                              </span>
                              <span className="text-[11px] font-semibold text-[#0F3D66] dark:text-blue-400 block mt-0.5">
                                {team.agency}
                              </span>
                              {team.contact_number && (
                                <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                                  <PhoneCall className="w-3 h-3 text-slate-400" />
                                  {team.contact_number}
                                </span>
                              )}
                            </td>

                            {/* Personnel & Equipment */}
                            <td className="py-3 px-3 max-w-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                {team.personnel_count} {locale === "hi" ? "तैनात कर्मी" : "Deployed Officers"}
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {team.equipment || (locale === "hi" ? "मानक आपातकालीन प्रतिक्रिया उपकरण" : "Standard emergency response equipment")}
                              </p>
                            </td>

                            {/* Staging Location */}
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                                {team.location_name || (locale === "hi" ? "डिपो स्थान अनिर्दिष्ट" : "Depot Location Unspecified")}
                              </span>
                              {hasCoordinates ? (
                                <div className="space-y-0.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-slate-500 block">
                                    {team.latitude?.toFixed(4)}° N, {team.longitude?.toFixed(4)}° E
                                  </span>
                                  <span className="inline-block text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                    {locale === "hi" ? "उपयोगकर्ता-दर्ज निर्देशांक" : "User-Reported Coordinates"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic block mt-0.5">
                                  {locale === "hi" ? "कोई निर्देशांक दर्ज नहीं" : "No coordinates entered"}
                                </span>
                              )}
                            </td>

                            {/* Status & Assignment */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}>
                                  {formatStatus(team.status, locale)}
                                </span>
                                {currentAsgn ? (
                                  <div className="text-[10px] text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                      {currentAsgn.incident?.incident_number || (locale === "hi" ? "सक्रिय टिकट" : "Active Ticket")}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setManagingAssignment(currentAsgn);
                                        setStatusUpdateForm({
                                          status: currentAsgn.assignment_status,
                                          notes: currentAsgn.notes || "",
                                        });
                                      }}
                                      className="text-[10px] font-semibold text-[#2563EB] hover:underline block"
                                    >
                                      {locale === "hi" ? "अभियान स्थिति अद्यतित करें →" : "Update Mission Status →"}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic block">
                                    {locale === "hi" ? "कोई सक्रिय घटना नहीं सौंपी गई" : "No active incident assigned"}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasCoordinates && (
                                  <button
                                    onClick={() => handleFocusTeam(team)}
                                    className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title={locale === "hi" ? "मानचित्र पर निर्देशांक देखें" : "Focus Coordinates on Map"}
                                    aria-label={locale === "hi" ? "मानचित्र पर निर्देशांक देखें" : "Focus Coordinates on Map"}
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <Button
                                  onClick={() => {
                                    setAssigningTeam(team);
                                    setConflictWarning(null);
                                    setFormError(null);
                                    setAssignmentForm({
                                      incident_id: incidents.length > 0 ? incidents[0].id : "",
                                      assignment_status: "ASSIGNED",
                                      notes: "",
                                      allow_conflict_override: false,
                                    });
                                  }}
                                  size="sm"
                                  className="h-7 text-[10px] font-bold bg-[#0F3D66] hover:bg-[#0c3152] text-white px-2 gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{t("deployTeam", "Task to Incident")}</span>
                                </Button>

                                <button
                                  onClick={() => {
                                    setEditingTeam(team);
                                    setFormError(null);
                                  }}
                                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                  title={locale === "hi" ? "दल विवरण संपादित करें" : "Edit Team Details"}
                                  aria-label={locale === "hi" ? "दल विवरण संपादित करें" : "Edit Team Details"}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => requestDeleteTeam(team)}
                                  className="p-1 rounded border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                                  title={locale === "hi" ? "दल सेवामुक्त करें" : "Decommission Team"}
                                  aria-label={`${locale === "hi" ? "दल सेवामुक्त करें" : "Decommission team"} ${team.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StateContainer>

      {/* CREATE TEAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "सामरिक प्रतिक्रिया इकाई पंजीकृत करें" : "Register Tactical Response Unit"}</span>
                </CardTitle>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={tCommon("close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "आपदा बचाव इकाई, बटालियन दस्ता, या आपातकालीन जल निकासी दल दर्ज करें।"
                  : "Log a disaster rescue unit, battalion squad, or emergency dewatering team."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateTeamSubmit}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-team-name" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("teamName", "Unit Call Sign / Name")} *
                    </label>
                    <input
                      id="create-team-name"
                      type="text"
                      required
                      placeholder={locale === "hi" ? "उदा. एसडीआरएफ इकाई 1 (5वीं बटालियन)" : "e.g. SDRF Unit 1 (5th Bn.)"}
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-team-agency" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("agency", "Agency / Service")} *
                    </label>
                    <select
                      id="create-team-agency"
                      value={teamForm.agency}
                      onChange={(e) => setTeamForm({ ...teamForm, agency: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {RESPONSE_TEAM_AGENCIES.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-team-personnel" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("personnelCount", "Personnel Strength")} *
                    </label>
                    <input
                      id="create-team-personnel"
                      type="number"
                      required
                      min={1}
                      value={teamForm.personnel_count}
                      onChange={(e) => setTeamForm({ ...teamForm, personnel_count: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-team-status" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "प्रारंभिक स्थिति" : "Initial Status"}
                    </label>
                    <select
                      id="create-team-status"
                      value={teamForm.status}
                      onChange={(e) => setTeamForm({ ...teamForm, status: e.target.value as ResponseTeamStatus })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {RESPONSE_TEAM_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {formatStatus(st, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-team-location" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "स्टेजिंग बेस / डिपो का नाम" : "Staging Base / Depot Name"}
                  </label>
                  <input
                    id="create-team-location"
                    type="text"
                    placeholder={locale === "hi" ? "उदा. सिंहगढ़ रोड स्टेजिंग डिपो" : "e.g. Sinhagad Road Staging Depot"}
                    value={teamForm.location_name}
                    onChange={(e) => setTeamForm({ ...teamForm, location_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                {/* Staging Coordinates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-team-latitude" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "स्टेजिंग अक्षांश (वैकल्पिक)" : "Staging Latitude (Optional)"}
                    </label>
                    <input
                      id="create-team-latitude"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 18.4985"
                      value={teamForm.latitude}
                      onChange={(e) => setTeamForm({ ...teamForm, latitude: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-team-longitude" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "स्टेजिंग देशांतर (वैकल्पिक)" : "Staging Longitude (Optional)"}
                    </label>
                    <input
                      id="create-team-longitude"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 73.8345"
                      value={teamForm.longitude}
                      onChange={(e) => setTeamForm({ ...teamForm, longitude: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-team-equipment" className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("equipmentCarried", "Assigned Equipment & Assets")}
                  </label>
                  <input
                    id="create-team-equipment"
                    type="text"
                    placeholder={locale === "hi" ? "उदा. 2 जेमिनी नावें, 40HP ओबीएम, पंप, लाइफजैकेट" : "e.g. 2 Gemini Boats, 40HP OBM, Dewatering Pumps, Lifejackets"}
                    value={teamForm.equipment}
                    onChange={(e) => setTeamForm({ ...teamForm, equipment: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-team-contact" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("contactNumber", "Emergency Dispatch Phone")}
                    </label>
                    <input
                      id="create-team-contact"
                      type="text"
                      placeholder="+91 98220 11201"
                      value={teamForm.contact_number}
                      onChange={(e) => setTeamForm({ ...teamForm, contact_number: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-team-notes" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "परिचालन टिप्पणियाँ" : "Operational Notes"}
                    </label>
                    <input
                      id="create-team-notes"
                      type="text"
                      placeholder={locale === "hi" ? "उदा. तेज बहाव जल बचाव में विशेषज्ञता" : "e.g. Specialized in swiftwater navigation"}
                      value={teamForm.notes}
                      onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs"
                >
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs"
                >
                  {locale === "hi" ? "दल पंजीकृत करें" : "Register Team"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "प्रतिक्रिया इकाई संपादित करें:" : "Edit Response Unit:"} {editingTeam.name}</span>
                </CardTitle>
                <button
                  onClick={() => setEditingTeam(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={tCommon("close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleUpdateTeamSubmit}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-team-name" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("teamName", "Unit Name")}
                    </label>
                    <input
                      id="edit-team-name"
                      type="text"
                      required
                      value={editingTeam.name}
                      onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-team-agency" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("agency", "Agency")}
                    </label>
                    <select
                      id="edit-team-agency"
                      value={editingTeam.agency}
                      onChange={(e) => setEditingTeam({ ...editingTeam, agency: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {RESPONSE_TEAM_AGENCIES.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-team-personnel" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("personnelCount", "Personnel Strength")}
                    </label>
                    <input
                      id="edit-team-personnel"
                      type="number"
                      min={1}
                      value={editingTeam.personnel_count}
                      onChange={(e) =>
                        setEditingTeam({ ...editingTeam, personnel_count: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-team-status" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "तैनाती स्थिति" : "Deployment Status"}
                    </label>
                    <select
                      id="edit-team-status"
                      value={editingTeam.status}
                      onChange={(e) =>
                        setEditingTeam({ ...editingTeam, status: e.target.value as ResponseTeamStatus })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {RESPONSE_TEAM_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {formatStatus(st, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-team-location" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "स्टेजिंग बेस लैंडमार्क" : "Staging Base Landmark"}
                  </label>
                  <input
                    id="edit-team-location"
                    type="text"
                    value={editingTeam.location_name || ""}
                    onChange={(e) => setEditingTeam({ ...editingTeam, location_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-team-latitude" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "अक्षांश" : "Latitude"}
                    </label>
                    <input
                      id="edit-team-latitude"
                      type="number"
                      step="0.0001"
                      value={editingTeam.latitude ?? ""}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          latitude: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-team-longitude" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "देशांतर" : "Longitude"}
                    </label>
                    <input
                      id="edit-team-longitude"
                      type="number"
                      step="0.0001"
                      value={editingTeam.longitude ?? ""}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          longitude: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-team-equipment" className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("equipmentCarried", "Assigned Equipment")}
                  </label>
                  <input
                    id="edit-team-equipment"
                    type="text"
                    value={editingTeam.equipment || ""}
                    onChange={(e) => setEditingTeam({ ...editingTeam, equipment: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTeam(null)}
                  className="text-xs"
                >
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs"
                >
                  {tCommon("save", "Save Changes")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* TASK TEAM TO INCIDENT MODAL (WITH CONFLICT PREVENTION) */}
      {assigningTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "इकाई रवाना करें:" : "Dispatch Unit:"} {assigningTeam.name}</span>
                </CardTitle>
                <button
                  onClick={() => {
                    setAssigningTeam(null);
                    setConflictWarning(null);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={tCommon("close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "इस सामरिक प्रतिक्रिया दल को सीधे एक सक्रिय आपातकालीन संकट टिकट से जोड़ें।"
                  : "Link this tactical response squad directly to an active emergency field distress ticket."}
              </CardDescription>
            </CardHeader>

            {/* Conflict Warning Dialog */}
            {conflictWarning ? (
              <div className="p-4 space-y-3">
                <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="font-bold text-sm">
                      {locale === "hi" ? "तैनाती टकराव चेतावनी" : "Deployment Conflict Warning"}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    <strong>{conflictWarning.teamName}</strong>{" "}
                    {locale === "hi"
                      ? `पहले से ही घटना ${conflictWarning.conflictingIncidentNumber} ("${conflictWarning.conflictingIncidentTitle}") में स्थिति ${formatStatus(conflictWarning.currentStatus || "ASSIGNED", locale)} में सक्रिय रूप से तैनात है।`
                      : `is already actively tasked to incident ${conflictWarning.conflictingIncidentNumber} ("${conflictWarning.conflictingIncidentTitle}") in status ${conflictWarning.currentStatus}.`}
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    {locale === "hi"
                      ? "आपदा प्रतिक्रिया नियम दोहरे सक्रिय आवंटन की अनुमति नहीं देते हैं जब तक कि घटना कमांडर द्वारा स्पष्ट रूप से ओवरराइड न किया जाए।"
                      : "Disaster response rules disallow duplicate active assignments unless explicitly overridden by the Incident Commander."}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConflictWarning(null);
                      setAssigningTeam(null);
                    }}
                    className="text-xs"
                  >
                    {locale === "hi" ? "प्रेषण रद्द करें" : "Cancel Dispatch"}
                  </Button>

                  <Button
                    onClick={handleConfirmConflictOverride}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    {locale === "hi" ? "ओवरराइड करें एवं दोहरा आवंटन करें" : "Override & Double-Assign"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssignSubmit}>
                <CardContent className="p-4 space-y-3.5 text-xs">
                  {formError && (
                    <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="assign-incident-id" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "लक्षित मैदानी संकट घटना *" : "Target Field Distress Incident *"}
                    </label>
                    {incidents.length === 0 ? (
                      <p className="text-xs text-rose-600">
                        {locale === "hi" ? "सौंपने के लिए कोई सक्रिय घटना उपलब्ध नहीं है।" : "No active incidents available to task."}
                      </p>
                    ) : (
                      <select
                        id="assign-incident-id"
                        required
                        value={assignmentForm.incident_id}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, incident_id: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                      >
                        <option value="">{locale === "hi" ? "-- सक्रिय मैदानी घटना चुनें --" : "-- Select Active Field Incident --"}</option>
                        {incidents.map((inc) => (
                          <option key={inc.id} value={inc.id}>
                            [{inc.incident_number}] {inc.title} ({inc.type} • {inc.severity})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="assign-status" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "प्रारंभिक अभियान स्थिति" : "Initial Mission Status"}
                    </label>
                    <select
                      id="assign-status"
                      value={assignmentForm.assignment_status}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          assignment_status: e.target.value as AssignmentStatus,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="ASSIGNED">{formatStatus("ASSIGNED", locale)} ({locale === "hi" ? "तैनाती हेतु पंक्तिबद्ध" : "Queued for mobilization"})</option>
                      <option value="EN_ROUTE">{formatStatus("EN_ROUTE", locale)} ({locale === "hi" ? "निर्देशांक की ओर रवाना" : "Mobile to coordinates"})</option>
                      <option value="ON_SITE">{formatStatus("ON_SITE", locale)} ({locale === "hi" ? "खोज एवं बचाव में संलग्न" : "Engaged in search/rescue"})</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "प्रेषक कार्य आवंटन निर्देश एवं टिप्पणियाँ" : "Dispatcher Tasking Notes & Directives"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={locale === "hi" ? "उदा. जलभराव वाले सबवे से बुजुर्ग नागरिकों को निकालने के लिए जेमिनी नावें तैनात करें..." : "e.g. Deploy 2 Gemini inflatable boats to evacuate elderly citizens from flooded subway underpass..."}
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAssigningTeam(null)}
                    className="text-xs"
                  >
                    {tCommon("cancel", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || incidents.length === 0}
                    className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs"
                  >
                    {locale === "hi" ? "पुष्टि करें एवं दल रवाना करें" : "Confirm & Dispatch Unit"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* UPDATE MISSION STATUS MODAL */}
      {managingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "अभियान जीवनचक्र अद्यतित करें" : "Update Mission Lifecycle"}</span>
                </CardTitle>
                <button
                  onClick={() => setManagingAssignment(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={tCommon("close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "इस सक्रिय तैनाती के लिए परिचालन स्थिति अद्यतित करें। दल की स्थिति स्वचालित रूप से सिंक्रनाइज़ होगी।"
                  : "Update operational status for this active deployment. Team status will automatically synchronize."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpdateAssignmentStatusSubmit}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label htmlFor="update-asgn-status" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "आवंटन स्थिति *" : "Assignment Status *"}
                  </label>
                  <select
                    id="update-asgn-status"
                    value={statusUpdateForm.status}
                    onChange={(e) =>
                      setStatusUpdateForm({
                        ...statusUpdateForm,
                        status: e.target.value as AssignmentStatus,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  >
                    {ASSIGNMENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {formatStatus(st, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="update-asgn-notes" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "मैदानी कमांडर परिचालन लॉग" : "Field Commander Operational Log"}
                  </label>
                  <textarea
                    id="update-asgn-notes"
                    rows={3}
                    placeholder={locale === "hi" ? "उदा. 14 निवासियों को सुरक्षित निकाला गया; पंप जल निकासी में जुटे..." : "e.g. 14 residents evacuated safely; pumps clearing outfall channel..."}
                    value={statusUpdateForm.notes}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagingAssignment(null)}
                  className="text-xs"
                >
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs"
                >
                  {locale === "hi" ? "अभियान लॉग अद्यतित करें" : "Update Mission Log"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Accessible Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          setIsConfirming(true);
          try {
            await confirmDialog.action();
          } finally {
            setIsConfirming(false);
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        isLoading={isConfirming}
      />
    </div>
  );
}
