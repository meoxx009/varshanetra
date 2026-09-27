"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Home,
  Truck,
  RotateCcw,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Send,
  X,
  Droplets,
  LifeBuoy,
  LayoutGrid,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatStatus, formatResourceType, formatNumber } from "@/lib/i18n/formatters";
import {
  ShelterVisualCard,
  ShelterAggregateSummary,
  NdmaShelterReportDialog,
  ShelterOccupancyDialog,
  ShelterIssueDialog,
} from "@/components/shelters";
import {
  Resource,
  Shelter,
  ResourceType,
  RESOURCE_TYPES,
  ShelterStatus,
  SHELTER_STATUSES,
  DataSourceMeta,
} from "@/types";

const RESOURCES_SOURCE_META: DataSourceMeta = {
  provider: "District Disaster Logistics Depot & Relief Shelter Grid",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Disaster equipment reserves and relief shelters. Coordinates represent certified emergency evacuation assembly posts.",
};

export default function ResourcesAndSheltersPage() {
  const locale = useLocale();
  const tResources = useTranslations("resources");
  const tShelters = useTranslations("shelters");
  const tCommon = useTranslations("common");

  const [activeTab, setActiveTab] = useState<"resources" | "shelters">("resources");
  const [viewState, setViewState] = useState<ComponentViewState>("success");

  // Data states
  const [resources, setResources] = useState<Resource[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [resourceSearch, setResourceSearch] = useState<string>("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("ALL");

  const [shelterSearch, setShelterSearch] = useState<string>("");
  const [shelterStatusFilter, setShelterStatusFilter] = useState<string>("ALL");

  // Dialogs
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const [isAddShelterOpen, setIsAddShelterOpen] = useState(false);
  const [isEditShelterOpen, setIsEditShelterOpen] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);

  // Shelter Visual Dialogs & View Modes (W-014)
  const [shelterViewMode, setShelterViewMode] = useState<"grid" | "table">("grid");
  const [isNdmaReportOpen, setIsNdmaReportOpen] = useState(false);
  const [occupancyModalShelter, setOccupancyModalShelter] = useState<Shelter | null>(null);
  const [issueModalShelter, setIssueModalShelter] = useState<Shelter | null>(null);

  // Action status message
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Forms
  const [resourceForm, setResourceForm] = useState({
    name: "",
    type: "Boat" as ResourceType,
    total_quantity: 10,
    deployed_quantity: 0,
    location: "",
    notes: "",
  });

  const [deployForm, setDeployForm] = useState({
    quantity: 1,
    destination: "",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    quantity: 1,
    notes: "",
  });

  const [shelterForm, setShelterForm] = useState({
    name: "",
    latitude: 18.5204,
    longitude: 73.8567,
    capacity: 250,
    current_occupancy: 0,
    water_available: true,
    food_available: true,
    medical_support: true,
    electricity: true,
    contact_information: "",
    status: "ACTIVE" as ShelterStatus,
    notes: "",
  });

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const [resRes, shlRes] = await Promise.all([
        fetch("/api/resources"),
        fetch("/api/shelters"),
      ]);

      const resJson = await resRes.json();
      const shlJson = await shlRes.json();

      if (!resRes.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to fetch logistics resources");
      }
      if (!shlRes.ok || !shlJson.success) {
        throw new Error(shlJson.error || "Failed to fetch relief shelters");
      }

      setResources(resJson.data || []);
      setShelters(shlJson.data || []);
      setViewState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to service";
      setErrorMsg(msg);
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "shelters") {
        setActiveTab("shelters");
      }
    }
  }, []);

  // Resource Operations
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourceForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register resource.");
      }
      setFeedback({ type: "success", message: `Resource "${resourceForm.name}" registered successfully.` });
      setIsAddResourceOpen(false);
      setResourceForm({
        name: "",
        type: "Boat",
        total_quantity: 10,
        deployed_quantity: 0,
        location: "",
        notes: "",
      });
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to create resource" });
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    setFeedback(null);

    // Frontend negative inventory protection check
    if (deployForm.quantity > selectedResource.available_quantity) {
      setFeedback({
        type: "error",
        message: `Cannot deploy ${deployForm.quantity} units. Only ${selectedResource.available_quantity} available in depot reserve.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/resources/${selectedResource.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute deployment.");
      }
      setFeedback({
        type: "success",
        message: `Successfully deployed ${deployForm.quantity} ${selectedResource.name} to ${deployForm.destination}.`,
      });
      setIsDeployOpen(false);
      setSelectedResource(null);
      setDeployForm({ quantity: 1, destination: "", notes: "" });
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Deployment failed" });
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    setFeedback(null);

    if (returnForm.quantity > selectedResource.deployed_quantity) {
      setFeedback({
        type: "error",
        message: `Cannot return ${returnForm.quantity} units. Only ${selectedResource.deployed_quantity} currently deployed in field.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/resources/${selectedResource.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to return resource to depot.");
      }
      setFeedback({
        type: "success",
        message: `Successfully returned ${returnForm.quantity} ${selectedResource.name} to depot inventory.`,
      });
      setIsReturnOpen(false);
      setSelectedResource(null);
      setReturnForm({ quantity: 1, notes: "" });
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Return failed" });
    }
  };

  // Shelter Operations
  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      const res = await fetch("/api/shelters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shelterForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register shelter.");
      }
      setFeedback({ type: "success", message: `Shelter "${shelterForm.name}" registered successfully.` });
      setIsAddShelterOpen(false);
      setShelterForm({
        name: "",
        latitude: 18.5204,
        longitude: 73.8567,
        capacity: 250,
        current_occupancy: 0,
        water_available: true,
        food_available: true,
        medical_support: true,
        electricity: true,
        contact_information: "",
        status: "ACTIVE",
        notes: "",
      });
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to create shelter" });
    }
  };

  const handleUpdateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShelter) return;
    setFeedback(null);

    const isOver = shelterForm.current_occupancy > shelterForm.capacity;

    try {
      const res = await fetch(`/api/shelters/${selectedShelter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shelterForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update shelter.");
      }

      if (isOver) {
        setFeedback({
          type: "warning",
          message: `VALIDATION WARNING: Occupancy (${shelterForm.current_occupancy}) exceeds rated capacity (${shelterForm.capacity}) for ${selectedShelter.name}. Emergency protocols logged.`,
        });
      } else {
        setFeedback({ type: "success", message: `Shelter "${selectedShelter.name}" updated successfully.` });
      }

      setIsEditShelterOpen(false);
      setSelectedShelter(null);
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update shelter" });
    }
  };

  // Quick Occupancy Adjustment
  const handleQuickOccupancyAdjust = async (shelter: Shelter, delta: number) => {
    const newOccupancy = Math.max(0, shelter.current_occupancy + delta);
    setFeedback(null);

    try {
      const res = await fetch(`/api/shelters/${shelter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_occupancy: newOccupancy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust occupancy.");
      }

      if (data.overcapacityWarning) {
        setFeedback({
          type: "warning",
          message: `EXPLICIT VALIDATION WARNING: Intake increased occupancy (${newOccupancy}) beyond rated capacity (${shelter.capacity}) for ${shelter.name}.`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `Occupancy updated for ${shelter.name}: ${newOccupancy}/${shelter.capacity} evacuees.`,
        });
      }
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Adjustment failed" });
    }
  };

  // Modal Handlers for ShelterVisualCard quick actions (W-014)
  const handleUpdateOccupancyFromModal = async (shelter: Shelter, newOccupancy: number) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/shelters/${shelter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_occupancy: newOccupancy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update occupancy.");
      }

      if (newOccupancy > shelter.capacity) {
        setFeedback({
          type: "warning",
          message: `${shelter.name}: ${locale === "hi" ? "चेतावनी: अधिभोग निर्धारित क्षमता से अधिक है।" : "Warning: Occupancy exceeds rated capacity."} (${newOccupancy}/${shelter.capacity})`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `${shelter.name}: ${locale === "hi" ? "अधिभोग सफलतापूर्वक अद्यतन किया गया।" : "Occupancy updated successfully."} (${newOccupancy}/${shelter.capacity})`,
        });
      }
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update occupancy" });
      throw err;
    }
  };

  const handleReportIssueFromModal = async (shelter: Shelter, issueText: string, category: string) => {
    setFeedback(null);
    try {
      const timestamp = new Date().toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" });
      const newNote = shelter.notes
        ? `${shelter.notes} | [${category} ${timestamp}]: ${issueText}`
        : `[${category} ${timestamp}]: ${issueText}`;

      const res = await fetch(`/api/shelters/${shelter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit issue report.");
      }

      setFeedback({
        type: "success",
        message: `${shelter.name}: ${locale === "hi" ? "समस्या रिपोर्ट जिला नियंत्रण कक्ष में दर्ज कर ली गई है।" : "Issue report logged to District Control Room."}`,
      });
      fetchData(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to submit issue" });
      throw err;
    }
  };

  // Filtered lists
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesType = resourceTypeFilter === "ALL" || r.type === resourceTypeFilter;
      const matchesSearch =
        !resourceSearch ||
        r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.location.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(resourceSearch.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [resources, resourceTypeFilter, resourceSearch]);

  const filteredShelters = useMemo(() => {
    return shelters.filter((s) => {
      const matchesStatus = shelterStatusFilter === "ALL" || s.status === shelterStatusFilter;
      const matchesSearch =
        !shelterSearch ||
        s.name.toLowerCase().includes(shelterSearch.toLowerCase()) ||
        (s.contact_information && s.contact_information.toLowerCase().includes(shelterSearch.toLowerCase())) ||
        (s.notes && s.notes.toLowerCase().includes(shelterSearch.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [shelters, shelterStatusFilter, shelterSearch]);

  // Aggregate Metrics
  const totalResourceItems = useMemo(() => resources.reduce((acc, r) => acc + r.total_quantity, 0), [resources]);
  const deployedResourceItems = useMemo(() => resources.reduce((acc, r) => acc + r.deployed_quantity, 0), [resources]);
  const availableResourceItems = useMemo(() => resources.reduce((acc, r) => acc + r.available_quantity, 0), [resources]);
  const overcapacitySheltersCount = useMemo(() => shelters.filter((s) => s.overcapacity_warning).length, [shelters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tResources("title", "Resource Inventory & Relief Shelter Command")}
        description={locale === "hi"
          ? "जल निकासी उपकरण, बचाव नौकाओं और राशन किटों का जिला रसद भंडार, साथ ही वास्तविक समय अधिभोग ट्रैकिंग वाले उच्च क्षमता वाले राहत शिविर।"
          : "District logistics reserve dispatching dewatering equipment, boats, and ration packs, alongside high-capacity relief shelters with real-time occupancy tracking."}
        breadcrumbs={[
          { label: tCommon("overview", "Dashboard"), href: "/dashboard" },
          { label: tResources("title", "Resource & Shelter Command") },
        ]}
        sourceMeta={RESOURCES_SOURCE_META}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="text-xs gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{tCommon("refresh", "Refresh")}</span>
            </Button>
            {activeTab === "resources" ? (
              <Button
                size="sm"
                onClick={() => setIsAddResourceOpen(true)}
                className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{tResources("createResource", "Register Equipment")}</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsAddShelterOpen(true)}
                className="bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{tShelters("createShelter", "Register Shelter")}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Tab Selector */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
              activeTab === "resources"
                ? "bg-[#0F3D66] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{locale === "hi" ? "उपकरण एवं रसद भंडार" : "Equipment & Logistics Reserves"} ({resources.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("shelters")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
              activeTab === "shelters"
                ? "bg-[#059669] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{locale === "hi" ? "राहत आश्रय एवं शिविर" : "Relief Shelters & Evacuee Camps"} ({shelters.length})</span>
            {overcapacitySheltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold animate-pulse">
                {overcapacitySheltersCount} {locale === "hi" ? "अति-अधिभोग" : "Overcapacity"}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 hidden sm:flex">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{locale === "hi" ? "सकारात्मक इन्वेंट्री सुरक्षा तंत्र सक्रिय" : "Transactional Negative-Inventory Guard Active"}</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: RESOURCES & LOGISTICS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          {/* Top Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={locale === "hi" ? "कुल जिला संपत्तियां" : "Total District Assets"}
              value={totalResourceItems.toLocaleString()}
              unit={locale === "hi" ? "मदें" : "Items"}
              subtext={locale === "hi" ? "उपकरण, किट और खाद्य भंडार" : "Equipment, kits, and food reserves"}
              icon={Package}
              severity="NORMAL"
              sourceLabel={locale === "hi" ? "जिला डिपो" : "District Depot"}
              isLoading={isLoading}
            />
            <MetricCard
              title={locale === "hi" ? "उपलब्ध रिज़र्व स्टॉक" : "Available Reserve"}
              value={availableResourceItems.toLocaleString()}
              unit={locale === "hi" ? "मदें" : "Items"}
              subtext={locale === "hi" ? "त्वरित तैनाती हेतु तैयार भंडार" : "Immediate deployment readiness"}
              icon={Droplets}
              severity="NORMAL"
              sourceLabel={locale === "hi" ? "आईडीआरएन डिपो" : "IDRN Depots"}
              isLoading={isLoading}
            />
            <MetricCard
              title={locale === "hi" ? "वर्तमान में तैनात" : "Currently Deployed"}
              value={deployedResourceItems.toLocaleString()}
              unit={locale === "hi" ? "मदें" : "Items"}
              subtext={locale === "hi" ? "जलमग्न सेक्टरों में कार्यरत" : "Operating in inundated sectors"}
              icon={Truck}
              severity={deployedResourceItems > 0 ? "ADVISORY" : "NORMAL"}
              sourceLabel={locale === "hi" ? "सामरिक क्षेत्र" : "Tactical Field"}
              isLoading={isLoading}
            />
            <MetricCard
              title={locale === "hi" ? "बचाव नौकाएं एवं पंप" : "Rescue Boats & Pumps"}
              value={`${
                resources.find((r) => r.type === "Boat")?.available_quantity || 0
              } / ${resources.find((r) => r.type === "Rescue Vehicle")?.available_quantity || 0}`}
              unit={locale === "hi" ? "तैयार" : "Ready"}
              subtext={locale === "hi" ? "नौकाएं / जल निकासी ट्रक" : "Boats / Dewatering Trucks"}
              icon={LifeBuoy}
              severity="ALERT"
              sourceLabel="SDRF/PMC"
              isLoading={isLoading}
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder={locale === "hi" ? "उपकरण, डिपो स्थान या विवरण खोजें..." : "Search equipment, depot location, or notes..."}
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">{locale === "hi" ? "सभी श्रेणियां" : "All Categories"} ({resources.length})</option>
                {RESOURCE_TYPES.map((tItem) => (
                  <option key={tItem} value={tItem}>
                    {formatResourceType(tItem, locale)} ({resources.filter((r) => r.type === tItem).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resources Table */}
          <StateContainer
            state={viewState}
            onRetry={() => fetchData(true)}
            errorMessage={errorMsg || (locale === "hi" ? "जिला संसाधन नेटवर्क डेटाबेस से संपर्क करने में असमर्थ।" : "Unable to reach District Resource Network database.")}
            emptyTitle={locale === "hi" ? "कोई संसाधन नहीं मिला" : "No Resources Found"}
            emptyDescription={locale === "hi" ? "आपके खोज मानदंडों से मेल खाता कोई उपकरण पंजीकृत नहीं है।" : "No equipment registered matching your search criteria."}
          >
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">{locale === "hi" ? "उपकरण एवं सामरिक रसद भंडार" : "Equipment & Tactical Logistics Stockpile"}</CardTitle>
                <CardDescription className="text-xs">
                  {locale === "hi"
                    ? "वास्तविक समय डिपो उपलब्धता और क्षेत्र तैनाती ट्रैकिंग।"
                    : "Real-time depot availability and atomic field deployment tracking."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">{locale === "hi" ? "उपकरण / संसाधन" : "Equipment / Resource"}</th>
                        <th className="py-2.5 px-3">{tResources("resourceType", "Category")}</th>
                        <th className="py-2.5 px-3 text-right">{locale === "hi" ? "कुल" : "Total"}</th>
                        <th className="py-2.5 px-3 text-right">{locale === "hi" ? "उपलब्ध" : "Available"}</th>
                        <th className="py-2.5 px-3 text-right">{locale === "hi" ? "तैनात" : "Deployed"}</th>
                        <th className="py-2.5 px-3">{tResources("depotLocation", "Depot Location")}</th>
                        <th className="py-2.5 px-3 text-center">{tCommon("actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredResources.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {locale === "hi" ? "फ़िल्टर से मेल खाता कोई संसाधन नहीं मिला।" : "No resources found matching filter."}
                          </td>
                        </tr>
                      ) : (
                        filteredResources.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                {item.name}
                              </div>
                              {item.notes && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                                  {item.notes}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                                {formatResourceType(item.type, locale)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                              {formatNumber(item.total_quantity, locale)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatNumber(item.available_quantity, locale)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                              {formatNumber(item.deployed_quantity, locale)}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs truncate">
                              {item.location}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedResource(item);
                                    setDeployForm({ quantity: 1, destination: "", notes: "" });
                                    setIsDeployOpen(true);
                                  }}
                                  disabled={item.available_quantity <= 0}
                                  className="h-7 px-2 text-[11px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300 gap-1 font-semibold"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{tResources("deployUnits", "Deploy")}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedResource(item);
                                    setReturnForm({ quantity: 1, notes: "" });
                                    setIsReturnOpen(true);
                                  }}
                                  disabled={item.deployed_quantity <= 0}
                                  className="h-7 px-2 text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 gap-1 font-semibold"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>{tResources("returnUnits", "Return")}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </StateContainer>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: RELIEF SHELTERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "shelters" && (
        <div className="space-y-6">
          {/* Top Aggregate Summary Banner with NDMA Daily Report (W-014) */}
          <ShelterAggregateSummary
            shelters={shelters}
            locale={locale}
            onOpenNdmaReport={() => setIsNdmaReportOpen(true)}
          />

          {/* Shelter Filters and View Mode Switcher */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder={locale === "hi" ? "आश्रय नाम, संपर्क या अधिकारी खोजें..." : "Search shelter name, contact, or officer..."}
                value={shelterSearch}
                onChange={(e) => setShelterSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={shelterStatusFilter}
                  onChange={(e) => setShelterStatusFilter(e.target.value)}
                  className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">{locale === "hi" ? "सभी स्थितियां" : "All Statuses"} ({shelters.length})</option>
                  {SHELTER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {formatStatus(st, locale)} ({shelters.filter((s) => s.status === st).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Cards vs Table */}
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShelterViewMode("grid")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                    shelterViewMode === "grid"
                      ? "bg-[#059669] text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={locale === "hi" ? "कार्ड दृश्य" : "Card Grid View"}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{locale === "hi" ? "कार्ड्स" : "Cards"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShelterViewMode("table")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                    shelterViewMode === "table"
                      ? "bg-[#059669] text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={locale === "hi" ? "तालिका दृश्य" : "Table View"}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{locale === "hi" ? "तालिका" : "Table"}</span>
                </button>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setShelterForm({
                    name: "",
                    latitude: 18.5204,
                    longitude: 73.8567,
                    capacity: 250,
                    current_occupancy: 0,
                    water_available: true,
                    food_available: true,
                    medical_support: false,
                    electricity: true,
                    contact_information: "",
                    status: "ACTIVE",
                    notes: "",
                  });
                  setIsAddShelterOpen(true);
                }}
                className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                <span>{locale === "hi" ? "आश्रय जोड़ें" : "Add Shelter"}</span>
              </Button>
            </div>
          </div>

          {/* Shelters Table */}
          <StateContainer
            state={viewState}
            onRetry={() => fetchData(true)}
            errorMessage={errorMsg || (locale === "hi" ? "राहत आश्रय डेटाबेस से संपर्क करने में असमर्थ।" : "Unable to reach relief shelter database.")}
            emptyTitle={locale === "hi" ? "कोई आश्रय पंजीकृत नहीं" : "No Shelters Registered"}
            emptyDescription={locale === "hi" ? "फ़िल्टर से मेल खाता कोई राहत आश्रय नहीं मिला।" : "No relief shelters found matching filter."}
          >
            {shelterViewMode === "grid" ? (
              filteredShelters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
                  <Home className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>{locale === "hi" ? "कोई राहत आश्रय नहीं मिला।" : "No relief shelters found."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredShelters.map((s) => (
                    <ShelterVisualCard
                      key={s.id}
                      shelter={s}
                      locale={locale}
                      onUpdateOccupancy={(target) => setOccupancyModalShelter(target)}
                      onReportIssue={(target) => setIssueModalShelter(target)}
                    />
                  ))}
                </div>
              )
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold">{locale === "hi" ? "निर्दिष्ट आपातकालीन राहत आश्रय" : "Designated Emergency Relief Shelters"}</CardTitle>
                      <CardDescription className="text-xs">
                        {locale === "hi"
                          ? "लाइव क्षमता उपयोग, जीवन-रक्षक सुविधाएं, और प्रवेश नियंत्रण।"
                          : "Live capacity utilization, life-support amenities, and intake controls."}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">{locale === "hi" ? "आश्रय नाम एवं संपर्क" : "Shelter Name & Contact"}</th>
                          <th className="py-2.5 px-3">{tCommon("status", "Status")}</th>
                          <th className="py-2.5 px-3 text-center">{locale === "hi" ? "अधिभोग / क्षमता" : "Occupancy / Capacity"}</th>
                          <th className="py-2.5 px-3 text-right">{locale === "hi" ? "उपलब्ध रिक्तियां" : "Available Spots"}</th>
                          <th className="py-2.5 px-3 text-center">{locale === "hi" ? "आवश्यक सुविधाएं" : "Essential Amenities"}</th>
                          <th className="py-2.5 px-3 text-center">{locale === "hi" ? "प्रवेश समायोजन" : "Intake Adjustment"}</th>
                          <th className="py-2.5 px-3 text-center">{tCommon("actions", "Manage")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredShelters.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              {locale === "hi" ? "अभी तक कोई राहत आश्रय पंजीकृत नहीं है।" : "No relief shelters registered yet."}
                            </td>
                          </tr>
                        ) : (
                          filteredShelters.map((s) => {
                            const pct = s.occupancy_rate || 0;
                            const isOver = Boolean(s.overcapacity_warning);

                            return (
                              <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug flex items-center gap-1.5">
                                    <span>{s.name}</span>
                                    {isOver && (
                                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-mono text-[9px] font-bold">
                                        {locale === "hi" ? "क्षमता से अधिक" : "OVERCAPACITY"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>
                                      {s.latitude.toFixed(4)}° N, {s.longitude.toFixed(4)}° E
                                    </span>
                                    {s.contact_information && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-400">
                                          {s.contact_information}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      s.status === "ACTIVE"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : s.status === "FULL"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                        : s.status === "STANDBY"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                    }`}
                                  >
                                    {formatStatus(s.status, locale)}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {s.current_occupancy} / {s.capacity}
                                  </div>
                                  <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        isOver ? "bg-red-600" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {pct}% {locale === "hi" ? "क्षमता" : "capacity"}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {s.available_capacity ?? Math.max(0, s.capacity - s.current_occupancy)}
                                </td>

                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-center gap-2 text-xs">
                                    <span title={s.water_available ? (locale === "hi" ? "पेयजल आपूर्ति सक्रिय" : "Water Supply Active") : (locale === "hi" ? "पानी उपलब्ध नहीं" : "No Water")} className={s.water_available ? "opacity-100" : "opacity-25 grayscale"}>
                                      🚰
                                    </span>
                                    <span title={s.food_available ? (locale === "hi" ? "राशन आपूर्ति सक्रिय" : "Ration Supply Active") : (locale === "hi" ? "भोजन उपलब्ध नहीं" : "No Food")} className={s.food_available ? "opacity-100" : "opacity-25 grayscale"}>
                                      🍲
                                    </span>
                                    <span title={s.medical_support ? (locale === "hi" ? "चिकित्सा दल स्थल पर" : "Medical Team On-Site") : (locale === "hi" ? "चिकित्सा उपलब्ध नहीं" : "No Medical")} className={s.medical_support ? "opacity-100" : "opacity-25 grayscale"}>
                                      🩺
                                    </span>
                                    <span title={s.electricity ? (locale === "hi" ? "विद्युत / जनरेटर सक्रिय" : "Power / Generator Online") : (locale === "hi" ? "बिजली नहीं" : "No Power")} className={s.electricity ? "opacity-100" : "opacity-25 grayscale"}>
                                      ⚡
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleQuickOccupancyAdjust(s, -10)}
                                      disabled={s.current_occupancy <= 0}
                                      title={locale === "hi" ? "10 विस्थापित मुक्त करें" : "Release 10 Evacuees"}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold disabled:opacity-30"
                                    >
                                      -10
                                    </button>
                                    <button
                                      onClick={() => handleQuickOccupancyAdjust(s, 10)}
                                      title={locale === "hi" ? "10 विस्थापित जोड़ें" : "Admit 10 Evacuees"}
                                      className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                                    >
                                      +10
                                    </button>
                                    <button
                                      onClick={() => handleQuickOccupancyAdjust(s, 50)}
                                      title={locale === "hi" ? "50 विस्थापित जोड़ें" : "Admit 50 Evacuees"}
                                      className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-bold"
                                    >
                                      +50
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedShelter(s);
                                      setShelterForm({
                                        name: s.name,
                                        latitude: s.latitude,
                                        longitude: s.longitude,
                                        capacity: s.capacity,
                                        current_occupancy: s.current_occupancy,
                                        water_available: s.water_available,
                                        food_available: s.food_available,
                                        medical_support: s.medical_support,
                                        electricity: s.electricity,
                                        contact_information: s.contact_information || "",
                                        status: s.status,
                                        notes: s.notes || "",
                                      });
                                      setIsEditShelterOpen(true);
                                    }}
                                    className="h-7 px-2 text-[11px] text-[#0F3D66] dark:text-blue-400 font-semibold"
                                  >
                                    {tCommon("edit", "Edit")}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </StateContainer>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: REGISTER RESOURCE */}
      {/* ------------------------------------------------------------- */}
      {isAddResourceOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                {locale === "hi" ? "नया उपकरण या रसद संसाधन पंजीकृत करें" : "Register New Equipment or Logistics Resource"}
              </h3>
              <button onClick={() => setIsAddResourceOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  {tResources("resourceName", "Equipment / Material Name")} *
                </label>
                <input
                  required
                  placeholder={locale === "hi" ? "उदा. इन्फ्लेटेबल रेस्क्यू बोट (ओबीएम सहित)" : "e.g., Inflatable Rescue Boat with OBM"}
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">
                    {tResources("resourceType", "Category / Type")} *
                  </label>
                  <select
                    value={resourceForm.type}
                    onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatResourceType(t, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    {tResources("totalQuantity", "Total Stock Quantity")} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={resourceForm.total_quantity}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, total_quantity: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  {tResources("depotLocation", "Depot / Storage Location")} *
                </label>
                <input
                  required
                  placeholder={locale === "hi" ? "उदा. स्वारगेट केंद्रीय राहत डिपो" : "e.g., Swargate Municipal Depot Workshop"}
                  value={resourceForm.location}
                  onChange={(e) => setResourceForm({ ...resourceForm, location: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  {locale === "hi" ? "तकनीकी विनिर्देश व विवरण" : "Technical Specs & Notes"}
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  placeholder={locale === "hi" ? "उदा. तीव्र बहाव जल बचाव हेतु उपयुक्त, 40एचपी मोटर" : "e.g., Rated for swiftwater navigation, 40HP Yamaha outboard"}
                  value={resourceForm.notes}
                  onChange={(e) => setResourceForm({ ...resourceForm, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddResourceOpen(false)}>
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button type="submit" size="sm" className="bg-[#0F3D66] text-white font-bold">
                  {locale === "hi" ? "उपकरण सहेजें" : "Save Equipment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: DEPLOY RESOURCE */}
      {/* ------------------------------------------------------------- */}
      {isDeployOpen && selectedResource && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#2563EB]" />
                  {tResources("deployUnits", "Deploy Equipment to Field")}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedResource.name}</p>
              </div>
              <button onClick={() => setIsDeployOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDeploy} className="p-4 space-y-3.5 text-xs">
              <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>{locale === "hi" ? "डिपो में उपलब्ध मात्रा:" : "Current Available in Depot:"}</span>
                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {selectedResource.available_quantity} {locale === "hi" ? "इकाइयाँ" : "Units"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {locale === "hi"
                    ? `कुल स्टॉक: ${selectedResource.total_quantity} • वर्तमान में तैनात: ${selectedResource.deployed_quantity}`
                    : `Total Stock: ${selectedResource.total_quantity} • Currently Deployed: ${selectedResource.deployed_quantity}`}
                </p>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {tResources("quantityToDeploy", "Quantity to Deploy")} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedResource.available_quantity}
                  required
                  value={deployForm.quantity}
                  onChange={(e) => setDeployForm({ ...deployForm, quantity: parseInt(e.target.value, 10) || 1 })}
                />
                {deployForm.quantity > selectedResource.available_quantity && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    {locale === "hi"
                      ? `उपलब्ध आरक्षित (${selectedResource.available_quantity}) से अधिक। ऋणात्मक इन्वेंटरी प्रतिबंधित है।`
                      : `Exceeds available reserve (${selectedResource.available_quantity}). Negative inventory prohibited.`}
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {tResources("destinationSector", "Destination / Sector")} *
                </label>
                <input
                  required
                  placeholder={locale === "hi" ? "उदा. सिंहगढ़ रोड जलभराव सेक्टर" : "e.g., Sinhagad Road Flash Inundation Sector"}
                  value={deployForm.destination}
                  onChange={(e) => setDeployForm({ ...deployForm, destination: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {locale === "hi" ? "अभियान निर्देश व विवरण" : "Mission Notes"}
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  placeholder={locale === "hi" ? "उदा. एसडीआरएफ टीम 5 को सबवे डीवाटरिंग हेतु सौंपा गया" : "e.g., Tasked with SDRF Battalion 5 for subway pumping"}
                  value={deployForm.notes}
                  onChange={(e) => setDeployForm({ ...deployForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDeployOpen(false)}>
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deployForm.quantity > selectedResource.available_quantity || deployForm.quantity <= 0}
                  className="bg-[#2563EB] text-white font-bold"
                >
                  {locale === "hi" ? "तैनाती की पुष्टि करें" : "Confirm Deployment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: RETURN RESOURCE */}
      {/* ------------------------------------------------------------- */}
      {isReturnOpen && selectedResource && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                  {tResources("returnUnits", "Return Equipment to Depot Inventory")}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedResource.name}</p>
              </div>
              <button onClick={() => setIsReturnOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReturn} className="p-4 space-y-3.5 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>{locale === "hi" ? "वर्तमान में क्षेत्र में तैनात:" : "Currently Operating in Field:"}</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                    {selectedResource.deployed_quantity} {locale === "hi" ? "इकाइयाँ" : "Units"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {locale === "hi" ? "डिपो स्थान:" : "Depot Location:"} {selectedResource.location}
                </p>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {locale === "hi" ? "वापस करने की मात्रा *" : "Quantity to Return *"}
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedResource.deployed_quantity}
                  required
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value, 10) || 1 })}
                />
                {returnForm.quantity > selectedResource.deployed_quantity && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    {locale === "hi"
                      ? `वर्तमान में तैनात (${selectedResource.deployed_quantity}) से अधिक वापस नहीं किया जा सकता।`
                      : `Cannot return more than currently deployed (${selectedResource.deployed_quantity}).`}
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {locale === "hi" ? "वापसी निरीक्षण विवरण" : "Return Inspection Notes"}
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  placeholder={locale === "hi" ? "उदा. उपकरण का निरीक्षण व सर्विसिंग पूर्ण, डिपो में सुरक्षित संग्रहित" : "e.g., Equipment inspected, serviced, and stored back in Swargate bay"}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsReturnOpen(false)}>
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={returnForm.quantity > selectedResource.deployed_quantity || returnForm.quantity <= 0}
                  className="bg-emerald-600 text-white font-bold"
                >
                  {locale === "hi" ? "इन्वेंटरी में पुनः जोड़ें" : "Reintegrate to Inventory"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CREATE / EDIT SHELTER */}
      {/* ------------------------------------------------------------- */}
      {(isAddShelterOpen || isEditShelterOpen) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                {isAddShelterOpen
                  ? tShelters("createShelter", "Register Evacuation Shelter")
                  : `${tCommon("edit", "Edit")}: ${selectedShelter?.name}`}
              </h3>
              <button
                onClick={() => {
                  setIsAddShelterOpen(false);
                  setIsEditShelterOpen(false);
                  setSelectedShelter(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={isAddShelterOpen ? handleCreateShelter : handleUpdateShelter} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  {tShelters("shelterName", "Shelter Facility Name")} *
                </label>
                <input
                  required
                  placeholder={locale === "hi" ? "उदा. शिवाजी नगर बहुउद्देश्यीय सामुदायिक केंद्र" : "e.g., Shivaji Nagar Multi-Purpose Community Hall"}
                  value={shelterForm.name}
                  onChange={(e) => setShelterForm({ ...shelterForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">{locale === "hi" ? "अक्षांश (° N) *" : "Latitude (° N) *"}</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={shelterForm.latitude}
                    onChange={(e) => setShelterForm({ ...shelterForm, latitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">{locale === "hi" ? "देशांतर (° E) *" : "Longitude (° E) *"}</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={shelterForm.longitude}
                    onChange={(e) => setShelterForm({ ...shelterForm, longitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">
                    {tShelters("capacity", "Nominal Rated Capacity")} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={shelterForm.capacity}
                    onChange={(e) =>
                      setShelterForm({ ...shelterForm, capacity: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    {tShelters("currentOccupancy", "Current Evacuee Occupancy")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shelterForm.current_occupancy}
                    onChange={(e) =>
                      setShelterForm({ ...shelterForm, current_occupancy: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Explicit Overcapacity Warning Banner */}
              {shelterForm.current_occupancy > shelterForm.capacity && (
                <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong>{locale === "hi" ? "अति-क्षमता चेतावनी:" : "EXPLICIT VALIDATION WARNING:"}</strong>{" "}
                    {locale === "hi"
                      ? `वर्तमान अधिभोग (${shelterForm.current_occupancy}) निर्धारित क्षमता (${shelterForm.capacity}) से अधिक है। स्थिति डैशबोर्ड पर चेतावनी प्रदर्शित होगी।`
                      : `Current occupancy (${shelterForm.current_occupancy}) exceeds rated nominal capacity (${shelterForm.capacity}). An overcapacity alert badge will be displayed on the map and situational dashboard.`}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">{tCommon("status", "Operational Status")}</label>
                  <select
                    value={shelterForm.status}
                    onChange={(e) => setShelterForm({ ...shelterForm, status: e.target.value as ShelterStatus })}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  >
                    {SHELTER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {formatStatus(st, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">{locale === "hi" ? "संपर्क फोन / प्रभारी अधिकारी" : "Contact Phone / Officer"}</label>
                  <input
                    placeholder={locale === "hi" ? "उदा. +91 94220 12040 (प्रभारी)" : "e.g., +91 94220 12040 (Caretaker)"}
                    value={shelterForm.contact_information}
                    onChange={(e) => setShelterForm({ ...shelterForm, contact_information: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1.5">{tShelters("amenities", "Life-Support Amenities Provided")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-200 dark:border-slate-800 p-2.5 rounded-md">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shelterForm.water_available}
                      onChange={(e) => setShelterForm({ ...shelterForm, water_available: e.target.checked })}
                    />
                    <span>🚰 {locale === "hi" ? "पेयजल" : "Water"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shelterForm.food_available}
                      onChange={(e) => setShelterForm({ ...shelterForm, food_available: e.target.checked })}
                    />
                    <span>🍲 {locale === "hi" ? "भोजन" : "Food"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shelterForm.medical_support}
                      onChange={(e) => setShelterForm({ ...shelterForm, medical_support: e.target.checked })}
                    />
                    <span>🩺 {locale === "hi" ? "चिकित्सा" : "Medical"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shelterForm.electricity}
                      onChange={(e) => setShelterForm({ ...shelterForm, electricity: e.target.checked })}
                    />
                    <span>⚡ {locale === "hi" ? "बिजली" : "Power"}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">{locale === "hi" ? "परिचालन निर्देश व विवरण" : "Operational Directives & Notes"}</label>
                <textarea
                  rows={2}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                  placeholder={locale === "hi" ? "उदा. बाढ़ स्तर से ऊपर सुरक्षित पक्का भवन। समर्पित बाल चिकित्सा पोस्ट।" : "e.g., Elevated plinth above river flood level. Dedicated pediatric medical post."}
                  value={shelterForm.notes}
                  onChange={(e) => setShelterForm({ ...shelterForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddShelterOpen(false);
                    setIsEditShelterOpen(false);
                    setSelectedShelter(null);
                  }}
                >
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button type="submit" size="sm" className="bg-[#059669] text-white font-bold">
                  {isAddShelterOpen
                    ? (locale === "hi" ? "राहत शिविर पंजीकृत करें" : "Register Shelter")
                    : (locale === "hi" ? "परिवर्तन सहेजें" : "Save Changes")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: NDMA DAILY SHELTER REPORT (W-014) */}
      {/* ------------------------------------------------------------- */}
      <NdmaShelterReportDialog
        isOpen={isNdmaReportOpen}
        onClose={() => setIsNdmaReportOpen(false)}
        shelters={shelters}
        districtName={locale === "hi" ? "जिला आपदा नियंत्रण केंद्र" : "District Incident Command"}
        locale={locale}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: QUICK OCCUPANCY UPDATE (W-014 Quick Action 1) */}
      {/* ------------------------------------------------------------- */}
      <ShelterOccupancyDialog
        isOpen={!!occupancyModalShelter}
        onClose={() => setOccupancyModalShelter(null)}
        shelter={occupancyModalShelter}
        onSave={handleUpdateOccupancyFromModal}
        locale={locale}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 8: REPORT SHELTER ISSUE (W-014 Quick Action 2) */}
      {/* ------------------------------------------------------------- */}
      <ShelterIssueDialog
        isOpen={!!issueModalShelter}
        onClose={() => setIssueModalShelter(null)}
        shelter={issueModalShelter}
        onSubmitIssue={handleReportIssueFromModal}
        locale={locale}
      />
    </div>
  );
}
