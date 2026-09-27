"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Compass,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Radio,
  CloudRain,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IMDRadarProductCode,
  RadarFailureState,
  RadarPanelId,
  RadarProviderType,
} from "@/types/radar";
import { SpatialRiskGridFeatureCollection } from "@/types";

export interface ScientificRadarPanelProps {
  panelId: RadarPanelId;
  title: string;
  titleHi: string;
  productCode: IMDRadarProductCode;
  productName: string;
  metric: string;
  purpose: string;
  purposeHi: string;
  stationName: string;
  stationCode: string;
  distanceKm: number;
  coverageStatus: "DIRECT" | "PERIPHERAL" | "OUTSIDE";
  locationName: string;
  provider: RadarProviderType;
  showRangeRings: boolean;
  showRiskOverlay: boolean;
  riskGridData?: SpatialRiskGridFeatureCollection | null;
  mode: "latest" | "animated";
  locale: "en" | "hi";
  onRefreshPanel?: () => void;
  // Fallback tile url if provider is RainViewer
  rainViewerTileUrl?: string;
  rainViewerTimestamp?: string;
}

// Scientific Color Scales based on IMD / WMO standard radar symbology
const PRODUCT_LEGENDS: Record<
  IMDRadarProductCode,
  { label: string; labelHi: string; unit: string; stops: { color: string; val: string }[] }
> = {
  caz: {
    label: "MAX Reflectivity",
    labelHi: "अधिकतम परावर्तकता",
    unit: "dBZ",
    stops: [
      { color: "#00e0e0", val: "10-20" },
      { color: "#00a000", val: "20-30" },
      { color: "#00e000", val: "30-40" },
      { color: "#ffff00", val: "40-48" },
      { color: "#ff8000", val: "48-55" },
      { color: "#ff0000", val: "55-62" },
      { color: "#c000c0", val: "> 62" },
    ],
  },
  sri: {
    label: "Surface Rainfall Intensity",
    labelHi: "सतही वर्षा तीव्रता",
    unit: "mm/hr",
    stops: [
      { color: "#0099ff", val: "0.5-2" },
      { color: "#00cc44", val: "2-8" },
      { color: "#e6e600", val: "8-16" },
      { color: "#ff9900", val: "16-32" },
      { color: "#ff3300", val: "32-64" },
      { color: "#cc0099", val: "> 64" },
    ],
  },
  vp2: {
    label: "Radial Velocity (Doppler V)",
    labelHi: "त्रिज्यीय वेग",
    unit: "m/s",
    stops: [
      { color: "#0066cc", val: "-32 (In)" },
      { color: "#00cccc", val: "-16" },
      { color: "#00ff99", val: "-4" },
      { color: "#e2e8f0", val: "0 (Zero)" },
      { color: "#ffff00", val: "+4" },
      { color: "#ff9900", val: "+16" },
      { color: "#ff0000", val: "+32 (Out)" },
    ],
  },
  pac: {
    label: "Precipitation Accumulation",
    labelHi: "वर्षा संचय",
    unit: "mm",
    stops: [
      { color: "#38bdf8", val: "1-10" },
      { color: "#4ade80", val: "10-25" },
      { color: "#facc15", val: "25-50" },
      { color: "#fb923c", val: "50-100" },
      { color: "#f87171", val: "100-200" },
      { color: "#c084fc", val: "> 200" },
    ],
  },
  ppi: {
    label: "Plan Position Indicator (PPI-Z)",
    labelHi: "पीपीआई परावर्तकता",
    unit: "dBZ",
    stops: [
      { color: "#00e0e0", val: "10-20" },
      { color: "#00cc00", val: "20-35" },
      { color: "#ffff00", val: "35-45" },
      { color: "#ff8000", val: "45-55" },
      { color: "#ff0000", val: "> 55" },
    ],
  },
  ppz: {
    label: "PPI Reflectivity (PPZ)",
    labelHi: "पीपीआई जेड परावर्तकता",
    unit: "dBZ",
    stops: [
      { color: "#00e0e0", val: "10-20" },
      { color: "#00cc00", val: "20-35" },
      { color: "#ffff00", val: "35-45" },
      { color: "#ff8000", val: "45-55" },
      { color: "#ff0000", val: "> 55" },
    ],
  },
};

