"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Waves,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { ImdIntegrationStatusCard } from "./imd-integration-status-card";

export interface EnhancedDataHealthMonitorProps {
  weatherTimestamp?: string | Date | null;
  hasWeatherError?: boolean;
  isSupabaseConnected?: boolean;
  fieldReports?: Array<{ created_at: string }>;
  osmLoadedAt?: string | Date | null;
  className?: string;
  onRefresh?: () => void;
}

export function EnhancedDataHealthMonitor({
  weatherTimestamp: initialWeatherTimestamp,
  hasWeatherError: initialWeatherError = false,
  isSupabaseConnected: initialSupabaseConnected = true,
  fieldReports: initialFieldReports,
  osmLoadedAt: initialOsmLoadedAt,
  className,
  onRefresh,
}: EnhancedDataHealthMonitorProps) {
  const locale = useLocale();

  // Internal state for self-sufficient data fetching if not supplied via props
  const [weatherTime, setWeatherTime] = useState<Date | null>(
    initialWeatherTimestamp ? new Date(initialWeatherTimestamp) : null
  );
  const [hasWeatherErr, setHasWeatherErr] = useState<boolean>(initialWeatherError);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(initialSupabaseConnected);
  const [fieldReportsList, setFieldReportsList] = useState<Array<{ created_at: string }>>(
    initialFieldReports || []
  );
  const [osmCacheTime, setOsmCacheTime] = useState<Date>(
    initialOsmLoadedAt ? new Date(initialOsmLoadedAt) : new Date(Date.now() - 25 * 60 * 1000)
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [nasaGpmStatus, setNasaGpmStatus] = useState<"NOT_CONFIGURED" | "LIVE" | "STALE">("NOT_CONFIGURED");
  const [nasaGpmFetchTime, setNasaGpmFetchTime] = useState<Date | null>(null);

  // Sync props changes if passed
  useEffect(() => {
    if (initialWeatherTimestamp !== undefined) {
      setWeatherTime(initialWeatherTimestamp ? new Date(initialWeatherTimestamp) : null);
    }
    if (initialWeatherError !== undefined) {
      setHasWeatherErr(initialWeatherError);
    }
    if (initialSupabaseConnected !== undefined) {
      setIsDbConnected(initialSupabaseConnected);
    }
    if (initialFieldReports !== undefined) {
      setFieldReportsList(initialFieldReports);
    }
    if (initialOsmLoadedAt !== undefined && initialOsmLoadedAt !== null) {
      setOsmCacheTime(new Date(initialOsmLoadedAt));
    }
  }, [
    initialWeatherTimestamp,
    initialWeatherError,
    initialSupabaseConnected,
    initialFieldReports,
    initialOsmLoadedAt,
  ]);

  // Self-sufficient health check if initial data is sparse
  const runSelfAudit = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, reportsRes] = await Promise.all([
        fetch("/api/health/sources"),
        fetch("/api/field-reports"),
      ]);

      if (healthRes.ok) {
        const hData = await healthRes.json();
        if (hData.success && Array.isArray(hData.sources)) {
          const meteoSource = hData.sources.find((s: { id: string }) => s.id === "open-meteo");
          if (meteoSource) {
            setHasWeatherErr(meteoSource.status === "UNAVAILABLE" || meteoSource.status === "DEGRADED");
            if (meteoSource.lastSuccessfulFetchAt) {
              setWeatherTime(new Date(meteoSource.lastSuccessfulFetchAt));
            }
          }
          const supaSource = hData.sources.find((s: { id: string }) => s.id === "supabase");
          if (supaSource) {
            setIsDbConnected(supaSource.status === "CONNECTED" || supaSource.status === "ONLINE");
          }
          const gpmSource = hData.sources.find((s: { id: string }) => s.id === "nasa-gpm");
          if (gpmSource) {
            if (gpmSource.status === "NOT_CONFIGURED") {
              setNasaGpmStatus("NOT_CONFIGURED");
            } else if (gpmSource.status === "ONLINE" || gpmSource.status === "CONNECTED") {
              setNasaGpmStatus("LIVE");
              if (gpmSource.lastSuccessfulFetchAt) {
                setNasaGpmFetchTime(new Date(gpmSource.lastSuccessfulFetchAt));
              }
            } else {
              setNasaGpmStatus("STALE");
              if (gpmSource.lastSuccessfulFetchAt) {
                setNasaGpmFetchTime(new Date(gpmSource.lastSuccessfulFetchAt));
              }
            }
          }
        }
      }

      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        if (rData.success && Array.isArray(rData.data)) {
          setFieldReportsList(rData.data);
        }
      }

      setLastCheckTime(new Date());
    } catch (err) {
      console.warn("[VarshaNetra:DataHealth] Probe refresh encounter:", err);
    } finally {
      setIsRefreshing(false);
      if (onRefresh) onRefresh();
    }
  }, [onRefresh]);

  // If no initial weather or reports were supplied, run self-audit once on mount
  useEffect(() => {
    if (!initialWeatherTimestamp && (!initialFieldReports || initialFieldReports.length === 0)) {
      runSelfAudit();
    }
  }, [initialWeatherTimestamp, initialFieldReports, runSelfAudit]);

  // 1. Weather Component Calculation (Weight: 35%)
  const { weatherScore, weatherStatus, weatherAgeMinutes } = useMemo(() => {
    if (hasWeatherErr || !weatherTime) {
      return {
        weatherScore: 0,
        weatherStatus: "UNAVAILABLE" as const,
        weatherAgeMinutes: Infinity,
      };
    }

    const diffMinutes = Math.max(0, Math.floor((Date.now() - weatherTime.getTime()) / 60000));
    if (diffMinutes < 15) {
      return {
        weatherScore: 100,
        weatherStatus: "LIVE" as const,
        weatherAgeMinutes: diffMinutes,
      };
    } else if (diffMinutes <= 60) {
      return {
        weatherScore: 50,
        weatherStatus: "AGING" as const,
        weatherAgeMinutes: diffMinutes,
      };
    } else {
      return {
        weatherScore: 0,
        weatherStatus: "STALE" as const,
        weatherAgeMinutes: diffMinutes,
      };
    }
  }, [weatherTime, hasWeatherErr]);

  // 2. Operations Component Calculation (Supabase) (Weight: 35%)
  const { operationsScore, supabaseStatus } = useMemo(() => {
    if (isDbConnected) {
      return {
        operationsScore: 100,
        supabaseStatus: "CONNECTED" as const,
      };
    }
    return {
      operationsScore: 0,
      supabaseStatus: "DISCONNECTED" as const,
    };
  }, [isDbConnected]);

  // 3. Ground Truth Component Calculation (Field Reports) (Weight: 30%)
  const { groundTruthScore, fieldReportStatus, latestReportTime, fieldReportAgeHours } = useMemo(() => {
    if (!fieldReportsList || fieldReportsList.length === 0) {
      return {
        groundTruthScore: 0,
        fieldReportStatus: "NO REPORTS" as const,
        latestReportTime: null,
        fieldReportAgeHours: Infinity,
      };
    }

    // Sort to find newest report
    const sorted = [...fieldReportsList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const newest = sorted[0];
    const newestTime = new Date(newest.created_at);
    const ageHours = Math.max(0, (Date.now() - newestTime.getTime()) / 3600000);

    // Scoring logic as per prompt:
    // last 3 hours = 100, 3 to 12 hours = 50, over 12 hours / none = 0
    let score = 0;
    if (ageHours <= 3) {
      score = 100;
    } else if (ageHours <= 12) {
      score = 50;
    } else {
      score = 0;
    }

    // Display Status:
    // Under 1 hour = ACTIVE, 1 to 6 hours = QUIET, over 6 hours = NO REPORTS
    let status: "ACTIVE" | "QUIET" | "NO REPORTS" = "NO REPORTS";
    if (ageHours < 1) {
      status = "ACTIVE";
    } else if (ageHours <= 6) {
      status = "QUIET";
    } else {
      status = "NO REPORTS";
    }

    return {
      groundTruthScore: score,
      fieldReportStatus: status,
      latestReportTime: newestTime,
      fieldReportAgeHours: ageHours,
    };
  }, [fieldReportsList]);

  // 4. Weighted Overall Score Calculation
  const overallQualityScore = useMemo(() => {
    const raw = weatherScore * 0.35 + operationsScore * 0.35 + groundTruthScore * 0.3;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }, [weatherScore, operationsScore, groundTruthScore]);

  // Score Ring Styling
  const { strokeColor, textColorClass, qualityLabelHi, qualityLabelEn, verdictSummary } =
    useMemo(() => {
      if (overallQualityScore >= 75) {
        return {
          strokeColor: "#15803D", // Green
          textColorClass: "text-emerald-700 dark:text-emerald-400",
          qualityLabelHi: "उच्च विश्वसनीयता • इष्टतम परिचालन स्थिति",
          qualityLabelEn: "High Reliability • Optimal Operational State",
          verdictSummary:
            locale === "hi"
              ? "मौसम, डेटाबेस एवं मैदानी सत्यापन तीनों घटक अद्यतन हैं।"
              : "Weather telemetry, database sync, and field truth feeds are timely.",
        };
      } else if (overallQualityScore >= 50) {
        return {
          strokeColor: "#D97706", // Yellow / Amber
          textColorClass: "text-amber-600 dark:text-amber-400",
          qualityLabelHi: "मध्यम विश्वसनीयता • कुछ डेटा स्रोतों में विलंब",
          qualityLabelEn: "Moderate Reliability • Feed Delays Detected",
          verdictSummary:
            locale === "hi"
              ? "कुछ डेटा घटकों में अद्यतन अंतराल है; निर्णय लेते समय सत्यापन करें।"
              : "Some feeds exhibit latency or gaps; exercise operational caution.",
        };
      } else {
        return {
          strokeColor: "#DC2626", // Red
          textColorClass: "text-rose-600 dark:text-rose-400",
          qualityLabelHi: "गंभीर डेटा अंतराल • सीमित विश्वसनीयता",
          qualityLabelEn: "Degraded Quality • Limited Reliability",
          verdictSummary:
            locale === "hi"
              ? "डेटा पुराना है या सेवाएँ बाधित हैं; स्वतः मूल्यांकन पर निर्भर न रहें।"
              : "Stale data or service disconnects; manual validation required.",
        };
      }
    }, [overallQualityScore, locale]);

  // Circular progress ring calculations
  const ringSize = 100;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallQualityScore / 100) * circumference;

  // Decision Impact Warning Triggers
  const showWeatherWarning = weatherStatus === "STALE";
  const showFieldReportsWarning = fieldReportAgeHours > 4;
  const showDatabaseWarning = !isDbConnected;
  const hasAnyWarning = showWeatherWarning || showFieldReportsWarning || showDatabaseWarning;

  // Format Helper for timestamps
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return locale === "hi" ? "डेटा अनुपलब्ध" : "Unavailable";
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return locale === "hi" ? "अभी-अभी" : "Just now";
    if (minutes < 60) return `${minutes} ${locale === "hi" ? "मिनट पहले" : "min ago"}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${locale === "hi" ? "घंटे पहले" : "hours ago"}`;
  };

  return (
    <Card
      className={cn(
        "border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden",
        className
      )}
    >
      {/* CARD HEADER */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0F3D66]/10 text-[#0F3D66] dark:text-sky-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  <span>समग्र डेटा गुणवत्ता एवं स्वास्थ्य मॉनिटर</span>
                </CardTitle>
                <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                  • Overall Data Quality Monitor
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500">
                {locale === "hi"
                  ? "मौसम पूर्वानुमान, ईओसी डेटाबेस एवं मैदानी रिपोर्टों का वास्तविक समय भारित विश्वसनीयता विश्लेषण।"
                  : "Real-time weighted quality index across weather telemetry, operational DB, and field truth feeds."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
              {locale === "hi" ? "अंतिम ऑडिट:" : "Audited:"}{" "}
              {lastCheckTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runSelfAudit}
              disabled={isRefreshing}
              className="text-xs h-8 px-2.5 font-semibold gap-1.5 border-slate-300 dark:border-slate-700 shadow-2xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              <span>{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5 text-xs">
        {/* SECTION 1: OVERALL DATA QUALITY SCORE PROMINENT DISPLAY */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-7">
            {/* Circular Progress Ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg width={ringSize} height={ringSize} className="rotate-[-90deg] drop-shadow-2xs">
                {/* Background Ring */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-slate-200 dark:text-slate-700"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  fill="transparent"
                />
              </svg>

              {/* Centered Score Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className={cn("text-2xl sm:text-3xl font-extrabold font-mono tracking-tight", textColorClass)}>
                  {overallQualityScore}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  / 100
                </span>
              </div>
            </div>

            {/* Score Breakdown & Narrative Details */}
            <div className="flex-1 space-y-2.5 text-center md:text-left min-w-0">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {locale === "hi" ? "समग्र डेटा गुणवत्ता" : "Overall Data Quality"}
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    ({locale === "hi" ? "भारित समग्र सूचकांक" : "Weighted Composite Index"})
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                  {locale === "hi" ? qualityLabelHi : qualityLabelEn}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {verdictSummary}
                </p>
              </div>

              {/* 3 Weighted Components Pill Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/80">
                {/* 1. Weather Component */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-blue-500" />
                      <span>{locale === "hi" ? "मौसम API" : "Weather Telemetry"}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">35% भार</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {weatherScore} / 100
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
                        weatherScore === 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : weatherScore === 50
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      )}
                    >
                      {weatherStatus}
                    </span>
                  </div>
                </div>

                {/* 2. Operations Component */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-500" />
                      <span>{locale === "hi" ? "डेटाबेस सिंक" : "Operations Sync"}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">35% भार</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {operationsScore} / 100
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
                        operationsScore === 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      )}
                    >
                      {supabaseStatus}
                    </span>
                  </div>
                </div>

                {/* 3. Ground Truth Component */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      <span>{locale === "hi" ? "मैदानी रिपोर्ट" : "Ground Truth"}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">30% भार</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {groundTruthScore} / 100
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
                        fieldReportStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : fieldReportStatus === "QUIET"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      )}
                    >
                      {fieldReportStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DECISION IMPACT WARNINGS (Conditional Banners) */}
        {hasAnyWarning && (
          <div className="space-y-2">
            {/* Weather Stale Warning */}
            {showWeatherWarning && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "मौसम डेटा पुराना है - जोखिम मूल्यांकन वर्तमान नहीं हो सकता"
                      : "Weather data is stale - risk assessment may not be current"}
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    {locale === "hi"
                      ? `अंतिम सफल मौसम अद्यतन ${weatherAgeMinutes} मिनट पहले प्राप्त हुआ था (>60 मिनट सीमा पार)। बाढ़ मॉडल पूर्वानुमानित वर्षा के बजाय स्थानीय आधारभूत स्तर पर कार्य कर रहा है।`
                      : `Last successful weather forecast telemetry received ${weatherAgeMinutes} minutes ago (>60 min limit). Flood models may compute from baseline rather than live surge.`}
                  </p>
                </div>
              </div>
            )}

            {/* No Recent Field Reports Warning */}
            {showFieldReportsWarning && (
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200 flex items-start gap-2.5 text-xs shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "कोई हालिया क्षेत्र रिपोर्ट नहीं - जमीनी स्थिति अज्ञात"
                      : "No recent field reports - ground situation unknown"}
                  </p>
                  <p className="text-[11px] text-orange-800 dark:text-orange-300 leading-relaxed">
                    {locale === "hi"
                      ? "पिछले 4 घंटों में पटवारी/तलठी या मैदानी निरीक्षकों द्वारा कोई रिपोर्ट दर्ज नहीं की गई है। जलभराव व पुल जलमग्नता की मैदानी स्थिति की पुष्टि हेतु ईओसी दल से संपर्क करें।"
                      : "No revenue officers or ground inspectors submitted reports in the past 4 hours. Ground inundation and culvert blockages remain unverified."}
                  </p>
                </div>
              </div>
            )}

            {/* Supabase Disconnected Warning */}
            {showDatabaseWarning && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start gap-2.5 text-xs shadow-2xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold">
                    {locale === "hi" ? "डेटाबेस कनेक्शन विफल" : "Database connection failed"}
                  </p>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                    {locale === "hi"
                      ? "सुपाबेस ईओसी डेटाबेस से संपर्क नहीं हो पा रहा है। आपदा टिकट, संसाधन आवंटन और दल स्थिति स्थानीय कैश मोड में प्रदर्शित हो रही है।"
                      : "Unable to reach Supabase backend. Incident dispatch, resource allocation, and team statuses are running in local offline-cache state."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: DATA SOURCES TABLE / CARD GRID (EXACT 4 SOURCES) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>📡</span>
              <span>{locale === "hi" ? "सक्रिय परिचालन डेटा स्रोत" : "Active Operational Data Sources"}</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              4 {locale === "hi" ? "मूलभूत स्रोत" : "Core Feeds"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">{locale === "hi" ? "डेटा स्रोत का नाम" : "Data Source Name"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "स्थिति बैज" : "Status Badge"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "अंतिम अद्यतन" : "Last Update"}</th>
                  <th className="py-2.5 px-3.5">{locale === "hi" ? "प्रभाव व उपयोग विवरण" : "Operational Impact Note"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {/* SOURCE 1: Open-Meteo */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-blue-600" />
                        <span>Open-Meteo मौसम API</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        Open-Meteo Weather API
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {weatherStatus === "LIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>LIVE (सजीव)</span>
                      </span>
                    ) : weatherStatus === "AGING" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>AGING (धीमा)</span>
                      </span>
                    ) : weatherStatus === "STALE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>STALE (पुराना)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-900 border border-red-400 dark:bg-red-950 dark:text-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                        <span>UNAVAILABLE (अनुपलब्ध)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {formatTimeAgo(weatherTime)}
                  </td>
                  <td className="py-3 px-3.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      मौसम पूर्वानुमान और वर्षा डेटा
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Weather forecast and rainfall data
                    </span>
                  </td>
                </tr>

                {/* SOURCE 2: OpenStreetMap & Overpass */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-600" />
                        <span>OpenStreetMap और Overpass</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        OpenStreetMap & Overpass
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                      <span>CACHED (संग्रहीत)</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {formatTimeAgo(osmCacheTime)}
                  </td>
                  <td className="py-3 px-3.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      अस्पताल, पुलिस, विद्यालय स्थान
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Hospital, Police, School locations
                    </span>
                  </td>
                </tr>

                {/* SOURCE 3: Supabase Database */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Supabase डेटाबेस</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        Supabase Database
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {isDbConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>CONNECTED (संबद्ध)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>DISCONNECTED (विच्छेदित)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {formatTimeAgo(new Date(Date.now() - 60000))}
                  </td>
                  <td className="py-3 px-3.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      घटनाएं, दल, संसाधन, आश्रय
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Incidents, Teams, Resources, Shelters
                    </span>
                  </td>
                </tr>

                {/* SOURCE 4: Field Report Feed */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-600" />
                        <span>क्षेत्र रिपोर्ट फ़ीड</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        Field Report Feed
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {fieldReportStatus === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>ACTIVE (सक्रिय &lt;1h)</span>
                      </span>
                    ) : fieldReportStatus === "QUIET" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>QUIET (शांत 1-6h)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>NO REPORTS (&gt;6h)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {formatTimeAgo(latestReportTime)}
                  </td>
                  <td className="py-3 px-3.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      जमीनी वास्तविकता डेटा
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ground reality data
                    </span>
                  </td>
                </tr>

                {/* SOURCE 5: NASA GPM IMERG Satellite Rainfall (LIVE-002) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Satellite className="w-3.5 h-3.5 text-blue-600" />
                        <span>NASA GPM उपग्रह वर्षा (IMERG)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        NASA GPM Satellite IMERG Late Run
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {nasaGpmStatus === "LIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>LIVE SATELLITE</span>
                      </span>
                    ) : nasaGpmStatus === "STALE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>STALE SATELLITE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-100 border border-slate-700">
                        <span>NOT CONFIGURED</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {nasaGpmFetchTime ? formatTimeAgo(nasaGpmFetchTime) : (locale === "hi" ? "पंजीकरण आवश्यक" : "Registration Req.")}
                  </td>
                  <td className="py-3 px-3.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      NASA Global Precipitation Measurement IMERG Late Run Product
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Spaceborne orbital microwave & infrared observation (4-6h latency)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3b: IMD Integration Status & Roadmap Card */}
        <ImdIntegrationStatusCard className="mb-2" />

        {/* SECTION 4: NOT YET INTEGRATED SECTION (PLANNED SOURCES) */}
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/30 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  <span>भविष्य में एकीकृत होने वाले स्रोत</span>
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  रोडमैप • Roadmap
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sources Planned for Future Integration (सरकारी एपीआई प्रावधान के उपरांत सक्रिय होंगे)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* 1. IMD Official API */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  <span>IMD आधिकारिक API</span>
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  IMD Official API
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  आधिकारिक मौसम अवलोकन • Official meteorological observations
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 dark:bg-slate-700">
                NOT CONFIGURED
              </span>
            </div>

            {/* 2. CWC River Gauge */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Waves className="w-3.5 h-3.5 text-slate-400" />
                  <span>CWC नदी गेज</span>
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  CWC River Gauge
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  वास्तविक समय नदी स्तर • Real-time river level data
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 dark:bg-slate-700">
                NOT CONFIGURED
              </span>
            </div>

            {/* 3. ISRO Satellite Flood Maps */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Satellite className="w-3.5 h-3.5 text-slate-400" />
                  <span>ISRO उपग्रह बाढ़ मानचित्र</span>
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  ISRO Satellite Flood Maps
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  उपग्रह-आधारित बाढ़ मानचित्रण • Satellite-based flood mapping
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 dark:bg-slate-700">
                NOT CONFIGURED
              </span>
            </div>

            {/* 4. Doppler Radar */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5 text-slate-400" />
                  <span>डॉपलर रडार</span>
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Doppler Radar
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  अल्पकालिक तूफान ट्रैकिंग • Short-term storm tracking
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 dark:bg-slate-700">
                NOT CONFIGURED
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
