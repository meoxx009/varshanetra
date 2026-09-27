"use client";

import React from "react";
import { CloudRain, Droplets, Mountain, Waves, X, ShieldAlert } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { SusceptibilityFeatureProperties } from "@/lib/services/floodSusceptibility";

interface SusceptibilityDetailCardProps {
  properties: SusceptibilityFeatureProperties;
  onClose?: () => void;
  compact?: boolean;
}

export function SusceptibilityDetailCard({
  properties,
  onClose,
  compact = false,
}: SusceptibilityDetailCardProps) {
  const locale = useLocale();
  const { factors, inputs, score, category, categoryHi, categoryEn, color } = properties;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md ${
        compact ? "p-3 text-[11px] max-w-xs" : "p-4 text-xs space-y-3"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-xs shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <div>
            <div className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
              {locale === "hi" ? "बाढ़ संवेदनशीलता क्षेत्र" : "Flood Susceptibility Zone"}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              GPS: {properties.lat.toFixed(4)}°N, {properties.lon.toFixed(4)}°E
            </div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label={locale === "hi" ? "बंद करें" : "Close"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Prominent Mandatory Disclaimer Banner */}
      <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/30 text-[10px] space-y-1">
        <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {locale === "hi"
              ? "यह प्रायोगिक संवेदनशीलता मानचित्रण है, वास्तविक बाढ़ गहराई भविष्यवाणी नहीं"
              : "This is EXPERIMENTAL susceptibility mapping, NOT actual flood depth prediction."}
          </span>
        </div>
        <p className="text-amber-800 dark:text-amber-300 leading-tight">
          {locale === "hi"
            ? "यह स्थान-विशेष अनुमान है। CWC और IMD के आधिकारिक डेटा से सत्यापित करें।"
            : "This is a location-specific estimate. Verify with official CWC and IMD data."}
        </p>
      </div>

      {/* Susceptibility Level & Overall Score */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">
            {locale === "hi" ? "संवेदनशीलता स्तर" : "Susceptibility Level"}
          </div>
          <div className="text-sm font-black flex items-center gap-1.5" style={{ color }}>
            <span>{category}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({locale === "hi" ? categoryHi : categoryEn})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">
            {locale === "hi" ? "कुल स्कोर" : "Overall Score"}
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {score} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Contributing Factors Breakdown (All 4 Components) */}
      <div className="space-y-2">
        <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
          {locale === "hi" ? "योगदान कारक विश्लेषण" : "Contributing Factors Breakdown"}
        </div>

        <div className="space-y-1.5 text-[11px]">
          {/* Factor 1: Rainfall Component */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {locale === "hi" ? "वर्षा घटक" : "Rainfall"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "वर्तमान + 24घं:" : "Cur + 24h:"} {(inputs.currentRainfallMm + inputs.forecast24hMm).toFixed(1)} mm
                </span>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-blue-700 dark:text-blue-300">
              {factors.rainfallScore} / 35
            </div>
          </div>

          {/* Factor 2: Antecedent Moisture */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {locale === "hi" ? "पूर्ववर्ती आर्द्रता" : "Antecedent Moisture"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "पिछले 72घं:" : "Prev 72h:"} {inputs.previous72hRainfallMm.toFixed(1)} mm
                </span>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-teal-700 dark:text-teal-300">
              {factors.antecedentMoistureScore} / 20
            </div>
          </div>

          {/* Factor 3: Elevation Component */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {locale === "hi" ? "सापेक्ष भूभाग ऊँचाई" : "Relative Elevation"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "सापेक्ष स्तर:" : "Rel level:"} {inputs.elevationM}m ({inputs.slopePercent}% slope)
                </span>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {factors.elevationScore} / 25
            </div>
          </div>

          {/* Factor 4: River Proximity Component */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {locale === "hi" ? "नदी निकटता" : "River Proximity"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "नदी दूरी:" : "River dist:"} {inputs.distanceToRiverKm} km
                </span>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
              {factors.riverProximityScore} / 20
            </div>
          </div>
        </div>
      </div>

      {/* Footer Data Source Note */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>SRTM DEM + Open-Meteo + OSM</span>
        <span className="font-semibold text-[#0F3D66] dark:text-blue-400">VarshaNetra ROAD-003</span>
      </div>
    </div>
  );
}
