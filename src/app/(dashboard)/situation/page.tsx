"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Info,
  Building2,
  ArrowRight,
  ShieldCheck,
  CloudRain,
  Waves,
  Shield,
  ChevronDown,
  Clock,
  Radio,
  FileText,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { PageHeader } from "@/components/common/page-header";
import { SituationIntelligenceReport } from "@/types/situation-intelligence";
import { SeverityLevel } from "@/types";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { formatDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

// Known existing dashboard routes in VarshaNetra
const KNOWN_ROUTES: Record<string, { labelEn: string; labelHi: string }> = {
  "/alerts": { labelEn: "View Active Alerts", labelHi: "सक्रिय चेतावनियां देखें" },
  "/response": { labelEn: "Dispatch Response Teams", labelHi: "प्रतिक्रिया दल तैनात करें" },
  "/resources": { labelEn: "Inspect Resources & Shelters", labelHi: "संसाधन व राहत शिविर देखें" },
  "/incidents": { labelEn: "Open Incident Log", labelHi: "घटना रजिस्टर खोलें" },
  "/impact": { labelEn: "Inspect Impact Analysis", labelHi: "प्रभाव विश्लेषण देखें" },
  "/flood": { labelEn: "View Inundation Model", labelHi: "बाढ़ मॉडल देखें" },
  "/weather": { labelEn: "Open Weather Radar", labelHi: "मौसम रडार खोलें" },
  "/field-reports": { labelEn: "Inspect Field Reports", labelHi: "क्षेत्रीय रिपोर्ट जांचें" },
  "/dashboard": { labelEn: "Go to Main Dashboard", labelHi: "मुख्य डैशबोर्ड पर जाएं" },
};

function getRouteActionInfo(deepLink?: string, locale: "en" | "hi" = "en") {
  if (!deepLink) return null;
  const basePath = deepLink.split("?")[0];
  const routeMeta = KNOWN_ROUTES[basePath];
  if (!routeMeta) return null;
  return {
    href: deepLink,
    label: locale === "hi" ? routeMeta.labelHi : routeMeta.labelEn,
  };
}

export default function SituationIntelligencePage() {
  const locale = useLocale();
  const { location } = useDistrictLocation();
  const [report, setReport] = useState<SituationIntelligenceReport | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>("ALL");
  const [expandedStatements, setExpandedStatements] = useState<Record<string, boolean>>({});
  const [evidenceSectionOpen, setEvidenceSectionOpen] = useState(false);

  const fetchSituation = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setInitialLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(location.latitude),
          lon: String(location.longitude),
          district: location.shortName || location.displayName,
          lang: locale,
        });

        const res = await fetch(`/api/situation-intelligence?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to generate situation intelligence`);
        }

        const json = await res.json();
        if (!json.success || !json.report) {
          throw new Error(json.error || "Malformed server response");
        }

        setReport(json.report);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load situation intelligence";
        setError(msg);
      } finally {
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [location, locale]
  );

  useEffect(() => {
    fetchSituation(false);
  }, [fetchSituation]);

  const handleCopy = async () => {
    if (!report) return;
    try {
      const summaryText =
        locale === "hi" && report.summaryParagraphHi
          ? report.summaryParagraphHi
          : report.summaryParagraph;
      const textToCopy = `[VARSHANETRA COMMAND BRIEFING - ${location.shortName.toUpperCase()}]
Severity: ${report.overallSeverity} | Generated: ${formatDateTime(report.generatedAt)}

CURRENT SITUATION:
${summaryText}

KEY METRICS:
- 24h Rain Forecast: ${report.keyStatistics.forecastRain24hMm} mm (+6h: ${report.keyStatistics.forecastRain6hMm} mm)
- Flood Risk Score: ${report.keyStatistics.floodRiskScore.toFixed(1)}/100 (${report.keyStatistics.floodRiskLevel})
- Active Incidents: ${report.keyStatistics.activeIncidentsCount} | Active Alerts: ${report.keyStatistics.issuedAlertsCount}
- Critical Assets in Risk Zone: ${report.keyStatistics.exposedInfrastructureCount}

PRIORITY ACTIONS:
${report.considerations
  .map(
    (c, i) =>
      `${i + 1}. [${c.priority}] ${locale === "hi" && c.suggestionHi ? c.suggestionHi : c.suggestion}`
  )
  .join("\n")}
`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback ignore
    }
  };

  const toggleStatement = (id: string) => {
    setExpandedStatements((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSeverityBadge = (sev: SeverityLevel, isHeader = false) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isHeader
                ? "bg-red-600 text-white border-red-700 shadow-xs"
                : "bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800"
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${isHeader ? "text-white" : "text-red-600"}`} />
            <span>{locale === "hi" ? "गंभीर निगरानी" : "CRITICAL WATCH"}</span>
          </span>
        );
      case "ALERT":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isHeader
                ? "bg-orange-600 text-white border-orange-700 shadow-xs"
                : "bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isHeader ? "text-white" : "text-orange-600"}`} />
            <span>{locale === "hi" ? "उच्च चेतावनी" : "ELEVATED ALERT"}</span>
          </span>
        );
      case "ADVISORY":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isHeader
                ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isHeader ? "text-white" : "text-amber-600"}`} />
            <span>{locale === "hi" ? "सलाह" : "ADVISORY"}</span>
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isHeader
                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isHeader ? "text-white" : "text-emerald-600"}`} />
            <span>{locale === "hi" ? "सामान्य बेसलाइन" : "NORMAL BASELINE"}</span>
          </span>
        );
    }
  };

  // Sorted considerations by Priority: HIGH -> MEDIUM -> LOW
  const sortedConsiderations = useMemo(() => {
    if (!report?.considerations) return [];
    const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return [...report.considerations].sort(
      (a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
    );
  }, [report]);

  // Topic filter counts
  const filteredStatements = useMemo(() => {
    if (!report?.statements) return [];
    if (activeTopic === "ALL") return report.statements;
    return report.statements.filter((s) => s.topic === activeTopic);
  }, [report, activeTopic]);

  // Rainfall status helper
  const getRainfallStatus = (rain24h: number) => {
    if (rain24h >= 115.5) {
      return {
        label: locale === "hi" ? "अत्यधिक भारी वर्षा" : "Very Heavy Rainfall Watch",
        color: "text-red-700 dark:text-red-400",
        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900",
      };
    }
    if (rain24h >= 64.5) {
      return {
        label: locale === "hi" ? "भारी वर्षा चेतावनी" : "Heavy Rainfall Advisory",
        color: "text-orange-700 dark:text-orange-400",
        badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900",
      };
    }
    if (rain24h >= 15.5) {
      return {
        label: locale === "hi" ? "मध्यम वर्षा" : "Moderate Rainfall",
        color: "text-blue-700 dark:text-blue-400",
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900",
      };
    }
    if (rain24h > 0) {
      return {
        label: locale === "hi" ? "हल्की वर्षा" : "Light Rainfall",
        color: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900",
      };
    }
    return {
      label: locale === "hi" ? "वर्षा की संभावना नहीं" : "No Significant Rain",
      color: "text-slate-700 dark:text-slate-300",
      badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    };
  };

  // Flood risk status helper
  const getFloodStatus = (level: string, score: number) => {
    const upper = level.toUpperCase();
    if (upper === "SEVERE" || upper === "CRITICAL" || score >= 75) {
      return {
        label: locale === "hi" ? "गंभीर बाढ़ जोखिम" : "Severe Flood Risk",
        color: "text-red-700 dark:text-red-400",
        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900",
      };
    }
    if (upper === "HIGH" || score >= 50) {
      return {
        label: locale === "hi" ? "उच्च बाढ़ जोखिम" : "Elevated Flood Risk",
        color: "text-orange-700 dark:text-orange-400",
        badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900",
      };
    }
    if (upper === "MODERATE" || score >= 25) {
      return {
        label: locale === "hi" ? "मध्यम बाढ़ जोखिम" : "Moderate Flood Risk",
        color: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900",
      };
    }
    return {
      label: locale === "hi" ? "कम जोखिम बेसलाइन" : "Low Risk Baseline",
      color: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900",
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Action Buttons and Live Status */}
      <PageHeader
        title={locale === "hi" ? "कमांड सेंटर" : "Command Center"}
        description={
          locale === "hi"
            ? "वर्तमान स्थिति, प्राथमिकता कार्रवाइयां और सत्यापित परिचालन साक्ष्य।"
            : "Current situation, priority actions and verified operational evidence."
        }
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "कमांड सेंटर" : "Command Center" },
        ]}
        sourceMeta={report?.metadata}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live Feed Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{locale === "hi" ? "लाइव फीड" : "Live Feed"}</span>
            </div>

            {/* Canonical Snapshot Cycle ID Badge */}
            {report?.canonicalSnapshotId && (
              <span
                title={locale === "hi" ? "कैनोनिकल स्नैपशॉट चक्र पहचानकर्ता" : "Canonical Snapshot Cycle ID"}
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono bg-blue-50 dark:bg-blue-950/50 text-[#0F3D66] dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow-2xs"
              >
                <Layers className="w-3 h-3 text-[#2563EB]" />
                <span>CYCLE: {report.canonicalSnapshotId}</span>
              </span>
            )}

            {/* Severity Pill */}
            {report && getSeverityBadge(report.overallSeverity, true)}

            {/* Refresh Button (preserves scroll position) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSituation(true)}
              disabled={isRefreshing || initialLoading}
              className="text-xs h-9 px-3 gap-1.5 border-slate-200 dark:border-slate-700 cursor-pointer"
              title={locale === "hi" ? "स्थिति विश्लेषण पुनः ताज़ा करें" : "Refresh operational assessment"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {isRefreshing
                  ? locale === "hi"
                    ? "ताज़ा हो रहा है..."
                    : "Refreshing..."
                  : locale === "hi"
                    ? "ताज़ा करें"
                    : "Refresh"}
              </span>
            </Button>

            {/* Copy Briefing Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!report}
              className="text-xs h-9 px-3 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>
                {copied
                  ? locale === "hi"
                    ? "कॉपी हो गया"
                    : "Copied"
                  : locale === "hi"
                    ? "ब्रीफिंग कॉपी करें"
                    : "Copy Briefing"}
              </span>
            </Button>
          </div>
        }
      />

      {/* Mandatory State 1: Error Recovery */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-900 dark:text-red-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">
                {locale === "hi"
                  ? "परिचालन स्थिति संश्लेषित करने में त्रुटि"
                  : "Failed to synthesize operational situation"}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchSituation(false)}
            className="text-xs h-8 px-3 cursor-pointer shrink-0 ml-3"
          >
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
          </Button>
        </div>
      )}

      {/* Mandatory State 2: Initial Loading Skeleton */}
      {initialLoading && !error && (
        <div className="space-y-4 animate-pulse">
          {/* Section 1 Skeleton */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" />
            </div>
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
          </div>

          {/* Section 2 Skeleton (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2"
              >
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>

          {/* Section 3 Skeleton */}
          <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5" />
        </div>
      )}

      {/* Mandatory State 3: Empty State */}
      {!initialLoading && !error && !report && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <Info className="w-9 h-9 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            {locale === "hi" ? "कोई परिचालन स्थिति उपलब्ध नहीं है" : "No Operational Situation Available"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {locale === "hi"
              ? "चयनित अधिकार क्षेत्र के लिए परिचालन ब्रीफिंग संकलित करने में असमर्थ। कृपया नेटवर्क या स्थान जांचें।"
              : "Unable to compile operational situation report for the selected jurisdiction. Please check network connection or district selection."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchSituation(false)}
            className="text-xs h-8 px-4 mt-4 cursor-pointer"
          >
            {locale === "hi" ? "पुनः लोड करें" : "Reload"}
          </Button>
        </div>
      )}

      {/* Mandatory State 4: Success Operational View */}
      {!initialLoading && !error && report && (
        <>
          {/* ========================================================================= */}
          {/* SECTION 1: Current Situation (One-glance operational summary)             */}
          {/* ========================================================================= */}
          <section
            aria-labelledby="section-current-situation"
            className="rounded-xl border-2 border-[#0F3D66]/20 dark:border-blue-900/60 bg-linear-to-br from-blue-50/70 via-white to-slate-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 p-5 shadow-xs transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-200/60 dark:border-blue-900/50 gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 rounded-md bg-[#0F3D66] text-white">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2
                  id="section-current-situation"
                  className="text-sm font-black uppercase tracking-wider text-[#0F3D66] dark:text-blue-400"
                >
                  {locale === "hi" ? "वर्तमान स्थिति" : "Current Situation"}
                </h2>
                {getSeverityBadge(report.overallSeverity)}
              </div>

              {/* Timestamp & Location Provenance */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span suppressHydrationWarning>
                  {locale === "hi" ? "स्थिति समय:" : "Assessment as of:"} {formatDateTime(report.generatedAt)}
                </span>
              </div>
            </div>

            {/* Plain-language Executive Summary Narrative */}
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              &ldquo;
              {locale === "hi" && report.summaryParagraphHi
                ? report.summaryParagraphHi
                : report.summaryParagraph}
              &rdquo;
            </p>

            {/* Verification Guarantee */}
            <div className="mt-3.5 pt-3 border-t border-blue-100 dark:border-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400 shrink-0" />
                <span>
                  {locale === "hi"
                    ? "सत्यापित परिचालन सारांश: लाइव टेलीमेट्री और जिला डेटाबेस अभिलेखों से क्रॉस-ऑडिट किया गया।"
                    : "Verified operational synthesis: Cross-audited against live telemetry and district records."}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {location.shortName || location.displayName}
              </span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2: At a Glance (Max 4 Cards: Status first, numeric details second) */}
          {/* ========================================================================= */}
          <section aria-labelledby="section-at-a-glance" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2
                id="section-at-a-glance"
                className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {locale === "hi" ? "संक्षिप्त स्थिति (4 प्रमुख संकेतक)" : "At a Glance"}
              </h2>
              <span className="text-xs text-slate-400">
                {locale === "hi" ? "श्रेणी प्राथमिक • विवरण द्वितीयक" : "Status First • Metrics Secondary"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Forecast Rainfall */}
              {(() => {
                const rainStatus = getRainfallStatus(report.keyStatistics.forecastRain24hMm);
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-800 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <CloudRain className="w-4 h-4 text-blue-500" />
                          {locale === "hi" ? "पूर्वानुमान वर्षा" : "Forecast Rainfall"}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rainStatus.badge}`}
                        >
                          {rainStatus.label}
                        </span>
                      </div>

                      {/* Primary: Category Status */}
                      <p className={`text-lg font-black tracking-tight ${rainStatus.color}`}>
                        {report.keyStatistics.forecastRain24hMm} mm
                        <span className="text-xs font-normal text-slate-500 ml-1.5">/ 24h</span>
                      </p>

                      {/* Secondary: Numeric Details */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {locale === "hi"
                          ? `आगामी 6 घंटे: ${report.keyStatistics.forecastRain6hMm} mm`
                          : `Next 6 hours: ${report.keyStatistics.forecastRain6hMm} mm`}
                      </p>
                    </div>

                    <Link
                      href="/weather"
                      className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{locale === "hi" ? "मौसम रडार देखें" : "View Weather Radar"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })()}

              {/* Card 2: Flood Risk (Synchronized Canonical Assessment) */}
              {(() => {
                const activeRiskLevel = (report.canonicalAssessment?.riskCategory || report.keyStatistics.floodRiskLevel).toUpperCase();
                const activeRiskScore = report.canonicalAssessment?.riskScore ?? report.keyStatistics.floodRiskScore;
                const floodStatus = getFloodStatus(activeRiskLevel, activeRiskScore);
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-800 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Waves className="w-4 h-4 text-teal-500" />
                          {locale === "hi" ? "बाढ़ संवेदनशीलता" : "Flood Risk"}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${floodStatus.badge}`}
                        >
                          {floodStatus.label}
                        </span>
                      </div>

                      {/* Primary: Category Status */}
                      <p className={`text-lg font-black tracking-tight ${floodStatus.color}`}>
                        {activeRiskLevel}
                      </p>

                      {/* Secondary: Numeric Details */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {locale === "hi"
                          ? `जोखिम सूचकांक: ${activeRiskScore.toFixed(1)} / 100`
                          : `Index Score: ${activeRiskScore.toFixed(1)} / 100`}
                      </p>
                    </div>

                    <Link
                      href="/flood"
                      className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{locale === "hi" ? "बाढ़ मॉडल देखें" : "View Flood Model"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })()}

              {/* Card 3: Active Incidents & Warnings */}
              {(() => {
                const hasIncidents = report.keyStatistics.activeIncidentsCount > 0;
                const hasAlerts = report.keyStatistics.issuedAlertsCount > 0;
                const statusLabel = hasIncidents
                  ? locale === "hi"
                    ? "सक्रिय प्रतिक्रिया"
                    : "Incident Response Active"
                  : hasAlerts
                    ? locale === "hi"
                      ? "चेतावनियां जारी"
                      : "Warnings Active"
                    : locale === "hi"
                      ? "सभी क्षेत्र सामान्य"
                      : "All Sectors Clear";

                const badgeClass =
                  hasIncidents || hasAlerts
                    ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900";

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-800 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          {locale === "hi" ? "घटनाएं व चेतावनियां" : "Incidents & Warnings"}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Primary: Category Status */}
                      <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {report.keyStatistics.activeIncidentsCount}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {locale === "hi" ? "घटनाएं" : "Incidents"}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700 mx-1.5">•</span>
                        {report.keyStatistics.issuedAlertsCount}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {locale === "hi" ? "चेतावनियां" : "Alerts"}
                        </span>
                      </p>

                      {/* Secondary: Numeric Details */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {locale === "hi"
                          ? `${report.keyStatistics.verifiedFieldReportsCount} सत्यापित क्षेत्रीय रिपोर्ट`
                          : `${report.keyStatistics.verifiedFieldReportsCount} verified field reports`}
                      </p>
                    </div>

                    <Link
                      href="/incidents"
                      className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{locale === "hi" ? "घटना रजिस्टर देखें" : "View Incident Log"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })()}

              {/* Card 4: Infrastructure at Risk */}
              {(() => {
                const exposed = report.keyStatistics.exposedInfrastructureCount;
                const statusLabel =
                  exposed > 0
                    ? locale === "hi"
                      ? "जोखिम क्षेत्र में संपत्तियां"
                      : "Assets in Hazard Zone"
                    : locale === "hi"
                      ? "संपत्तियां सुरक्षित"
                      : "Critical Assets Safe";

                const badgeClass =
                  exposed > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900";

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-800 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          {locale === "hi" ? "बुनियादी ढांचा" : "Infrastructure at Risk"}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Primary: Category Status */}
                      <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {exposed}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {locale === "hi" ? "सुविधाएं जोखिम में" : "facilities in risk zone"}
                        </span>
                      </p>

                      {/* Secondary: Numeric Details */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {locale === "hi"
                          ? `आश्रय अधिभोग: ${report.keyStatistics.shelterOccupancyPercent.toFixed(0)}%`
                          : `Shelter Occupancy: ${report.keyStatistics.shelterOccupancyPercent.toFixed(0)}%`}
                      </p>
                    </div>

                    <Link
                      href="/impact"
                      className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{locale === "hi" ? "प्रभाव विश्लेषण देखें" : "View Impact Analysis"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3: What Should Happen Now? (Action-First Cards)                   */}
          {/* ========================================================================= */}
          <section aria-labelledby="section-priority-actions" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h2
                  id="section-priority-actions"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <Activity className="w-5 h-5 text-[#0F3D66] dark:text-blue-400" />
                  <span>{locale === "hi" ? "अब क्या कार्रवाई की जाए?" : "What Should Happen Now?"}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === "hi"
                    ? "लाइव टेलीमेट्री और जिला मानक संचालन प्रक्रियाओं (एसओपी) के अनुरूप उत्पन्न प्राथमिकता कार्रवाइयां।"
                    : "Priority operational directives derived deterministically from live telemetry & SOP protocols."}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                {locale === "hi" ? "जिला आपदा प्रोटोकॉल" : "District Disaster Protocol"}
              </span>
            </div>

            {sortedConsiderations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {sortedConsiderations.map((c) => {
                  const actionTarget = getRouteActionInfo(c.deepLink, locale);
                  const isHigh = c.priority === "HIGH";
                  const isMedium = c.priority === "MEDIUM";

                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl border p-4.5 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between gap-3 transition ${
                        isHigh
                          ? "border-red-300 dark:border-red-900/70 hover:border-red-400"
                          : isMedium
                            ? "border-amber-300 dark:border-amber-900/70 hover:border-amber-400"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Header: Priority Badge & Topic */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                                : isMedium
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                            }`}
                          >
                            {isHigh ? (
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                            ) : isMedium ? (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Info className="w-3 h-3 text-blue-600" />
                            )}
                            <span>
                              {c.priority}{" "}
                              {locale === "hi" ? "प्राथमिकता" : "PRIORITY"}
                            </span>
                          </span>

                          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            {c.topic}
                          </span>
                        </div>

                        {/* One Short Action Sentence */}
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {locale === "hi" && c.suggestionHi ? c.suggestionHi : c.suggestion}
                        </p>

                        {/* Rationale Sentence */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                          <strong className="text-slate-700 dark:text-slate-300">
                            {locale === "hi" ? "कारण:" : "Rationale:"}
                          </strong>{" "}
                          {locale === "hi" && c.rationaleHi ? c.rationaleHi : c.rationale}
                        </p>
                      </div>

                      {/* Clickable Action Route Button (Only rendered if target feature/route exists) */}
                      {actionTarget && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Link
                            href={actionTarget.href}
                            className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-[#0F3D66] text-[#0F3D66] hover:text-white dark:bg-slate-800/80 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          >
                            <span>{actionTarget.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {locale === "hi"
                    ? "सामान्य बेसलाइन — किसी तत्काल आपातकालीन हस्तक्षेप की आवश्यकता नहीं है"
                    : "Normal Baseline — No Immediate Emergency Interventions Required"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  {locale === "hi"
                    ? "सभी निगरानी पैरामीटर सामान्य सीमाओं के भीतर हैं। नियमित निगरानी और क्षेत्रीय गश्त जारी रखें।"
                    : "All monitored parameters are within safe operational thresholds. Continue standard meteorological monitoring and routine sector patrols."}
                </p>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 4: Why this status? (Expandable Progressive Evidence)              */}
          {/* ========================================================================= */}
          <section aria-labelledby="section-why-this-status" className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2
                  id="section-why-this-status"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <FileText className="w-5 h-5 text-[#0F3D66] dark:text-blue-400" />
                  <span>{locale === "hi" ? "यह स्थिति क्यों है?" : "Why this status?"}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === "hi"
                    ? "प्रगतिशील रूप से प्रदर्शित कारक, गणितीय टेलीमेट्री और सत्यापित ट्रिगर्स।"
                    : "Progressively disclosed factors, mathematical telemetry and verified triggers."}
                </p>
              </div>

              {/* Topic Filters */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs">
                {[
                  { key: "ALL", label: locale === "hi" ? "सभी कारक" : "All Factors" },
                  { key: "RAINFALL", label: locale === "hi" ? "वर्षा" : "Rainfall" },
                  { key: "FLOOD_RISK", label: locale === "hi" ? "बाढ़ जोखिम" : "Flood Risk" },
                  { key: "INCIDENTS", label: locale === "hi" ? "घटनाएं" : "Incidents" },
                  { key: "INFRASTRUCTURE", label: locale === "hi" ? "बुनियादी ढांचा" : "Infrastructure" },
                  { key: "RESOURCES", label: locale === "hi" ? "संसाधन" : "Resources" },
                ].map((topicObj) => {
                  const isSelected = activeTopic === topicObj.key;
                  return (
                    <button
                      key={topicObj.key}
                      type="button"
                      onClick={() => setActiveTopic(topicObj.key)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {topicObj.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statements List with Collapsible Evidence Trays */}
            <div className="space-y-3">
              {filteredStatements.length > 0 ? (
                filteredStatements.map((stmt) => {
                  const isExpanded = expandedStatements[stmt.id] ?? false;
                  return (
                    <div
                      key={stmt.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 transition"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {stmt.topic}
                          </span>
                          {getSeverityBadge(stmt.severity)}
                        </div>

                        {/* Evidence Disclosure Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleStatement(stmt.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          aria-expanded={isExpanded}
                        >
                          <span>
                            {isExpanded
                              ? locale === "hi"
                                ? "साक्ष्य छिपाएं"
                                : "Hide Evidence"
                              : locale === "hi"
                                ? `साक्ष्य देखें (${stmt.evidence.length})`
                                : `View Evidence (${stmt.evidence.length})`}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Statement Descriptive Text */}
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {locale === "hi" && stmt.textHi ? stmt.textHi : stmt.text}
                      </p>

                      {/* Collapsible Evidence Tray */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 text-blue-600" />
                            {locale === "hi"
                              ? "सत्यापित डेटाबेस और टेलीमेट्री साक्ष्य:"
                              : "Verified Telemetry & Database Records:"}
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {stmt.evidence.map((ev, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col justify-between gap-2 shadow-2xs"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {ev.label}
                                    </span>
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                      {ev.value}
                                    </span>
                                  </div>
                                  {ev.details && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      {ev.details}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500">
                                  <span>
                                    {locale === "hi" ? "प्रदाता:" : "Source:"} {ev.sourceTableOrProvider}
                                  </span>
                                  {ev.deepLink && (
                                    <Link
                                      href={ev.deepLink}
                                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <span>{locale === "hi" ? "जांचें" : "Inspect"}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                  <p className="text-xs text-slate-500">
                    {locale === "hi"
                      ? "चयनित कारक के लिए कोई कथन उपलब्ध नहीं है।"
                      : "No statements recorded for this factor."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 5: Detailed Operational Evidence (Collapsed by Default)           */}
          {/* ========================================================================= */}
          <section
            aria-labelledby="section-detailed-evidence"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
          >
            <button
              type="button"
              id="section-detailed-evidence"
              onClick={() => setEvidenceSectionOpen((prev) => !prev)}
              aria-expanded={evidenceSectionOpen}
              className="w-full p-4.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 transition cursor-pointer text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {locale === "hi" ? "विस्तृत परिचालन साक्ष्य" : "Detailed Operational Evidence"}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {report.dataSourcesQueried?.length || 0}{" "}
                    {locale === "hi" ? "स्रोत परीक्षित" : "sources queried"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {locale === "hi"
                    ? "डेटा स्रोतों की स्थिति, एपीआई प्रतिक्रिया विलंबता और तकनीकी रिकॉर्ड।"
                    : "Technical source telemetry, API response latencies, and underlying records."}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                <span>
                  {evidenceSectionOpen
                    ? locale === "hi"
                      ? "छुपाएं"
                      : "Collapse"
                    : locale === "hi"
                      ? "विस्तार करें"
                      : "Expand"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    evidenceSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {evidenceSectionOpen && (
              <div className="p-4.5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                {/* Data Sources Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.dataSourcesQueried.map((ds, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ds.source}
                        </span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            ds.status === "LIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : ds.status === "CACHED"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : ds.status === "EMPTY"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          {ds.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>
                          {locale === "hi" ? "अभिलेख:" : "Records:"} {ds.recordCount}
                        </span>
                        {ds.latencyMs !== undefined && (
                          <span className="font-mono text-slate-400">{ds.latencyMs} ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compliance & Provenance Guarantee */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0F3D66] dark:text-[#2563EB] shrink-0" />
                    <span>
                      <strong>
                        {locale === "hi"
                          ? "निर्देश #14 और #18 अनुपालन:"
                          : "Directive #14 & #18 Adherence:"}
                      </strong>{" "}
                      {locale === "hi"
                        ? "शून्य कल्पित तथ्य। कोई बाहरी सशुल्क एआई निर्भरता नहीं। नियतात्मक नियम-आधारित संश्लेषण। केवल परामर्श निर्णय समर्थन।"
                        : "Zero hallucinated facts. No external paid AI API dependency. Deterministic rule-based synthesis. Advisory decision support only."}
                    </span>
                  </div>
                  <DataSourceBadge metadata={report.metadata} showAttributionText={false} />
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
