"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  RefreshCw,
  Layers,
  Sparkles,
  Globe,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MapLayerControls } from "@/components/map/map-layer-controls";
import { MapLegend } from "@/components/map/map-legend";
import { MapInspector } from "@/components/map/map-inspector";
import { ExperimentalMapDisclaimer } from "@/components/disclaimers";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import {
  ActiveMapLayerId,
  MapInspectorData,
  DataSourceMeta,
  ForecastWindow,
  SpatialRiskGridFeatureCollection,
  SpatialRiskCellProperties,
  RiverGauge,
} from "@/types";
import {
  generateSusceptibilityGrid,
  type SusceptibilityFeatureProperties,
} from "@/lib/services/floodSusceptibility";
import { SusceptibilityDetailCard } from "@/components/flood/susceptibility-detail-card";
import { HecRasRoadmapCard } from "@/components/flood/hec-ras-roadmap-card";
import { useOverpassInfrastructure } from "@/hooks/use-overpass-infrastructure";
import { useSatelliteRainfall } from "@/hooks/use-satellite-rainfall";
import { OverpassCacheBanner, InfrastructurePlaceholderCards } from "@/components/infrastructure";

// Client-only dynamic import for Leaflet GIS Map Canvas (strict SSR avoidance)
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse shadow-xs">
      <div className="w-12 h-12 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Initializing OpenStreetMap & Leaflet Vector Engine...
      </span>
      <p className="text-[11px] text-slate-500">
        Loading spatial layers and tactical cartography.
      </p>
    </div>
  ),
});

// Client-only dynamic import for Near-Live Weather Radar Workspace (VNET-GIS-RADAR-001)
const NearLiveRadarWorkspace = dynamic(
  () => import("@/components/radar/near-live-radar-workspace"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse shadow-xs">
        <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Loading Doppler Weather Radar Reflectivity Intelligence Module...
        </span>
        <p className="text-[11px] text-slate-500">
          Synchronizing IMD Doppler Weather Radar MAX(Z) telemetry &amp; reflectivity intelligence.
        </p>
      </div>
    ),
  }
);

const DEFAULT_ACTIVE_LAYERS: Record<ActiveMapLayerId, boolean> = {
  basemap: true,
  floodRisk: true,
  hospitals: false,
  clinics: false,
  police: false,
  fire: false,
  schools: false,
  rivers: true,
  fieldReports: true,
  incidents: true,
  responseTeams: true,
  shelters: true,
  riverGauges: false,
  floodSusceptibility: false,
  nasaGpmRainfall: false,
  radar: false,
  copernicusWms: false,
  earthquakes: false,
  firmsFire: false,
};

const BASE_MAP_SOURCE_META: DataSourceMeta = {
  provider: "OpenStreetMap Foundation & Overpass API",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice: "Base map © OpenStreetMap contributors under ODbL 1.0; Incidents via EOC Incident Dispatch.",
  url: "https://www.openstreetmap.org/copyright",
};

