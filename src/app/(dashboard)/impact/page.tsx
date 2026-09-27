"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  HeartPulse,
  ShieldAlert,
  School,
  Waves,
  Download,
  Search,
  ArrowUpDown,
  Navigation,
  ExternalLink,
  Info,
  RefreshCw,
  CheckCircle2,
  Filter,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import {
  ActiveMapLayerId,
  FacilitiesGroupedResponse,
  ForecastWindow,
  MapInspectorData,
  SpatialRiskGridFeatureCollection,
  SpatialRiskCellProperties,
} from "@/types";
import {
  computeSpatialImpactAnalysis,
  generateExposedFacilitiesCsv,
  ExposedFacilityItem,
  ImpactDepartment,
  ExposureLevel,
} from "@/lib/services/spatial-impact";
import { fetchDistrictInfrastructureClient } from "@/lib/services/overpass-client";

// Client-only dynamic import for Leaflet GIS Map Canvas
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[440px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Initializing Spatial Infrastructure Cartography...
      </span>
      <p className="text-[11px] text-slate-500">
        Intersecting OpenStreetMap critical facilities with flood hazard polygons.
      </p>
    </div>
  ),
});

const DEFAULT_MAP_LAYERS: Record<ActiveMapLayerId, boolean> = {
  basemap: true,
  floodRisk: true,
  hospitals: true,
  clinics: true,
  police: true,
  fire: true,
  schools: true,
  rivers: true,
  riverGauges: true,
  fieldReports: true,
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

type DepartmentFilter = "ALL" | ImpactDepartment;
type ExposureFilter = "ALL" | "EXPOSED_ONLY" | "DIRECT_ONLY" | "BUFFER_ONLY";
type SortOption = "SEVERITY_DESC" | "DISTANCE_ASC" | "NAME_ASC" | "DEPARTMENT";

export default function ImpactPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tNav = useTranslations("navigation");
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // View state and telemetry
  const [viewState, setViewState] = useState<ComponentViewState>("success");
  const [forecastWindow, setForecastWindow] = useState<ForecastWindow>("24h");
  const [facilities, setFacilities] = useState<FacilitiesGroupedResponse | null>(null);
  const [riskGrid, setRiskGrid] = useState<SpatialRiskGridFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Map state
  const [selectedRiskCell, setSelectedRiskCell] = useState<SpatialRiskCellProperties | null>(null);
  const [inspectorData, setInspectorData] = useState<MapInspectorData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [focusCoordinates, setFocusCoordinates] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
  } | null>(null);

  // Table filtering & sorting
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("ALL");
  const [exposureFilter, setExposureFilter] = useState<ExposureFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("SEVERITY_DESC");

  // Fetch telemetry
  const fetchImpactTelemetry = useCallback(
    async (bypassCache = false) => {
      if (bypassCache) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage("");

      try {
        const [facResult, gridRes] = await Promise.all([
          fetchDistrictInfrastructureClient({
            latitude: location.latitude,
            longitude: location.longitude,
            district: location.district || location.shortName,
            radius: 8000,
            forceRefresh: bypassCache,
          }),
          fetch(
            `/api/flood/grid?lat=${location.latitude}&lon=${location.longitude}&window=${forecastWindow}`
          ),
        ]);

        const gridJson = await gridRes.json();
        if (!gridRes.ok || !gridJson.success) {
          throw new Error(gridJson.error || "Failed to load spatial flood risk grid.");
        }

        setFacilities(facResult.data);
        setRiskGrid(gridJson.data);
        setViewState("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error executing spatial impact analysis.";
        setErrorMessage(msg);
        setViewState("error");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [location.latitude, location.longitude, location.district, location.shortName, forecastWindow]
  );

  useEffect(() => {
    fetchImpactTelemetry(false);
  }, [fetchImpactTelemetry]);

  // Compute spatial intersection results
  const impactAnalysis = useMemo(() => {
    return computeSpatialImpactAnalysis(riskGrid, facilities, location.displayName);
  }, [riskGrid, facilities, location.displayName]);

  // Filter and sort facilities for the register table
  const filteredFacilities = useMemo(() => {
    let list = [...impactAnalysis.facilities];

    // Department filter
    if (departmentFilter !== "ALL") {
      list = list.filter((item) => item.department === departmentFilter);
    }

    // Exposure filter
    if (exposureFilter === "EXPOSED_ONLY") {
      list = list.filter(
        (item) =>
          item.exposureLevel === "DIRECT_SEVERE" ||
          item.exposureLevel === "DIRECT_HIGH" ||
          item.exposureLevel === "PROXIMITY_BUFFER"
      );
    } else if (exposureFilter === "DIRECT_ONLY") {
      list = list.filter(
        (item) => item.exposureLevel === "DIRECT_SEVERE" || item.exposureLevel === "DIRECT_HIGH"
      );
    } else if (exposureFilter === "BUFFER_ONLY") {
      list = list.filter((item) => item.exposureLevel === "PROXIMITY_BUFFER");
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q) ||
          item.departmentLabel.toLowerCase().includes(q) ||
          (item.address && item.address.toLowerCase().includes(q)) ||
          (item.operator && item.operator.toLowerCase().includes(q))
      );
    }

    // Sort order
    const severityWeight: Record<ExposureLevel, number> = {
      DIRECT_SEVERE: 4,
      DIRECT_HIGH: 3,
      PROXIMITY_BUFFER: 2,
      MODERATE_ZONE: 1,
      LOW_RISK: 0,
    };

    list.sort((a, b) => {
      if (sortBy === "SEVERITY_DESC") {
        const diff = severityWeight[b.exposureLevel] - severityWeight[a.exposureLevel];
        if (diff !== 0) return diff;
        return a.distanceToHighRiskMeters - b.distanceToHighRiskMeters;
      }
      if (sortBy === "DISTANCE_ASC") {
        return a.distanceToHighRiskMeters - b.distanceToHighRiskMeters;
      }
      if (sortBy === "NAME_ASC") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "DEPARTMENT") {
        return a.departmentLabel.localeCompare(b.departmentLabel);
      }
      return 0;
    });

    return list;
  }, [impactAnalysis.facilities, departmentFilter, exposureFilter, searchQuery, sortBy]);

  // Click row to focus on map
  const handleFocusFacility = (item: ExposedFacilityItem) => {
    setFocusCoordinates({
      lat: item.latitude,
      lon: item.longitude,
      zoom: 16,
    });
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const csvContent = generateExposedFacilitiesCsv(filteredFacilities);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedDistrict = location.shortName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.setAttribute(
      "download",
      `varshanetra_impact_${sanitizedDistrict}_${forecastWindow}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = impactAnalysis.summary;

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <PageHeader
        title={locale === "hi" ? "प्रभाव विश्लेषण एवं अवसंरचना जोखिम" : "Impact Analysis & Infrastructure Exposure"}
        description={
          locale === "hi"
            ? `${location.displayName} में बाढ़ संवेदनशीलता क्षेत्रों के आधार पर महत्वपूर्ण सार्वजनिक सुविधाओं का प्रभाव विश्लेषण।`
            : `Spatial exposure of critical public infrastructure across flood susceptibility corridors in ${location.displayName}.`
        }
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "प्रभाव विश्लेषण" : "Impact Analysis" },
        ]}
        sourceMeta={summary.metadata}
        compactSource={true}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Forecast Window Selection */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg text-xs shadow-xs">
              <span className="text-slate-500 font-medium px-1.5 hidden sm:inline">{locale === "hi" ? "पूर्वानुमान:" : "Forecast:"}</span>
              {(["3h", "6h", "12h", "24h"] as ForecastWindow[]).map((win) => (
                <button
                  key={win}
                  onClick={() => setForecastWindow(win)}
                  className={`px-2 py-1 rounded font-semibold transition ${
                    forecastWindow === win
                      ? "bg-[#0F3D66] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  +{win}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchImpactTelemetry(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Refresh infrastructure and hazard telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{locale === "hi" ? "रीफ्रेश करें" : "Refresh"}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={filteredFacilities.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3D66] text-white text-xs font-bold hover:bg-[#0F3D66]/90 transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? `सीएसवी निर्यात (${filteredFacilities.length})` : `Export CSV (${filteredFacilities.length})`}</span>
            </button>
          </div>
        }
      />

      {/* Exposure Summary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "जोखिम में स्वास्थ्य केंद्र" : "Health Facilities Exposed"}
          value={String(summary.byDepartment.health.highRiskCount)}
          unit={`/ ${summary.byDepartment.health.total} ${locale === "hi" ? "मैप्ड" : "mapped"}`}
          subtext={
            summary.byDepartment.health.highRiskCount > 0
              ? (locale === "hi" ? "अस्पताल / प्राथमिक स्वास्थ्य केंद्र उच्च/गंभीर या बफर क्षेत्र में" : "Hospitals / PHCs in High/Severe or buffer zone")
              : (locale === "hi" ? "सभी मैप्ड अस्पताल उच्च जोखिम क्षेत्रों से बाहर" : "All mapped hospitals outside high hazard zones")
          }
          icon={HeartPulse}
          severity={summary.byDepartment.health.highRiskCount > 0 ? "CRITICAL" : "NORMAL"}
          sourceLabel="OSM Health Layer"
          isLoading={isLoading || viewState === "loading"}
        />

        <MetricCard
          title={locale === "hi" ? "जोखिम में आपातकालीन स्टेशन" : "Emergency Stations Exposed"}
          value={String(summary.byDepartment.emergency.highRiskCount)}
          unit={`/ ${summary.byDepartment.emergency.total} ${locale === "hi" ? "मैप्ड" : "mapped"}`}
          subtext={
            summary.byDepartment.emergency.highRiskCount > 0
              ? (locale === "hi" ? "बाढ़ जोखिम के निकट पुलिस / अग्निशमन केंद्र" : "Police / Fire stations near flood hazard")
              : (locale === "hi" ? "आपातकालीन प्रेषण बिंदु पूरी तरह अबाधित" : "Emergency dispatch points fully unhindered")
          }
          icon={ShieldAlert}
          severity={summary.byDepartment.emergency.highRiskCount > 0 ? "ALERT" : "NORMAL"}
          sourceLabel="OSM Emergency"
          isLoading={isLoading || viewState === "loading"}
        />

        <MetricCard
          title={locale === "hi" ? "जोखिम क्षेत्र में आश्रय स्थल" : "Shelters in Hazard Zone"}
          value={String(summary.byDepartment.education.highRiskCount)}
          unit={`/ ${summary.byDepartment.education.total} ${locale === "hi" ? "स्कूल" : "schools"}`}
          subtext={
            summary.byDepartment.education.highRiskCount > 0
              ? (locale === "hi" ? "राहत आश्रय पदनाम से अयोग्य विद्यालय" : "Schools disqualified from relief shelter designation")
              : (locale === "hi" ? "सभी नामित विद्यालय आश्रय सुरक्षित भूभाग पर" : "All designated school shelters on safe terrain")
          }
          icon={School}
          severity={summary.byDepartment.education.highRiskCount > 0 ? "ADVISORY" : "NORMAL"}
          sourceLabel="OSM Education"
          isLoading={isLoading || viewState === "loading"}
        />

        <MetricCard
          title={locale === "hi" ? "निगरानी किए गए जलमार्ग" : "Waterway Channels Monitored"}
          value={String(summary.byDepartment.transport.total)}
          unit={locale === "hi" ? "खंड" : "Segments"}
          subtext={locale === "hi" ? `${summary.byDepartment.transport.highRiskCount} गंभीर/उच्च जल निकासी गलियारे में` : `${summary.byDepartment.transport.highRiskCount} in severe/high discharge corridors`}
          icon={Waves}
          severity={summary.byDepartment.transport.highRiskCount > 0 ? "ALERT" : "NORMAL"}
          sourceLabel="OSM Hydrography"
          isLoading={isLoading || viewState === "loading"}
        />
      </div>

      {/* Main Container with 4 States */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchImpactTelemetry(false)}
        errorMessage={errorMessage || "Unable to query critical infrastructure from OSM Overpass endpoint."}
        emptyTitle="No Infrastructure Data Returned"
        emptyDescription="No critical facilities or spatial grid cells were returned for this district."
      >
        <div className="space-y-6">
          {/* Spatial Map Inspection Section */}
          <div ref={mapSectionRef} className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2563EB]" />
                  <span>Interactive Infrastructure Exposure Map ({forecastWindow} Horizon)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visual overlay of OpenStreetMap critical infrastructure pins over deterministic risk grid cells.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DataSourceBadge
                  metadata={summary.metadata}
                />
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {summary.totalHighOrSevereExposed} exposed / {summary.totalMappedFacilities} total
                </span>
              </div>
            </div>

            <GisMap
              location={location}
              facilities={facilities}
              activeLayers={DEFAULT_MAP_LAYERS}
              riskGridData={riskGrid}
              selectedRiskCell={selectedRiskCell}
              onSelectRiskCell={setSelectedRiskCell}
              inspectorData={inspectorData}
              onInspectLocation={setInspectorData}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              focusCoordinates={focusCoordinates}
              className="h-[440px] w-full"
            />
          </div>

          {/* Department and Filter Controls */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              {/* Department Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Department:
                  </span>
                  {[
                    { id: "ALL" as const, label: "All Facilities", count: summary.totalMappedFacilities },
                    { id: "HEALTH" as const, label: "Health & Medical", count: summary.byDepartment.health.total },
                    { id: "EMERGENCY" as const, label: "Emergency Services", count: summary.byDepartment.emergency.total },
                    { id: "EDUCATION" as const, label: "Education & Shelters", count: summary.byDepartment.education.total },
                    { id: "TRANSPORT" as const, label: "Waterways & Drainage", count: summary.byDepartment.transport.total },
                  ].map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setDepartmentFilter(dept.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                        departmentFilter === dept.id
                          ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-xs font-bold"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{dept.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          departmentFilter === dept.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {dept.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Exposure Level Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Exposure:</span>
                  <select
                    value={exposureFilter}
                    onChange={(e) => setExposureFilter(e.target.value as ExposureFilter)}
                    aria-label="Filter facilities by exposure level"
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  >
                    <option value="ALL">All Exposure Levels ({impactAnalysis.facilities.length})</option>
                    <option value="EXPOSED_ONLY">
                      Exposed Only: Severe, High, Buffer ({summary.totalHighOrSevereExposed})
                    </option>
                    <option value="DIRECT_ONLY">
                      Direct High & Severe Only ({summary.directSevereCount + summary.directHighCount})
                    </option>
                    <option value="BUFFER_ONLY">
                      Buffer Zone Proximity Only ({summary.bufferProximityCount})
                    </option>
                  </select>
                </div>
              </div>

              {/* Search and Sort Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by facility name, address, or operator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 font-medium">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      aria-label="Sort facilities by criteria"
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="SEVERITY_DESC">Severity (Highest Risk First)</option>
                      <option value="DISTANCE_ASC">Distance to Hazard (Closest First)</option>
                      <option value="NAME_ASC">Facility Name (A to Z)</option>
                      <option value="DEPARTMENT">Department</option>
                    </select>
                  </div>

                  <span className="text-slate-400 text-xs">|</span>

                  <span className="text-xs text-slate-500 font-mono">
                    Showing {filteredFacilities.length} of {impactAnalysis.facilities.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High-Risk Facility Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Critical Infrastructure Exposure Register</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {filteredFacilities.length} mapped items
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic intersection against +{forecastWindow} flood-risk grid. Click &quot;Focus on Map&quot; to inspect any facility.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredFacilities.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {locale === "hi"
                      ? "वर्तमान फ़िल्टर से कोई सुविधा मेल नहीं खाती"
                      : "No Facilities Match Current Filters"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {locale === "hi"
                      ? "विभाग फ़िल्टर बदलने का प्रयास करें, कोई अन्य कीवर्ड खोजें, या 'सभी जोखिम स्तर' पर स्विच करें।"
                      : "Try changing the department filter, searching for another keyword, or switching exposure to \"All Exposure Levels\"."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <th className="py-3 px-3.5 font-semibold">
                          {locale === "hi" ? "सुविधा एवं श्रेणी" : "Facility & Category"}
                        </th>
                        <th className="py-3 px-3 font-semibold">
                          {locale === "hi" ? "विभाग" : "Department"}
                        </th>
                        <th className="py-3 px-3 font-semibold">
                          {locale === "hi" ? "जोखिम स्थिति" : "Exposure Status"}
                        </th>
                        <th className="py-3 px-3 font-semibold">
                          {locale === "hi" ? "खतरे की निकटता" : "Hazard Proximity"}
                        </th>
                        <th className="py-3 px-3 font-semibold">
                          {locale === "hi" ? "परिचालन निर्देश" : "Operational Directive"}
                        </th>
                        <th className="py-3 px-3.5 font-semibold text-right">
                          {locale === "hi" ? "कार्रवाइयां" : "Actions"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredFacilities.map((fac) => {
                        return (
                          <tr
                            key={fac.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                          >
                            {/* Name & Category */}
                            <td className="py-3 px-3.5">
                              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{fac.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{fac.categoryLabel}</span>
                                {fac.operator && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[140px]">{fac.operator}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                                {fac.departmentLabel}
                              </span>
                            </td>

                            {/* Exposure Status Badge */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: fac.severityColor }}
                                />
                                <span
                                  className="font-bold text-[11px]"
                                  style={{ color: fac.severityColor }}
                                >
                                  {fac.exposureStatusLabel}
                                </span>
                              </div>
                              {fac.cellRiskScore !== undefined && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Cell score: {fac.cellRiskScore}/100
                                </div>
                              )}
                            </td>

                            {/* Hazard Proximity */}
                            <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {fac.distanceToHighRiskMeters === 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  0 m (Direct in Cell)
                                </span>
                              ) : (
                                <span>{fac.distanceToHighRiskMeters} m to hazard</span>
                              )}
                              {fac.forecastRainMm !== undefined && (
                                <div className="text-[10px] text-slate-500">
                                  Rain: {fac.forecastRainMm} mm
                                </div>
                              )}
                            </td>

                            {/* Operational Directive */}
                            <td className="py-3 px-3 max-w-xs">
                              <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                                {fac.actionRecommendation}
                              </p>
                              {fac.contactNumber && (
                                <div className="mt-1 text-[10px] text-[#2563EB] font-semibold">
                                  Emergency Contact: {fac.contactNumber}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleFocusFacility(fac)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#0F3D66] text-white text-[10px] font-semibold hover:bg-[#0F3D66]/90 transition shadow-2xs"
                                  title="Pan map to this facility"
                                >
                                  <Navigation className="w-2.5 h-2.5" />
                                  <span>Focus on Map</span>
                                </button>
                                {fac.osmUrl && (
                                  <a
                                    href={fac.osmUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                                    title="View feature on OpenStreetMap"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
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

          {/* Operational Methodology & Transparent Compliance Footer */}
          <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    {locale === "hi"
                      ? "पद्धति संबंधी सूचना एवं डेटा उद्भव (कमान केंद्र निर्देश)"
                      : "Methodological Notice & Data Provenance (Command Center Directives)"}
                  </h4>
                  <p className="leading-relaxed">
                    <strong>{locale === "hi" ? "ओपनस्ट्रीटमैप मानचित्रित बुनियादी ढांचा संवेदनशीलता:" : "OSM Mapped Infrastructure Exposure:"}</strong>{" "}
                    {locale === "hi"
                      ? "स्थानिक संवेदनशीलता गणना ज़िला खोज दायरे के भीतर ओपनस्ट्रीटमैप (अस्पताल, क्लीनिक, पुलिस स्टेशन, अग्निशामक केंद्र, स्कूल और जलमार्ग) में मानचित्रित वास्तविक सुविधाओं को दर्शाती है। ओपनस्ट्रीटमैप में अनुपस्थिति को कभी भी यह प्रमाण न मानें कि जमीन पर कोई सुविधा मौजूद नहीं है।"
                      : "Spatial exposure counts reflect real features mapped in OpenStreetMap (hospitals, clinics, police stations, fire stations, schools, and waterways) within the district search radius. Never interpret absence in OpenStreetMap as proof that no facility exists on the ground."}
                  </p>
                  <p className="leading-relaxed">
                    <strong>{locale === "hi" ? "शून्य कृत्रिम जनसंख्या आंकड़े:" : "Zero Fabricated Population Figures:"}</strong>{" "}
                    {locale === "hi"
                      ? "वर्षानेत्र स्थायी इंजीनियरिंग निर्देश #14 के अनुसार, कोई कृत्रिम या असत्यापित \"प्रभावित जनसंख्या\" आंकड़े उत्पन्न नहीं किए जाते हैं। केवल बहु-कारक जोखिम ग्रिड के विरुद्ध वास्तविक ज्यामितीय संवेदनशीलता की रिपोर्ट की जाती है।"
                      : "In accordance with VarshaNetra Permanent Engineering Directive #14, no artificial or uncalibrated \"affected population\" numbers are generated. Only deterministic geometric exposures against the multi-factor risk grid are reported."}
                  </p>
                  <p className="leading-relaxed text-[11px] text-slate-500">
                    {locale === "hi"
                      ? `डेटा स्रोत: ओपनस्ट्रीटमैप ओवरपास एपीआई (ODbL 1.0) • ओपन-मेटियो CC BY 4.0 मौसम पूर्वानुमान • वर्षानेत्र नियतात्मक स्थानिक जोखिम सूचकांक • पायलट जिला: ${location.displayName}।`
                      : `Data Sources: OpenStreetMap Overpass API (ODbL 1.0) • Open-Meteo CC BY 4.0 Weather Forecast • VarshaNetra Deterministic Spatial Risk Index • Pilot District: ${location.displayName}.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StateContainer>
    </div>
  );
}
