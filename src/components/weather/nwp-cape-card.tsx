"use client";

import React from "react";
import { Zap, AlertTriangle, ShieldCheck, ShieldAlert, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CapeMetrics } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface NwpCapeCardProps {
  cape: CapeMetrics;
}

export function NwpCapeCard({ cape }: NwpCapeCardProps) {
  const locale = useLocale();

  const getRiskMeta = (level: "LOW" | "MODERATE" | "HIGH" | "EXTREME") => {
    switch (level) {
      case "EXTREME":
        return {
          labelEn: "EXTREME CONVECTIVE RISK",
          labelHi: "अत्यंत तीव्र संवहनी जोखिम",
          bgClass: "bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-200 border-red-300 dark:border-red-700",
          icon: ShieldAlert,
          colorHex: "#DC2626",
          badgeColor: "text-red-600",
          alertNoteEn: "Extreme convective rain - flash flood danger",
          alertNoteHi: "अत्यंत तीव्र संवहनी वर्षा - अचानक बाढ़ का खतरा",
        };
      case "HIGH":
        return {
          labelEn: "HIGH CONVECTIVE RISK",
          labelHi: "उच्च संवहनी जोखिम",
          bgClass: "bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-200 border-orange-300 dark:border-orange-700",
          icon: AlertTriangle,
          colorHex: "#EA580C",
          badgeColor: "text-orange-600",
          alertNoteEn: "Intense rain with thunderstorm possible",
          alertNoteHi: "गरज के साथ तीव्र वर्षा संभव",
        };
      case "MODERATE":
        return {
          labelEn: "MODERATE CONVECTIVE RISK",
          labelHi: "मध्यम संवहनी जोखिम",
          bgClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-700",
          icon: AlertTriangle,
          colorHex: "#D97706",
          badgeColor: "text-amber-600",
          alertNoteEn: "Scattered thunderstorms possible",
          alertNoteHi: "छिटपुट गरज-चमक संभव",
        };
      case "LOW":
      default:
        return {
          labelEn: "LOW CONVECTIVE RISK",
          labelHi: "कम संवहनी जोखिम",
          bgClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
          icon: ShieldCheck,
          colorHex: "#15803D",
          badgeColor: "text-emerald-600",
          alertNoteEn: "Atmosphere stable, minimal storm activity",
          alertNoteHi: "स्थिर वायुमंडल, न्यूनतम तूफान गतिविधि",
        };
    }
  };

  const riskMeta = getRiskMeta(cape.riskLevel);
  const RiskIcon = riskMeta.icon;

  // Percentage for the 0 to 4000 J/kg visual bar
  const gaugePercent = Math.min(100, Math.max(5, (cape.peakCape24h / 4000) * 100));

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi"
                  ? "CAPE सूचकांक (वायुमंडलीय अस्थिरता)"
                  : "CAPE Index (Atmospheric Instability)"}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "Convective Available Potential Energy — ECMWF IFS मॉडल गणना"
                : "Convective Available Potential Energy — ECMWF IFS Model Assessment"}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${riskMeta.bgClass}`}
          >
            <RiskIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{locale === "hi" ? riskMeta.labelHi : riskMeta.labelEn}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Core Value & Explanation Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center sm:text-left">
            <span className="text-[11px] text-slate-500 font-semibold block">
              {locale === "hi" ? "शीर्ष CAPE (आगामी 24 घंटे)" : "Peak 24h CAPE Value"}
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {cape.peakCape24h}{" "}
              <span className="text-xs font-normal text-slate-500">J/kg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {locale === "hi" ? `वर्तमान स्तर: ${cape.currentCape} J/kg` : `Current hour: ${cape.currentCape} J/kg`}
            </span>
          </div>

          <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {locale === "hi"
                  ? "CAPE सूचकांक गरज के साथ तीव्र वर्षा की संभावना दर्शाता है"
                  : "CAPE index indicates potential for intense convective rainfall"}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              {locale === "hi" ? cape.descriptionHi : cape.descriptionEn}
            </p>
            {(cape.riskLevel === "HIGH" || cape.riskLevel === "EXTREME") && (
              <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 text-[11px] font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>
                  <strong>{locale === "hi" ? "चेतावनी नोट:" : "Operational Note:"}</strong>{" "}
                  {locale === "hi" ? riskMeta.alertNoteHi : riskMeta.alertNoteEn}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Threshold Meter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>0 J/kg</span>
            <span className="text-emerald-600">500 (Low)</span>
            <span className="text-amber-600">1500 (Mod)</span>
            <span className="text-orange-600">3000 (High)</span>
            <span className="font-bold text-red-600">4000+ (Extreme)</span>
          </div>

          {/* Color Gradient Track */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex">
            <div className="h-full bg-emerald-500 w-[12.5%]" title="Below 500 J/kg: Low" />
            <div className="h-full bg-amber-400 w-[25%]" title="500 to 1500 J/kg: Moderate" />
            <div className="h-full bg-orange-500 w-[37.5%]" title="1500 to 3000 J/kg: High" />
            <div className="h-full bg-red-600 w-[25%]" title="Above 3000 J/kg: Extreme" />
          </div>

          {/* Current Needle Indicator */}
          <div className="relative w-full h-4">
            <div
              className="absolute top-0 -ml-1.5 flex flex-col items-center transition-all duration-500"
              style={{ left: `${gaugePercent}%` }}
            >
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-900 dark:border-b-white" />
              <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white">
                ▲
              </span>
            </div>
          </div>
        </div>

        {/* Operational Thresholds Guide (4-Column) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
          <div className="p-2 rounded border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>&lt; 500 J/kg</span>
              <span className="text-[10px] uppercase font-bold text-emerald-700">Low</span>
            </div>
            <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300 mt-0.5">
              {locale === "hi" ? "कम संवहनी जोखिम" : "Low convective risk"}
            </div>
          </div>

          <div className="p-2 rounded border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>500 - 1500 J/kg</span>
              <span className="text-[10px] uppercase font-bold text-amber-700">Moderate</span>
            </div>
            <div className="text-[10px] text-amber-800/80 dark:text-amber-300 mt-0.5">
              {locale === "hi" ? "मध्यम संवहनी जोखिम" : "Moderate convective risk"}
            </div>
          </div>

          <div className="p-2 rounded border border-orange-200 dark:border-orange-800/80 bg-orange-50/60 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200">
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>1500 - 3000 J/kg</span>
              <span className="text-[10px] uppercase font-bold text-orange-700">High</span>
            </div>
            <div className="text-[10px] text-orange-800/80 dark:text-orange-300 mt-0.5 font-medium">
              {locale === "hi" ? "गरज के साथ तीव्र वर्षा संभव" : "Intense rain with thunderstorm possible"}
            </div>
          </div>

          <div className="p-2 rounded border border-red-200 dark:border-red-800/80 bg-red-50/60 dark:bg-red-950/20 text-red-900 dark:text-red-200">
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>&gt; 3000 J/kg</span>
              <span className="text-[10px] uppercase font-bold text-red-700">Extreme</span>
            </div>
            <div className="text-[10px] text-red-800/80 dark:text-red-300 mt-0.5 font-medium">
              {locale === "hi" ? "अत्यंत तीव्र संवहनी वर्षा - अचानक बाढ़" : "Extreme convective rain - flash flood danger"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
