"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Clock,
  PlusCircle,
  CheckCircle2,
  LifeBuoy,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Navigation,
  Edit3,
  History,
  X,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { SeverityBadge } from "@/components/common/severity-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatSeverity, formatStatus, formatDateTime, formatIncidentType } from "@/lib/i18n/formatters";
import {
  IncidentItem,
  IncidentStatus,
  IncidentType,
  IncidentAuditLog,
  SeverityLevel,
  DataSourceMeta,
  FacilitiesGroupedResponse,
  ActiveMapLayerId,
  MapInspectorData,
  INCIDENT_TYPES,
  MapFeatureItem,
  IncidentAssignment,
  Resource,
} from "@/types";
import { ResourcePriorityQueue, IncidentTimelineModal } from "@/components/incidents";

function validateIncidentCoordinates(
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

function incidentToMapFeatureItem(incident: IncidentItem): MapFeatureItem {
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

// Client-only Leaflet GIS Map
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Loading Tactical Incidents GIS Layer...
      </span>
    </div>
  ),
});

const INCIDENTS_PAGE_SOURCE_META: DataSourceMeta = {
  provider: "District EOC 112 / Municipal Incident Dispatch",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Emergency field distress incidents linked to District Command Room and Dial 112 dispatch network.",
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

export default function IncidentsPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const t = useTranslations("incidents");
  const tCommon = useTranslations("common");

  // View state & data
  const [viewState, setViewState] = useState<ComponentViewState>("success");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Map state
  const [showMap, setShowMap] = useState<boolean>(true);
  const [isPickingOnMap, setIsPickingOnMap] = useState<boolean>(false);
  const [inspectorData, setInspectorData] = useState<MapInspectorData | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
  } | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingIncident, setEditingIncident] = useState<IncidentItem | null>(null);
  const [selectedIncidentAudit, setSelectedIncidentAudit] = useState<{
    incident: IncidentItem;
    logs: IncidentAuditLog[];
    assignments?: IncidentAssignment[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Accessible Confirmation Dialog & Feedback State
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
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Create Form State
  const [formData, setFormData] = useState<{
    type: IncidentType;
    title: string;
    description: string;
    severity: SeverityLevel;
    latitude: string;
    longitude: string;
    location_name: string;
    assigned_to: string;
    reporter_name: string;
  }>({
    type: "Urban Waterlogging",
    title: "",
    description: "",
    severity: "ALERT",
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    location_name: location.displayName,
    assigned_to: "PMC Drainage Squad",
    reporter_name: "Citizen SOS (Dial 112)",
  });

  // Fetch Incidents
  const fetchIncidents = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/incidents");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load incidents from Supabase.");
      }

      setIncidents(json.data || []);
      setViewState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching incidents";
      setErrorMessage(msg);
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/resources");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setResources(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch resources for priority queue:", err);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchResources();
  }, [fetchIncidents, fetchResources]);

  // Update default coordinates when location changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      location_name: location.displayName,
    }));
  }, [location.latitude, location.longitude, location.displayName]);

  // Handle map point selection for incident creation
  const handleMapInspect = (data: MapInspectorData | null) => {
    setInspectorData(data);
    if (isPickingOnMap && data) {
      setFormData((prev) => ({
        ...prev,
        latitude: data.latitude.toFixed(5),
        longitude: data.longitude.toFixed(5),
        location_name: data.address || `Point (${data.latitude.toFixed(4)}° N, ${data.longitude.toFixed(4)}° E)`,
      }));
      setIsPickingOnMap(false);
      setIsCreateModalOpen(true);
    }
  };

  // Convert active incidents to GIS map features
  const mapFacilitiesData: FacilitiesGroupedResponse = useMemo(() => {
    const activeItems = incidents.filter((i) => i.status !== "CLOSED");
    return {
      hospitals: [],
      clinics: [],
      police: [],
      fire: [],
      schools: [],
      rivers: [],
      fieldReports: [],
      incidents: activeItems.map(incidentToMapFeatureItem),
      totalCount: activeItems.length,
      metadata: INCIDENTS_PAGE_SOURCE_META,
    };
  }, [incidents]);

  // Filter & Search
  const filteredIncidents = useMemo(() => {
    let list = [...incidents];

    if (statusFilter !== "ALL") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (severityFilter !== "ALL") {
      list = list.filter((i) => i.severity === severityFilter);
    }
    if (typeFilter !== "ALL") {
      list = list.filter((i) => i.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.incident_number.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location_name.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q) ||
          (i.assigned_to && i.assigned_to.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [incidents, statusFilter, severityFilter, typeFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const openCount = incidents.filter((i) => i.status === "OPEN").length;
    const respondingCount = incidents.filter((i) => i.status === "RESPONDING").length;
    const acknowledgedCount = incidents.filter((i) => i.status === "ACKNOWLEDGED").length;
    const resolvedCount = incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
    const criticalCount = incidents.filter(
      (i) => i.severity === "CRITICAL" && (i.status === "OPEN" || i.status === "RESPONDING")
    ).length;

    return { openCount, respondingCount, acknowledgedCount, resolvedCount, criticalCount };
  }, [incidents]);

  // Focus incident on map
  const handleFocusIncident = (item: IncidentItem) => {
    setShowMap(true);
    setFocusCoordinates({
      lat: item.latitude,
      lon: item.longitude,
      zoom: 16,
    });
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Create Incident
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate coordinates
    const coordCheck = validateIncidentCoordinates(formData.latitude, formData.longitude);
    if (!coordCheck.valid) {
      setFormError(coordCheck.error || "Invalid coordinates.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: coordCheck.latitude,
          longitude: coordCheck.longitude,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to log incident.");
      }

      setIsCreateModalOpen(false);
      setFormData({
        type: "Urban Waterlogging",
        title: "",
        description: "",
        severity: "ALERT",
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        location_name: location.displayName,
        assigned_to: "PMC Drainage Squad",
        reporter_name: "Citizen SOS (Dial 112)",
      });
      await fetchIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating incident";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Incident
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;
    setFormError(null);

    const coordCheck = validateIncidentCoordinates(
      editingIncident.latitude,
      editingIncident.longitude
    );
    if (!coordCheck.valid) {
      setFormError(coordCheck.error || "Invalid coordinates.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/incidents/${editingIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editingIncident.type,
          title: editingIncident.title,
          description: editingIncident.description,
          severity: editingIncident.severity,
          latitude: coordCheck.latitude,
          longitude: coordCheck.longitude,
          location_name: editingIncident.location_name,
          assigned_to: editingIncident.assigned_to,
          reporter_name: editingIncident.reporter_name,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update incident.");
      }

      setEditingIncident(null);
      await fetchIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating incident";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Status Transition
  const executeTransitionStatus = async (
    incidentId: string,
    newStatus: IncidentStatus,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || `Field status updated to ${newStatus}.`,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedbackToast({
          type: "error",
          message: json.error || `Failed to transition status to ${newStatus}.`,
        });
        return;
      }

      setFeedbackToast({
        type: "success",
        message: `Incident status successfully updated to ${newStatus}.`,
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      await fetchIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setFeedbackToast({ type: "error", message: `Action failed: ${msg}` });
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  // Accessible Status Transition Request with Confirmation
  const handleTransitionStatus = (
    incidentId: string,
    newStatus: IncidentStatus,
    defaultNotes?: string
  ) => {
    const isDestructive = newStatus === "CLOSED";
    setConfirmDialog({
      isOpen: true,
      title: `Transition Status to ${newStatus}`,
      description: (
        <span>
          Are you sure you want to transition this incident to <strong>{newStatus}</strong>?
          {defaultNotes ? ` Note: "${defaultNotes}"` : ""}
        </span>
      ),
      confirmLabel: isDestructive ? "Close Incident" : `Mark as ${newStatus}`,
      variant: isDestructive ? "destructive" : "default",
      action: async () => {
        await executeTransitionStatus(incidentId, newStatus, defaultNotes);
      },
    });
  };

  // Deploy handler from Resource Priority Queue
  const handleDeployFromPriorityQueue = (incident: IncidentItem) => {
    if (incident.status === "OPEN" || incident.status === "ACKNOWLEDGED") {
      handleTransitionStatus(
        incident.id,
        "RESPONDING",
        locale === "hi"
          ? "संसाधन प्राथमिकता कतार से सीधा प्रेषण एवं दल तैनाती।"
          : "Direct dispatch and responder team mobilization from Resource Priority Queue."
      );
    } else {
      setEditingIncident(incident);
    }
  };

  // View Audit Logs
  const handleViewAudit = async (item: IncidentItem) => {
    try {
      const res = await fetch(`/api/incidents/${item.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedIncidentAudit({
          incident: json.data,
          logs: json.auditLogs || [],
          assignments: json.assignments || [],
        });
      }
    } catch {
      setSelectedIncidentAudit({ incident: item, logs: [], assignments: [] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("title", "Disaster Incident Command & Dispatch")}
        description={locale === "hi"
          ? "जलभराव वाले संवेदनशील स्थानों, अवरुद्ध पुलियों, गिरे हुए पेड़ों और आपातकालीन संकट कॉल की एकीकृत ट्रैकिंग।"
          : "Unified logging and spatial tracking of waterlogging hotspots, blocked culverts, fallen trees, and emergency citizen distress calls."}
        breadcrumbs={[
          { label: tCommon("overview", "Dashboard"), href: "/dashboard" },
          { label: t("title", "Incidents") },
        ]}
        sourceMeta={INCIDENTS_PAGE_SOURCE_META}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowMap(!showMap)}
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1 min-h-[40px] px-3"
            >
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>
                {showMap
                  ? (locale === "hi" ? "मानचित्र दृश्य छिपाएँ" : "Hide Map View")
                  : (locale === "hi" ? "मानचित्र दृश्य दिखाएँ" : "Show Map View")}
              </span>
            </Button>

            <Button
              onClick={() => fetchIncidents(true)}
              variant="outline"
              size="sm"
              disabled={isRefreshing || isLoading}
              className="text-xs font-semibold gap-1 min-h-[40px] px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{tCommon("refresh", "Refresh")}</span>
            </Button>

            <Button
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              size="sm"
              className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-1.5 shadow-sm min-h-[40px] px-3.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t("reportIncident", "Log New Incident")}</span>
            </Button>
          </div>
        }
      />

      {/* Accessible Operational Feedback Banner */}
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs ${
            feedbackToast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : feedbackToast.type === "info"
              ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackToast.type === "info" ? (
              <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="p-1 hover:bg-black/10 rounded"
            aria-label={locale === "hi" ? "सूचना हटाएँ" : "Dismiss notification"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "सक्रिय संकट टिकट" : "Open Distress Tickets"}
          value={String(metrics.openCount)}
          unit={locale === "hi" ? "अनावंटित" : "Unassigned"}
          subtext={locale === "hi" ? "दल आवंटन की प्रतीक्षा में नए नागरिक रिपोर्ट" : "New citizen emergency reports awaiting squad assignment"}
          icon={AlertTriangle}
          severity={metrics.openCount > 0 ? "ALERT" : "NORMAL"}
          sourceLabel={locale === "hi" ? "112 प्रेषण फ़ीड" : "112 Dispatch Feed"}
          isLoading={isLoading}
        />

        <MetricCard
          title={locale === "hi" ? "सक्रिय मैदानी अभियान" : "Active Field Operations"}
          value={String(metrics.respondingCount)}
          unit={locale === "hi" ? "प्रगति पर" : "In Progress"}
          subtext={locale === "hi" ? "घटना स्थल पर तैनात आपातकालीन प्रतिक्रिया दल" : "Emergency response battalions deployed on site"}
          icon={LifeBuoy}
          severity={metrics.respondingCount > 0 ? "CRITICAL" : "NORMAL"}
          sourceLabel={locale === "hi" ? "एसडीआरएफ एवं नगर ईओसी" : "SDRF & Municipal EOC"}
          isLoading={isLoading}
        />

        <MetricCard
          title={locale === "hi" ? "स्वीकृत / पंक्तिबद्ध" : "Queued / Acknowledged"}
          value={String(metrics.acknowledgedCount)}
          unit={locale === "hi" ? "पंक्तिबद्ध" : "Queued"}
          subtext={locale === "hi" ? "सत्यापित रिपोर्ट जो प्रतिक्रिया हेतु तैयार हैं" : "Verified reports queued for responder mobilization"}
          icon={Clock}
          severity={metrics.acknowledgedCount > 0 ? "ADVISORY" : "NORMAL"}
          sourceLabel={locale === "hi" ? "कमांड रूटिंग" : "Command Routing"}
          isLoading={isLoading}
        />

        <MetricCard
          title={locale === "hi" ? "आज समाधान किए गए" : "Resolved Today"}
          value={String(metrics.resolvedCount)}
          unit={locale === "hi" ? "टिकट" : "Tickets"}
          subtext={locale === "hi" ? "जलभराव निकासी, गाद सफाई एवं बैरिकेडिंग वापसी पूर्ण" : "Water cleared, culverts desilted, and barricades withdrawn"}
          icon={CheckCircle2}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "ईओसी समाधान लॉग" : "EOC Resolution Log"}
          isLoading={isLoading}
        />
      </div>

      {/* Main Container with 4 States */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchIncidents(false)}
        errorMessage={errorMessage || (locale === "hi" ? "डेटाबेस से घटनाओं को लोड करने में विफल।" : "Failed to load incidents from Supabase database.")}
        emptyTitle={locale === "hi" ? "कोई घटना दर्ज नहीं" : "No Incidents Logged"}
        emptyDescription={locale === "hi" ? "इस जिले के लिए वर्तमान में कोई संकट टिकट दर्ज नहीं है।" : "No distress tickets or field reports are currently registered for this district."}
      >
        <div className="space-y-6">
          {/* Spatial Map Inspection Section */}
          {showMap && (
            <div ref={mapSectionRef} className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#DC2626]" />
                    <span>{locale === "hi" ? "सक्रिय घटना मानचित्र एवं स्थानिक प्रेषण" : "Live Incident Cartography & Spatial Dispatch"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === "hi"
                      ? "ओपनस्ट्रीटमैप पर जियोलोकेटेड आपातकालीन संकट मार्कर। पिन लगाने के लिए 'मानचित्र पर बिंदु चुनें' पर क्लिक करें।"
                      : "Geolocated emergency distress markers layered on OpenStreetMap. Click \"Pick Point on Map\" to drop a pin."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const nextPicking = !isPickingOnMap;
                      setIsPickingOnMap(nextPicking);
                      if (nextPicking) {
                        setFeedbackToast({
                          type: "info",
                          message: locale === "hi"
                            ? "मानचित्र चयन मोड सक्रिय: घटना निर्देशांक स्वचालित रूप से सेट करने के लिए मानचित्र पर क्लिक करें।"
                            : "Pick on Map Mode active: Click anywhere on the map to set incident coordinates automatically.",
                        });
                        setTimeout(() => setFeedbackToast(null), 6000);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={`text-xs font-semibold gap-1 ${
                      isPickingOnMap
                        ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                        : ""
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>
                      {isPickingOnMap
                        ? (locale === "hi" ? "चयन हेतु क्लिक करें..." : "Click on Map to Pick...")
                        : (locale === "hi" ? "मानचित्र पर बिंदु चुनें" : "Pick Point on Map")}
                    </span>
                  </Button>

                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                    {mapFacilitiesData.incidents.length} {locale === "hi" ? "सक्रिय पिन" : "geolocated active pins"}
                  </span>
                </div>
              </div>

              <GisMap
                location={location}
                facilities={mapFacilitiesData}
                activeLayers={MAP_LAYERS}
                inspectorData={inspectorData}
                onInspectLocation={handleMapInspect}
                isFullscreen={false}
                onToggleFullscreen={() => {}}
                focusCoordinates={focusCoordinates}
                className="h-[380px] w-full"
              />
            </div>
          )}

          {/* Filter & Search Bar */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              {/* Status Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div role="tablist" aria-label={locale === "hi" ? "घटना स्थिति फ़िल्टर" : "Incident status filters"} className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> {tCommon("status", "Status")}:
                  </span>
                  {[
                    { id: "ALL" as const, label: tCommon("all", "All"), count: incidents.length },
                    { id: "OPEN" as const, label: formatStatus("OPEN", locale), count: metrics.openCount },
                    { id: "RESPONDING" as const, label: formatStatus("RESPONDING", locale), count: metrics.respondingCount },
                    { id: "ACKNOWLEDGED" as const, label: formatStatus("ACKNOWLEDGED", locale), count: metrics.acknowledgedCount },
                    { id: "RESOLVED" as const, label: formatStatus("RESOLVED", locale), count: incidents.filter((i) => i.status === "RESOLVED").length },
                    { id: "CLOSED" as const, label: formatStatus("CLOSED", locale), count: incidents.filter((i) => i.status === "CLOSED").length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={statusFilter === tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-2 min-h-[38px] rounded-lg border text-xs transition flex items-center gap-1.5 ${
                        statusFilter === tab.id
                          ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-xs font-bold"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          statusFilter === tab.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Severity & Type Selectors */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">{t("incidentType", "Type")}:</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as IncidentType | "ALL")}
                      aria-label={locale === "hi" ? "प्रकार अनुसार फ़िल्टर करें" : "Filter incidents by type"}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="ALL">{locale === "hi" ? "सभी प्रकार" : "All Types"}</option>
                      {INCIDENT_TYPES.map((tItem) => (
                        <option key={tItem} value={tItem}>
                          {formatIncidentType(tItem, locale)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">{tCommon("severity", "Severity")}:</span>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | "ALL")}
                      aria-label={locale === "hi" ? "गंभीरता अनुसार फ़िल्टर करें" : "Filter incidents by severity"}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="ALL">{locale === "hi" ? "सभी गंभीरता" : "All Severities"}</option>
                      <option value="CRITICAL">{formatSeverity("CRITICAL", locale)}</option>
                      <option value="ALERT">{formatSeverity("ALERT", locale)}</option>
                      <option value="ADVISORY">{formatSeverity("ADVISORY", locale)}</option>
                      <option value="NORMAL">{formatSeverity("NORMAL", locale)}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    aria-label={locale === "hi" ? "घटना टिकट खोजें" : "Search incident tickets"}
                    placeholder={locale === "hi" ? "टिकट सं., शीर्षक, विवरण, स्थान या दल खोजें..." : "Search by ticket #, title, narrative, location, or assigned unit..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <span className="text-xs text-slate-500 font-mono text-right sm:text-left">
                  {locale === "hi"
                    ? `${incidents.length} में से ${filteredIncidents.length} टिकट प्रदर्शित`
                    : `Showing ${filteredIncidents.length} of ${incidents.length} tickets`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resource Priority Queue Display */}
          <ResourcePriorityQueue
            incidents={incidents}
            resources={resources}
            districtName={location.displayName}
            onDeployIncident={handleDeployFromPriorityQueue}
            onViewTimeline={handleViewAudit}
            className="mb-4"
          />

          {/* Incidents Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>{locale === "hi" ? "सक्रिय घटना प्रेषण रजिस्टर" : "Active Incident Dispatch Register"}</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {filteredIncidents.length} {locale === "hi" ? "मदें" : "items"}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "hi"
                      ? "समन्वय सत्यापन एवं दल रूटिंग के साथ वास्तविक समय आपदा मैदानी टिकट।"
                      : "Real-time disaster field tickets with coordinate verification and responder routing."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredIncidents.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "वर्तमान फ़िल्टर से कोई घटना मेल नहीं खाती" : "No Incidents Match Current Filters"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {locale === "hi"
                      ? "फ़िल्टर बदलने का प्रयास करें या मैदानी टिकट दर्ज करने के लिए 'नई घटना दर्ज करें' पर क्लिक करें।"
                      : "Try switching filters or click \"Log New Incident\" to author a field ticket."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (Hidden on mobile) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                          <th className="py-3 px-3.5 font-semibold">{locale === "hi" ? "घटना सं. एवं प्रकार" : "Incident # & Type"}</th>
                          <th className="py-3 px-3 font-semibold">{locale === "hi" ? "स्थिति विवरण" : "Situation Narrative"}</th>
                          <th className="py-3 px-3 font-semibold">{locale === "hi" ? "स्थान एवं निर्देशांक" : "Location & Coordinates"}</th>
                          <th className="py-3 px-3 font-semibold">{locale === "hi" ? "गंभीरता एवं स्थिति" : "Severity & Status"}</th>
                          <th className="py-3 px-3 font-semibold">{locale === "hi" ? "सौंपी गई इकाई" : "Assigned Unit"}</th>
                          <th className="py-3 px-3.5 font-semibold text-right">{tCommon("actions", "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredIncidents.map((item) => {
                          const isOpen = item.status === "OPEN";
                          const isResponding = item.status === "RESPONDING";
                          const isAcknowledged = item.status === "ACKNOWLEDGED";
                          const isResolved = item.status === "RESOLVED";
                          const isClosed = item.status === "CLOSED";

                          let statusColor = "bg-slate-100 text-slate-700 border-slate-300";
                          if (isOpen) statusColor = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";
                          else if (isResponding) statusColor = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
                          else if (isAcknowledged) statusColor = "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
                          else if (isResolved || isClosed) statusColor = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                            >
                              {/* Incident Number & Type */}
                              <td className="py-3 px-3.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewAudit(item)}
                                  className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-[#2563EB] dark:hover:text-blue-400 block text-left transition cursor-pointer"
                                  title={locale === "hi" ? "समयरेखा एवं विवरण देखें" : "View Timeline & Details"}
                                >
                                  {item.incident_number}
                                </button>
                                <span className="text-[11px] font-semibold text-[#2563EB] block mt-0.5">
                                  {formatIncidentType(item.type, locale)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                  {formatDateTime(item.created_at, locale)}
                                </span>
                              </td>

                              {/* Situation Narrative */}
                              <td className="py-3 px-3 max-w-xs">
                                <button
                                  type="button"
                                  onClick={() => handleViewAudit(item)}
                                  className="font-bold text-slate-800 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-blue-400 block text-left transition cursor-pointer"
                                  title={locale === "hi" ? "समयरेखा एवं विवरण देखें" : "View Timeline & Details"}
                                >
                                  {item.title}
                                </button>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {item.description}
                                </p>
                              </td>

                              {/* Location & Coordinates */}
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                                  {item.location_name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                                  {item.latitude.toFixed(4)}° N, {item.longitude.toFixed(4)}° E
                                </span>
                              </td>

                              {/* Severity & Status */}
                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <SeverityBadge severity={item.severity} size="sm" />
                                  <span
                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}
                                  >
                                    {formatStatus(item.status, locale)}
                                  </span>
                                </div>
                              </td>

                              {/* Assigned Unit */}
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                                  {item.assigned_to || (locale === "hi" ? "अनावंटित" : "Unassigned")}
                                </span>
                                <span className="text-[10px] text-slate-400 italic block mt-0.5">
                                  {locale === "hi" ? "माध्यम" : "Via"} {item.reporter_name || (locale === "hi" ? "नागरिक 112" : "Citizen 112")}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleFocusIncident(item)}
                                    className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title={locale === "hi" ? "मानचित्र में देखें" : "Focus in Map"}
                                    aria-label={locale === "hi" ? "मानचित्र में देखें" : "Focus in Map"}
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingIncident(item);
                                      setFormError(null);
                                    }}
                                    className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title={locale === "hi" ? "टिकट संपादित करें" : "Edit Ticket"}
                                    aria-label={locale === "hi" ? "टिकट संपादित करें" : "Edit Ticket"}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleViewAudit(item)}
                                    className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title={locale === "hi" ? "ऑडिट ट्रेल" : "Audit Trail"}
                                    aria-label={locale === "hi" ? "ऑडिट ट्रेल" : "Audit Trail"}
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Quick Status Transition Dropdown / Button */}
                                  {isOpen && (
                                    <button
                                      onClick={() =>
                                        handleTransitionStatus(
                                          item.id,
                                          "ACKNOWLEDGED",
                                          locale === "hi"
                                            ? "स्थानीय मैदानी प्रतिक्रिया दल को सौंपा गया।"
                                            : "Assigned to local field response crew."
                                        )
                                      }
                                      className="px-2 py-1 rounded bg-[#2563EB] text-white text-[10px] font-bold hover:bg-blue-600 transition"
                                    >
                                      {locale === "hi" ? "स्वीकार करें" : "Acknowledge"}
                                    </button>
                                  )}

                                  {isAcknowledged && (
                                    <button
                                      onClick={() =>
                                        handleTransitionStatus(
                                          item.id,
                                          "RESPONDING",
                                          locale === "hi"
                                            ? "प्रतिक्रिया दल स्थल पर रवाना।"
                                            : "Responders mobilized on site."
                                        )
                                      }
                                      className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition"
                                    >
                                      {locale === "hi" ? "तैनात करें" : "Mobilize"}
                                    </button>
                                  )}

                                  {isResponding && (
                                    <button
                                      onClick={() =>
                                        handleTransitionStatus(
                                          item.id,
                                          "RESOLVED",
                                          locale === "hi"
                                            ? "संकट समाप्त एवं स्थल सुरक्षित प्रमाणित।"
                                            : "Hazard neutralized and site certified safe."
                                        )
                                      }
                                      className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition"
                                    >
                                      {locale === "hi" ? "समाधान" : "Resolve"}
                                    </button>
                                  )}

                                  {isResolved && (
                                    <button
                                      onClick={() =>
                                        handleTransitionStatus(
                                          item.id,
                                          "CLOSED",
                                          locale === "hi"
                                            ? "अंतिम मैदानी सत्यापन के बाद घटना बंद।"
                                            : "Incident closed after final field verification."
                                        )
                                      }
                                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                      {locale === "hi" ? "बंद करें" : "Close"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Touch Cards View (Shown only on phone viewports < md) */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60 p-2.5 space-y-3">
                    {filteredIncidents.map((item) => {
                      const isOpen = item.status === "OPEN";
                      const isResponding = item.status === "RESPONDING";
                      const isAcknowledged = item.status === "ACKNOWLEDGED";
                      const isResolved = item.status === "RESOLVED";
                      const isClosed = item.status === "CLOSED";

                      let statusColor = "bg-slate-100 text-slate-700 border-slate-300";
                      if (isOpen) statusColor = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";
                      else if (isResponding) statusColor = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
                      else if (isAcknowledged) statusColor = "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
                      else if (isResolved || isClosed) statusColor = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                        >
                          {/* Header row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <SeverityBadge severity={item.severity} size="sm" />
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}>
                                {formatStatus(item.status, locale)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewAudit(item)}
                              className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-[#2563EB] transition"
                              title={locale === "hi" ? "समयरेखा एवं विवरण देखें" : "View Timeline & Details"}
                            >
                              {item.incident_number}
                            </button>
                          </div>

                          {/* Title & Type */}
                          <div>
                            <span className="text-[11px] font-bold text-[#2563EB] block">
                              {formatIncidentType(item.type, locale)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewAudit(item)}
                              className="text-left w-full group cursor-pointer"
                              title={locale === "hi" ? "समयरेखा एवं विवरण देखें" : "View Timeline & Details"}
                            >
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug mt-0.5 group-hover:text-[#2563EB] transition">
                                {item.title}
                              </h4>
                            </button>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Location & Assigned info */}
                          <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.location_name}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                ({item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°)
                              </span>
                            </div>
                            <div className="text-[11px] flex items-center justify-between">
                              <span>
                                {locale === "hi" ? "सौंपी गई इकाई:" : "Assigned:"}{" "}
                                <strong className="text-slate-700 dark:text-slate-300">
                                  {item.assigned_to || (locale === "hi" ? "अनावंटित" : "Unassigned")}
                                </strong>
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {formatDateTime(item.created_at, locale)}
                              </span>
                            </div>
                          </div>

                          {/* Mobile Action Buttons Bar (Large Touch Targets >=40px) */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => handleFocusIncident(item)}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-slate-100"
                            >
                              <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>{locale === "hi" ? "मानचित्र दृश्य" : "View Map"}</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingIncident(item);
                                setFormError(null);
                              }}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-slate-100"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              <span>{locale === "hi" ? "संपादित करें" : "Edit Ticket"}</span>
                            </button>

                            <button
                              onClick={() => handleViewAudit(item)}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-slate-100"
                            >
                              <History className="w-3.5 h-3.5 text-slate-600" />
                              <span>{locale === "hi" ? "ऑडिट ट्रेल" : "Audit Trail"}</span>
                            </button>

                            {/* Status Transition Action with primary contrast */}
                            {isOpen && (
                              <button
                                onClick={() =>
                                  handleTransitionStatus(
                                    item.id,
                                    "ACKNOWLEDGED",
                                    locale === "hi"
                                      ? "स्थानीय मैदानी प्रतिक्रिया दल को सौंपा गया।"
                                      : "Assigned to local field response crew."
                                  )
                                }
                                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span>{locale === "hi" ? "स्वीकार करें" : "Acknowledge"}</span>
                              </button>
                            )}

                            {isAcknowledged && (
                              <button
                                onClick={() =>
                                  handleTransitionStatus(
                                    item.id,
                                    "RESPONDING",
                                    locale === "hi"
                                      ? "प्रतिक्रिया दल स्थल पर रवाना।"
                                      : "Responders mobilized on site."
                                  )
                                }
                                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span>{locale === "hi" ? "तैनात करें" : "Mobilize"}</span>
                              </button>
                            )}

                            {isResponding && (
                              <button
                                onClick={() =>
                                  handleTransitionStatus(
                                    item.id,
                                    "RESOLVED",
                                    locale === "hi"
                                      ? "संकट समाप्त एवं स्थल सुरक्षित प्रमाणित।"
                                      : "Hazard neutralized and site certified safe."
                                  )
                                }
                                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span>{locale === "hi" ? "समाधान करें" : "Resolve"}</span>
                              </button>
                            )}

                            {isResolved && (
                              <button
                                onClick={() =>
                                  handleTransitionStatus(
                                    item.id,
                                    "CLOSED",
                                    locale === "hi"
                                      ? "अंतिम मैदानी सत्यापन के बाद घटना बंद।"
                                      : "Incident closed after final field verification."
                                  )
                                }
                                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <span>{locale === "hi" ? "टिकट बंद करें" : "Close Ticket"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </StateContainer>

      {/* CREATE INCIDENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "आपातकालीन संकट घटना दर्ज करें" : "Log Emergency Distress Incident"}</span>
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
                  ? "डेटाबेस में जियोलोकेटेड संकट टिकट बनाता है। घटना लाइव जीआईएस मानचित्र पर प्रदर्शित होगी।"
                  : "Creates a geolocated distress ticket in Supabase. Incident will appear on the live GIS map."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateSubmit}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                    {formError}
                  </div>
                )}

                {/* Type & Severity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-inc-type" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("incidentType", "Incident Classification")} *
                    </label>
                    <select
                      id="create-inc-type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as IncidentType })
                      }
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {INCIDENT_TYPES.map((tItem) => (
                        <option key={tItem} value={tItem}>
                          {tItem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-inc-severity" className="font-semibold text-slate-700 dark:text-slate-300">
                      {tCommon("severity", "Severity Rating")} *
                    </label>
                    <select
                      id="create-inc-severity"
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({ ...formData, severity: e.target.value as SeverityLevel })
                      }
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="CRITICAL">{formatSeverity("CRITICAL", locale)} ({locale === "hi" ? "तत्काल जीवन संकट" : "Immediate Life Threat"})</option>
                      <option value="ALERT">{formatSeverity("ALERT", locale)} ({locale === "hi" ? "गंभीर आपदा / संपत्ति खतरा" : "Severe Hazard / Asset Threat"})</option>
                      <option value="ADVISORY">{formatSeverity("ADVISORY", locale)} ({locale === "hi" ? "स्थानीयकृत जलभराव" : "Localized Inundation"})</option>
                      <option value="NORMAL">{formatSeverity("NORMAL", locale)} ({locale === "hi" ? "सामान्य सूचना" : "Routine Notice"})</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label htmlFor="create-inc-title" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "घटना शीर्षक / सारांश *" : "Incident Title / Summary *"}
                  </label>
                  <input
                    id="create-inc-title"
                    type="text"
                    required
                    placeholder={locale === "hi" ? "उदा. सिंहगढ़ रोड सबवे पर गहरा जलभराव" : "e.g. Deep Waterlogging at Sinhagad Road Subway"}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                {/* Location Name */}
                <div className="space-y-1">
                  <label htmlFor="create-inc-location" className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("incidentLocation", "Landmark / Location Name")} *
                  </label>
                  <input
                    id="create-inc-location"
                    type="text"
                    required
                    placeholder={locale === "hi" ? "उदा. विट्ठलवाड़ी मंदिर के पास, सिंहगढ़ रोड" : "e.g. Near Vitthalwadi Temple, Sinhagad Road"}
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-inc-lat" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "अक्षांश (-90 से +90) *" : "Latitude (-90 to +90) *"}
                    </label>
                    <input
                      id="create-inc-lat"
                      type="number"
                      step="0.0001"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-inc-lon" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "देशांतर (-180 से +180) *" : "Longitude (-180 to +180) *"}
                    </label>
                    <input
                      id="create-inc-lon"
                      type="number"
                      step="0.0001"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>

                {/* Narrative Description */}
                <div className="space-y-1">
                  <label htmlFor="create-inc-desc" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "मैदानी विवरण एवं अवलोकन *" : "Field Description & Observations *"}
                  </label>
                  <textarea
                    id="create-inc-desc"
                    rows={3}
                    required
                    placeholder={locale === "hi" ? "विशिष्ट स्थिति, पानी की गहराई, अवरुद्ध लेन या प्रभावित नागरिकों का वर्णन करें..." : "Describe specific conditions, water depth, blocked lanes, or affected citizens..."}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 min-h-[70px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                {/* Assigned Unit & Reporter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="create-inc-assigned" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "सौंपा गया लाइन विभाग" : "Assigned Line Department"}
                    </label>
                    <input
                      id="create-inc-assigned"
                      type="text"
                      placeholder={locale === "hi" ? "उदा. नगर निगम जल निकासी दल #3" : "e.g. PMC Drainage Squad #3"}
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="create-inc-reporter" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("reporterName", "Reporting Source")}
                    </label>
                    <input
                      id="create-inc-reporter"
                      type="text"
                      placeholder={locale === "hi" ? "उदा. डायल 112 संकट प्रेषण" : "e.g. Dial 112 SOS Dispatch"}
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
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
                  className="min-h-[44px] px-4 font-semibold text-xs sm:text-sm"
                >
                  {tCommon("cancel", "Cancel")}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold min-h-[44px] px-5 text-xs sm:text-sm shadow-xs"
                >
                  {locale === "hi" ? "टिकट बनाएँ एवं प्रेषित करें" : "Create & Dispatch Ticket"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT INCIDENT MODAL */}
      {editingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#0F3D66]" />
                  <span>
                    {locale === "hi" ? "घटना संपादित करें" : "Edit Incident"} {editingIncident.incident_number}
                  </span>
                </CardTitle>
                <button
                  onClick={() => setEditingIncident(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={tCommon("close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleUpdateSubmit}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-inc-type" className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("incidentType", "Classification")}
                    </label>
                    <select
                      id="edit-inc-type"
                      value={editingIncident.type}
                      onChange={(e) =>
                        setEditingIncident({
                          ...editingIncident,
                          type: e.target.value as IncidentType,
                        })
                      }
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      {INCIDENT_TYPES.map((tItem) => (
                        <option key={tItem} value={tItem}>
                          {tItem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-inc-severity" className="font-semibold text-slate-700 dark:text-slate-300">
                      {tCommon("severity", "Severity")}
                    </label>
                    <select
                      id="edit-inc-severity"
                      value={editingIncident.severity}
                      onChange={(e) =>
                        setEditingIncident({
                          ...editingIncident,
                          severity: e.target.value as SeverityLevel,
                        })
                      }
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="CRITICAL">{formatSeverity("CRITICAL", locale)}</option>
                      <option value="ALERT">{formatSeverity("ALERT", locale)}</option>
                      <option value="ADVISORY">{formatSeverity("ADVISORY", locale)}</option>
                      <option value="NORMAL">{formatSeverity("NORMAL", locale)}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-inc-title" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "शीर्षक" : "Title"}
                  </label>
                  <input
                    id="edit-inc-title"
                    type="text"
                    required
                    value={editingIncident.title}
                    onChange={(e) =>
                      setEditingIncident({ ...editingIncident, title: e.target.value })
                    }
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-inc-location" className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("incidentLocation", "Location Landmark")}
                  </label>
                  <input
                    id="edit-inc-location"
                    type="text"
                    required
                    value={editingIncident.location_name}
                    onChange={(e) =>
                      setEditingIncident({ ...editingIncident, location_name: e.target.value })
                    }
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-inc-desc" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "वर्णनात्मक विवरण" : "Narrative Description"}
                  </label>
                  <textarea
                    id="edit-inc-desc"
                    rows={3}
                    required
                    value={editingIncident.description}
                    onChange={(e) =>
                      setEditingIncident({ ...editingIncident, description: e.target.value })
                    }
                    className="w-full px-3 py-2 min-h-[70px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-inc-assigned" className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("assignedTeam", "Assigned Team")}
                  </label>
                  <input
                    id="edit-inc-assigned"
                    type="text"
                    value={editingIncident.assigned_to || ""}
                    onChange={(e) =>
                      setEditingIncident({ ...editingIncident, assigned_to: e.target.value })
                    }
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingIncident(null)}
                  className="min-h-[44px] px-4 font-semibold text-xs sm:text-sm"
                >
                  {tCommon("cancel", "Cancel")}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold min-h-[44px] px-5 text-xs sm:text-sm shadow-xs"
                >
                  {tCommon("save", "Save Changes")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* INCIDENT DETAIL & CHRONOLOGICAL TIMELINE MODAL */}
      <IncidentTimelineModal
        isOpen={Boolean(selectedIncidentAudit)}
        onClose={() => setSelectedIncidentAudit(null)}
        incident={selectedIncidentAudit?.incident || null}
        initialAuditLogs={selectedIncidentAudit?.logs || []}
        initialAssignments={selectedIncidentAudit?.assignments || []}
        onIncidentUpdated={fetchIncidents}
      />
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
