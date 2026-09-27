"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  Compass,
  Info,
  Layers,
  MapPin,
  Activity,
  Box,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { DistrictLocation, SpatialRiskGridFeatureCollection } from "@/types";
import {
  IMDRadarProductCode,
  IMDStationCode,
  IMDStationInfo,
  RadarProviderType,
} from "@/types/radar";
import {
  IMD_RADAR_STATIONS,
  resolveRadarStationContext,
  calculateHaversineDistanceKm,
} from "@/lib/radar/station-registry";
import { cn } from "@/lib/utils";

export interface NearLiveRadarWorkspaceProps {
  location: DistrictLocation;
  riskGridData?: SpatialRiskGridFeatureCollection | null;
  className?: string;
}

// Radar Products Definition (VNET-DWR-REFLECTIVITY-003)
interface RadarProductTabDef {
  code: IMDRadarProductCode;
  labelEn: string;
  labelHi: string;
  shortLabel: string;
  unit: string;
  descriptionEn: string;
  descriptionHi: string;
  isPrimary?: boolean;
}

const RADAR_PRODUCTS: RadarProductTabDef[] = [
  {
    code: "caz",
    labelEn: "MAX(Z) Composite Reflectivity",
    labelHi: "अधिकतम परावर्तकता (MAX-Z)",
    shortLabel: "MAX(Z)",
    unit: "dBZ",
    descriptionEn: "Peak storm core reflectivity return across vertical volume scan (10 to 65+ dBZ)",
    descriptionHi: "ऊर्ध्वाधर स्तंभ में उच्चतम रडार परावर्तकता (10 से 65+ dBZ)",
    isPrimary: true,
  },
  {
    code: "ppi",
    labelEn: "PPI(Z) Plan Position Reflectivity",
    labelHi: "योजना स्थिति परावर्तकता (PPI-Z)",
    shortLabel: "PPI(Z)",
    unit: "dBZ",
    descriptionEn: "Base elevation slice radar reflectivity return over terrain",
    descriptionHi: "धरातल स्तर पर आधार ऊंचाई रडार परावर्तकता",
  },
  {
    code: "sri",
    labelEn: "Surface Rainfall Intensity",
    labelHi: "सतही वर्षा तीव्रता (SRI)",
    shortLabel: "SRI",
    unit: "mm/hr",
    descriptionEn: "Radar-derived instantaneous rainfall rate reaching surface level",
    descriptionHi: "धरातल पर वास्तविक समय वर्षा दर अनुमान (0.5 से 100+ मिमी/घंटा)",
  },
  {
    code: "vp2",
    labelEn: "PPI(V) Doppler Radial Velocity",
    labelHi: "डॉपलर त्रिज्यीय वेग (PPI-V)",
    shortLabel: "PPI(V)",
    unit: "m/s",
    descriptionEn: "Inbound vs outbound wind vectors for shear & squall detection",
    descriptionHi: "हवा की गति एवं दिशा (अंदर/बाहर -32 से +32 मी/से)",
  },
  {
    code: "pac",
    labelEn: "Precipitation Accumulation",
    labelHi: "संचित रडार वर्षा (PAC)",
    shortLabel: "PAC",
    unit: "mm",
    descriptionEn: "Estimated accumulated rainfall volume over observation window",
    descriptionHi: "अवलोकन अवधि में अनुमानित संचित वर्षा मात्रा",
  },
];

// Standard Meteorological dBZ and Metric Color Scales
const REFLECTIVITY_STOPS = [
  { color: "#00e0e0", label: "10-20", category: "Very Light" },
  { color: "#00a000", label: "20-30", category: "Light Rain" },
  { color: "#00e000", label: "30-40", category: "Moderate Rain" },
  { color: "#ffff00", label: "40-48", category: "Heavy Rain" },
  { color: "#ff8000", label: "48-55", category: "Very Heavy" },
  { color: "#ff0000", label: "55-62", category: "Severe Storm" },
  { color: "#c000c0", label: "> 62", category: "Extreme / Hail" },
];

