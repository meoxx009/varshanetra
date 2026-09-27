"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Activity,
  Users,
  Home,
  Shield,
  Layers,
  Compass,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataBadge } from "@/components/common/data-badge";
import { useLocale } from "@/lib/i18n/context";
import type { CanonicalAssessment, FloodRiskLevel } from "@/types";
import type { NormalizedOfficialAlerts } from "@/lib/services/canonical-telemetry";

export interface SituationSummaryCardProps {
  /** Canonical VarshaNetra assessment object (Single Source of Truth) */
  canonicalAssessment?: CanonicalAssessment | null;
  /** Unique snapshot ID shared across all operational modules for the current cycle */
  snapshotId?: string | null;
  /** Official statutory alerts feed (IMD / District EOC) */
  officialAlerts?: NormalizedOfficialAlerts | null;

  /** Legacy / direct fallback fields */
  riskLevel?: string | null;
  riskScore?: number | null;
  /** Next 24 hours rainfall forecast accumulation in mm */
  rainfall24h?: number | null;
  /** Active / open incidents count */
  activeIncidentsCount?: number | null;
  /** Ready / available tactical response teams */
  availableTeamsCount?: number | null;
  /** Total response teams commissioned */
  totalTeamsCount?: number | null;
  /** Open and operational relief shelters */
  openSheltersCount?: number | null;
  /** Timestamp or ISO string of the most recent field report */
  lastFieldReportTime?: string | Date | null;
  /** Last updated timestamp for telemetry */
  lastUpdated?: Date | string | null;
  /** Callback to refresh telemetry data */
  onRefresh?: () => void;
  /** Refreshing in-flight state */
  isRefreshing?: boolean;
}

/** Reusable placeholder for unavailable or null data according to Data Integrity Rule */
function UnavailableText({ customText = "अनुपलब्ध" }: { customText?: string }) {
  return (
    <span className="text-slate-400 dark:text-slate-500 italic text-sm font-normal">
      {customText}
    </span>
  );
}

/**
 * Calculates human-readable time ago and whether the report is older than 2 hours.
 */
function calculateTimeAgo(dateInput?: string | Date | null): {
  display: string | null;
  isStale: boolean;
} {
  if (!dateInput) return { display: null, isStale: false };
  const d = new Date(dateInput);
  const time = d.getTime();
  if (isNaN(time)) return { display: null, isStale: false };

  const now = Date.now();
  const diffMs = now - time;
  if (diffMs < 0) return { display: "अभी-अभी (Just now)", isStale: false };

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isStale = diffHours >= 2;

  if (diffMinutes < 1) return { display: "< 1m ago", isStale: false };
  if (diffMinutes < 60) return { display: `${diffMinutes}m ago`, isStale: false };
  if (diffHours < 24) return { display: `${diffHours}h ${diffMinutes % 60}m ago`, isStale };
  return { display: `${diffDays}d ago`, isStale: true };
}

/**
 * SituationSummaryCard
 * High-visibility district situation summary card placed at the very top of the dashboard.
 * Synchronized with the canonical VarshaNetra assessment (VNET-SITUATION-SYNC-002).
 */
