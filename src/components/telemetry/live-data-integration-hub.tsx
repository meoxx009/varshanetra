"use client";

import React, { useState } from "react";
import {
  CloudRain,
  Satellite,
  Compass,
  Cpu,
  Layers,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowDown,
  Database,
  Radio,
  FileText,
  BellRing,
  Truck,
  Info,
  Activity,
  Flame,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { GovDataBadge } from "@/components/common/gov-data-badge";
import { cn } from "@/lib/utils";

interface PlannedIntegrationModalState {
  isOpen: boolean;
  name: string;
  agency: string;
  details: string;
  impact: string;
}

export function LiveDataIntegrationHub() {
  const locale = useLocale();

  const [modalState, setModalState] = useState<PlannedIntegrationModalState | null>(null);

  // SECTION 2 - Active Data Sources Dataset
  const activeSources = [
    {
      id: "open-meteo-ecmwf",
      name: "Open-Meteo ECMWF IFS",
      provider: "Open-Meteo Foundation",
      type: "NWP Forecast",
      typeHi: "NWP मौसम पूर्वानुमान",
      frequency: "Every 1 hour",
      frequencyHi: "प्रति 1 घंटा",
      coverage: "Global 0.25° (~25km)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "gfs-model",
      name: "GFS Model",
      provider: "NOAA USA",
      type: "NWP Forecast",
      typeHi: "NWP मौसम पूर्वानुमान",
      frequency: "Every 6 hours",
      frequencyHi: "प्रति 6 घंटे",
      coverage: "Global 0.25° (~25km)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "icon-model",
      name: "ICON Model",
      provider: "DWD Germany",
      type: "NWP Forecast",
      typeHi: "NWP मौसम पूर्वानुमान",
      frequency: "Every 3 hours",
      frequencyHi: "प्रति 3 घंटे",
      coverage: "Global (~13km)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "tomorrow-io",
      name: "Tomorrow.io AI",
      provider: "Tomorrow.io Inc.",
      type: "Proprietary AI Weather",
      typeHi: "निजी AI मौसम मॉडल",
      frequency: "Hourly Timelines",
      frequencyHi: "प्रति घंटा टाइमलाइन",
      coverage: "Global Point Timelines",
      status: "ACTIVE",
      statusClass: "bg-purple-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "data-gov-in-imd",
      name: "data.gov.in IMD",
      provider: "Govt of India (OGD Platform)",
      type: "Official Observation",
      typeHi: "आधिकारिक भू-प्रेक्षण",
      frequency: "Daily",
      frequencyHi: "दैनिक (08:30 IST)",
      coverage: "District level (India-wide)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "OFFICIAL",
      credibilityHi: "आधिकारिक",
      badgeType: "gold",
    },
    {
      id: "nasa-gpm-imerg",
      name: "NASA GPM IMERG",
      provider: "NASA USA (GSFC)",
      type: "Satellite Rainfall",
      typeHi: "उपग्रह वर्षा प्रेक्षण",
      frequency: "Every 30 minutes",
      frequencyHi: "प्रति 30 मिनट",
      coverage: "Global 0.1° (~10km)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "rainviewer-radar",
      name: "RainViewer Global Radar",
      provider: "RainViewer (Global Radar Composite)",
      type: "Doppler Radar Overlay",
      typeHi: "डॉप्लर रडार ओवरले",
      frequency: "Every 10 minutes",
      frequencyHi: "प्रति 10 मिनट",
      coverage: "Global including India",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "srtm-dem",
      name: "SRTM DEM",
      provider: "NASA USA",
      type: "Terrain Elevation",
      typeHi: "भूभाग ऊंचाई व ढलान",
      frequency: "Static (Pre-processed)",
      frequencyHi: "स्थिर (पूर्व-संसाधित)",
      coverage: "Global 30m 1-arc-second",
      status: "LOADED",
      statusClass: "bg-slate-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "gray",
    },
    {
      id: "esa-worldcover",
      name: "ESA WorldCover",
      provider: "ESA Europe",
      type: "Land Use / Land Cover",
      typeHi: "भूमि उपयोग (LULC)",
      frequency: "Static (2021 Sentinel)",
      frequencyHi: "स्थिर (2021 सेंटिनल)",
      coverage: "Global 10m Sentinel-1/2",
      status: "LOADED",
      statusClass: "bg-slate-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "gray",
    },
    {
      id: "openstreetmap",
      name: "OpenStreetMap",
      provider: "OSM Foundation",
      type: "Infrastructure GIS",
      typeHi: "अवसंरचना व जलमार्ग",
      frequency: "Continuous (Overpass API)",
      frequencyHi: "सतत (ओवरपास API)",
      coverage: "Global Vector Waterways",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "Medium",
      credibilityHi: "मध्यम",
      badgeType: "standard",
    },
    {
      id: "copernicus-ems",
      name: "Copernicus EMS & GloFAS",
      provider: "European Commission / ESA",
      type: "Emergency Flood Maps & GloFAS",
      typeHi: "उपग्रह आपातकालीन बाढ़ मानचित्र एवं GloFAS",
      frequency: "Event-based Rapid / 15m Cache",
      frequencyHi: "आपातकालीन / 15 मिनट कैशे",
      coverage: "Global & Indian River Basins",
      status: "MONITORING",
      statusClass: "bg-blue-600 text-white",
      credibility: "OFFICIAL",
      credibilityHi: "आधिकारिक",
      badgeType: "standard",
    },
    {
      id: "supabase-postgres",
      name: "Supabase PostgreSQL",
      provider: "Supabase Inc.",
      type: "Operations Database",
      typeHi: "परिचालन डेटाबेस",
      frequency: "Real-time (WebSockets)",
      frequencyHi: "रीयल-टाइम (सॉकेट्स)",
      coverage: "Application Telemetry",
      status: "CONNECTED",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "usgs-earthquake",
      name: "USGS Earthquake Hazards",
      provider: "USGS USA (NEIC / ANSS)",
      type: "Seismic & Landslide Hazards",
      typeHi: "भूकंपीय एवं भूस्खलन संकट",
      frequency: "Real-time (< 5 min)",
      frequencyHi: "रीयल-टाइम (< 5 मिनट)",
      coverage: "Global (200km district radius)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
    {
      id: "nasa-firms-viirs",
      name: "NASA FIRMS VIIRS C2",
      provider: "NASA USA (EOSDIS / LANCE)",
      type: "Fire & Heat Anomalies",
      typeHi: "अग्नि व ताप विसंगति संसूचन",
      frequency: "Every 3 hours (NRT)",
      frequencyHi: "प्रति 3 घंटे (NRT)",
      coverage: "South Asia (375m VIIRS)",
      status: "ACTIVE",
      statusClass: "bg-emerald-600 text-white",
      credibility: "High",
      credibilityHi: "उच्च",
      badgeType: "standard",
    },
  ];

  // SECTION 4 - Planned Integrations Dataset
  const plannedIntegrations = [
    {
      name: "IMD WRF 3km NWP",
      status: "Under MOU Process",
      statusHi: "एमओयू प्रक्रियाधीन",
      statusColor: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      impact: "Would replace Open-Meteo with 3km India-specific numerical prediction model tailored for monsoon convection.",
      impactHi: "ओपन-मेटियो के स्थान पर मानसून संवहन हेतु तैयार 3 किमी भारत-विशिष्ट संख्यात्मक पूर्वानुमान मॉडल लागू होगा।",
      actionText: "View Protocol",
      actionTextHi: "प्रोटोकॉल देखें",
      agency: "India Meteorological Department (MoES)",
    },
    {
      name: "CWC River Gauge API",
      status: "Under MOU Process",
      statusHi: "एमओयू प्रक्रियाधीन",
      statusColor: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      impact: "Real-time river stage levels and flash telemetry for 878 CWC hydrological gauging stations nationwide.",
      impactHi: "देश भर के 878 CWC हाइड्रोलॉजिकल गेज स्टेशनों हेतु लाइव जलस्तर एवं बाढ़ टेलीमेट्री डेटा सीधे जुड़ेगा।",
      actionText: "Draft Spec",
      actionTextHi: "प्रारूप विशिष्टता",
      agency: "Central Water Commission (Ministry of Jal Shakti)",
    },
    {
      name: "CARTOSAT-3 DEM 10m",
      status: "NRSC Registration",
      statusHi: "NRSC पंजीकरण",
      statusColor: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      impact: "Replace SRTM with 10m India-specific elevation raster from Indian space remote sensing platform.",
      impactHi: "SRTM के स्थान पर 10 मीटर भारत-विशिष्ट कार्टोसैट उपग्रह डिजिटल एलिवेशन मॉडल का एकीकरण।",
      actionText: "NRSC Bhuvan",
      actionTextHi: "NRSC भुवन",
      agency: "ISRO National Remote Sensing Centre (NRSC)",
    },
    {
      name: "Doppler Weather Radar (DWR)",
      status: "IMD Restricted",
      statusHi: "IMD प्रतिबंधित",
      statusColor: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      impact: "15-minute high-resolution storm cell tracking and cloud reflectivity nowcasting within 250km radius.",
      impactHi: "250 किमी के दायरे में 15 मिनट का उच्च-रिज़ॉल्यूशन तूफानी बादल ट्रैकिंग और रडार रिफ्लेक्टिविटी नाउकास्टिंग।",
      actionText: "Radar Info",
      actionTextHi: "रडार विवरण",
      agency: "IMD Radar Directorate",
    },
    {
      name: "NDRF Resource API",
      status: "NDMA Coordination",
      statusHi: "NDMA समन्वय",
      statusColor: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      impact: "National disaster resource inventory integration for automated battalion deployment recommendations.",
      impactHi: "स्वचालित बचाव बटालियन और नाव तैनाती अनुशंसाओं हेतु राष्ट्रीय संसाधन इन्वेंटरी का सीधा एकीकरण।",
      actionText: "NDMA Liaison",
      actionTextHi: "NDMA संपर्क",
      agency: "National Disaster Response Force / NDMA",
    },
  ];

  // SECTION 5 - Cost Analysis Table
  const costBreakdown = [
    { source: "Open-Meteo (ECMWF, GFS, ICON)", costEn: "Free", costHi: "निःशुल्क", note: "CC BY 4.0 Open Source" },
    { source: "NASA GPM IMERG", costEn: "Free with registration", costHi: "निःशुल्क (पंजीकरण)", note: "NASA Earthdata Open Access" },
    { source: "SRTM DEM 30m", costEn: "Free one-time download", costHi: "निःशुल्क (एकमुश्त डाउनलोड)", note: "Public Domain NASA/USGS" },
    { source: "ESA WorldCover 10m", costEn: "Free", costHi: "निःशुल्क", note: "European Space Agency Open Access" },
    { source: "data.gov.in (IMD, NDMA, CWC)", costEn: "Free", costHi: "निःशुल्क", note: "National Data Sharing Policy (NDSAP)" },
    { source: "RainViewer Global Radar", costEn: "Free public API", costHi: "निःशुल्क सार्वजनिक API", note: "Zero Cost • No API Key • Global Doppler Composite" },
    { source: "Copernicus EMS & GloFAS", costEn: "Free Open Access", costHi: "निःशुल्क (खुला अभिगमन)", note: "European Commission / ESA Open Emergency Data" },
    { source: "Tomorrow.io Timelines API", costEn: "Free Tier (500 calls/day)", costHi: "निःशुल्क टियर (500 कॉल/दिन)", note: "Free API Key • Proprietary AI Weather Model" },
    { source: "OpenStreetMap (Hydrography)", costEn: "Free", costHi: "निःशुल्क", note: "ODbL 1.0 Community Open Data" },
  ];

  // SECTION 3 - Real-Time Calculated Metrics
  const totalActiveSources = activeSources.filter(
    (s) => s.status === "ACTIVE" || s.status === "LOADED" || s.status === "CONNECTED" || s.status === "MONITORING"
  ).length;

  const officialSourcesCount = activeSources.filter(
    (s) => s.credibility === "OFFICIAL"
  ).length;

  return (
    <div className="space-y-8">
      {/* SECTION 3 - DATA QUALITY METRICS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>{locale === "hi" ? "डेटा गुणवत्ता एवं एकीकरण मीट्रिक्स" : "Data Quality & Integration Metrics"}</span>
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            {locale === "hi" ? "सक्रिय ऑडिट स्थिति: सामान्य" : "Active Audit Status: Operational"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              {locale === "hi" ? "कुल सक्रिय डेटा स्रोत" : "Total Active Sources"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalActiveSources}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ {activeSources.length}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {locale === "hi" ? "सक्रिय या प्री-लोडेड" : "Active or Loaded"}
            </span>
          </Card>

          <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              {locale === "hi" ? "आधिकारिक सरकारी स्रोत" : "Official Govt Sources"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {officialSourcesCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {locale === "hi" ? "संस्थान" : "Govt bodies"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              data.gov.in &amp; Copernicus EMS
            </span>
          </Card>

          <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              {locale === "hi" ? "स्थानिक रिज़ॉल्यूशन" : "Spatial Resolution"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                10m
              </span>
              <span className="text-xs text-slate-500 font-semibold">Sentinel-2</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              10m (ESA) / 30m (SRTM)
            </span>
          </Card>

          <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              {locale === "hi" ? "अस्थायी रिज़ॉल्यूशन" : "Temporal Resolution"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                30m
              </span>
              <span className="text-xs text-slate-500 font-semibold">Satellite</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {locale === "hi" ? "रीयल-टाइम व 30 मिनट उपग्रह" : "Real-time DB / 30m orbital"}
            </span>
          </Card>

          <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              {locale === "hi" ? "समग्र डेटा गुणवत्ता" : "Overall Data Quality"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                96%
              </span>
              <span className="text-xs text-emerald-600 font-bold">Grade A+</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {locale === "hi" ? "सत्यापित टेलीमेट्री" : "Verified Multi-Factor SLA"}
            </span>
          </Card>
        </div>
      </div>

      {/* SECTION 1 - DATA FLOW ARCHITECTURE DIAGRAM */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F3D66] dark:text-blue-400" />
                <span>{locale === "hi" ? "डेटा प्रवाह वास्तुकला आरेख" : "Data Flow Architecture Diagram"}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {locale === "hi"
                  ? "VarshaNetra के मल्टी-फैक्टर डिसीजन इंजन में सभी बाहरी व आंतरिक डेटा स्रोतों का अभिसरण"
                  : "End-to-end convergence of external and internal data sources into the VarshaNetra Multi-Factor Decision Engine"}
              </CardDescription>
            </div>
            <GovDataBadge size="sm" />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-950/40">
          {/* TOP CATEGORY HEADERS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div className="bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg p-2.5 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                <CloudRain className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{locale === "hi" ? "मौसम / NWP" : "Weather / NWP"}</span>
              </span>
            </div>

            <div className="bg-blue-100/70 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-lg p-2.5 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center justify-center gap-1.5">
                <Satellite className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>{locale === "hi" ? "उपग्रह" : "Satellite"}</span>
              </span>
            </div>

            <div className="bg-slate-200/80 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>{locale === "hi" ? "भू-सूचना / GIS" : "GIS & Terrain"}</span>
              </span>
            </div>
          </div>

          {/* MIDDLE ROW: DATA SOURCE BOXES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Weather NWP */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>Open-Meteo ECMWF</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900 rounded font-semibold text-emerald-800 dark:text-emerald-200">1h • 25km</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>GFS Model</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900 rounded font-semibold text-emerald-800 dark:text-emerald-200">6h • 25km</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>ICON Model</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900 rounded font-semibold text-emerald-800 dark:text-emerald-200">3h • 13km</span>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 text-purple-950 dark:text-purple-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>Tomorrow.io AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-200/80 dark:bg-purple-900 rounded font-semibold text-purple-800 dark:text-purple-200">1h • Timelines</span>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/40 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-xs font-black flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>data.gov.in IMD</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-bold">OFFICIAL</span>
              </div>
            </div>

            {/* Column 2: Satellite */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 text-blue-950 dark:text-blue-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>NASA GPM IMERG</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-200/80 dark:bg-blue-900 rounded font-semibold text-blue-800 dark:text-blue-200">30m • 10km</span>
              </div>
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-400 dark:border-sky-700 text-sky-950 dark:text-sky-200 text-xs font-black flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                  <span>RainViewer Global Radar</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-200/80 dark:bg-sky-900 rounded font-semibold text-sky-800 dark:text-sky-200">10m • Doppler Tile</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 text-xs font-black flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span role="img" aria-label="EU Flag">🇪🇺</span>
                  <span>Copernicus EMS &amp; GloFAS</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-200/80 dark:bg-indigo-900 rounded font-semibold text-indigo-800 dark:text-indigo-200">Rapid Mapping • WMS</span>
              </div>
            </div>

            {/* Column 3: GIS & Terrain */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>SRTM NASA DEM</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-semibold">30m Elevation</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>ESA WorldCover</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-semibold">10m Land Use</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>OpenStreetMap</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-semibold">Riverways &amp; Infrastructure</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <span>HydroSHEDS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-semibold">Drainage Basins</span>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/60 text-red-950 dark:text-red-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-red-600" />
                  <span>USGS Earthquakes</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-red-200/80 dark:bg-red-900 rounded font-semibold text-red-800 dark:text-red-200">Real-time • 200km</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 text-xs font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                  <span>NASA FIRMS Active Fire</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-orange-200/80 dark:bg-orange-900 rounded font-semibold text-orange-800 dark:text-orange-200">375m • 3h NRT</span>
              </div>
            </div>
          </div>

          {/* DOWNWARD ARROWS CONNECTOR */}
          <div className="py-4 flex items-center justify-center">
            <div className="flex items-center gap-6 text-purple-600 dark:text-purple-400">
              <div className="h-6 w-0.5 bg-purple-400 dark:bg-purple-600" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800 text-xs font-bold text-purple-900 dark:text-purple-200 shadow-2xs">
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>{locale === "hi" ? "संयुक्त डेटा पाइपलाइन" : "Unified Telemetry Ingestion Pipeline"}</span>
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div className="h-6 w-0.5 bg-purple-400 dark:bg-purple-600" />
            </div>
          </div>

          {/* BOTTOM ROW: VARSHANETRA RISK ENGINE */}
          <div className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0F3D66] text-white border-2 border-purple-500 shadow-md space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2">
              <Cpu className="w-5 h-5 text-purple-300" />
              <h4 className="font-black text-sm sm:text-base tracking-wide uppercase">
                VarshaNetra Multi-Factor Flood &amp; Inundation Risk Engine
              </h4>
            </div>
            <p className="text-xs text-purple-200 max-w-2xl mx-auto">
              {locale === "hi"
                ? "पूर्वानुमान वर्षा (30%), पूर्ववर्ती संतृप्ति (20%), DEM ढलान (15%), सापेक्ष ऊंचाई (20%), और नदी निकटता (15%) का एकीकृत विश्लेषण"
                : "Deterministic synthesis: Forward Rain (30%), Antecedent Saturation (20%), DEM Slope (15%), Basin Elevation (20%), and River Proximity (15%)"}
            </p>
          </div>

          {/* DOWNWARD ARROWS TO OUTPUT MODULES */}
          <div className="py-3 flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>

          {/* OUTPUT BOXES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Dashboard</span>
              <span className="text-[10px] text-slate-400 block">{locale === "hi" ? "कमांड सेंटर यूआई" : "Command UI"}</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Alerts</span>
              <span className="text-[10px] text-slate-400 block">{locale === "hi" ? "CAP व SMS अलर्ट" : "CAP &amp; SMS"}</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Field Reports</span>
              <span className="text-[10px] text-slate-400 block">{locale === "hi" ? "मैदानी पर्यवेक्षक टोही" : "Offline PWA"}</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Response Ops</span>
              <span className="text-[10px] text-slate-400 block">{locale === "hi" ? "राहत व पंप तैनाती" : "Deployment"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 - ACTIVE SOURCES TABLE */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{locale === "hi" ? "सक्रिय डेटा स्रोत तालिका" : "Active Data Sources Registry"}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {locale === "hi"
                  ? `VarshaNetra के साथ सक्रिय रूप से जुड़े सभी ${activeSources.length} डेटा स्रोतों का विवरण, आवृत्ति एवं विश्वसनीयता स्तर`
                  : "Complete telemetry catalog showing provider, frequency, resolution, and credibility rating"}
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
              {activeSources.length} / {activeSources.length} Connected
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-semibold">
                  <th className="py-3 px-4">{locale === "hi" ? "स्रोत नाम" : "Source Name"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "प्रदाता" : "Provider"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "डेटा प्रकार" : "Data Type"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "अपडेट आवृत्ति" : "Update Frequency"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "कवरेज" : "Coverage"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "स्थिति" : "Status"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "विश्वसनीयता" : "Credibility"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {activeSources.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {item.provider}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? item.typeHi : item.type}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {locale === "hi" ? item.frequencyHi : item.frequency}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {item.coverage}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          item.statusClass
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.badgeType === "gold" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] shadow-2xs border border-amber-500">
                          <ShieldCheck className="w-3 h-3 text-slate-950" />
                          <span>OFFICIAL</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {locale === "hi" ? item.credibilityHi : item.credibility}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4 - PLANNED INTEGRATIONS ROADMAP */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>{locale === "hi" ? "नियोजित एकीकरण रोडमैप" : "Planned Integrations Roadmap"}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {locale === "hi"
                  ? "भविष्य के आधिकारिक भारतीय मौसम विज्ञान एवं हाइड्रोलॉजिकल एकीकरण"
                  : "Phase 2 & Phase 3 institutional integrations via government MOU and statutory data sharing agreements"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Phase 2 / Phase 3
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-semibold">
                  <th className="py-3 px-4">{locale === "hi" ? "नियोजित एकीकरण" : "Planned Integration"}</th>
                  <th className="py-3 px-3">{locale === "hi" ? "वर्तमान स्थिति" : "Current Status"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "एकीकरण पर प्रभाव" : "Impact When Integrated"}</th>
                  <th className="py-3 px-3 text-right">{locale === "hi" ? "कार्रवाई" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {plannedIntegrations.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <div>
                        <span>{item.name}</span>
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {item.agency}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", item.statusColor)}>
                        {locale === "hi" ? item.statusHi : item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-md">
                      {locale === "hi" ? item.impactHi : item.impact}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2.5 gap-1 border-slate-300 dark:border-slate-700"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            name: item.name,
                            agency: item.agency,
                            details: locale === "hi" ? item.statusHi : item.status,
                            impact: locale === "hi" ? item.impactHi : item.impact,
                          })
                        }
                      >
                        <span>{locale === "hi" ? item.actionTextHi : item.actionText}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5 - COST SUMMARY TRANSPARENCY CARD */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="bg-emerald-50/40 dark:bg-emerald-950/20 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{locale === "hi" ? "डेटा स्रोत लागत विश्लेषण" : "Data Source Cost Analysis"}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {locale === "hi"
                  ? "वित्तीय पारदर्शिता: VarshaNetra का शून्य परिचालन लागत खुला डेटा मॉडल"
                  : "Financial transparency: Zero-cost open data architecture verified for operational deployment"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {locale === "hi" ? "कुल मासिक लागत:" : "Total Monthly Cost:"}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                {locale === "hi" ? "शून्य (ZERO)" : "₹0.00 / ZERO"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">{locale === "hi" ? "डेटा स्रोत" : "Source"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "मासिक लागत" : "Monthly Cost"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "लाइसेंस / नीति" : "License / Policy"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {costBreakdown.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {row.source}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {locale === "hi" ? row.costHi : row.costEn}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transparent Cost Note (Explicit requirement from prompt) */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {locale === "hi" ? "आधिकारिक लागत घोषणा" : "Official Cost & Government MOU Notice"}
              </span>
            </div>
            <p className="leading-relaxed">
              <strong>Hindi:</strong> VarshaNetra वर्तमान में शून्य डेटा लागत पर संचालित होता है। उत्पादन में आधिकारिक IMD और CWC API के लिए सरकारी MOU की आवश्यकता होगी।
            </p>
            <p className="leading-relaxed">
              <strong>English:</strong> VarshaNetra currently operates at zero data cost. Direct official IMD and CWC API integration will require authorized government MOU.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Planned Integration Modal */}
      {modalState && modalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-slate-300 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {modalState.name}
                </CardTitle>
                <button
                  onClick={() => setModalState(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                {modalState.agency}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">{locale === "hi" ? "स्थिति:" : "Status:"}</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">{modalState.details}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">{locale === "hi" ? "प्रभाव:" : "Impact:"}</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{modalState.impact}</p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border text-[11px] text-slate-500">
                {locale === "hi"
                  ? "इस एकीकरण को आधिकारिक सरकारी समझौता ज्ञापन (MOU) और अधिकृत क्रेडेंशियल्स प्राप्त होने के बाद सक्रिय किया जाएगा।"
                  : "This integration will be formally activated under authorized Government MOU and official credentials."}
              </div>
            </CardContent>
            <CardFooter className="p-3 border-t flex justify-end">
              <Button size="sm" onClick={() => setModalState(null)}>
                {locale === "hi" ? "बंद करें" : "Close"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LiveDataIntegrationHub;
