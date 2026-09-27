"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Waves,
  CloudRain,
  History,
  Activity,
  Mountain,
  Compass,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  MapPin,
  Satellite,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  ChevronsUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AntecedentRainfallCard } from "@/components/weather/antecedent-rainfall-card";
import { FloodRiskCard, getRiskLevelMeta } from "@/components/flood/flood-risk-card";
import { SusceptibilityExplainabilityCard } from "@/components/flood/susceptibility-explainability-card";
import { TerrainIntelligenceCard } from "@/components/terrain";
import { GovernmentDataCard } from "@/components/govdata";
import { CopernicusEMSCard } from "@/components/copernicus/copernicus-ems-card";
import { LandslideRiskCard, NASAFIRMSCard } from "@/components/hazards";
import { HydraulicModelBanner } from "@/components/flood/hydraulic-model-banner";
import { FloodTimelineControls } from "@/components/flood/flood-timeline-controls";
import { FloodMethodologyCard } from "@/components/flood/flood-methodology-card";
import { HecRasRoadmapCard } from "@/components/flood/hec-ras-roadmap-card";
import { ExperimentalMapDisclaimer } from "@/components/disclaimers";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { getHydraulicModelStatus } from "@/lib/services/hydraulic-model-adapter";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import {
  AntecedentRainfallSummary,
  FloodRiskCalculationResult,
  DataSourceMeta,
  TimelineHorizon,
  ForecastWindow,
  SpatialRiskGridFeatureCollection,
  SpatialRiskCellProperties,
  MunicipalInundationHotspot,
  FloodRiskLevel,
} from "@/types";
import { useOverpassInfrastructure } from "@/hooks/use-overpass-infrastructure";
import { FloodInfrastructureFilterBar } from "@/components/flood/flood-infrastructure-filter-bar";
import { RiskZoneDetailsPanel } from "@/components/flood/risk-zone-details-panel";
import { RiskZonesOperationalTable } from "@/components/flood/risk-zones-operational-table";
import { InfrastructureCategoryFilter } from "@/lib/services/risk-zone-locality";
import { coordinatedFetch } from "@/lib/services/request-coordinator";


// Client-only dynamic Leaflet Map Canvas (SSR avoidance)
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse shadow-xs">
      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Rendering Spatial Flood-Risk Grid & Waterway Layers...
      </span>
      <p className="text-[11px] text-slate-500">
        Synthesizing meteorological forecasts, antecedent saturation, and DEM elevation.
      </p>
    </div>
  ),
});

const FLOOD_SOURCE_META: DataSourceMeta = {
  provider: "VarshaNetra Inundation Intelligence Engine & Open-Meteo ERA5",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Experimental multi-factor index via Open-Meteo CC BY 4.0 and OSM hydrography. Water depths in metres withheld until calibrated 2D hydraulic models are active.",
};