export function SituationSummaryCard({
  canonicalAssessment,
  snapshotId,
  officialAlerts,
  riskLevel,
  riskScore,
  rainfall24h,
  activeIncidentsCount,
  availableTeamsCount,
  totalTeamsCount,
  openSheltersCount,
  lastFieldReportTime,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: SituationSummaryCardProps) {
  const locale = useLocale();

  // Rule: Read the canonical assessment object directly. Do not calculate a second risk score.
  // Do not overwrite risk category based on textual interpretation.
  const currentRiskCategory: FloodRiskLevel = useMemo(() => {
    if (canonicalAssessment?.riskCategory) {
      return canonicalAssessment.riskCategory;
    }
    if (riskLevel) {
      const upper = riskLevel.trim().toUpperCase();
      if (["SEVERE", "CRITICAL"].includes(upper)) return "SEVERE";
      if (["HIGH", "ALERT"].includes(upper)) return "HIGH";
      if (["MODERATE", "ADVISORY", "MEDIUM"].includes(upper)) return "MODERATE";
      return "LOW";
    }
    return "LOW";
  }, [canonicalAssessment?.riskCategory, riskLevel]);

  // Rule: Do not calculate a second risk score inside Situation Summary. Read directly.
  const currentRiskScore: number | null = useMemo(() => {
    if (typeof canonicalAssessment?.riskScore === "number") {
      return canonicalAssessment.riskScore;
    }
    if (typeof riskScore === "number" && !isNaN(riskScore)) {
      return riskScore;
    }
    return null;
  }, [canonicalAssessment?.riskScore, riskScore]);

  // Snapshot ID parity: Must match other operational modules
  const activeSnapshotId = snapshotId || canonicalAssessment?.snapshotId || null;

  // Data completeness from canonical assessment
  const dataCompleteness = canonicalAssessment?.dataCompleteness ?? null;

  // Primary key driver from canonical assessment
  const primaryKeyDriver = canonicalAssessment?.keyDrivers?.[0];
  const keyDriverText = useMemo(() => {
    if (primaryKeyDriver) {
      return locale === "hi" && primaryKeyDriver.rationaleHi
        ? primaryKeyDriver.rationaleHi
        : primaryKeyDriver.rationale;
    }
    if (canonicalAssessment) {
      return locale === "hi" && canonicalAssessment.plainLanguageExplanationHi
        ? canonicalAssessment.plainLanguageExplanationHi
        : canonicalAssessment.plainLanguageExplanationEn;
    }
    return null;
  }, [primaryKeyDriver, canonicalAssessment, locale]);

  // Colored left border:
  // 4px solid red if HIGH or SEVERE
  // 4px solid orange if MODERATE
  // 4px solid green if LOW
  const borderLeftColor =
    currentRiskCategory === "SEVERE" || currentRiskCategory === "HIGH"
      ? "#DC2626"
      : currentRiskCategory === "MODERATE"
      ? "#EA580C"
      : "#15803D";

  const borderLeftClass =
    currentRiskCategory === "SEVERE" || currentRiskCategory === "HIGH"
      ? "border-l-4 border-l-red-600 dark:border-l-red-500"
      : currentRiskCategory === "MODERATE"
      ? "border-l-4 border-l-orange-500 dark:border-l-orange-400"
      : "border-l-4 border-l-green-600 dark:border-l-green-500";

  // Last field report time ago calculation
  const reportTimeAgo = useMemo(
    () => calculateTimeAgo(lastFieldReportTime),
    [lastFieldReportTime]
  );

  // Formatted assessment timestamp
  const assessmentTimestamp = useMemo(() => {
    const rawTime =
      canonicalAssessment?.calculatedAt ||
      canonicalAssessment?.assessmentTimestamp ||
      lastUpdated;
    if (!rawTime) return "N/A";
    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }, [canonicalAssessment, lastUpdated]);

  // Recommended Action Box parameters strictly derived from currentRiskCategory
  const recommendation = useMemo(() => {
    switch (currentRiskCategory) {
      case "SEVERE":
        return {
          containerClass:
            "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200",
          badgeClass: "bg-red-600 text-white",
          icon: ShieldAlert,
          hindi: "तत्काल कार्रवाई आवश्यक है - DDMA बैठक बुलाएं और निकासी पर विचार करें",
          english: "IMMEDIATE ACTION REQUIRED - Convene DDMA meeting and consider evacuation",
        };
      case "HIGH":
        return {
          containerClass:
            "bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-orange-900 dark:text-orange-200",
          badgeClass: "bg-orange-600 text-white",
          icon: AlertTriangle,
          hindi: "EOC को सक्रिय करें और SDRF दल तैयार रखें",
          english: "Activate EOC and keep SDRF teams ready",
        };
      case "MODERATE":
        return {
          containerClass:
            "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200",
          badgeClass: "bg-amber-500 text-slate-950",
          icon: AlertTriangle,
          hindi: "स्थिति पर निगरानी रखें - जल निकासी प्रणालियों का नियमित निरीक्षण करें",
          english: "Continue monitoring situation - Inspect drainage corridors actively",
        };
      case "LOW":
      default:
        return {
          containerClass:
            "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200",
          badgeClass: "bg-emerald-600 text-white",
          icon: CheckCircle2,
          hindi: "सामान्य निगरानी जारी रखें",
          english: "Routine monitoring in progress",
        };
    }
  }, [currentRiskCategory]);

  const ActionIcon = recommendation.icon;

  return (
    <Card
      className={cn(
        "shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all",
        borderLeftClass
      )}
      style={{
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor,
      }}
    >
      {/* HEADER: Title, Subtitle, Snapshot Cycle ID, Timestamp, Refresh Button */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {locale === "hi" ? "स्थिति सारांश" : "Situation Summary"}
              </h2>
              {/* Snapshot ID Badge (Rule: Use same snapshotId shown by other operational modules) */}
              {activeSnapshotId && (
                <span
                  title={locale === "hi" ? "कैनोनिकल स्नैपशॉट चक्र पहचानकर्ता" : "Canonical Snapshot Cycle ID"}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-blue-50 dark:bg-blue-950/50 text-[#0F3D66] dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"
                >
                  <Layers className="w-3 h-3 text-[#2563EB]" />
                  <span>CYCLE: {activeSnapshotId}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              {locale === "hi"
                ? "कैनोनिकल वर्षानेत्र बहु-कारक आकलन एवं आधिकारिक बुलेटिन"
                : "CANONICAL VARSHANETRA MULTI-FACTOR ASSESSMENT & OFFICIAL BULLETINS"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {locale === "hi" ? "आकलन समय:" : "Assessed:"} {assessmentTimestamp}
            </span>

            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={locale === "hi" ? "डेटा ताज़ा करें" : "Refresh Telemetry"}
                className="h-8 w-8 rounded-lg border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="डेटा ताज़ा करें / Refresh Telemetry"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5 text-slate-700 dark:text-slate-300", isRefreshing && "animate-spin")}
                />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* TWO SECTIONS: Left Section (Canonical Risk + Official Alert) + Right Section (6 Metric Tiles) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT SECTION: Primary Canonical Risk Category + Dual-Channel Official vs Model demarcation */}
          <div className="lg:col-span-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col justify-between gap-3.5">
            {/* CHANNEL A: VarshaNetra Model Risk Assessment (Rule: Primary Display) */}
            <div className="space-y-2 text-center flex flex-col items-center">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  {locale === "hi" ? "कैनोनिकल बाढ़ जोखिम स्तर" : "Canonical Flood Risk Category"}
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide block">
                  VARSHANETRA MULTI-FACTOR ENGINE V1.2
                </span>
              </div>

              {/* Primary: Current Risk Category */}
              <div className="py-1">
                {currentRiskCategory === "SEVERE" ? (
                  <Badge className="bg-red-600 hover:bg-red-600 text-white font-black text-base sm:text-lg px-4 py-2 rounded-xl shadow-md border-transparent flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>गंभीर आपातकाल (SEVERE)</span>
                  </Badge>
                ) : currentRiskCategory === "HIGH" ? (
                  <Badge className="bg-orange-600 hover:bg-orange-600 text-white font-black text-base sm:text-lg px-4 py-2 rounded-xl shadow-md border-transparent flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>उच्च चेतावनी (HIGH)</span>
                  </Badge>
                ) : currentRiskCategory === "MODERATE" ? (
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-black text-base sm:text-lg px-4 py-2 rounded-xl shadow-md border-transparent flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>मध्यम सतर्कता (MODERATE)</span>
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-base sm:text-lg px-4 py-2 rounded-xl shadow-md border-transparent flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>सामान्य स्थिति (LOW)</span>
                  </Badge>
                )}
              </div>

              {/* Primary: Risk Score */}
              <div className="flex items-baseline gap-1.5 justify-center">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {locale === "hi" ? "जोखिम स्कोर:" : "Risk Score:"}
                </span>
                {currentRiskScore !== null ? (
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {currentRiskScore.toFixed(1)}{" "}
                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  </span>
                ) : (
                  <UnavailableText />
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-0.5">
                <DataBadge type="MODEL_DERIVED" compact={true} />
                {typeof dataCompleteness === "number" && (
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {locale === "hi" ? `पूर्णता: ${dataCompleteness}%` : `Data: ${dataCompleteness}%`}
                  </span>
                )}
              </div>
            </div>

            {/* CHANNEL B: Authoritative Statutory Alert Feed (Rule: Never merge both concepts into one badge) */}
            <div className="mt-1 pt-3 border-t border-slate-200 dark:border-slate-800 text-left space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span>{locale === "hi" ? "आधिकारिक वैधानिक अलर्ट" : "Official Statutory Alert"}</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {officialAlerts?.isOfficial ? "AUTHORITATIVE" : "STATUTORY"}
                </span>
              </div>

              {officialAlerts?.hasActiveWarning ? (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        officialAlerts.colorCode === "Red"
                          ? "bg-red-600 animate-pulse"
                          : officialAlerts.colorCode === "Orange"
                          ? "bg-orange-500 animate-pulse"
                          : "bg-amber-500"
                      )}
                    />
                    <span className="text-xs font-bold text-red-900 dark:text-red-200">
                      {locale === "hi" ? officialAlerts.colorCodeHi : officialAlerts.colorCodeEn} (
                      {officialAlerts.severity})
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {locale === "hi" && officialAlerts.headlineHi
                      ? officialAlerts.headlineHi
                      : officialAlerts.headlineEn}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {officialAlerts.source}
                  </p>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      {locale === "hi" ? "सामान्य बेसलाइन (हरा)" : "Normal Baseline (Green)"}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    IMD / District EOC
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: Grid of 6 metric tiles */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Tile 1: Current Risk Category & Score */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "वर्तमान जोखिम" : "Current Risk"}
                    </span>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    CANONICAL ASSESSMENT
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {currentRiskCategory === "SEVERE" ? (
                    <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold text-xs px-2.5 py-0.5">
                      SEVERE / गंभीर
                    </Badge>
                  ) : currentRiskCategory === "HIGH" ? (
                    <Badge className="bg-orange-600 hover:bg-orange-600 text-white font-bold text-xs px-2.5 py-0.5">
                      HIGH / उच्च
                    </Badge>
                  ) : currentRiskCategory === "MODERATE" ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-bold text-xs px-2.5 py-0.5">
                      MODERATE / मध्यम
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5">
                      LOW / सामान्य
                    </Badge>
                  )}
                  {currentRiskScore !== null && (
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentRiskScore.toFixed(1)}/100
                    </span>
                  )}
                  <DataBadge type="MODEL_DERIVED" compact={true} />
                </div>
              </div>

              {/* Tile 2: Next 24h Rainfall Forecast */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "अगले 24 घंटे" : "Next 24 Hours"}
                    </span>
                    <CloudRain className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    FORECAST RAINFALL
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {typeof rainfall24h === "number" && !isNaN(rainfall24h) ? (
                    <>
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {rainfall24h.toFixed(1)} <span className="text-xs font-semibold text-slate-500">mm</span>
                      </span>
                      <DataBadge type="FORECAST" compact={true} />
                    </>
                  ) : (
                    <>
                      <UnavailableText customText={locale === "hi" ? "डेटा अनुपलब्ध" : "Data unavailable"} />
                      <DataBadge type="UNAVAILABLE" compact={true} />
                    </>
                  )}
                </div>
              </div>

              {/* Tile 3: Active Official Alerts */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "आधिकारिक अलर्ट" : "Official Alert"}
                    </span>
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    IMD / STATUTORY
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {officialAlerts?.hasActiveWarning ? (
                    <Badge
                      className={cn(
                        "font-bold text-xs px-2.5 py-0.5",
                        officialAlerts.colorCode === "Red"
                          ? "bg-red-600 text-white"
                          : officialAlerts.colorCode === "Orange"
                          ? "bg-orange-600 text-white"
                          : "bg-amber-500 text-slate-950"
                      )}
                    >
                      {officialAlerts.colorCode} ({officialAlerts.severity})
                    </Badge>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {locale === "hi" ? "हरा / सामान्य" : "Green / Normal"}
                    </span>
                  )}
                  <DataBadge type="GOVT_DATA" compact={true} />
                </div>
              </div>

              {/* Tile 4: Active Incidents */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "सक्रिय घटनाएं" : "Active Incidents"}
                    </span>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    OPERATIONAL INCIDENTS
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {typeof activeIncidentsCount === "number" ? (
                    <>
                      <span
                        className={cn(
                          "text-base sm:text-lg font-black",
                          activeIncidentsCount > 3
                            ? "text-red-600 dark:text-red-400 font-bold"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {activeIncidentsCount}
                      </span>
                      <DataBadge type="LIVE" compact={true} />
                    </>
                  ) : (
                    <>
                      <UnavailableText />
                      <DataBadge type="UNAVAILABLE" compact={true} />
                    </>
                  )}
                </div>
              </div>

              {/* Tile 5: Teams Available */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "उपलब्ध दल" : "Teams Ready"}
                    </span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    TACTICAL DISPATCH
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {typeof availableTeamsCount === "number" && typeof totalTeamsCount === "number" ? (
                    <>
                      <span
                        className={cn(
                          "text-base sm:text-lg font-black",
                          availableTeamsCount === 0
                            ? "text-red-600 dark:text-red-400 font-bold"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {availableTeamsCount}
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">
                          /{totalTeamsCount}
                        </span>
                      </span>
                      <DataBadge type="LIVE" compact={true} />
                    </>
                  ) : (
                    <>
                      <UnavailableText />
                      <DataBadge type="UNAVAILABLE" compact={true} />
                    </>
                  )}
                </div>
              </div>

              {/* Tile 6: Shelters Open & Last Field Report */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "राहत शिविर" : "Relief Shelters"}
                    </span>
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    OPEN CAPACITY
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {typeof openSheltersCount === "number" ? (
                    <>
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {openSheltersCount}
                      </span>
                      <DataBadge type="USER_REPORTED" compact={true} />
                    </>
                  ) : (
                    <>
                      <UnavailableText />
                      <DataBadge type="UNAVAILABLE" compact={true} />
                    </>
                  )}
                  {reportTimeAgo.display && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block w-full mt-0.5">
                      {locale === "hi" ? "अंतिम रिपोर्ट:" : "Report:"} {reportTimeAgo.display}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KEY DRIVER & DATA COMPLETENESS CONTEXT BAR (Secondary Display Requirement) */}
        {keyDriverText && (
          <div className="p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-start sm:items-center gap-2">
              <Compass className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-[#0F3D66] dark:text-blue-300 mr-1.5">
                  {locale === "hi" ? "प्रमुख परिचालन कारक:" : "Primary Hydrological Driver:"}
                </span>
                <span className="text-slate-800 dark:text-slate-200">{keyDriverText}</span>
              </div>
            </div>
            {typeof dataCompleteness === "number" && (
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                {locale === "hi" ? `डेटा पूर्णता: ${dataCompleteness}%` : `Completeness: ${dataCompleteness}%`}
              </span>
            )}
          </div>
        )}

        {/* RECOMMENDED ACTION BOX below the tiles */}
        <div
          className={cn(
            "p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs sm:text-sm font-semibold transition-colors",
            recommendation.containerClass
          )}
        >
          <div className="flex items-center gap-2 shrink-0">
            <ActionIcon className="w-4 h-4 shrink-0" />
            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5", recommendation.badgeClass)}>
              {locale === "hi" ? "अनुशंसित कार्रवाई" : "Recommended Action"}
            </Badge>
          </div>
          <div className="leading-snug">
            <span>{recommendation.hindi}</span>
            <span className="opacity-75 font-normal mx-1.5">•</span>
            <span className="opacity-90 font-medium">{recommendation.english}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SituationSummaryCard;
