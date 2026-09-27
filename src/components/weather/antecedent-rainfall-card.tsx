"use client";

import React from "react";
import { Droplets, AlertTriangle, ShieldCheck, Waves, Info, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AntecedentRainfallSummary, SoilMoistureCategory } from "@/types";
import { useLocale, Locale } from "@/lib/i18n/context";

interface AntecedentRainfallCardProps {
  antecedent?: AntecedentRainfallSummary | null;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export function getSoilCategoryBadge(category: SoilMoistureCategory, locale: Locale = "en"): {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (category) {
    case "CRITICAL_SATURATION":
      return {
        label: locale === "hi" ? "गंभीर संतृप्ति (AMC-III चरम)" : "Critical Saturation (AMC-III Extreme)",
        badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
        icon: AlertTriangle,
      };
    case "SATURATED":
      return {
        label: locale === "hi" ? "संतृप्त भूमि (AMC-III उच्च)" : "Saturated Ground (AMC-III High)",
        badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
        icon: Waves,
      };
    case "MODERATE":
      return {
        label: locale === "hi" ? "नम / अवशोषक (AMC-II)" : "Moist / Absorbing (AMC-II)",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
        icon: Droplets,
      };
    case "DRY":
    default:
      return {
        label: locale === "hi" ? "सूखी अंतःस्रवण भूमि (AMC-I)" : "Dry Infiltration Bed (AMC-I)",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
        icon: ShieldCheck,
      };
  }
}

export const AntecedentRainfallCard: React.FC<AntecedentRainfallCardProps> = ({
  antecedent,
  isLoading = false,
  className = "",
  compact = false,
}) => {
  const locale = useLocale();
  if (isLoading) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
        <div className="p-5 animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded w-full" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        </div>
      </Card>
    );
  }

  const p24 = antecedent?.precip24h ?? 0;
  const p48 = antecedent?.precip48h ?? 0;
  const p72 = antecedent?.precip72h ?? 0;
  const category = antecedent?.soilMoistureIndex ?? "DRY";
  const multiplier = antecedent?.runoffRiskMultiplier ?? 1.0;
  const badgeInfo = getSoilCategoryBadge(category, locale);
  const BadgeIcon = badgeInfo.icon;

  if (compact) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 p-3.5 shadow-xs flex flex-col justify-between ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            {locale === "hi" ? "पूर्ववर्ती भूमि संतृप्ति" : "Antecedent Ground Saturation"}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.badgeClass}`}>
            {category}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              {locale === "hi" ? "पूर्ववर्ती 24घं" : "Prior 24h"}
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">{p24}</span>
            <span className="text-[9px] text-slate-400 ml-0.5">mm</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              {locale === "hi" ? "पूर्ववर्ती 48घं" : "Prior 48h"}
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">{p48}</span>
            <span className="text-[9px] text-slate-400 ml-0.5">mm</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              {locale === "hi" ? "पूर्ववर्ती 72घं" : "Prior 72h"}
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">{p72}</span>
            <span className="text-[9px] text-slate-400 ml-0.5">mm</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">{locale === "hi" ? "अपवाह गुणक:" : "Runoff Factor:"}</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            {multiplier.toFixed(1)}x {locale === "hi" ? "गुणांक" : "coefficient"}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {locale === "hi" ? "पूर्ववर्ती वर्षा एवं मृदा संतृप्ति" : "Antecedent Rainfall & Soil Saturation"}
              </CardTitle>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "पूर्ववर्ती 24घं, 48घं एवं 72घं में हुई वर्षा जो भूमि अंतःस्रवण क्षमता निर्धारित करती है।"
                  : "Precipitation fallen in preceding 24h, 48h & 72h determining ground infiltration capacity."}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${badgeInfo.badgeClass}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              {badgeInfo.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3 Accumulation Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{locale === "hi" ? "पूर्ववर्ती 24 घंटे" : "Prior 24 Hours"}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1.5 text-2xl font-black font-mono text-slate-900 dark:text-white">
              {p24} <span className="text-xs font-normal text-slate-500">mm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {p24 === 0
                ? (locale === "hi" ? "हाल में कोई वर्षा नहीं" : "Zero recent rainfall")
                : p24 > 30
                ? (locale === "hi" ? "तीव्र तात्कालिक संतृप्ति" : "Heavy immediate saturation")
                : (locale === "hi" ? "हल्का भूमि अवशोषण" : "Light ground dampening")}
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{locale === "hi" ? "पूर्ववर्ती 48 घंटे" : "Prior 48 Hours"}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1.5 text-2xl font-black font-mono text-slate-900 dark:text-white">
              {p48} <span className="text-xs font-normal text-slate-500">mm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {locale === "hi" ? "उपसतही कैचमेंट नमी संचय" : "Subsurface catchment moisture accumulation"}
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
              <span className="font-semibold">{locale === "hi" ? "पूर्ववर्ती 72 घंटे (3 दिन)" : "Prior 72 Hours (3 Days)"}</span>
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-1.5 text-2xl font-black font-mono text-[#0F3D66] dark:text-blue-400">
              {p72} <span className="text-xs font-normal text-slate-500">mm</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              {locale === "hi" ? "कुल 3-दिवसीय हाइड्रोलॉजिकल रिचार्ज" : "Total 3-day hydrological antecedent recharge"}
            </p>
          </div>
        </div>

        {/* Operational Hydrologic Context */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {locale === "hi" ? "कैचमेंट हाइड्रोलॉजिक व्यवहार:" : "Catchment Hydrologic Behavior:"}{" "}
              {antecedent?.soilMoistureDescription || (locale === "hi" ? "मानक अवशोषण दर।" : "Standard absorption rates.")}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {locale === "hi"
                ? "जब मिट्टी सूखी (AMC-I) होती है, तो आने वाली वर्षा का पानी काफी हद तक भूजल में अवशोषित हो जाता है। संतृप्त परिस्थितियों (AMC-III) में, बाद में होने वाली वर्षा तुरंत सतही अपवाह में बदल जाती है, जिससे निचले शहरी नोड्स में जलभराव और अचानक बाढ़ का खतरा काफी बढ़ जाता है।"
                : "When soil is dry (AMC-I), incoming downpours are largely absorbed into the water table. Under saturated conditions (AMC-III), subsequent rainfall will immediately convert to rapid overland flow, substantially increasing waterlogging and flash flood risk in low-lying urban nodes."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