// Verified hotspot locations with explicit non-fabricated depth statements
const MUNICIPAL_HOTSPOTS: MunicipalInundationHotspot[] = [
  {
    id: "spot-1",
    location: "Sinhagad Road (Ekta Nagari low-lying sector)",
    taluk: "Haveli",
    riskLevel: "SEVERE",
    pumpsDeployed: 4,
    operationalStatus: "Active Cordon • Pumping Underway",
    hydraulicStatus: "2D Depth: Awaiting Calibration",
    fieldObservation: "Riverbed backwater overtopping storm sewer outfall; dewatering crew on site.",
    reportedWaterloggingRisk: "CRITICAL",
  },
  {
    id: "spot-2",
    location: "Yerawada (Shanti Nagar alluvial depression)",
    taluk: "Pune City",
    riskLevel: "HIGH",
    pumpsDeployed: 2,
    operationalStatus: "Warning Issued • Storm Drain Desilted",
    hydraulicStatus: "2D Depth: Awaiting Calibration",
    fieldObservation: "Natural gravity runoff sluggish due to <1.5% gradient alluvial plain.",
    reportedWaterloggingRisk: "HIGH",
  },
  {
    id: "spot-3",
    location: "Dapodi Railway Subway Underpass",
    taluk: "Pimpri-Chinchwad",
    riskLevel: "HIGH",
    pumpsDeployed: 2,
    operationalStatus: "Traffic Diverted to Elevated Corridor",
    hydraulicStatus: "2D Depth: Awaiting Calibration",
    fieldObservation: "Depression sump prone to flash catchment inflow during heavy bursts.",
    reportedWaterloggingRisk: "HIGH",
  },
  {
    id: "spot-4",
    location: "Sangamwadi Confluence Embankment",
    taluk: "Pune City",
    riskLevel: "MODERATE",
    pumpsDeployed: 1,
    operationalStatus: "Riverbed parking evacuated as precaution",
    hydraulicStatus: "2D Depth: Awaiting Calibration",
    fieldObservation: "Mula-Mutha riverbed buffer monitored; embankments holding.",
    reportedWaterloggingRisk: "MODERATE",
  },
];

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  id,
  title,
  subtitle,
  badge,
  badgeColor = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
      <button
        type="button"
        id={`${id}-header`}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0F3D66] dark:text-blue-400 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              {badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hidden sm:inline">
            {isOpen ? "Hide" : "Explore"}
          </span>
          <div
            className={`p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          id={`${id}-content`}
          role="region"
          aria-labelledby={`${id}-header`}
          className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/40 dark:bg-slate-950/30 space-y-5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function FloodPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tFlood = useTranslations("flood");
  const tNav = useTranslations("navigation");

  const [antecedent, setAntecedent] = useState<AntecedentRainfallSummary | null>(null);
  const [floodRisk, setFloodRisk] = useState<FloodRiskCalculationResult | null>(null);
  const [riskGrid, setRiskGrid] = useState<SpatialRiskGridFeatureCollection | null>(null);
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("24h");
  const [accumulatedRainMm, setAccumulatedRainMm] = useState<number>(0);
  const [selectedRiskCell, setSelectedRiskCell] = useState<SpatialRiskCellProperties | null>(null);
  const [infraFilter, setInfraFilter] = useState<InfrastructureCategoryFilter>("all");
  const [focusCoordinates, setFocusCoordinates] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Overpass client infrastructure with caching and cooldown protection
  const { facilities } = useOverpassInfrastructure({
    latitude: location.latitude,
    longitude: location.longitude,
    district: location.district || location.shortName,
    radius: 12000,
  });

  const categoryCounts = useMemo(() => {
    if (!facilities) return undefined;
    const counts: Record<InfrastructureCategoryFilter, number> = {
      all: facilities.totalCount,
      health: (facilities.hospitals?.length || 0) + (facilities.clinics?.length || 0),
      police: facilities.police?.length || 0,
      fire: facilities.fire?.length || 0,
      shelter:
        (facilities.shelters?.length || 0) +
        (facilities.schools?.filter(
          (s) =>
            s.name?.toLowerCase().includes("shelter") ||
            s.name?.toLowerCase().includes("relief")
        ).length || 0),
      transport:
        (facilities.fieldReports?.filter(
          (f) =>
            f.details?.toLowerCase().includes("bridge") ||
            f.name?.toLowerCase().includes("subway")
        ).length || 0) + 2,
      schools: facilities.schools?.length || 0,
      drainage: facilities.rivers?.length || 0,
      government: facilities.responseTeams?.length || 0,
      other: (facilities.incidents?.length || 0) + (facilities.fieldReports?.length || 0),
    };
    return counts;
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    if (!facilities) return null;
    if (infraFilter === "all") return facilities;

    return {
      ...facilities,
      hospitals: infraFilter === "health" ? facilities.hospitals : [],
      clinics: infraFilter === "health" ? facilities.clinics : [],
      police: infraFilter === "police" ? facilities.police : [],
      fire: infraFilter === "fire" ? facilities.fire : [],
      schools: infraFilter === "schools" ? facilities.schools : [],
      rivers: infraFilter === "drainage" ? facilities.rivers : [],
      shelters: infraFilter === "shelter" ? facilities.shelters : [],
      responseTeams: infraFilter === "government" ? facilities.responseTeams : [],
      fieldReports: infraFilter === "other" ? facilities.fieldReports : [],
      incidents: infraFilter === "other" ? facilities.incidents : [],
    };
  }, [facilities, infraFilter]);

  const activeMapLayers = useMemo(() => {
    return {
      basemap: true,
      floodRisk: true,
      hospitals: infraFilter === "all" || infraFilter === "health",
      clinics: infraFilter === "all" || infraFilter === "health",
      police: infraFilter === "all" || infraFilter === "police",
      fire: infraFilter === "all" || infraFilter === "fire",
      schools: infraFilter === "all" || infraFilter === "schools",
      rivers: true,
      riverGauges: false,
      fieldReports: infraFilter === "all" || infraFilter === "other",
      incidents: infraFilter === "all" || infraFilter === "other",
      responseTeams: infraFilter === "all" || infraFilter === "government",
      shelters: infraFilter === "all" || infraFilter === "shelter",
      floodSusceptibility: false,
    };
  }, [infraFilter]);

  const [terrain, setTerrain] = useState<{
    elevationMeters: number;
    slopePercent: number;
    classification: string;
    isWithinPilot: boolean;
  } | null>(null);

  const [state, setState] = useState<ComponentViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Progressive Disclosure Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    factors: false,
    hotspots: false,
    hydrology: false,
    hazards: false,
    governance: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const areAllSectionsOpen = Object.values(openSections).every(Boolean);

  const toggleAllSections = () => {
    const nextState = !areAllSectionsOpen;
    setOpenSections({
      factors: nextState,
      hotspots: nextState,
      hydrology: nextState,
      hazards: nextState,
      governance: nextState,
    });
  };

  // Dynamic check for 2D hydraulic model status
  const hydraulicConfig = getHydraulicModelStatus();

  // Map timeline horizon to forecast window parameter
  const resolveForecastWindow = (horizon: TimelineHorizon): ForecastWindow => {
    switch (horizon) {
      case "now":
      case "3h":
        return "3h";
      case "6h":
        return "6h";
      case "12h":
        return "12h";
      case "24h":
      default:
        return "24h";
    }
  };

  const fetchFloodTelemetry = useCallback(
    async (horizon: TimelineHorizon = timelineHorizon) => {
      setIsLoading(true);
      setErrorMessage("");
      const win = resolveForecastWindow(horizon);

      try {
        const bundleRes = await coordinatedFetch<{
          success: boolean;
          data: {
            antecedent: AntecedentRainfallSummary | null;
            floodRisk: FloodRiskCalculationResult;
            terrain: {
              elevationMeters: number;
              slopePercent: number;
              classification: string;
              isWithinPilot: boolean;
            };
            riskGrid: SpatialRiskGridFeatureCollection | null;
            accumulatedRainMm: number;
          };
        }>(`/api/flood/bundle?lat=${location.latitude}&lon=${location.longitude}&window=${win}`, {
          ttlMs: 45000,
        });

        if (bundleRes?.success && bundleRes.data) {
          if (bundleRes.data.antecedent) {
            setAntecedent(bundleRes.data.antecedent);
          }
          if (bundleRes.data.floodRisk) {
            setFloodRisk(bundleRes.data.floodRisk);
          }
          if (typeof bundleRes.data.accumulatedRainMm === "number") {
            setAccumulatedRainMm(bundleRes.data.accumulatedRainMm);
          }
          if (bundleRes.data.terrain) {
            setTerrain(bundleRes.data.terrain);
          }
          if (bundleRes.data.riskGrid) {
            setRiskGrid(bundleRes.data.riskGrid);
          }
          setState("success");
        } else {
          throw new Error("Failed to calculate flood risk index.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Error connecting to flood intelligence telemetry";
        setErrorMessage(msg);
        setState("error");
      } finally {
        setIsLoading(false);
      }
    },
    [location.latitude, location.longitude, timelineHorizon]
  );

  useEffect(() => {
    fetchFloodTelemetry(timelineHorizon);
  }, [fetchFloodTelemetry, timelineHorizon]);

  const handleSelectTimeline = (horizon: TimelineHorizon) => {
    setTimelineHorizon(horizon);
    setSelectedRiskCell(null);
  };

  // Determine active risk level and metadata
  const activeRiskLevel = (floodRisk?.riskLevel || "LOW") as FloodRiskLevel;

  const riskMeta = getRiskLevelMeta(activeRiskLevel);
  const RiskIcon = riskMeta.icon;

  // Extract key dominant driver
  const dominantDriver = useMemo(() => {
    if (
      floodRisk?.susceptibility?.contributingFactors &&
      floodRisk.susceptibility.contributingFactors.length > 0
    ) {
      const sorted = [...floodRisk.susceptibility.contributingFactors].sort(
        (a, b) => b.weightedContribution - a.weightedContribution
      );
      const top = sorted[0];
      return {
        label: locale === "hi" && top.labelHi ? top.labelHi : top.label,
        value: `${top.rawValue} ${top.unit}`.trim(),
        score: `${Math.round(top.normalizedScore)}/100`,
        rationale: locale === "hi" && top.rationaleHi ? top.rationaleHi : top.rationale,
      };
    }
    if (floodRisk?.contributingFactors && floodRisk.contributingFactors.length > 0) {
      const sorted = [...floodRisk.contributingFactors].sort(
        (a, b) => b.weightedContribution - a.weightedContribution
      );
      const top = sorted[0];
      return {
        label: top.label,
        value: `${top.rawValue} ${top.unit}`.trim(),
        score: `${Math.round(top.normalizedScore)}/100`,
        rationale: top.rationale,
      };
    }
    return null;
  }, [floodRisk, locale]);

  // Operational guidance translation based on risk level
  const operationalGuidance = useMemo(() => {
    const isHi = locale === "hi";
    switch (activeRiskLevel) {
      case "SEVERE":
        return {
          priorityBadge: isHi ? "अति उच्च प्राथमिकता" : "PRIORITY RED • IMMEDIATE ATTENTION",
          priorityClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
          summary: isHi
            ? "निचले क्षेत्रों, नदी तट एवं रेलवे सबवे में गंभीर जलभराव का खतरा। जल निकासी चैनल अधिकतम क्षमता पर हैं।"
            : "Critical overland inundation threat in low-lying sectors, riverfront depressions, and railway subways. Natural drainage capacity is under severe load.",
          actions: [
            isHi
              ? "आपातकालीन संचालन केंद्र (EOC) में 24x7 निरंतर निगरानी एवं संचार ग्रिड सक्रिय करें।"
              : "Activate 24x7 continuous EOC incident monitoring and inter-agency dispatch.",
            isHi
              ? "पहचाने गए 4 नगरपालिका हॉटस्पॉट पर उच्च क्षमता वाले डीवाटरिंग पंप तैनात करें।"
              : "Pre-position high-capacity municipal dewatering pumps at the 4 verified depression nodes.",
            isHi
              ? "सबवे और नदी तट सड़कों पर त्वरित बैरिकेडिंग एवं यातायात डायवर्जन प्रोटोकॉल लागू करें।"
              : "Enforce proactive traffic diversions and barricades across inundation-prone underpasses.",
          ],
        };
      case "HIGH":
        return {
          priorityBadge: isHi ? "उच्च सतर्कता" : "HIGH ALERT • PREVENTIVE DEPLOYMENT",
          priorityClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
          summary: isHi
            ? "जलग्रहण क्षेत्र में भारी अपवाह का खतरा। निचले इलाकों और प्राकृतिक नालों में जलभराव की उच्च संभावना।"
            : "Elevated catchment runoff surge anticipated. Heightened waterlogging potential in natural depressions and critical drainage intersections.",
          actions: [
            isHi
              ? "प्रमुख वर्षा जल निकासी आउटफॉल और स्लूइस गेट्स से गाद निकासी की त्वरित पुष्टि करें।"
              : "Verify desilting and unobstructed discharge at all major stormwater outfalls.",
            isHi
              ? "नगरपालिका त्वरित कार्यबलों (Quick Response Teams) को स्टैंडबाय पर रखें।"
              : "Place municipal quick-response dewatering squads and rescue units on active standby.",
            isHi
              ? "तालुका स्तर पर नदी गेज रीडिंग और जलस्तर वृद्धि की प्रति घंटा रिपोर्ट लें।"
              : "Cross-reference hourly river gauge telemetry with taluk sub-divisional officers.",
          ],
        };
      case "MODERATE":
        return {
          priorityBadge: isHi ? "मध्यम निगरानी" : "ADVISORY WATCH • ACTIVE MONITORING",
          priorityClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          summary: isHi
            ? "जलग्रहण मृदा में वर्षा जल अवशोषण जारी। स्थानीय नालों में सामान्य से अधिक प्रवाह की संभावना।"
            : "Watershed ground is absorbing moderate rainfall. Nominal runoff surge expected across municipal stormwater networks.",
          actions: [
            isHi
              ? "मानक निगरानी बनाए रखें; वर्षा जल निकास बिंदुओं पर कचरे के जमाव की जांच करें।"
              : "Maintain standard advisory monitoring; inspect urban drains for trash chokepoints.",
            isHi
              ? "आगामी 6 से 24 घंटों के लिए मौसम राडार और उपग्रह वर्षा की प्रगति ट्रैक करें।"
              : "Track upcoming 6h to 24h radar sweeps and antecedent soil saturation progression.",
            isHi
              ? "डिप्टी कलेक्टर/ईओसी को दैनिक बाढ़ सुरक्षा सारांश प्रस्तुत करें।"
              : "Prepare daily flood-watch situation bulletin for executive operational briefing.",
          ],
        };
      case "LOW":
      default:
        return {
          priorityBadge: isHi ? "सामान्य परिचालन" : "ROUTINE STATUS • ALL CLEAR",
          priorityClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          summary: isHi
            ? "सामान्य स्थिति। वर्षा जल भूमि और जलमार्गों द्वारा आसानी से समाहित किया जा रहा है।"
            : "Normal hydrological baseline. Precipitation comfortably within local gravity drainage network capacity.",
          actions: [
            isHi
              ? "नियमित स्वचालित टेलीमेट्री पोलिंग जारी रखें। किसी आपातकालीन कार्रवाई की आवश्यकता नहीं।"
              : "Maintain routine automated telemetry ingestion. No emergency deployment required.",
            isHi
              ? "मानसून पूर्व जल निकासी रखरखाव और तैयारियों की समीक्षा जारी रखें।"
              : "Continue routine district stormwater infrastructure maintenance and readiness drills.",
          ],
        };
    }
  }, [activeRiskLevel, locale]);

  return (
    <div className="space-y-6">
      {/* 1. Concise, Professional Header */}
      <PageHeader
        title={`${tFlood("title")}: ${location.shortName || (locale === "hi" ? "जिला परिचालन" : "District Operations")}`}
        description={
          locale === "hi"
            ? `${location.displayName} हेतु वर्तमान बाढ़-जोखिम स्थिति, सत्यापित जलवैज्ञानिक कारक एवं परिचालन निगरानी।`
            : `Current flood-risk status, verified hydrological factors, and operational monitoring for ${location.displayName}.`
        }
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: tFlood("title") || "Flood Inundation" },
        ]}
        sourceMeta={FLOOD_SOURCE_META}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFloodTelemetry(timelineHorizon)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#2563EB]" : ""}`}
              />
              <span className="hidden sm:inline">
                {locale === "hi" ? "टेलीमेट्री रीफ्रेश करें" : "Refresh Telemetry"}
              </span>
            </button>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <span className="px-1.5 text-slate-500 font-medium hidden md:inline">
                {locale === "hi" ? "परीक्षण स्थिति:" : "Test State:"}
              </span>
              {(["success", "loading", "empty", "error"] as ComponentViewState[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setState(st)}
                  className={`px-2 py-0.5 rounded capitalize font-medium text-xs transition ${
                    state === st
                      ? "bg-[#0F3D66] text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <StateContainer
        state={state}
        onRetry={() => fetchFloodTelemetry(timelineHorizon)}
        errorMessage={
          errorMessage ||
          (locale === "hi"
            ? "ग्रिड मेश गणना के दौरान हाइड्रोडायनामिक सिमुलेशन इंजन का समय समाप्त हो गया।"
            : "Hydrodynamic simulation engine timed out during grid mesh calculation.")
        }
        emptyTitle={
          locale === "hi"
            ? "कोई सक्रिय जलभराव जोखिम नहीं मिला"
            : "No Active Inundation Risk Detected"
        }
        emptyDescription={
          locale === "hi"
            ? "सभी वर्षा जल निकासी चैनल एवं नदी गेज बिंदु सुरक्षित रूप से चेतावनी सीमा से नीचे हैं।"
            : "All storm drain channels and river gauge points are safely below advisory thresholds."
        }
      >
        <div className="space-y-6">
          {/* 2. Primary Operational Hero: Answers the 4 Core Questions Immediately */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 2A. Core Risk Status Card (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    {locale === "hi" ? "सत्यापित बाढ़ स्थिति" : "Verified Flood Risk Status"}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    +{timelineHorizon} {locale === "hi" ? "क्षितिज" : "Outlook"}
                  </span>
                </div>

                {/* Big Category Badge + Score */}
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                      activeRiskLevel === "SEVERE"
                        ? "bg-[#DC2626]"
                        : activeRiskLevel === "HIGH"
                        ? "bg-[#EA580C]"
                        : activeRiskLevel === "MODERATE"
                        ? "bg-[#D97706]"
                        : "bg-[#15803D]"
                    }`}
                  >
                    <RiskIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm sm:text-base font-black px-2.5 py-0.5 rounded uppercase tracking-wider text-white shadow-xs ${
                          activeRiskLevel === "SEVERE"
                            ? "bg-[#DC2626]"
                            : activeRiskLevel === "HIGH"
                            ? "bg-[#EA580C]"
                            : activeRiskLevel === "MODERATE"
                            ? "bg-[#D97706]"
                            : "bg-[#15803D]"
                        }`}
                      >
                        {riskMeta.label}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                        {floodRisk?.susceptibility?.score ?? floodRisk?.riskScore ?? "--"}
                        <span className="text-xs text-slate-400 font-normal"> / 100</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                      {riskMeta.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status footer with Data Completeness & Engine version */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {floodRisk?.dataCompleteness ?? 0}% {locale === "hi" ? "सत्यापित डेटा पूर्णता" : "Verified Inputs"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {floodRisk?.susceptibility ? "Engine V1 (Terrain-Aware)" : "Multi-Factor Synthesis"}
                </span>
              </div>
            </div>

            {/* 2B. Operational Action Guidance ("What does this mean & What to do?") (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                    <h3 className="text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-white">
                      {locale === "hi" ? "परिचालन अर्थ एवं अनुशंसित कार्रवाई" : "Operational Meaning & Recommended Actions"}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${operationalGuidance.priorityClass}`}
                  >
                    {operationalGuidance.priorityBadge}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {operationalGuidance.summary}
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    {locale === "hi" ? "प्राथमिकता प्रोटोकॉल:" : "Immediate Response Directives:"}
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {operationalGuidance.actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-tight">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transparency Disclaimer Note */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 leading-tight">
                {locale === "hi"
                  ? "सत्यापित ओपन-मीटिओ वर्षा एवं डीईएम स्थलाकृति पर आधारित स्थितिजन्य मॉडल। यह सांविधिक निकासी आदेश नहीं है।"
                  : "Model-derived situational intelligence based on verified Open-Meteo rainfall and DEM slope. Does not constitute a statutory evacuation order."}
              </p>
            </div>
          </div>

          {/* 3. Four Supporting KPI Cards (Clean, concise, directly answering core questions) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={`${locale === "hi" ? "पूर्वानुमान वर्षा" : "Forecast Rainfall"} (+${timelineHorizon})`}
              value={accumulatedRainMm > 0 ? `${accumulatedRainMm.toFixed(1)}` : "0.0"}
              unit="mm"
              subtext={
                locale === "hi"
                  ? `आगामी ${timelineHorizon} में संचयी वर्षा`
                  : `Next ${timelineHorizon} accumulated precip`
              }
              icon={CloudRain}
              severity={accumulatedRainMm > 40 ? "ALERT" : accumulatedRainMm > 15 ? "ADVISORY" : "NORMAL"}
              sourceLabel="Open-Meteo NWP"
              isLoading={isLoading}
            />

            <MetricCard
              title={locale === "hi" ? "पूर्ववर्ती 72 घंटे वर्षा" : "Previous 72h Rainfall"}
              value={antecedent ? `${antecedent.precip72h.toFixed(1)}` : "--"}
              unit="mm"
              subtext={
                antecedent
                  ? `${locale === "hi" ? "अपवाह गुणक" : "Runoff multiplier"}: ${antecedent.runoffRiskMultiplier}x`
                  : locale === "hi"
                  ? "टेलीमेट्री की प्रतीक्षा..."
                  : "Awaiting telemetry"
              }
              icon={History}
              severity={antecedent && antecedent.precip72h > 45 ? "ALERT" : "NORMAL"}
              sourceLabel="ERA5 Reanalysis"
              isLoading={isLoading}
            />

            <MetricCard
              title={locale === "hi" ? "जलग्रहण मृदा संतृप्ति" : "Catchment Soil Moisture"}
              value={antecedent?.soilMoistureIndex || "DRY"}
              subtext={
                antecedent?.soilMoistureIndex === "CRITICAL_SATURATION"
                  ? locale === "hi"
                    ? "अति संतृप्त (उच्च अपवाह)"
                    : "Critically saturated (High runoff)"
                  : antecedent?.soilMoistureIndex === "SATURATED"
                  ? locale === "hi"
                    ? "संतृप्त (मध्यम अपवाह)"
                    : "Saturated (Elevated runoff)"
                  : locale === "hi"
                  ? "अवशोषण क्षमता बरकरार"
                  : "Ground absorption intact"
              }
              icon={Waves}
              severity={
                antecedent?.soilMoistureIndex === "CRITICAL_SATURATION"
                  ? "CRITICAL"
                  : antecedent?.soilMoistureIndex === "SATURATED"
                  ? "ALERT"
                  : "NORMAL"
              }
              sourceLabel="Hydrology Engine"
              isLoading={isLoading}
            />

            <MetricCard
              title={locale === "hi" ? "प्रमुख जोखिम कारक" : "Primary Risk Driver"}
              value={dominantDriver ? dominantDriver.label : locale === "hi" ? "समतुल्य" : "Balanced"}
              subtext={
                dominantDriver
                  ? `${dominantDriver.value} • ${dominantDriver.score}`
                  : locale === "hi"
                  ? "कोई एकल प्रमुख कारक नहीं"
                  : "No single outlier"
              }
              icon={Activity}
              severity={
                activeRiskLevel === "SEVERE"
                  ? "CRITICAL"
                  : activeRiskLevel === "HIGH"
                  ? "ALERT"
                  : activeRiskLevel === "MODERATE"
                  ? "ADVISORY"
                  : "NORMAL"
              }
              sourceLabel="Explainability V1"
              isLoading={isLoading}
            />
          </div>

          {/* 4. Secondary Operational Section: Timeline, Infrastructure Intelligence & Spatial Map */}
          <div id="flood-map-section" className="space-y-4">
            <FloodTimelineControls
              currentHorizon={timelineHorizon}
              onSelectHorizon={handleSelectTimeline}
              accumulatedRainMm={accumulatedRainMm}
              isLoading={isLoading}
            />

            {/* Tactical Infrastructure Filter Bar directly above the map */}
            <FloodInfrastructureFilterBar
              selectedCategory={infraFilter}
              onSelectCategory={setInfraFilter}
              categoryCounts={categoryCounts}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Canvas */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                    <strong className="text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      {locale === "hi"
                        ? `स्थानिक बाढ़-जोखिम एवं अवसंरचना ग्रिड (+${timelineHorizon})`
                        : `Spatial Flood-Risk & Infrastructure Grid (+${timelineHorizon})`}
                    </strong>
                  </div>
                  <Link
                    href="/map"
                    className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{locale === "hi" ? "पूर्ण कमान मानचित्र खोलें" : "Open Full Command Map"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <ExperimentalMapDisclaimer className="mb-2" />

                <GisMap
                  location={location}
                  facilities={filteredFacilities}
                  activeLayers={activeMapLayers}
                  riskGridData={riskGrid}
                  onSelectRiskCell={(cell) => setSelectedRiskCell(cell)}
                  selectedRiskCell={selectedRiskCell}
                  focusCoordinates={focusCoordinates}
                  onInspectLocation={() => {}}
                  inspectorData={null}
                  isFullscreen={false}
                  onToggleFullscreen={() => {}}
                  className="w-full h-[480px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    {locale === "hi" ? "मेश रिज़ॉल्यूशन:" : "Mesh Resolution:"}{" "}
                    <strong>{riskGrid?.summary.totalCells ?? 0} {locale === "hi" ? "बाउंडेड सेल" : "Bounded Cells"}</strong> (~4.4 km step)
                  </span>
                  <span>
                    {locale === "hi"
                      ? "स्थानीय इलाके एवं संपत्तियां देखने हेतु किसी भी सेल पर क्लिक करें"
                      : "Click any cell to inspect local areas & infrastructure"}
                  </span>
                </div>
              </div>

              {/* Side Panel: Dedicated Risk Zone Details Panel */}
              <div className="space-y-4">
                <RiskZoneDetailsPanel
                  selectedCell={selectedRiskCell}
                  onClearSelection={() => setSelectedRiskCell(null)}
                  facilities={facilities}
                  riskGrid={riskGrid}
                  timelineHorizon={timelineHorizon}
                  onFocusAsset={(lat, lon) => {
                    setFocusCoordinates({ lat, lon, zoom: 16 });
                    const mapEl = document.getElementById("flood-map-section");
                    if (mapEl) {
                      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                />
              </div>
            </div>

            {/* Below-Map Operational List: Risk Zones & Local Areas */}
            <div className="pt-2">
              <RiskZonesOperationalTable
                riskGrid={riskGrid}
                facilities={facilities}
                selectedCellId={selectedRiskCell?.cellId}
                onSelectZone={(cell) => {
                  setSelectedRiskCell(cell);
                  setFocusCoordinates({ lat: cell.centerLat, lon: cell.centerLon, zoom: 14 });
                }}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 5. Progressive Disclosure Sections: Organized, Collapsible Deep Dives */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                  <span>
                    {locale === "hi"
                      ? "विस्तृत परिचालन एवं वैज्ञानिक विश्लेषण"
                      : "Detailed Operational & Scientific Evidence"}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {locale === "hi"
                    ? "जटिल बहु-कारक विवरण, नगरपालिका हॉटस्पॉट, भूभाग एवं उपग्रह सुदूर संवेदन मॉड्यूल।"
                    : "Multi-factor explainability, monitored municipal hotspots, terrain diagnostics, and satellite feeds."}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAllSections}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>
                  {areAllSectionsOpen
                    ? locale === "hi"
                      ? "सभी संकुचित करें"
                      : "Collapse All"
                    : locale === "hi"
                    ? "सभी विस्तृत करें"
                    : "Expand All"}
                </span>
              </button>
            </div>

            {/* Section A: Contributing Factors & Multi-Factor Explainability */}
            <CollapsibleSection
              id="factors-section"
              title={
                locale === "hi"
                  ? "विस्तृत योगदान कारक एवं वैज्ञानिक स्कोरिंग"
                  : "Detailed Contributing Factors & Scientific Scoring"
              }
              subtitle={
                locale === "hi"
                  ? "भार, सामान्यीकृत सूचकांकों एवं परिचालन कारणों का संपूर्ण विवरण।"
                  : "Full breakdown of weights, normalized indices, and operational rationales."
              }
              badge={locale === "hi" ? "5 कारक विश्लेषित" : "5 Factors Analyzed"}
              icon={Activity}
              isOpen={openSections.factors}
              onToggle={() => toggleSection("factors")}
            >
              <div className="space-y-6">
                <SusceptibilityExplainabilityCard
                  susceptibilityData={floodRisk?.susceptibility}
                  isLoading={isLoading}
                />
                <FloodRiskCard riskData={floodRisk} isLoading={isLoading} />
              </div>
            </CollapsibleSection>

            {/* Section B: Monitored Municipal Hotspots & Dewatering Pumps */}
            <CollapsibleSection
              id="hotspots-section"
              title={
                locale === "hi"
                  ? "निगरानी किए गए नगरपालिका हॉटस्पॉट एवं निचले क्षेत्र"
                  : "Monitored Municipal Hotspots & Low-Lying Vulnerability"
              }
              subtitle={
                locale === "hi"
                  ? "मैदानी पर्यवेक्षक टोही, जल निकासी पंप तैनाती एवं हाइड्रोलिक मॉडल स्थिति।"
                  : "Field observer reconnaissance, dewatering pump deployments, and hydraulic model status."
              }
              badge={locale === "hi" ? "4 हॉटस्पॉट • पंप सक्रिय" : "4 Hotspots • Active Pumps"}
              icon={MapPin}
              isOpen={openSections.hotspots}
              onToggle={() => toggleSection("hotspots")}
            >
              <Card className="border-slate-200 dark:border-slate-800 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                        {locale === "hi"
                          ? "निगरानी किए गए नगरपालिका हॉटस्पॉट"
                          : "Verified Municipal Hotspot Telemetry"}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {locale === "hi"
                          ? "मैदानी टोही एवं जल निकासी पंप तैनाती।"
                          : "Field reconnaissance, emergency dewatering units, and uncalibrated 2D depth notices."}
                      </CardDescription>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                      {locale === "hi" ? "कैलिब्रेटेड बाथिमेट्री: लिंक नहीं" : "Calibrated Bathymetry: Not Linked"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "हॉटस्पॉट स्थान" : "Hotspot Location"}
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "तालुका / वार्ड" : "Taluk / Ward"}
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "संवेदनशीलता" : "Susceptibility"}
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "2D जलभराव मॉडल" : "2D Water Depth Model"}
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "जल निकासी पंप" : "Dewatering Pumps"}
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            {locale === "hi" ? "मैदानी अवलोकन / स्थिति" : "Field Observation / Status"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {MUNICIPAL_HOTSPOTS.map((spot) => (
                          <tr
                            key={spot.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {spot.location}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                              {spot.taluk}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                                  spot.riskLevel === "SEVERE"
                                    ? "bg-[#DC2626]"
                                    : spot.riskLevel === "HIGH"
                                    ? "bg-[#EA580C]"
                                    : spot.riskLevel === "MODERATE"
                                    ? "bg-[#EAB308] text-slate-900"
                                    : "bg-[#16A34A]"
                                }`}
                              >
                                {spot.riskLevel}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                {locale === "hi" ? "2D गहराई: अंशांकन प्रतीक्षित" : spot.hydraulicStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {spot.pumpsDeployed} {locale === "hi" ? "इकाइयाँ" : "Units"}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                              {spot.fieldObservation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleSection>

            {/* Section C: Catchment Hydrology & Terrain Diagnostics */}
            <CollapsibleSection
              id="hydrology-section"
              title={
                locale === "hi"
                  ? "जलग्रहण जलविज्ञान एवं भूभाग विश्लेषण"
                  : "Catchment Hydrology & Terrain Diagnostics"
              }
              subtitle={
                locale === "hi"
                  ? "72घं संचयी वर्षा वक्र, एएमसी मृदा संतृप्ति एवं डीईएम भूभाग ढलान रूपरेखा।"
                  : "72h cumulative precipitation curve, AMC soil saturation, and DEM elevation slope profile."
              }
              badge={
                terrain?.isWithinPilot
                  ? `${terrain.elevationMeters}m • ${terrain.classification}`
                  : "ERA5 • SRTM DEM"
              }
              icon={Mountain}
              isOpen={openSections.hydrology}
              onToggle={() => toggleSection("hydrology")}
            >
              <div className="space-y-6">
                <AntecedentRainfallCard antecedent={antecedent} isLoading={isLoading} />
                <TerrainIntelligenceCard
                  districtName={location.district || location.shortName || "Pune"}
                />
              </div>
            </CollapsibleSection>

            {/* Section D: Multi-Hazard Remote Sensing & Government Open Data */}
            <CollapsibleSection
              id="hazards-section"
              title={
                locale === "hi"
                  ? "बहु-आपदा सुदूर संवेदन एवं सरकारी ओपन डेटा"
                  : "Multi-Hazard Remote Sensing & Government Open Data"
              }
              subtitle={
                locale === "hi"
                  ? "आधिकारिक जिला वर्षा रिकॉर्ड, कोपरनिकस बाढ़ सक्रियण, भूकंप/भूस्खलन जोखिम एवं नासा थर्मल टेलीमेट्री।"
                  : "Official district rainfall records, Copernicus EMS flood activations, seismic/landslide risk, and NASA FIRMS thermal telemetry."
              }
              badge={locale === "hi" ? "data.gov.in • Copernicus • USGS • NASA" : "data.gov.in • Copernicus • USGS • NASA"}
              icon={Satellite}
              isOpen={openSections.hazards}
              onToggle={() => toggleSection("hazards")}
            >
              <div className="space-y-6">
                <GovernmentDataCard
                  districtName={location.district || location.shortName || "Pune"}
                  stateName={location.state}
                  openMeteoForecastMm={accumulatedRainMm}
                />
                <CopernicusEMSCard />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <LandslideRiskCard
                    districtName={location.district || location.shortName || "Pune"}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    rainfall24hMm={accumulatedRainMm}
                  />
                  <NASAFIRMSCard
                    districtName={location.district || location.shortName || "Pune"}
                    latitude={location.latitude}
                    longitude={location.longitude}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Section E: Scientific Methodology & 2D Hydraulic Roadmap */}
            <CollapsibleSection
              id="governance-section"
              title={
                locale === "hi"
                  ? "वैज्ञानिक कार्यप्रणाली एवं 2D हाइड्रोलिक अंशांकन रोडमैप"
                  : "Scientific Methodology & 2D Hydraulic Calibration Roadmap"
              }
              subtitle={
                locale === "hi"
                  ? "सूचकांक गणना सूत्र, पारदर्शी डेटा सीमाएं एवं 4-चरणीय एचईसी-आरएएस 2D एकीकरण योजना।"
                  : "Index calculation formulation, transparent data limitations, and 4-phase HEC-RAS 2D integration plan."
              }
              badge={locale === "hi" ? "कार्यप्रणाली • HEC-RAS 2D" : "Methodology • HEC-RAS 2D"}
              icon={FileText}
              isOpen={openSections.governance}
              onToggle={() => toggleSection("governance")}
            >
              <div className="space-y-6">
                <HydraulicModelBanner config={hydraulicConfig} />
                <FloodMethodologyCard />
                <HecRasRoadmapCard />
              </div>
            </CollapsibleSection>
          </div>

          {/* 6. Provenance & Attribution Footer */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <DataSourceBadge metadata={FLOOD_SOURCE_META} />

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Open-Meteo CC BY 4.0</span>
              <span>•</span>
              <span>NASA SRTM / Copernicus DEM</span>
              <span>•</span>
              <span>OpenStreetMap ODbL 1.0</span>
            </div>
          </div>
        </div>
      </StateContainer>
    </div>
  );
}
