"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Satellite,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { GpmModelComparison } from "@/types/nasa-gpm";

interface ModelVsSatelliteComparisonCardProps {
  nwpForecastMm: number;
  satelliteObservedMm: number;
  comparison?: GpmModelComparison;
  isDemo?: boolean;
}

export function ModelVsSatelliteComparisonCard({
  nwpForecastMm,
  satelliteObservedMm,
  comparison,
  isDemo = false,
}: ModelVsSatelliteComparisonCardProps) {
  const locale = useLocale();

  // Compute metrics if comparison not pre-computed
  const diffMm = Math.round(Math.abs(satelliteObservedMm - nwpForecastMm) * 10) / 10;
  const base = Math.max(1, (nwpForecastMm + satelliteObservedMm) / 2);
  const diffPct = comparison?.differencePercent ?? Math.round((diffMm / base) * 100);

  const isHighAgreement = diffPct <= 15;

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[#2563EB]" />
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              {locale === "hi"
                ? "मॉडल बनाम उपग्रह वर्षा तुलना"
                : "Model vs Satellite Rainfall Comparison"}
            </CardTitle>
          </div>
          {isDemo && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {locale === "hi" ? "डेमो तुलना" : "DEMO COMPARISON"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Two-Column Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: NWP Model (Open-Meteo) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Cpu className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                NWP Model (Open-Meteo)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                FORECAST
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {Math.round(nwpForecastMm * 10) / 10}
              </span>
              <span className="text-sm font-semibold text-slate-500">mm</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {locale === "hi"
                ? "संख्यात्मक वायुमंडलीय मॉडल पूर्वानुमान (ECMWF/GFS)"
                : "Numerical physics atmospheric model projection"}
            </p>
          </div>

          {/* Column 2: Satellite Observed (NASA GPM) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Satellite className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Satellite Observed (NASA GPM)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ACTUAL SENSOR
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {Math.round(satelliteObservedMm * 10) / 10}
              </span>
              <span className="text-sm font-semibold text-slate-500">mm</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {locale === "hi"
                ? "नासा IMERG कक्षीय माइक्रोवेव एवं इन्फ्रारेड सेंसर अवलोकन"
                : "NASA IMERG spaceborne microwave & infrared retrieval"}
            </p>
          </div>
        </div>

        {/* Operational Interpretation Banner */}
        {isHighAgreement ? (
          <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {locale === "hi"
                  ? "उच्च सहमति - पूर्वानुमान विश्वसनीय"
                  : "High agreement - forecast reliable"}
              </p>
              <p className="opacity-90">
                {locale === "hi"
                  ? `मॉडल और उपग्रह अवलोकन में केवल ${diffPct}% (अंतर: ${diffMm} mm) का अंतर है। दोनों डेटा स्रोत मेल खा रहे हैं।`
                  : `Model and satellite observation differ by only ${diffPct}% (variance: ${diffMm} mm). Ground observation validates atmospheric model.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {locale === "hi"
                  ? "महत्वपूर्ण अंतर - उपग्रह डेटा को प्राथमिकता दें"
                  : "Significant difference - prioritize satellite data"}
              </p>
              <p className="opacity-90">
                {locale === "hi"
                  ? `मॉडल और उपग्रह में ${diffPct}% (अंतर: ${diffMm} mm) का अंतर है। वास्तविक ज़मीनी स्थिति हेतु उपग्रह डेटा को अधिक महत्व दें।`
                  : `Model and satellite diverge by ${diffPct}% (variance: ${diffMm} mm). Prioritize satellite observation for actual ground response.`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