const SRI_STOPS = [
  { color: "#0099ff", label: "0.5-2", category: "Drizzle" },
  { color: "#00cc44", label: "2-8", category: "Light" },
  { color: "#e6e600", label: "8-16", category: "Moderate" },
  { color: "#ff9900", label: "16-32", category: "Heavy" },
  { color: "#ff3300", label: "32-64", category: "Very Heavy" },
  { color: "#cc0099", label: "> 64", category: "Violent" },
];

const VELOCITY_STOPS = [
  { color: "#0066cc", label: "-32", category: "Inbound (Fast)" },
  { color: "#00cccc", label: "-16", category: "Inbound" },
  { color: "#00ff99", label: "-4", category: "Inbound (Light)" },
  { color: "#e2e8f0", label: "0", category: "Zero Radial" },
  { color: "#ffff00", label: "+4", category: "Outbound (Light)" },
  { color: "#ff9900", label: "+16", category: "Outbound" },
  { color: "#ff0000", label: "+32", category: "Outbound (Fast)" },
];

// Helper to compute initial azimuth bearing from Station to City (degrees 0-360)
function calculateInitialBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

function getCompassDirection(bearing: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * NearLiveRadarWorkspace
 * Single large scientific Doppler Weather Radar Reflectivity Workstation (VNET-DWR-REFLECTIVITY-003)
 */
export function NearLiveRadarWorkspace({
  location,
  riskGridData = null,
  className = "",
}: NearLiveRadarWorkspaceProps) {
  const locale = useLocale();

  // Resolved default radar station for this district
  const defaultCoverageContext = useMemo(
    () =>
      resolveRadarStationContext(
        location.district || location.shortName,
        location.latitude,
        location.longitude,
        location.displayName
      ),
    [location]
  );

  // Active Station Selection (allows switching stations manually)
  const [selectedStationCode, setSelectedStationCode] = useState<IMDStationCode>(
    defaultCoverageContext.station.code
  );

  // Sync station when location changes
  useEffect(() => {
    setSelectedStationCode(defaultCoverageContext.station.code);
  }, [defaultCoverageContext.station.code]);

  const activeStation: IMDStationInfo = useMemo(() => {
    return IMD_RADAR_STATIONS[selectedStationCode] || defaultCoverageContext.station;
  }, [selectedStationCode, defaultCoverageContext.station]);

  // Distance and Bearing from Station to City
  const { distanceKm, bearing, bearingCompass } = useMemo(() => {
    const d = calculateHaversineDistanceKm(
      activeStation.latitude,
      activeStation.longitude,
      location.latitude,
      location.longitude
    );
    const b = calculateInitialBearing(
      activeStation.latitude,
      activeStation.longitude,
      location.latitude,
      location.longitude
    );
    return {
      distanceKm: d,
      bearing: b,
      bearingCompass: getCompassDirection(b),
    };
  }, [activeStation, location]);

  // Active Radar Product Tab (Default MAX(Z))
  const [selectedProduct, setSelectedProduct] = useState<IMDRadarProductCode>("caz");

  // Playback / Timeline state
  const [mode, setMode] = useState<"latest" | "animated">("latest");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Workstation Overlays & Visual Controls
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showAzimuthRadials, setShowAzimuthRadials] = useState<boolean>(true);
  const [showCityMarker, setShowCityMarker] = useState<boolean>(true);
  const [highlightStormCores, setHighlightStormCores] = useState<boolean>(false);
  const [is25DView, setIs25DView] = useState<boolean>(false);
  const [showHowToRead, setShowHowToRead] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Provider state (IMD Official is Primary, RainViewer is Fallback)
  const [provider, setProvider] = useState<RadarProviderType>("IMD_OFFICIAL");
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [scanSizeBytes, setScanSizeBytes] = useState<number | null>(null);
  const [hasProviderError, setHasProviderError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Fetch Metadata for the current product
  const fetchMetadata = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(
        `/api/radar/imd?station=${activeStation.code}&product=${selectedProduct}&mode=${mode}&meta=true&t=${Date.now()}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLastScanTime(json.lastModified || new Date().toISOString());
          setScanSizeBytes(json.sizeBytes || null);
          setHasProviderError(false);
          setProvider("IMD_OFFICIAL");
        } else {
          setHasProviderError(true);
        }
      } else {
        setHasProviderError(true);
      }
    } catch {
      setHasProviderError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeStation.code, selectedProduct, mode]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata, refreshKey]);

  // Construct Radar Image URL
  const radarImageUrl = useMemo(() => {
    if (provider === "RAINVIEWER_FALLBACK") {
      return "https://tilecache.rainviewer.com/v2/radar/nowcast_latest/256/4/11/7/2/1_1.png";
    }
    return `/api/radar/imd?station=${activeStation.code}&product=${selectedProduct}&mode=${mode}&t=${refreshKey}`;
  }, [activeStation.code, selectedProduct, mode, refreshKey, provider]);

  // Trigger manual refresh
  const handleRefresh = () => {
    setRefreshKey(Date.now());
    setImageLoaded(false);
    setImageError(false);
  };

  // Toggle animation playback
  const togglePlay = () => {
    if (mode === "latest") {
      setMode("animated");
      setIsPlaying(true);
    } else {
      setMode("latest");
      setIsPlaying(false);
    }
    handleRefresh();
  };

  // Active product definition
  const currentProductDef = useMemo(
    () => RADAR_PRODUCTS.find((p) => p.code === selectedProduct) || RADAR_PRODUCTS[0],
    [selectedProduct]
  );

  // Formatted scan timestamp
  const formattedTimestamp = useMemo(() => {
    if (!lastScanTime) return "Latest Scan Available";
    try {
      const d = new Date(lastScanTime);
      return (
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    } catch {
      return lastScanTime;
    }
  }, [lastScanTime]);

  // City Center Relative Placement on the 250 km Radar Disk
  // In a 100% circle with radius 50% (where 50% = 250 km)
  const cityPixelOffset = useMemo(() => {
    const clampedDistanceKm = Math.min(distanceKm, 250);
    const radiusPercent = (clampedDistanceKm / 250) * 44; // 44% max from center (leaving margin for rings)
    const bearingRad = (bearing * Math.PI) / 180;
    const x = 50 + radiusPercent * Math.sin(bearingRad);
    const y = 50 - radiusPercent * Math.cos(bearingRad);
    const isOutside250 = distanceKm > 250;
    return { x, y, isOutside250 };
  }, [distanceKm, bearing]);

  return (
    <Card
      className={cn(
        "bg-[#050811] text-slate-100 border border-slate-800 shadow-2xl transition-all overflow-hidden flex flex-col",
        isExpanded ? "fixed inset-2 z-50 rounded-2xl max-h-[96vh]" : "rounded-2xl",
        className
      )}
    >
      {/* ─── 1. TOP HEADER & TELEMETRY CONTROL STRIP ─── */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#080D1A]/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Product Identification */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>{locale === "hi" ? "डॉपलर मौसम रडार" : "Doppler Weather Radar"}</span>
                  </h2>
                  <Badge
                    variant="outline"
                    className="bg-cyan-950/60 text-cyan-300 border-cyan-700/60 font-mono text-[11px] px-2 py-0.5"
                  >
                    MAX(Z) dBZ
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider">
                  {locale === "hi"
                    ? "लाइव परावर्तकता बुद्धिमत्ता • भारत मौसम विज्ञान विभाग"
                    : "Live Reflectivity Intelligence • India Meteorological Department"}
                  {riskGridData?.features && riskGridData.features.length > 0 && (
                    <span className="text-[10px] text-cyan-400/80 font-mono ml-2 hidden sm:inline">
                      ({riskGridData.features.length} GIS Risk Zones Integrated)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Context Strip & Actions */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Source & Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-bold text-slate-200">
                {hasProviderError
                  ? "Feed Standby"
                  : provider === "IMD_OFFICIAL"
                  ? "IMD DWR (Official)"
                  : "RainViewer Fallback"}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">{formattedTimestamp}</span>
            </div>

            {/* Station Quick Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
              <span className="text-[11px] text-slate-400 font-semibold">{locale === "hi" ? "स्टेशन:" : "Station:"}</span>
              <select
                value={selectedStationCode}
                onChange={(e) => {
                  setSelectedStationCode(e.target.value as IMDStationCode);
                  handleRefresh();
                }}
                className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-hidden cursor-pointer"
                aria-label="Select Radar Station"
              >
                {Object.values(IMD_RADAR_STATIONS).map((st) => (
                  <option key={st.code} value={st.code} className="bg-slate-900 text-white">
                    {st.name} ({st.band} • 250 km)
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 rounded-lg border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Refresh radar scan"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-cyan-400")} />
            </Button>

            {/* Expand / Minimize */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 rounded-lg border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer hidden sm:flex"
              title={isExpanded ? "Collapse View" : "Expand Workstation"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* ─── 2. SECONDARY PRODUCT NAVIGATION TABS ─── */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/60 overflow-x-auto pb-1 scrollbar-none">
          {RADAR_PRODUCTS.map((prod) => {
            const isSelected = selectedProduct === prod.code;
            return (
              <button
                key={prod.code}
                onClick={() => {
                  setSelectedProduct(prod.code);
                  handleRefresh();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                )}
              >
                <span>{locale === "hi" ? prod.labelHi : prod.labelEn}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  {prod.unit}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
        {/* ─── 3. WORKSTATION SUB-BANNER & TOGGLE CONTROLS ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          {/* Left: Station Geographic Context */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Compass className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-bold text-white">
                {activeStation.name} DWR ({activeStation.band})
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">Radius: 250 km</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            {/* City Reference Marker Info */}
            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/50 font-medium">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {locale === "hi" ? "चयनित शहर:" : "Target City:"}{" "}
                <strong>{location.shortName || location.displayName}</strong>
              </span>
              <span className="font-mono text-amber-200">
                ({distanceKm} km {bearingCompass} / {bearing}°)
              </span>
            </div>
          </div>

          {/* Right: Workstation Visual Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setShowRangeRings(!showRangeRings)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1",
                showRangeRings
                  ? "bg-blue-950/80 text-blue-300 border-blue-700/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700"
              )}
              title="Toggle 50km, 100km, 150km, 200km, 250km Range Rings"
            >
              <Box className="w-3 h-3" />
              <span>{locale === "hi" ? "रेंज रिंग्स" : "Range Rings"}</span>
            </button>

            <button
              onClick={() => setShowAzimuthRadials(!showAzimuthRadials)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1",
                showAzimuthRadials
                  ? "bg-blue-950/80 text-blue-300 border-blue-700/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700"
              )}
              title="Toggle Compass Bearings"
            >
              <Compass className="w-3 h-3" />
              <span>{locale === "hi" ? "अज़ीमुथ" : "Azimuth"}</span>
            </button>

            <button
              onClick={() => setShowCityMarker(!showCityMarker)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1",
                showCityMarker
                  ? "bg-amber-950/80 text-amber-300 border-amber-700/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700"
              )}
              title="Toggle District Center Reference Marker"
            >
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>{locale === "hi" ? "जिला केंद्र" : "District Marker"}</span>
            </button>

            <button
              onClick={() => setHighlightStormCores(!highlightStormCores)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1",
                highlightStormCores
                  ? "bg-red-950/80 text-red-300 border-red-700/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700"
              )}
              title="Highlight precipitation cores > 40 dBZ"
            >
              <Activity className="w-3 h-3 text-red-400" />
              <span>{locale === "hi" ? "तूफान केंद्र (>40 dBZ)" : "Storm Cores (>40 dBZ)"}</span>
            </button>

            <button
              onClick={() => setIs25DView(!is25DView)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1",
                is25DView
                  ? "bg-purple-950/80 text-purple-300 border-purple-700/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700"
              )}
              title="2.5D Reflectivity Perspective (Intensity-based, not altitude)"
            >
              <Layers className="w-3 h-3 text-purple-400" />
              <span>2.5D Tilt</span>
            </button>

            <button
              onClick={() => setShowHowToRead(!showHowToRead)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700 hover:bg-slate-700/60 transition cursor-pointer flex items-center gap-1"
              title="How to read this radar"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{locale === "hi" ? "गाइड" : "Guide"}</span>
            </button>
          </div>
        </div>

        {/* ─── 4. HOW TO READ THIS RADAR (Collapsible Scientific Guidance) ─── */}
        {showHowToRead && (
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-blue-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                {locale === "hi" ? "इस डॉपलर रडार को कैसे पढ़ें (मार्गदर्शिका)" : "How to read this Doppler Radar"}
              </span>
              <button
                onClick={() => setShowHowToRead(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                <strong>{locale === "hi" ? "परावर्तकता (dBZ):" : "Reflectivity (dBZ):"}</strong>{" "}
                {locale === "hi"
                  ? "चमकीले एवं उच्च-dBZ रंग (पीला, नारंगी, लाल) सघन वर्षा एवं तूफान केंद्र दर्शाते हैं। > 40 dBZ भारी वर्षा है।"
                  : "Brighter and high-dBZ echoes generally indicate stronger radar returns (> 40 dBZ = heavy rain; > 50 dBZ = severe storm core)."}
              </li>
              <li>
                <strong>{locale === "hi" ? "समय एनीमेशन:" : "Temporal Movement:"}</strong>{" "}
                {locale === "hi"
                  ? "एनीमेशन बादलों एवं वर्षा क्षेत्रों की वास्तविक गति एवं फैलाव को दर्शाता है।"
                  : "The animation shows how real precipitation echoes move, cluster, and dissipate over time."}
              </li>
              <li>
                <strong>{locale === "hi" ? "परिचालन संदर्भ:" : "Operational Context:"}</strong>{" "}
                {locale === "hi"
                  ? "रडार डेटा वायुमंडलीय अवलोकन साक्ष्य है, स्वयं सीधे बाढ़ की भविष्यवाणी नहीं है।"
                  : "Radar data is observational context, used alongside terrain and runoff models for inundation intelligence."}
              </li>
            </ul>
          </div>
        )}

        {/* ─── 5. LARGE SCIENTIFIC RADAR WORKSTATION CANVAS ─── */}
        <div
          className={cn(
            "relative w-full rounded-2xl border border-slate-800 bg-[#02050E] overflow-hidden flex items-center justify-center min-h-[460px] sm:min-h-[580px] lg:min-h-[640px] select-none transition-all",
            is25DView && "perspective-1000"
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(15, 61, 102, 0.12) 0%, rgba(2, 5, 14, 0.98) 75%)",
          }}
        >
          {/* 2.5D Transformation Wrapper */}
          <div
            className={cn(
              "relative w-full h-full max-w-[640px] max-h-[640px] aspect-square flex items-center justify-center p-4 transition-transform duration-500",
              is25DView && "transform rotate-x-35 scale-90 shadow-2xl"
            )}
          >
            {/* 2.5D Mode Indicator Banner */}
            {is25DView && (
              <div className="absolute top-2 left-4 z-40 bg-purple-950/90 border border-purple-600/70 text-purple-200 text-[10px] font-mono px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>2.5D Reflectivity Visualization (Intensity-based, not altitude)</span>
              </div>
            )}

            {/* Radar Circular Disk Container */}
            <div className="relative w-full h-full rounded-full border border-cyan-900/60 overflow-hidden bg-black flex items-center justify-center shadow-[0_0_50px_rgba(0,180,255,0.06)]">
              {/* Genuine IMD Radar Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={radarImageUrl}
                alt={`${activeStation.name} DWR - ${currentProductDef.labelEn}`}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  highlightStormCores && "contrast-150 saturate-150",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />

              {/* Loading State Skeleton */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-cyan-400 space-y-3 z-20">
                  <div className="w-16 h-16 rounded-full border-2 border-cyan-900 border-t-cyan-400 animate-spin" />
                  <span className="text-xs font-mono tracking-wider font-semibold">
                    {locale === "hi" ? "आईएमडी डॉपलर स्कैन प्राप्त हो रहा है..." : "Acquiring IMD DWR Telemetry..."}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeStation.name} • {currentProductDef.shortLabel}
                  </span>
                </div>
              )}

              {/* Fallback / Error State */}
              {imageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-3 z-20">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <p className="text-xs font-bold text-slate-200">
                    {locale === "hi"
                      ? `${activeStation.name} से आधिकारिक आईएमडी रडार फ़ीड अस्थायी रूप से अनुपलब्ध है`
                      : `Official IMD radar feed temporarily unavailable from ${activeStation.name}`}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    {locale === "hi"
                      ? "सरकारी मौसम सर्वर पर रखरखाव या कनेक्शन विलंबता हो सकती है।"
                      : "The official government radar server may be undergoing scheduled maintenance or experiencing network timeout."}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefresh}
                      className="text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      {locale === "hi" ? "पुनः प्रयास करें" : "Retry IMD"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setProvider(provider === "IMD_OFFICIAL" ? "RAINVIEWER_FALLBACK" : "IMD_OFFICIAL")}
                      className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white"
                    >
                      {provider === "IMD_OFFICIAL" ? "Switch to RainViewer Fallback" : "Return to Official IMD"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── OVERLAY: CONCENTRIC RANGE RINGS ─── */}
              {showRangeRings && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  {/* 50 km Ring */}
                  <div className="absolute w-[20%] h-[20%] rounded-full border border-cyan-500/25 flex items-start justify-center pt-0.5">
                    <span className="text-[8px] font-mono text-cyan-400/70 bg-black/60 px-0.5 rounded">50km</span>
                  </div>
                  {/* 100 km Ring */}
                  <div className="absolute w-[40%] h-[40%] rounded-full border border-cyan-500/25 flex items-start justify-center pt-0.5">
                    <span className="text-[8px] font-mono text-cyan-400/70 bg-black/60 px-0.5 rounded">100km</span>
                  </div>
                  {/* 150 km Ring */}
                  <div className="absolute w-[60%] h-[60%] rounded-full border border-cyan-500/30 flex items-start justify-center pt-0.5">
                    <span className="text-[8px] font-mono text-cyan-400/80 bg-black/60 px-0.5 rounded">150km</span>
                  </div>
                  {/* 200 km Ring */}
                  <div className="absolute w-[80%] h-[80%] rounded-full border border-cyan-500/35 flex items-start justify-center pt-0.5">
                    <span className="text-[8px] font-mono text-cyan-400/90 bg-black/60 px-0.5 rounded">200km</span>
                  </div>
                  {/* 250 km Observation Horizon Ring */}
                  <div className="absolute w-[98%] h-[98%] rounded-full border-2 border-cyan-400/50 flex items-start justify-center pt-1">
                    <span className="text-[9px] font-mono font-bold text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-500/40">
                      250 km Observation Horizon
                    </span>
                  </div>
                </div>
              )}

              {/* ─── OVERLAY: AZIMUTH BEARING RADIALS ─── */}
              {showAzimuthRadials && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Cross Axes (N-S & E-W) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/20 -translate-x-1/2" />
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-500/20 -translate-y-1/2" />
                  {/* 45 Deg Diagonal Axes */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/15 -translate-x-1/2 rotate-45" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/15 -translate-x-1/2 -rotate-45" />

                  {/* Cardinal Points */}
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black text-cyan-300 bg-black/70 px-1 rounded">
                    000° N
                  </span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black text-cyan-300 bg-black/70 px-1 rounded">
                    180° S
                  </span>
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-cyan-300 bg-black/70 px-1 rounded">
                    270° W
                  </span>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-cyan-300 bg-black/70 px-1 rounded">
                    090° E
                  </span>
                </div>
              )}

              {/* ─── OVERLAY: RADAR STATION CENTER CROSSHAIR ─── */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
                <div className="w-5 h-5 rounded-full border border-cyan-400 bg-cyan-500/30 flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                </div>
                <div className="mt-1 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-800 text-[9px] font-mono text-cyan-200 whitespace-nowrap shadow-md">
                  [+] {activeStation.name} DWR
                </div>
              </div>

              {/* ─── OVERLAY: SELECTED CITY REFERENCE MARKER ─── */}
              {showCityMarker && (
                <div
                  className="absolute z-25 pointer-events-auto transition-all"
                  style={{
                    left: `${cityPixelOffset.x}%`,
                    top: `${cityPixelOffset.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="relative group flex flex-col items-center">
                    {/* Pulsing Beacon Marker */}
                    <div className="w-6 h-6 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce duration-1000">
                      <div className="w-2 h-2 rounded-full bg-amber-300" />
                    </div>

                    {/* City Marker Label Badge */}
                    <div className="mt-1 bg-amber-950/90 text-amber-200 border border-amber-500/80 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shadow-xl whitespace-nowrap flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{location.shortName || location.displayName}</span>
                      <span className="text-amber-400/80">({distanceKm}km)</span>
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-30 bg-black/95 text-slate-200 border border-amber-500/50 p-2 rounded-lg text-[10px] shadow-2xl w-48 pointer-events-none">
                      <p className="font-bold text-amber-300">City Reference Marker</p>
                      <p className="text-slate-300 mt-0.5">
                        {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        Distance from {activeStation.name} DWR: <strong>{distanceKm} km</strong> ({bearingCompass})
                      </p>
                      <p className="text-[9px] text-amber-400/90 mt-1 italic">
                        Note: Radar beam originates from {activeStation.name} DWR.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── 6. FLOATING SCIENTIFIC COLOR LEGEND (Right Dock) ─── */}
          <div className="absolute right-3 top-3 bottom-3 z-30 hidden md:flex flex-col justify-between bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono shadow-2xl w-28">
            <div className="text-center pb-1 border-b border-slate-800 space-y-0.5">
              <span className="font-bold text-slate-200 block">{currentProductDef.shortLabel}</span>
              <span className="text-[9px] text-cyan-400 font-bold block">{currentProductDef.unit}</span>
            </div>

            <div className="flex flex-col justify-between h-full py-1 space-y-1">
              {(selectedProduct === "sri"
                ? SRI_STOPS
                : selectedProduct === "vp2"
                ? VELOCITY_STOPS
                : REFLECTIVITY_STOPS
              ).map((stop, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3 rounded-xs shrink-0 border border-black/40"
                    style={{ backgroundColor: stop.color }}
                  />
                  <span className="text-[9px] font-bold text-slate-300">{stop.label}</span>
                </div>
              ))}
            </div>

            <div className="text-[8px] text-center text-slate-500 pt-1 border-t border-slate-800">
              IMD Scale
            </div>
          </div>
        </div>

        {/* ─── 7. TIMELINE & PLAYBACK CONTROL BAR ─── */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Controls: Play/Pause, Step, Speed */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={togglePlay}
              className={cn(
                "h-8 px-3 font-bold text-xs gap-1.5 cursor-pointer transition-all",
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs"
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "विराम (Static)" : "Pause (Static)"}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "चलाएं (Loop)" : "Animate (Loop)"}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("latest");
                setIsPlaying(false);
                handleRefresh();
              }}
              className="h-8 px-2.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs cursor-pointer"
              title="Jump to latest scan"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-cyan-400" />
              <span>{locale === "hi" ? "नवीनतम" : "Latest"}</span>
            </Button>

            {/* Playback Mode Indicator */}
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800/80 text-cyan-300 border border-slate-700">
              {mode === "animated" ? "LOOP: 6-Frame Animation" : "FRAME: Latest Volumetric Sweep"}
            </span>
          </div>

          {/* Timestamp & Verification Provenance */}
          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {locale === "hi" ? "स्कैन समय:" : "Scan Time:"}{" "}
              <strong className="text-white">{formattedTimestamp}</strong>
            </span>
            {scanSizeBytes && (
              <span className="hidden md:inline text-slate-500">
                ({(scanSizeBytes / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* ─── 8. PRODUCT SCIENTIFIC DESCRIPTION FOOTER ─── */}
        <div className="p-3 rounded-xl bg-[#080D1A] border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="font-bold text-white mr-1.5">{currentProductDef.labelEn}:</span>
              <span className="text-slate-300">
                {locale === "hi" ? currentProductDef.descriptionHi : currentProductDef.descriptionEn}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            Directive #18 • Observational Radar Telemetry
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default NearLiveRadarWorkspace;
