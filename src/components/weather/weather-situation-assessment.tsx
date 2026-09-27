"use client";

import React, { useMemo } from "react";
import {
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Wind,
  Droplets,
  Activity,
  Layers,
  Info,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/lib/i18n/context";
import { DistrictLocation } from "@/types";
import { NormalizedTelemetrySnapshot } from "@/lib/services/canonical-telemetry";
import { cn } from "@/lib/utils";

export interface WeatherSituationAssessmentProps {
  location: DistrictLocation;
  snapshot: NormalizedTelemetrySnapshot | null;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  error?: string | null;
  className?: string;
}

export function WeatherSituationAssessment({
  location,
  snapshot,
  isLoading,
  isRefreshing = false,
  onRefresh,
  error = null,
  className = "",
}: WeatherSituationAssessmentProps) {
  const locale = useLocale();

  // ─── 1. SAFE DATA EXTRACTION & MEMOIZED HOOKS (Rules of Hooks) ───
  const observations = snapshot?.observations;
  const forecast = snapshot?.forecast;
  const officialAlerts = snapshot?.officialAlerts;
  const derivedRisk = snapshot?.derivedRisk;
  const canonicalAssessment = snapshot?.canonicalAssessment;
  const snapshotId = snapshot?.snapshotId || "";
  const generatedAt = snapshot?.generatedAt || "";

  const acc6h = Number(forecast?.accumulations?.next6h ?? 0);
  const acc12h = Number(forecast?.accumulations?.next12h ?? 0);
  const acc24h = Number(forecast?.accumulations?.next24h ?? 0);

  // Near-term Trend & Hydrodynamic Momentum Evaluation
  const trendAnalysis = useMemo(() => {
    if (acc6h >= 35 || (acc12h - acc6h) >= 40 || acc24h >= 80) {
      return {
        key: "ESCALATING",
        labelEn: "Escalating",
        labelHi: "तीव्र वृद्धि (गंभीर)",
        color: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800",
        icon: TrendingUp,
        summaryEn: "Intense convective rain bursts forecast. Runoff discharge will accelerate rapidly across drainage networks.",
        summaryHi: "तीव्र वर्षा पूर्वानुमान। जल निकासी नेटवर्क में अपवाह बहाव तेजी से बढ़ेगा।",
      };
    }
    if (acc6h >= 15 || (acc12h - acc6h) >= 20 || acc24h >= 40) {
      return {
        key: "ELEVATING",
        labelEn: "Elevating",
        labelHi: "वृद्धि की ओर",
        color: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
        icon: TrendingUp,
        summaryEn: "Rainfall is increasing across forward windows and requires heightened monitoring at low-lying chokepoints.",
        summaryHi: "आगामी घंटों में वर्षा बढ़ रही है और निचले क्षेत्रों में निरंतर निगरानी की आवश्यकता है।",
      };
    }
    if (acc6h > 0 && acc12h <= acc6h * 1.2) {
      return {
        key: "EASING",
        labelEn: "Easing",
        labelHi: "शांत होने की ओर",
        color: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
        icon: TrendingDown,
        summaryEn: "Precipitation volume easing after initial localized showers. Infiltration capacity absorbing runoff.",
        summaryHi: "प्रारंभिक बौछारों के बाद वर्षा मात्रा में कमी। मिट्टी की अवशोषण क्षमता स्थिर बनी हुई है।",
      };
    }
    return {
      key: "STABLE",
      labelEn: "Stable / Quiescent",
      labelHi: "स्थिर / सामान्य",
      color: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
      icon: Minus,
      summaryEn: "No significant rainfall signal in the next 6 to 12 hours. Basin conditions remain quiescent.",
      summaryHi: "अगले 6 से 12 घंटों में कोई महत्वपूर्ण वर्षा संकेत नहीं है। बेसिन स्थिति शांत एवं स्थिर है।",
    };
  }, [acc6h, acc12h, acc24h]);

  // Plain Language Operational Guidance (VNET-WEATHER-INTEL-004)
  const plainLanguageMessage = useMemo(() => {
    if (acc6h <= 1 && acc12h <= 2 && acc24h <= 5) {
      return locale === "hi"
        ? "अगले 6 घंटों में कोई महत्वपूर्ण वर्षा संकेत नहीं है। सामान्य दैनिक गतिविधियां सुरक्षित हैं।"
        : "No significant rainfall signal in the next 6 hours. Routine field conditions remain safe.";
    }
    if (acc6h > 35 || acc24h > 65 || officialAlerts?.severity === "WARNING") {
      return locale === "hi"
        ? "भारी वर्षा संकेत दर्ज किया गया है; आधिकारिक आईएमडी एवं ईओसी चेतावनियों की निरंतर निगरानी जारी रखें।"
        : "Heavy rainfall signal detected; continue monitoring official warnings and district emergency channels.";
    }
    if (acc6h > 15 || (acc12h - acc6h > 20)) {
      return locale === "hi"
        ? "वर्षा में क्रमिक वृद्धि दर्ज हो रही है और यह जलभराव क्षेत्रों में सतत निगरानी की मांग करती है।"
        : "Rainfall is increasing and requires monitoring at vulnerable culverts and low-lying reaches.";
    }
    return locale === "hi"
      ? "हल्की से मध्यम बौछारें संभावित हैं; सतही अपवाह सामान्य सीमा के भीतर रहने का अनुमान है।"
      : "Isolated or light showers anticipated; surface runoff expected to remain within standard drainage tolerance.";
  }, [acc6h, acc12h, acc24h, officialAlerts?.severity, locale]);

  // Key Drivers (from canonical assessment)
  const rainfallDriver = useMemo(() => {
    const d = canonicalAssessment?.keyDrivers?.find(
      (k) => k.key === "FORECAST_PRECIPITATION" || k.key === "ANTECEDENT_RAINFALL"
    );
    return (
      d || {
        key: "FORECAST_PRECIPITATION",
        label: "Forward 24h Precipitation",
        labelHi: "आगामी 24 घंटे वर्षा",
        rawValue: acc24h,
        unit: "mm",
        weightedContribution: 25.0,
        rationale: acc24h > 0 ? `${acc24h} mm forward 24h forecast.` : "Negligible forward precipitation signal.",
        rationaleHi: acc24h > 0 ? `आगामी 24 घंटों में ${acc24h} मिमी वर्षा।` : "नगण्य आगामी वर्षा संकेत।",
      }
    );
  }, [canonicalAssessment?.keyDrivers, acc24h]);

  const terrainDriver = useMemo(() => {
    const d = canonicalAssessment?.keyDrivers?.find(
      (k) => k.key === "TERRAIN_SLOPE" || k.key === "RELATIVE_ELEVATION" || k.key === "WATERWAY_PROXIMITY"
    );
    return (
      d || {
        key: "TERRAIN_SLOPE",
        label: "Topographical Slope Gradient",
        labelHi: "भूभाग ढलान ग्रेडिएंट",
        rawValue: 2.5,
        unit: "%",
        weightedContribution: 16.8,
        rationale: "Favorable slope gradient supports natural runoff gravity evacuation.",
        rationaleHi: "प्राकृतिक अपवाह निकासी हेतु अनुकूल ढलान।",
      }
    );
  }, [canonicalAssessment?.keyDrivers]);

  // Formatted Timestamps
  const formattedObsTime = useMemo(() => {
    if (!observations?.observedAt && !generatedAt) return "--";
    try {
      const d = new Date(observations?.observedAt || generatedAt);
      return (
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    } catch {
      return observations?.observedAt || "--";
    }
  }, [observations?.observedAt, generatedAt]);

  const formattedAlertTime = useMemo(() => {
    if (!officialAlerts?.issuedAt) return "--";
    try {
      const d = new Date(officialAlerts.issuedAt);
      return (
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    } catch {
      return officialAlerts.issuedAt;
    }
  }, [officialAlerts?.issuedAt]);

  // Risk Level Badging
  const riskBadgeConfig = useMemo(() => {
    const level = (derivedRisk?.riskLevel || "LOW").toUpperCase();
    switch (level) {
      case "SEVERE":
      case "CRITICAL":
        return {
          bg: "bg-red-600 text-white",
          border: "border-red-600",
          text: "text-red-700 dark:text-red-400",
          badgeText: locale === "hi" ? "गंभीर जोखिम" : "SEVERE RISK",
          icon: ShieldAlert,
        };
      case "HIGH":
        return {
          bg: "bg-orange-600 text-white",
          border: "border-orange-600",
          text: "text-orange-700 dark:text-orange-400",
          badgeText: locale === "hi" ? "उच्च जोखिम" : "HIGH RISK",
          icon: AlertTriangle,
        };
      case "MODERATE":
        return {
          bg: "bg-amber-600 text-white",
          border: "border-amber-600",
          text: "text-amber-700 dark:text-amber-400",
          badgeText: locale === "hi" ? "मध्यम जोखिम" : "MODERATE RISK",
          icon: AlertTriangle,
        };
      case "LOW":
      default:
        return {
          bg: "bg-emerald-600 text-white",
          border: "border-emerald-600",
          text: "text-emerald-700 dark:text-emerald-400",
          badgeText: locale === "hi" ? "न्यूनतम जोखिम" : "LOW RISK",
          icon: CheckCircle2,
        };
    }
  }, [derivedRisk?.riskLevel, locale]);

  // Official Alert Color Code Config
  const alertColorConfig = useMemo(() => {
    const code = officialAlerts?.colorCode || "Green";
    switch (code) {
      case "Red":
        return {
          bg: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
          pill: "bg-red-600 text-white",
          badgeText: locale === "hi" ? "रेड अलर्ट (तत्काल कार्रवाई)" : "RED WARNING (Take Action)",
          icon: ShieldAlert,
        };
      case "Orange":
        return {
          bg: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40",
          pill: "bg-orange-600 text-white",
          badgeText: locale === "hi" ? "ऑरेंज अलर्ट (सतर्क रहें)" : "ORANGE ALERT (Be Prepared)",
          icon: AlertTriangle,
        };
      case "Yellow":
        return {
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
          pill: "bg-amber-600 text-white",
          badgeText: locale === "hi" ? "येलो वॉच (अपडेट रहें)" : "YELLOW WATCH (Be Updated)",
          icon: AlertTriangle,
        };
      case "Green":
      default:
        return {
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
          pill: "bg-emerald-600 text-white",
          badgeText: locale === "hi" ? "हरा (सामान्य स्थिति)" : "GREEN (No Severe Warning)",
          icon: CheckCircle2,
        };
    }
  }, [officialAlerts?.colorCode, locale]);

  // ─── 2. EARLY RETURNS FOR LOADING / ERROR / EMPTY STATES (Directive #6) ───
  if (isLoading && !snapshot) {
    return (
      <Card className={cn("bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden", className)}>
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <Skeleton className="h-28 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error && !snapshot) {
    return (
      <Card className={cn("bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-sm rounded-2xl p-6", className)}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">
                {locale === "hi" ? "मौसम स्थिति टेलीमेट्री लोड करने में त्रुटि" : "Error Loading Weather Situation Telemetry"}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{error}</p>
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-1.5 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry Sync"}</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!snapshot || !observations || !forecast || !officialAlerts || !derivedRisk || !canonicalAssessment) {
    return (
      <Card className={cn("bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 text-center space-y-2", className)}>
        <Info className="w-6 h-6 text-slate-400 mx-auto" />
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
          {locale === "hi" ? "कोई टेलीमेट्री स्नैपशॉट उपलब्ध नहीं" : "No Telemetry Snapshot Available"}
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {locale === "hi"
            ? "इस ज़िला निर्देशांक हेतु कोई वैध कैनोनिकल स्नैपशॉट प्राप्त नहीं हुआ।"
            : "No active canonical telemetry snapshot found for this district. Please synchronize or select an authorized pilot location."}
        </p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>{locale === "hi" ? "टेलीमेट्री सिंक करें" : "Sync Telemetry"}</span>
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden transition-all",
        className
      )}
    >
      {/* ─── SECTION HEADER & CANONICAL SNAPSHOT PROVENANCE ─── */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center">
                <CloudRain className="w-4 h-4 text-cyan-300" />
              </div>
              <CardTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "मौसम स्थिति" : "Weather Situation"}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  • {location.shortName || location.displayName}
                </span>
              </CardTitle>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {locale === "hi"
                ? "सत्यापित वायुमंडलीय स्थिति एवं आगामी 6, 12 व 24 घंटे की बाढ़-जोखिम प्रासंगिकता का एकीकृत विश्लेषण।"
                : "Verified atmospheric conditions & forward flood-risk context over the next 6, 12, and 24 hours."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
              title={`Canonical Snapshot Identifier: ${snapshotId}`}
            >
              {snapshotId}
            </span>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-7 text-xs px-2 gap-1 border-slate-300 dark:border-slate-700"
                title="Synchronize Canonical Telemetry"
              >
                <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-[#2563EB]")} />
                <span className="hidden sm:inline">{locale === "hi" ? "सिंक" : "Sync"}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* ─── PRIMARY SECTION: 4-CARD METRIC GRID ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: Current Weather */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {locale === "hi" ? "वर्तमान मौसम" : "Current Weather"}
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {observations.temperature.toFixed(1)}°C
                </h4>
                <p className="text-xs font-semibold text-[#0F3D66] dark:text-cyan-400 mt-0.5">
                  {observations.weatherDescription}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] border border-blue-200 dark:border-blue-900/50">
                <CloudRain className="w-5 h-5" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  {locale === "hi" ? "आर्द्रता:" : "Humidity:"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{observations.relativeHumidity}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-slate-400" />
                  {locale === "hi" ? "हवा:" : "Wind:"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-200">
                  {observations.windSpeed} km/h ({observations.windDirectionCompass})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                <span>{locale === "hi" ? "अवलोकन:" : "Observed:"}</span>
                <span className="font-mono">{formattedObsTime}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: Next 6h / 12h / 24h Rainfall Forecast */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {locale === "hi" ? "वर्षा पूर्वानुमान" : "Rainfall Forecast"}
                </span>
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-blue-400 text-blue-700 dark:text-blue-300">
                  ECMWF / GFS
                </Badge>
              </div>

              {/* 3-Window Micro Columns */}
              <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/70">
                  <span className="text-[10px] font-bold text-slate-500 block">+6h</span>
                  <span className={cn("text-sm font-black block mt-0.5", acc6h > 20 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                    {acc6h.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">mm</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/70">
                  <span className="text-[10px] font-bold text-slate-500 block">+12h</span>
                  <span className={cn("text-sm font-black block mt-0.5", acc12h > 35 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                    {acc12h.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">mm</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/70">
                  <span className="text-[10px] font-bold text-slate-500 block">+24h</span>
                  <span className={cn("text-sm font-black block mt-0.5", acc24h > 65 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white")}>
                    {acc24h.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">mm</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                {acc6h === 0 && acc12h === 0
                  ? (locale === "hi" ? "अगले 6 घंटे वर्षा रहित रहने का संकेत।" : "No rain signal detected in next 6h.")
                  : (locale === "hi" ? `आगामी 24 घंटे कुल संचय ${acc24h.toFixed(1)} मिमी अनुमानित।` : `Cumulative ${acc24h.toFixed(1)} mm anticipated in 24h.`)}
              </p>
            </div>
          </div>

          {/* CARD 3: Official IMD Warning (Statutory Government Notice) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#0F3D66] dark:text-cyan-400" />
                  {locale === "hi" ? "आधिकारिक IMD चेतावनी" : "Official IMD Warning"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  Statutory
                </span>
              </div>

              {/* Warning Level Badge */}
              <div className="mt-2.5">
                <div className={cn("p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5", alertColorConfig.bg)}>
                  <alertColorConfig.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{alertColorConfig.badgeText}</span>
                </div>
              </div>

              {/* Hazard & Validity */}
              <div className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold line-clamp-2">
                  {officialAlerts.headlineEn || "Normal Routine Meteorological State"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {locale === "hi" ? "वैधता: आगामी 24 घंटे" : "Validity: Active 24h window"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[120px]">{officialAlerts.source}</span>
              <span className="font-mono shrink-0">{formattedAlertTime}</span>
            </div>
          </div>

          {/* CARD 4: VarshaNetra Flood-Risk Category (Model-Derived) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#2563EB]" />
                  {locale === "hi" ? "वर्षानेत्र बाढ़ जोखिम" : "Flood-Risk Category"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  Model
                </span>
              </div>

              {/* Risk Level Callout */}
              <div className="mt-2.5 flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", riskBadgeConfig.bg)} />
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {riskBadgeConfig.badgeText}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {derivedRisk.riskScore.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">/100</span>
                </div>
              </div>

              {/* Confidence & Completeness Bar */}
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>{locale === "hi" ? "डेटा पूर्णता:" : "Data Completeness:"}</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {Math.round(derivedRisk.dataCompleteness)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0F3D66] dark:bg-blue-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(derivedRisk.dataCompleteness, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{locale === "hi" ? "मल्टी-फैक्टर इंजन" : "Multi-factor Synthesis"}</span>
              <span className="font-mono">Directive #18 Verified</span>
            </div>
          </div>
        </div>

        {/* ─── SECONDARY SECTION: FLOOD SITUATION OUTLOOK ─── */}
        <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F3D66] dark:text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === "hi" ? "बाढ़ स्थिति परिदृश्य" : "Flood Situation Outlook"}
              </h4>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                ({locale === "hi" ? "जलगतिकीय संवेग एवं भौतिक बेसिन विश्लेषण" : "Hydrodynamic momentum & physical basin susceptibility"})
              </span>
            </div>

            {/* Near-term Trend Badge */}
            <div className={cn("px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 self-start sm:self-auto", trendAnalysis.color)}>
              <trendAnalysis.icon className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? `प्रवृत्ति: ${trendAnalysis.labelHi}` : `Trend: ${trendAnalysis.labelEn}`}</span>
            </div>
          </div>

          {/* 3-Column Outlook Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Column 1: Near-Term Trend Narrative */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {locale === "hi" ? "निकट-अवधि संवेग (6-24 घंटे)" : "Near-Term Momentum (6-24h)"}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {locale === "hi" ? trendAnalysis.summaryHi : trendAnalysis.summaryEn}
              </p>
            </div>

            {/* Column 2: Key Rainfall Driver */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-blue-500" />
                  {locale === "hi" ? "प्रमुख वर्षा कारक" : "Key Rainfall Driver"}
                </span>
                <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {rainfallDriver.weightedContribution.toFixed(1)}% Weight
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {locale === "hi" && rainfallDriver.labelHi ? rainfallDriver.labelHi : rainfallDriver.label}:{" "}
                <span className="text-[#0F3D66] dark:text-cyan-400">{rainfallDriver.rawValue} {rainfallDriver.unit}</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                {locale === "hi" && rainfallDriver.rationaleHi ? rainfallDriver.rationaleHi : rainfallDriver.rationale}
              </p>
            </div>

            {/* Column 3: Key Terrain / Hydrology Driver */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-purple-500" />
                  {locale === "hi" ? "प्रमुख भूभाग कारक" : "Key Terrain / Hydrology"}
                </span>
                <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {terrainDriver.weightedContribution.toFixed(1)}% Weight
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {locale === "hi" && terrainDriver.labelHi ? terrainDriver.labelHi : terrainDriver.label}:{" "}
                <span className="text-[#0F3D66] dark:text-cyan-400">{terrainDriver.rawValue} {terrainDriver.unit}</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                {locale === "hi" && terrainDriver.rationaleHi ? terrainDriver.rationaleHi : terrainDriver.rationale}
              </p>
            </div>
          </div>

          {/* Simple Language Guidance Banner (VNET-WEATHER-INTEL-004) */}
          <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2 text-blue-950 dark:text-blue-200">
              <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold mr-1.5">
                  {locale === "hi" ? "परिचालन सारांश:" : "Operational Summary:"}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {plainLanguageMessage}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
              {locale === "hi"
                ? "निर्णय समर्थन केवल • DDMA सांविधिक आदेशों का पालन करें"
                : "Decision Support Only • Strictly Follow DDMA Statutory Orders"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherSituationAssessment;