export default function MapPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tMap = useTranslations("map");
  const tNav = useTranslations("navigation");

  const [activeLayers, setActiveLayers] = useState<Record<ActiveMapLayerId, boolean>>(DEFAULT_ACTIVE_LAYERS);
  const [riskGrid, setRiskGrid] = useState<SpatialRiskGridFeatureCollection | null>(null);
  const [forecastWindow, setForecastWindow] = useState<ForecastWindow>("24h");
  const [selectedRiskCell, setSelectedRiskCell] = useState<SpatialRiskCellProperties | null>(null);
  const [isGridLoading, setIsGridLoading] = useState<boolean>(false);
  const [inspectorData, setInspectorData] = useState<MapInspectorData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [riverGauges, setRiverGauges] = useState<RiverGauge[]>([]);
  const [selectedSusceptibilityCell, setSelectedSusceptibilityCell] = useState<SusceptibilityFeatureProperties | null>(null);

  // Overpass client infrastructure with 24h localStorage caching, 60s queue delay & exponential backoff
  const {
    facilities,
    isLoading,
    isRefreshing,
    isFromCache,
    cacheTimestamp,
    cooldownSeconds,
    isEmptyPlaceholder,
    refetch: fetchFacilitiesData,
  } = useOverpassInfrastructure({
    latitude: location.latitude,
    longitude: location.longitude,
    district: location.district || location.shortName,
    radius: 8000,
  });

  // NASA GPM Satellite rainfall telemetry (LIVE-002)
  const { data: satelliteRainfallData } = useSatelliteRainfall({
    latitude: location.latitude,
    longitude: location.longitude,
    district: location.shortName || location.displayName,
    autoFetch: true,
  });

  // Generate empirical hydraulic susceptibility grid (ROAD-003) via useMemo
  const susceptibilityGrid = useMemo(() => {
    const knownRivers = facilities?.rivers?.map((r) => ({ lat: r.latitude, lon: r.longitude }));
    return generateSusceptibilityGrid(location.latitude, location.longitude, {
      currentRainfallMm: 22.4,
      forecast24hMm: 68.0,
      previous72hRainfallMm: 85.0,
      knownRivers,
    });
  }, [location.latitude, location.longitude, facilities?.rivers]);

  // Support direct layer link like /map?layer=radar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("layer") === "radar") {
        setActiveLayers((prev) => ({ ...prev, radar: true }));
      }
    }
  }, []);

  const fetchRiskGridData = useCallback(
    async (window: ForecastWindow = forecastWindow, bypassCache = false) => {
      setIsGridLoading(true);
      try {
        const res = await fetch(
          `/api/flood/grid?lat=${location.latitude}&lon=${location.longitude}&window=${window}${
            bypassCache ? "&refresh=true" : ""
          }`
        );
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setRiskGrid(json.data);
        }
      } catch {
        // Fail gracefully without interrupting standard map layers
      } finally {
        setIsGridLoading(false);
      }
    },
    [location.latitude, location.longitude, forecastWindow]
  );

  const fetchRiverGauges = useCallback(async () => {
    try {
      const res = await fetch("/api/river-gauges");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRiverGauges(json.data);
        }
      }
    } catch {
      // Gracefully fail without breaking map
    }
  }, []);

  // Fetch flood risk grid when forecast window changes
  useEffect(() => {
    fetchRiskGridData(forecastWindow, false);
  }, [fetchRiskGridData, forecastWindow]);

  // Fetch river gauges once on mount
  useEffect(() => {
    fetchRiverGauges();
  }, [fetchRiverGauges]);

  // Clear previous inspection pin or selected cell when district changes
  useEffect(() => {
    setInspectorData(null);
    setSelectedRiskCell(null);
    setSelectedSusceptibilityCell(null);
  }, [location.latitude, location.longitude]);


  const handleInspectLocation = async (data: MapInspectorData | null) => {
    if (!data) {
      setInspectorData(null);
      return;
    }

    // Immediately set basic coordinate inspector data
    setInspectorData(data);

    // Query terrain intelligence endpoint for clicked coordinate
    try {
      const res = await fetch(`/api/terrain?lat=${data.latitude}&lon=${data.longitude}`);
      const json = await res.json();
      if (json.success && json.data) {
        setInspectorData((prev) => {
          if (!prev || prev.latitude !== data.latitude || prev.longitude !== data.longitude) return prev;
          return {
            ...prev,
            elevationMeters: json.data.elevationMeters,
            slopePercent: json.data.slopePercent,
            terrainClassification: json.data.classification,
            isWithinPilotTerrain: json.isWithinPilot,
          };
        });
      }
    } catch {
      // Gracefully ignore terrain fetch error for inspector
    }
  };

  const handleToggleLayer = (layerId: ActiveMapLayerId) => {
    setActiveLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const handleSelectAll = () => {
    const allTrue = Object.keys(DEFAULT_ACTIVE_LAYERS).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<ActiveMapLayerId, boolean>
    );
    setActiveLayers(allTrue);
  };

  const handleDeselectAll = () => {
    const allFalse = Object.keys(DEFAULT_ACTIVE_LAYERS).reduce(
      (acc, key) => ({ ...acc, [key]: key === "basemap" }),
      {} as Record<ActiveMapLayerId, boolean>
    );
    setActiveLayers(allFalse);
  };

  const layerCounts: Partial<Record<ActiveMapLayerId, number>> = {
    floodRisk: riskGrid?.summary.totalCells ?? 0,
    hospitals: facilities?.hospitals.length ?? 0,
    clinics: facilities?.clinics.length ?? 0,
    police: facilities?.police.length ?? 0,
    fire: facilities?.fire.length ?? 0,
    schools: facilities?.schools.length ?? 0,
    rivers: facilities?.rivers.length ?? 0,
    fieldReports: facilities?.fieldReports.length ?? 0,
    incidents: facilities?.incidents.length ?? 0,
    responseTeams: facilities?.responseTeams?.length ?? 0,
    shelters: facilities?.shelters?.length ?? 0,
    riverGauges: riverGauges.length,
    floodSusceptibility: susceptibilityGrid?.features.length ?? 0,
  };

  const sourceMeta = facilities?.metadata || BASE_MAP_SOURCE_META;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${tMap("title")}: ${location.shortName || (locale === "hi" ? "जिला परिचालन" : "District Operations")}`}
        description={`${locale === "hi" ? `${location.displayName} हेतु इंटरैक्टिव सामरिक कार्टोग्राफी। महत्वपूर्ण जीवन-सुरक्षा अवसंरचना, जलमार्ग, स्थानिक बाढ़ जोखिम ग्रिड, मैदानी संकट चेतावनी एवं आपातकालीन प्रेषण बिंदुओं को प्रदर्शित करता है।` : `Interactive tactical cartography for ${location.displayName}. Visualizes critical life-safety infrastructure, waterways, spatial flood risk grids, field SOS alerts, and emergency dispatch points.`}`}
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: tMap("title") || "Live GIS Map" },
        ]}
        sourceMeta={sourceMeta}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </span>
            </div>

            <a
              href="https://bhuvan.nrsc.gov.in/disaster/disaster.php"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-xs font-semibold shadow-xs transition"
              >
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">{locale === "hi" ? "ISRO भुवन पर देखें" : "View on ISRO Bhuvan"}</span>
                <span className="sm:hidden">Bhuvan</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </a>

            <button
              onClick={() => {
                fetchFacilitiesData(true);
                fetchRiskGridData(forecastWindow, true);
              }}
              disabled={isRefreshing || isLoading || isGridLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isGridLoading ? "animate-spin text-[#2563EB]" : ""}`} />
              <span className="hidden sm:inline">{locale === "hi" ? "परतें रीफ्रेश करें" : "Refresh Layers"}</span>
            </button>
          </div>
        }
      />

      {/* Step 4: Small Subtle Info Banner for Cached Infrastructure */}
      {isFromCache && (
        <OverpassCacheBanner
          cacheTimestamp={cacheTimestamp}
          cooldownSeconds={cooldownSeconds}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchFacilitiesData(true)}
        />
      )}

      {/* Main Operational Workspace: Left Column (Layers & Legend) + Right Column (GIS Map Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls (1 Col on Desktop) */}
        <div className="space-y-4 lg:col-span-1">
          {/* Layer Controls Panel */}
          <MapLayerControls
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            counts={layerCounts}
            isLoading={isLoading}
            forecastWindow={forecastWindow}
            onSelectForecastWindow={(win) => setForecastWindow(win)}
            isGridLoading={isGridLoading}
          />

          {/* Step 5: Static placeholder cards when Overpass returns empty and cache is empty */}
          {(isEmptyPlaceholder || (!isLoading && facilities && (facilities.hospitals.length + facilities.police.length + facilities.fire.length + (facilities.shelters?.length || 0) === 0))) && (
            <InfrastructurePlaceholderCards />
          )}

          {/* Selected Flood Risk Cell Inspector Card */}
          {selectedRiskCell && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: selectedRiskCell.color }}
                  />
                  <strong className="text-slate-900 dark:text-white uppercase">
                    {locale === "hi" ? `सेल #${selectedRiskCell.cellId.replace("grid_cell_", "")} मूल्यांकन` : `Cell #${selectedRiskCell.cellId.replace("grid_cell_", "")} Assessment`}
                  </strong>
                </div>
                <button
                  onClick={() => setSelectedRiskCell(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label={locale === "hi" ? "सेल विवरण बंद करें" : "Close Cell Details"}
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{locale === "hi" ? "जोखिम स्थिति:" : "Risk Status:"}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white uppercase tracking-wider"
                  style={{ backgroundColor: selectedRiskCell.color }}
                >
                  {selectedRiskCell.riskLevel} ({selectedRiskCell.riskScore} / 100)
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{locale === "hi" ? "केंद्र जीपीएस:" : "Center GPS:"}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedRiskCell.centerLat.toFixed(4)}°N, {selectedRiskCell.centerLon.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{locale === "hi" ? "वर्षा" : "Precip"} (+{selectedRiskCell.forecastWindow}):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedRiskCell.forecastRainMm} mm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{locale === "hi" ? "पूर्ववर्ती (24घं / 48घं):" : "Antecedent (24h / 48h):"}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedRiskCell.antecedent24hMm} mm / {selectedRiskCell.antecedent48hMm} mm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{locale === "hi" ? "ऊँचाई / ढलान:" : "Elevation / Slope:"}</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedRiskCell.elevationMeters}m ({selectedRiskCell.slopePercent}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{locale === "hi" ? "नदी से दूरी:" : "River Distance:"}</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedRiskCell.distanceToRiverMeters ? `${selectedRiskCell.distanceToRiverMeters} m` : (locale === "hi" ? "मैप नहीं किया गया" : "Not Mapped")}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700 text-xs">
                  <span className="text-slate-400">{locale === "hi" ? "डेटा पूर्णता:" : "Completeness:"}</span>
                  <span className="font-bold text-[#2563EB]">
                    {selectedRiskCell.dataCompleteness}%
                  </span>
                </div>
              </div>

              {selectedRiskCell.summaryReasons && selectedRiskCell.summaryReasons.length > 0 && (
                <div className="text-xs text-slate-700 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  {selectedRiskCell.summaryReasons[0]}
                </div>
              )}
            </div>
          )}

          {/* Selected Susceptibility Cell Detail Card (ROAD-003 PART 3) */}
          {selectedSusceptibilityCell && (
            <SusceptibilityDetailCard
              properties={selectedSusceptibilityCell}
              onClose={() => setSelectedSusceptibilityCell(null)}
            />
          )}

          {/* Coordinate Inspector Box (Appears when map is clicked) */}
          {inspectorData && (
            <MapInspector
              inspectorData={inspectorData}
              districtName={location.shortName || "District HQ"}
              onClose={() => setInspectorData(null)}
            />
          )}

          {/* Map Symbology Legend (Highlights Susceptibility, NASA GPM, and Radar when active) */}
          <MapLegend
            isSusceptibilityActive={activeLayers.floodSusceptibility}
            isNasaGpmActive={activeLayers.nasaGpmRainfall}
            isRadarActive={activeLayers.radar}
          />

          {/* HEC-RAS 2D Hydraulic Model Future Roadmap Card (ROAD-003 PART 4) */}
          <HecRasRoadmapCard />
        </div>

        {/* GIS Canvas Container (3 Cols on Desktop) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Experimental Map Notice (Disclaimer 2) */}
          <ExperimentalMapDisclaimer />

          <GisMap
            location={location}
            facilities={facilities}
            activeLayers={activeLayers}
            riskGridData={riskGrid}
            onSelectRiskCell={(cell) => setSelectedRiskCell(cell)}
            selectedRiskCell={selectedRiskCell}
            onInspectLocation={handleInspectLocation}
            inspectorData={inspectorData}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            className="w-full h-[620px]"
            riverGauges={riverGauges}
            susceptibilityData={susceptibilityGrid}
            selectedSusceptibilityCell={selectedSusceptibilityCell}
            onSelectSusceptibilityCell={(cell) => setSelectedSusceptibilityCell(cell)}
            satelliteRainfallData={satelliteRainfallData}
          />

          {/* Map Guidance & Tactical Telemetry Status Footer */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                {locale === "hi" ? "मानचित्रित सक्रिय वस्तुएँ:" : "Mapped Tactical Objects:"} <strong>{facilities?.totalCount ?? 0}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{locale === "hi" ? "निर्देशांक जांचने हेतु मानचित्र पर क्लिक करें" : "Click map to drop coordinate inspector pin"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Near-Live Weather Radar Intelligence Workspace (VNET-GIS-RADAR-001) */}
      <div className="w-full pt-4">
        <NearLiveRadarWorkspace
          location={location}
          riskGridData={riskGrid}
        />
      </div>
    </div>
  );
}