export function ScientificRadarPanel({
  panelId,
  title,
  titleHi,
  productCode,
  productName,
  metric,
  purpose,
  purposeHi,
  stationName,
  stationCode,
  distanceKm,
  coverageStatus,
  locationName,
  provider,
  showRangeRings,
  showRiskOverlay,
  riskGridData,
  mode,
  locale,
  onRefreshPanel,
  rainViewerTileUrl,
  rainViewerTimestamp,
}: ScientificRadarPanelProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [state, setState] = useState<RadarFailureState>("LOADING");
  const [imgTimestamp, setImgTimestamp] = useState<number>(Date.now());
  const [imgErrorDetails, setImgErrorDetails] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Derive genuine IMD image URL via server proxy route
  const imdImageUrl = `/api/radar/imd?station=${stationCode}&product=${productCode}&mode=${mode}&t=${imgTimestamp}`;

  // Handle image load success
  const handleImageLoad = () => {
    setState("READY");
    setImgErrorDetails("");
  };

  // Handle image load error
  const handleImageError = () => {
    if (coverageStatus === "OUTSIDE") {
      setState("OUTSIDE_RADAR_COVERAGE");
    } else {
      setState("RADAR_DATA_UNAVAILABLE");
      setImgErrorDetails(
        locale === "hi"
          ? `${stationName} स्टेशन से ${productName} उत्पाद वर्तमान में उपलब्ध नहीं है`
          : `${productName} is temporarily not broadcast by IMD ${stationName} station.`
      );
    }
  };

  // Refresh image timestamp
  const handleReload = () => {
    setState("LOADING");
    setImgTimestamp(Date.now());
    if (onRefreshPanel) onRefreshPanel();
  };

  // Check coverage bounds on mount or station change
  useEffect(() => {
    if (coverageStatus === "OUTSIDE") {
      setState("OUTSIDE_RADAR_COVERAGE");
    } else {
      setState("LOADING");
      setImgTimestamp(Date.now());
    }
  }, [stationCode, productCode, coverageStatus, mode]);

  // Pan / drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const legend = PRODUCT_LEGENDS[productCode] || PRODUCT_LEGENDS.caz;

  return (
    <div
      className="relative flex flex-col rounded-lg border border-slate-700/80 bg-[#050811] text-slate-100 shadow-md overflow-hidden min-h-[380px] sm:min-h-[420px]"
      data-testid={`radar-panel-${panelId}`}
    >
      {/* ─── TOP METADATA BAR (Strict Requirements) ─── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0B1120] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="p-1 rounded bg-[#0F3D66] text-sky-300">
            {productCode === "vp2" ? (
              <Wind className="w-3.5 h-3.5" />
            ) : productCode === "sri" ? (
              <CloudRain className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-100 tracking-tight">
                {locale === "hi" ? titleHi : title}
              </span>
              <span className="font-mono text-[10px] text-sky-400 font-semibold px-1 rounded bg-sky-950/60 border border-sky-800/60">
                {productCode.toUpperCase()} • {metric}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1">
              {locale === "hi" ? purposeHi : purpose}
            </p>
          </div>
        </div>

        {/* Station Identity & Coverage Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className="text-[9px] font-mono border-slate-700 bg-slate-900/80 text-slate-200"
          >
            IMD {stationName} [{stationCode.toUpperCase()}]
          </Badge>

          {coverageStatus === "DIRECT" ? (
            <Badge
              variant="outline"
              className="text-[9px] font-semibold border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
            >
              {distanceKm} km (Direct)
            </Badge>
          ) : coverageStatus === "PERIPHERAL" ? (
            <Badge
              variant="outline"
              className="text-[9px] font-semibold border-amber-500/60 bg-amber-950/60 text-amber-300"
            >
              {distanceKm} km (Peripheral)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[9px] font-semibold border-red-500/60 bg-red-950/60 text-red-300"
            >
              {distanceKm} km (Outside)
            </Badge>
          )}
        </div>
      </div>

      {/* ─── RADAR DISPLAY VIEWPORT ─── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 w-full bg-[#050811] flex items-center justify-center overflow-hidden select-none ${
          zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        style={{ minHeight: "260px" }}
      >
        {/* Loading Sweep State */}
        {state === "LOADING" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050811]/90 gap-3">
            <div className="relative w-20 h-20 rounded-full border border-sky-500/30 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t-2 border-sky-400 animate-spin" />
              <div className="w-10 h-10 rounded-full border border-sky-500/20" />
              <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-medium text-sky-300 tracking-wider">
              {locale === "hi"
                ? `आईएमडी ${stationName} रडार सिंक्रनाइज़ हो रहा है...`
                : `Receiving Doppler stream: IMD ${stationName}...`}
            </span>
          </div>
        )}

        {/* Failure State: OUTSIDE_RADAR_COVERAGE */}
        {state === "OUTSIDE_RADAR_COVERAGE" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#050811] space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-500/50 flex items-center justify-center">
              <Compass className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                {locale === "hi" ? "रडार कवरेज से बाहर" : "OUTSIDE RADAR COVERAGE"}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {locale === "hi"
                  ? `${locationName} निकटतम आईएमडी डॉपलर स्टेशन (${stationName}) से ${distanceKm} किमी दूर है (अधिकतम सीमा: 250 किमी)।`
                  : `${locationName} is ${distanceKm} km from nearest IMD DWR (${stationName}), exceeding the 250 km Doppler boundary.`}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] border-amber-600/60 text-amber-200">
              Provider Directive #13 &amp; #14: No Fake Synthetic Echoes
            </Badge>
          </div>
        )}

        {/* Failure State: RADAR_DATA_UNAVAILABLE / PROVIDER_ERROR */}
        {state === "RADAR_DATA_UNAVAILABLE" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#050811] space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">
                {locale === "hi" ? "रडार उत्पाद अनुपलब्ध" : "RADAR DATA UNAVAILABLE"}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {imgErrorDetails ||
                  (locale === "hi"
                    ? "स्टेशन अंशांकन या डेटा ट्रांसमिशन देरी।"
                    : "Station undergoing routine volume calibration or upstream IMD portal delay.")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReload}
              className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry Scan"}
            </Button>
          </div>
        )}

        {/* Genuine IMD Doppler Radar Imagery */}
        {provider === "IMD_OFFICIAL" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imdImageUrl}
            alt={`Official IMD DWR ${stationName} - ${productName}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-full h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${
                panOffset.y / zoomLevel
              }px)`,
              filter: "contrast(1.08) brightness(1.02)",
            }}
          />
        ) : (
          /* RainViewer Secondary Fallback Mode (Properly Labeled) */
          <div className="relative w-full h-full flex items-center justify-center">
            {rainViewerTileUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={rainViewerTileUrl}
                alt={`RainViewer Radar Fallback - ${productName}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="text-center text-slate-500 text-xs">
                {locale === "hi" ? "रडार फॉलबैक उपलब्ध नहीं" : "RainViewer Fallback Tile Unavailable"}
              </div>
            )}
            <div className="absolute top-2 left-2 bg-amber-950/80 border border-amber-600/70 text-amber-200 text-[10px] px-2 py-0.5 rounded font-mono">
              SECONDARY FALLBACK: RainViewer Composite
            </div>
          </div>
        )}

        {/* ─── OPTIONAL SCIENTIFIC RANGE RINGS OVERLAY ─── */}
        {showRangeRings && state === "READY" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Concentric 50km, 100km, 150km, 200km, 250km rings */}
            <div className="absolute w-[80%] h-[80%] rounded-full border border-sky-400/25 border-dashed" />
            <div className="absolute w-[64%] h-[64%] rounded-full border border-sky-400/20 border-dashed" />
            <div className="absolute w-[48%] h-[48%] rounded-full border border-sky-400/20 border-dashed" />
            <div className="absolute w-[32%] h-[32%] rounded-full border border-sky-400/20 border-dashed" />
            <div className="absolute w-[16%] h-[16%] rounded-full border border-sky-400/25 border-dashed" />

            {/* Compass Axes */}
            <div className="absolute w-full h-[1px] bg-sky-400/15" />
            <div className="absolute h-full w-[1px] bg-sky-400/15" />

            {/* Range markers */}
            <span className="absolute top-[9%] right-[11%] text-[9px] font-mono text-sky-400/60 font-bold">
              250km
            </span>
            <span className="absolute top-[17%] right-[19%] text-[9px] font-mono text-sky-400/60 font-bold">
              200km
            </span>
            <span className="absolute top-[25%] right-[27%] text-[9px] font-mono text-sky-400/60 font-bold">
              150km
            </span>
          </div>
        )}

        {/* ─── OPTIONAL VARSHANETRA FLOOD RISK OVERLAY LAYER ─── */}
        {showRiskOverlay && riskGridData?.features && state === "READY" && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 border border-amber-500/50 text-[10px] text-amber-300 font-mono shadow-sm">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>{locale === "hi" ? "बाढ़ जोखिम संरेखण सक्रिय" : "Flood Risk Grid Active"}</span>
            </div>

            {/* Centered micro grid projection representing correlated hydraulic vulnerability */}
            <div className="grid grid-cols-4 gap-1 p-3 rounded-lg border border-amber-500/30 bg-black/40 backdrop-blur-[1px]">
              {riskGridData.features.slice(0, 16).map((feat, idx) => {
                const color = feat.properties?.color || "#15803D";
                const level = feat.properties?.riskLevel || "LOW";
                return (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-xs border border-white/20 transition-transform"
                    style={{ backgroundColor: color, opacity: 0.65 }}
                    title={`Cell: ${feat.properties?.cellId} | ${level}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* In-viewport View Controls (Zoom / Reset) */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-xs p-1 rounded border border-slate-700">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 1))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded text-[10px] font-mono"
              title="Reset View"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── BOTTOM SCIENTIFIC COLOR LEGEND (Strict WMO / IMD Specifications) ─── */}
      <div className="px-3 py-1.5 bg-[#080d1a] border-t border-slate-800 text-[10px]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="font-semibold text-slate-300">
              {locale === "hi" ? legend.labelHi : legend.label}
            </span>
            <span>({legend.unit}):</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {legend.stops.map((stop, idx) => (
              <div key={idx} className="flex items-center gap-0.5">
                <span
                  className="w-2.5 h-2 rounded-xs inline-block"
                  style={{ backgroundColor: stop.color }}
                />
                <span className="font-mono text-[9px] text-slate-300">{stop.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── PANEL FOOTER: FRAME DATA FRESHNESS & METADATA ─── */}
      <div className="px-3 py-1 bg-[#050811] border-t border-slate-900 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span>
          Source: {provider === "IMD_OFFICIAL" ? "Mausam IMD DWR" : `RainViewer API ${rainViewerTimestamp ? `(${rainViewerTimestamp})` : ""}`}
        </span>
        <span className="text-slate-400">
          Target: {locationName} • Band: {stationCode === "koc" || stationCode === "tvm" ? "C-Band" : "S-Band"}
        </span>
      </div>
    </div>
  );
}

export default ScientificRadarPanel;
