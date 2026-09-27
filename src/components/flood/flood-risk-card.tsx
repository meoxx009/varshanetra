"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Waves,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataBadge } from "@/components/common/data-badge";
import {
  FloodRiskCalculationResult,
  FloodRiskLevel,
} from "@/types";

interface FloodRiskCardProps {
  riskData?: FloodRiskCalculationResult | null;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export function getRiskLevelMeta(level: FloodRiskLevel): {
  label: string;
  badgeClass: string;
  colorHex: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
} {
  switch (level) {
    case "SEVERE":
      return {
        label: "SEVERE RISK",
        badgeClass: "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-800",
        colorHex: "#DC2626",
        icon: ShieldAlert,
        description: "Overland flood surge imminent; storm drain capacity exceeded. Emergency teams on red alert.",
      };
    case "HIGH":
      return {
        label: "HIGH RISK",
        badgeClass: "bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:border-orange-700",
        colorHex: "#EA580C",
        icon: AlertTriangle,
        description: "Catchment runoff surge expected. Low-lying nodes and subways vulnerable to waterlogging.",
      };
    case "MODERATE":
      return {
        label: "MODERATE WATCH",
        badgeClass: "bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-700",
        colorHex: "#D97706",
        icon: Waves,
        description: "Soil dampening in progress; standard storm runoff active. Pre-position dewatering pumps.",
      };
    case "LOW":
    default:
      return {
        label: "LOW RISK",
        badgeClass: "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-800",
        colorHex: "#15803D",
        icon: ShieldCheck,
        description: "Ground absorption capacity intact; precipitation within normal canal drainage baseline.",
      };
  }
}

/**
 * ConfidenceAndExplainableRiskSection
 * Enhanced explainable risk & confidence display component (W-003)
 */
export function ConfidenceAndExplainableRiskSection({
  riskData,
  compact = false,
}: {
  riskData: FloodRiskCalculationResult;
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    confidenceScore,
    confidenceMeta,
    factorItems,
    availableCount,
    totalCount,
  } = useMemo(() => {
    let score = 0;
    const factors = riskData?.contributingFactors || [];

    // Check 1: Current rainfall value from existing weather data is a valid number and not null -> +30%
    const rainFactor = factors.find(
      (f) => f.key === "FORECAST_RAIN_24H" || f.label.toLowerCase().includes("forecast")
    );
    const hasRain = Boolean(
      rainFactor &&
      rainFactor.available &&
      typeof rainFactor.rawValue === "number" &&
      !isNaN(rainFactor.rawValue)
    );
    if (hasRain) score += 30;

    // Check 2: Elevation or terrain data exists in existing state -> +25%
    const terrainFactor = factors.find(
      (f) =>
        f.key === "TERRAIN_SLOPE" ||
        f.label.toLowerCase().includes("terrain") ||
        f.label.toLowerCase().includes("slope") ||
        f.label.toLowerCase().includes("elevation")
    );
    const hasTerrain = Boolean(terrainFactor && terrainFactor.available);
    if (hasTerrain) score += 25;

    // Check 3: River proximity data exists -> +25%
    const riverFactor = factors.find(
      (f) =>
        f.key === "RIVER_PROXIMITY" ||
        f.label.toLowerCase().includes("river") ||
        f.label.toLowerCase().includes("waterway")
    );
    const hasRiver = Boolean(riverFactor && riverFactor.available);
    if (hasRiver) score += 25;

    // Check 4: Previous 24h or historical rainfall exists -> +20%
    const antecedent24Factor = factors.find(
      (f) =>
        f.key === "ANTECEDENT_24H" ||
        (f.label.toLowerCase().includes("antecedent") && f.label.includes("24")) ||
        (f.label.toLowerCase().includes("prior") && f.label.includes("24"))
    );
    const antecedent48Factor = factors.find(
      (f) =>
        f.key === "ANTECEDENT_48H" ||
        (f.label.toLowerCase().includes("antecedent") && f.label.includes("48")) ||
        (f.label.toLowerCase().includes("prior") && f.label.includes("48"))
    );
    const hasAntecedent = Boolean(
      (antecedent24Factor && antecedent24Factor.available) ||
      (antecedent48Factor && antecedent48Factor.available)
    );
    if (hasAntecedent) score += 20;

    // Confidence Level & Coloring
    // 75 to 100 percent is green and shows उच्च विश्वसनीयता and HIGH CONFIDENCE.
    // 50 to 74 percent is yellow and shows मध्यम विश्वसनीयता and MODERATE CONFIDENCE.
    // Below 50 percent is red and shows कम विश्वसनीयता and LOW CONFIDENCE with extra warning.
    let meta = {
      labelHi: "उच्च विश्वसनीयता",
      labelEn: "HIGH CONFIDENCE",
      colorClass: "text-emerald-700 dark:text-emerald-400",
      barColor: "bg-emerald-600 dark:bg-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      warning: null as string | null,
    };

    if (score >= 75) {
      meta = {
        labelHi: "उच्च विश्वसनीयता",
        labelEn: "HIGH CONFIDENCE",
        colorClass: "text-emerald-700 dark:text-emerald-400",
        barColor: "bg-emerald-600 dark:bg-emerald-500",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        warning: null,
      };
    } else if (score >= 50) {
      meta = {
        labelHi: "मध्यम विश्वसनीयता",
        labelEn: "MODERATE CONFIDENCE",
        colorClass: "text-amber-700 dark:text-amber-400",
        barColor: "bg-amber-500 dark:bg-amber-400",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        warning: null,
      };
    } else {
      meta = {
        labelHi: "कम विश्वसनीयता",
        labelEn: "LOW CONFIDENCE",
        colorClass: "text-red-700 dark:text-red-400",
        barColor: "bg-red-600 dark:bg-red-500",
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800",
        warning: "चेतावनी: अपूर्ण टेलीमेट्री डेटा के कारण कम विश्वसनीयता। कृपया निर्णय से पूर्व आधिकारिक स्रोतों से पुनः पुष्टि करें। (Extra Warning: Low confidence due to incomplete telemetry factors. Verify before mission-critical actions.)",
      };
    }

    // Contributing factor item models
    // 1. Rainfall 24h
    const rainRaw = rainFactor && typeof rainFactor.rawValue === "number" ? rainFactor.rawValue : null;
    const isRainAvailable = hasRain && rainRaw !== null;
    const rainStatus = isRainAvailable
      ? rainRaw > 64.5
        ? { icon: "⬆️", text: "Increasing Risk", class: "text-red-600 font-bold" }
        : rainRaw > 15.5
        ? { icon: "➖", text: "Moderate", class: "text-amber-600 font-medium" }
        : { icon: "✅", text: "Safe", class: "text-emerald-600 font-medium" }
      : null;

    // 2. Previous Rainfall
    const anteRaw =
      antecedent24Factor && typeof antecedent24Factor.rawValue === "number"
        ? antecedent24Factor.rawValue
        : null;
    const isAnteAvailable = Boolean(antecedent24Factor && antecedent24Factor.available && anteRaw !== null);
    const anteStatus = isAnteAvailable
      ? anteRaw! > 35
        ? { icon: "⬆️", text: "Increasing Risk", class: "text-red-600 font-bold" }
        : anteRaw! > 15
        ? { icon: "➖", text: "Moderate", class: "text-amber-600 font-medium" }
        : { icon: "✅", text: "Safe", class: "text-emerald-600 font-medium" }
      : null;

    // 3. River Proximity
    const riverRaw =
      riverFactor && typeof riverFactor.rawValue === "number"
        ? riverFactor.rawValue
        : null;
    const isRiverAvailable = Boolean(riverFactor && riverFactor.available && riverRaw !== null);
    const riverStatus = isRiverAvailable
      ? riverRaw! < 300
        ? { icon: "⬆️", text: "Increasing Risk", class: "text-red-600 font-bold" }
        : riverRaw! < 1000
        ? { icon: "➖", text: "Moderate", class: "text-amber-600 font-medium" }
        : { icon: "✅", text: "Safe", class: "text-emerald-600 font-medium" }
      : null;

    // 4. Terrain Elevation
    const terrainRaw =
      terrainFactor && typeof terrainFactor.rawValue === "number"
        ? terrainFactor.rawValue
        : null;
    const isTerrainAvailable = Boolean(terrainFactor && terrainFactor.available && terrainRaw !== null);
    const terrainStatus = isTerrainAvailable
      ? terrainRaw! < 2
        ? { icon: "⬆️", text: "Increasing Risk (Pooling)", class: "text-red-600 font-bold" }
        : terrainRaw! < 5
        ? { icon: "➖", text: "Moderate", class: "text-amber-600 font-medium" }
        : { icon: "✅", text: "Safe (Good Runoff)", class: "text-emerald-600 font-medium" }
      : null;

    // 5. Catchment Moisture 48h
    const ante48Raw =
      antecedent48Factor && typeof antecedent48Factor.rawValue === "number"
        ? antecedent48Factor.rawValue
        : null;
    const isAnte48Available = Boolean(antecedent48Factor && antecedent48Factor.available && ante48Raw !== null);
    const ante48Status = isAnte48Available
      ? ante48Raw! > 60
        ? { icon: "⬆️", text: "Increasing Risk", class: "text-red-600 font-bold" }
        : ante48Raw! > 25
        ? { icon: "➖", text: "Moderate", class: "text-amber-600 font-medium" }
        : { icon: "✅", text: "Safe", class: "text-emerald-600 font-medium" }
      : null;

    const items = [
      {
        id: "rain24h",
        emoji: "🌧️",
        nameHi: rainFactor?.badgeText === "OFFICIAL" ? "IMD जिला वर्षा (आधिकारिक)" : "24 घंटे का वर्षा पूर्वानुमान",
        nameEn: rainFactor?.badgeText === "OFFICIAL" ? "IMD District Rain (Official)" : "Rainfall 24h",
        available: isRainAvailable,
        valueText: isRainAvailable ? `${rainRaw!.toFixed(1)} mm` : null,
        status: rainStatus,
        badgeType: rainFactor?.badgeText === "OFFICIAL" ? ("GOVT_DATA" as const) : ("FORECAST" as const),
        badgeNote: rainFactor?.badgeText === "OFFICIAL" ? "data.gov.in" : undefined,
        note: rainFactor?.badgeText === "OFFICIAL" ? "Official IMD observation from data.gov.in" : "IMD Threshold: >64.5mm triggers warning",
      },
      {
        id: "ante24h",
        emoji: "💧",
        nameHi: "पूर्ववर्ती वर्षा",
        nameEn: "Previous Rainfall",
        available: isAnteAvailable,
        valueText: isAnteAvailable ? `${anteRaw!.toFixed(1)} mm` : null,
        status: anteStatus,
        badgeType: "HISTORICAL" as const,
        badgeNote: undefined,
        note: "Antecedent 24h soil moisture baseline",
      },
      {
        id: "river",
        emoji: "🌊",
        nameHi: "नदी निकटता",
        nameEn: "River Proximity",
        available: isRiverAvailable,
        valueText: isRiverAvailable ? `${riverRaw} m` : null,
        status: riverStatus,
        badgeType: "MODEL_DERIVED" as const,
        badgeNote: "OSM Data",
        note: "Distance to nearest mapped waterway",
      },
      {
        id: "terrain",
        emoji: "⛰️",
        nameHi: "भूभाग ऊंचाई एवं ढलान",
        nameEn: "Terrain Elevation",
        available: isTerrainAvailable,
        valueText: isTerrainAvailable ? `${terrainRaw}% gradient` : null,
        status: terrainStatus,
        badgeType: "MODEL_DERIVED" as const,
        badgeNote: "SRTM Data",
        note: "Basin depression slope gradient",
      },
      {
        id: "ante48h",
        emoji: "⏳",
        nameHi: "48 घंटे संचयी आर्द्रता",
        nameEn: "48h Cumulative Moisture",
        available: isAnte48Available,
        valueText: isAnte48Available ? `${ante48Raw!.toFixed(1)} mm` : null,
        status: ante48Status,
        badgeType: "HISTORICAL" as const,
        badgeNote: undefined,
        note: "Multi-day catchment saturation",
      },
    ];

    const available = items.filter((it) => it.available).length;
    const total = items.length;

    return {
      confidenceScore: score,
      confidenceMeta: meta,
      factorItems: items,
      availableCount: available,
      totalCount: total,
    };
  }, [riskData]);

  return (
    <div
      className={cn(
        "space-y-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80",
        compact && "space-y-2.5 pt-1.5"
      )}
    >
      {/* ELEMENT 1 - CONFIDENCE SCORE */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              आत्मविश्वास स्कोर • Confidence Score:{" "}
              <span className="font-mono font-black">{confidenceScore}%</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              बहु-कारक टेलीमेट्री इनपुट सत्यापन (Multi-factor input verification)
            </span>
          </div>

          <span
            className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider shrink-0",
              confidenceMeta.badgeClass
            )}
          >
            {confidenceMeta.labelHi} ({confidenceMeta.labelEn})
          </span>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", confidenceMeta.barColor)}
            style={{ width: `${Math.min(Math.max(confidenceScore, 4), 100)}%` }}
          />
        </div>

        {/* Extra warning if below 50% */}
        {confidenceMeta.warning && (
          <p className="text-[11px] font-medium text-red-600 dark:text-red-400 leading-snug">
            {confidenceMeta.warning}
          </p>
        )}
      </div>

      {/* ELEMENT 2 - CONTRIBUTING FACTORS (Collapsible) */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          aria-expanded={isExpanded}
        >
          <span className="flex items-center gap-1.5">
            <span>{isExpanded ? "जोखिम कारक छिपाएं" : "जोखिम कारक देखें"}</span>
            <span className="font-normal opacity-70">•</span>
            <span className="font-medium text-[11px] text-slate-500 dark:text-slate-400">
              {isExpanded ? "Hide Risk Factors" : "View Risk Factors"}
            </span>
          </span>

          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>({availableCount}/{totalCount} सक्रिय)</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isExpanded && (
          <div className="p-3 space-y-3 border-t border-slate-200 dark:border-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {factorItems.map((factor) => (
                <div
                  key={factor.id}
                  className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none shrink-0" role="img" aria-label={factor.nameEn}>
                      {factor.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {factor.nameHi}
                        </span>
                        <span className="text-[10px] text-slate-400">({factor.nameEn})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{factor.note}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {factor.available ? (
                      <>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {factor.valueText}
                        </span>
                        <DataBadge
                          type={factor.badgeType}
                          note={factor.badgeNote}
                          compact={true}
                        />
                        {factor.status && (
                          <span
                            className={cn(
                              "text-xs inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
                              factor.status.class
                            )}
                            title={factor.status.text}
                          >
                            <span className="select-none">{factor.status.icon}</span>
                            <span className="text-[10px]">{factor.status.text}</span>
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                        <span className="select-none">⚪</span>
                        <span>डेटा अनुपलब्ध • Data Unavailable</span>
                        <DataBadge type="UNAVAILABLE" compact={true} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ELEMENT 3 - EXPERIMENTAL DISCLAIMER */}
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <p>
                  <strong>Hindi:</strong> यह एक प्रायोगिक जोखिम मूल्यांकन है जो मौसम और भूभाग डेटा पर आधारित है। यह प्रमाणित हाइड्रोलिक बाढ़ भविष्यवाणी नहीं है। निकासी निर्णयों के लिए हमेशा IMD और CWC के आधिकारिक पूर्वानुमान देखें।
                </p>
                <p>
                  <strong>English:</strong> This is an EXPERIMENTAL risk assessment based on meteorological and terrain factors. This is NOT a certified hydraulic flood prediction. Always verify with official IMD and CWC forecasts before making evacuation decisions.
                </p>
              </div>
            </div>

            {/* ELEMENT 4 - DATA COMPLETENESS FOOTER */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                डेटा पूर्णता • Data Completeness:{" "}
                <strong className="text-slate-700 dark:text-slate-200 font-mono">
                  {availableCount} of {totalCount} factors available
                </strong>
              </span>
              <span className="text-[10px] text-slate-400">
                {Math.round((availableCount / totalCount) * 100)}% telemetric coverage
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const FloodRiskCard: React.FC<FloodRiskCardProps> = ({
  riskData,
  isLoading = false,
  className = "",
  compact = false,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  if (isLoading) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-16 bg-slate-100 dark:bg-slate-900 rounded w-full" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (!riskData) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 ${className}`}>
        Flood risk assessment awaiting meteorological and spatial telemetry.
      </Card>
    );
  }

  const {
    riskScore,
    riskLevel,
    dataCompleteness,
    validUntil,
    calculatedAt,
    contributingFactors,
    summaryReasons,
    technicalExplanation,
    disclaimer,
  } = riskData;

  const levelMeta = getRiskLevelMeta(riskLevel);
  const LevelIcon = levelMeta.icon;

  const validUntilStr = new Date(validUntil).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const calculatedAtStr = new Date(calculatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Compact Mode (for Dashboard district card)
  if (compact) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <LevelIcon className="w-4 h-4" style={{ color: levelMeta.colorHex }} />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                District Flood Risk Index (V1)
              </CardTitle>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
              Experimental Decision Support
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono" style={{ color: levelMeta.colorHex }}>
                {riskScore}
              </span>
              <span className="text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border shadow-2xs ${levelMeta.badgeClass}`}>
                {levelMeta.label}
              </span>
              <DataBadge type="MODEL_DERIVED" compact={true} />
            </div>
          </div>

          {/* Enhanced Confidence Score and Explainable Risk (W-003) */}
          <ConfidenceAndExplainableRiskSection riskData={riskData} compact={true} />

          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            {summaryReasons[0] || levelMeta.description}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Data Completeness</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                {dataCompleteness}% verified
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Validity Horizon</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Until {validUntilStr}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 italic">
              Non-certified decision index
            </span>
            <Link
              href="/flood"
              className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>Explain Breakdown</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full Detailed Card Mode
  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: levelMeta.colorHex }}
            >
              <LevelIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Factor Inundation Risk Index (Engine V1)
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
                  Experimental Decision Support
                </span>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Multi-factor hydrologic synthesis: forward rainfall, antecedent moisture, terrain slope & waterway proximity.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link
              href="/map"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <Waves className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
              <span>View Spatial Grid Map</span>
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full border shadow-xs flex items-center gap-1.5 ${levelMeta.badgeClass}`}>
                <LevelIcon className="w-3.5 h-3.5" />
                {levelMeta.label}
              </span>
              <DataBadge type="MODEL_DERIVED" compact={true} />
            </div>
          </div>
        </div>
      </CardHeader>


      <CardContent className="pt-4 space-y-6">
        {/* Enhanced Confidence Score and Explainable Risk (W-003) */}
        <ConfidenceAndExplainableRiskSection riskData={riskData} compact={false} />

        {/* Top Summary Metric Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">Composite Risk Score</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono" style={{ color: levelMeta.colorHex }}>
                {riskScore}
              </span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${riskScore}%`, backgroundColor: levelMeta.colorHex }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">Data Completeness Index</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono text-[#0F3D66] dark:text-blue-400">
                {dataCompleteness}%
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {dataCompleteness === 100
                ? "All 5 meteorological & geospatial inputs verified."
                : "Rainfall complete; unmeasured terrain factors re-weighted."}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Forecast Validity</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2 text-base font-bold text-slate-800 dark:text-slate-200">
              Until {validUntilStr}
            </div>
            <span className="mt-2 text-[11px] text-slate-400">
              Computed at {calculatedAtStr} • 24h operational window
            </span>
          </div>
        </div>

        {/* Contributing Factors Breakdown Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Multi-Factor Parameter Breakdown & Weights
            </h4>
            <span className="text-[11px] text-slate-400">
              Active factors re-normalized to 100%
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Risk Factor</th>
                  <th className="py-2.5 px-3">Telemetry Value</th>
                  <th className="py-2.5 px-3">Normalized Score</th>
                  <th className="py-2.5 px-3">Base Weight</th>
                  <th className="py-2.5 px-3">Weighted Contribution</th>
                  <th className="py-2.5 px-3">Operational Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {contributingFactors.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {f.label}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {typeof f.rawValue === "number" ? `${f.rawValue} ${f.unit}` : f.rawValue}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.available ? (
                        <span className="font-mono font-bold text-[#0F3D66] dark:text-blue-400">
                          {f.normalizedScore} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unmeasured</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {Math.round(f.weight * 100)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {f.available ? `+${f.weightedContribution.toFixed(1)}` : "--"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                      {f.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expandable "Why This Assessment?" Section */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Why this assessment? Expand technical calculation explanation
            </span>
            {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showExplanation && (
            <div className="p-4 bg-white dark:bg-slate-950 space-y-3 text-xs border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">Summary Drivers:</span>
                <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1 text-[11px]">
                  {summaryReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="font-bold text-slate-900 dark:text-white">Algorithmic Formulation:</span>
                <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                  {technicalExplanation}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Notice on Data Completeness: Unlike heuristic black-box models, if elevation or river channel buffers are missing from local geospatial databases, the engine transparently reports an incomplete data index and recalculates normalized weights strictly across confirmed meteorological observations.
              </p>
            </div>
          )}
        </div>

        {/* Mandatory Transparency & Critical Directive Notice */}
        <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Mandatory Governance Notice:</strong> {disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
