"use client";

import React, { useState } from "react";
import {
  Satellite,
  AlertTriangle,
  Clock,
  RefreshCw,
  Info,
  Sliders,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SatelliteRainfallResponse } from "@/types/nasa-gpm";
import { useLocale } from "@/lib/i18n/context";
import { NasaGpmSetupModal } from "@/components/telemetry/nasa-gpm-setup-modal";

interface SatelliteRainfallCardProps {
  data: SatelliteRainfallResponse | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isStale?: boolean;
  onRefresh?: () => void;
  onOpenSetup?: () => void;
  nwpForecastMm?: number;
}

export function SatelliteRainfallCard({
  data,
  isLoading = false,
  isRefreshing = false,
  isStale = false,
  onRefresh,
  onOpenSetup,
  nwpForecastMm,
}: SatelliteRainfallCardProps) {
  const locale = useLocale();
  const [internalSetupOpen, setInternalSetupOpen] = useState<boolean>(false);

  const handleOpenSetup = () => {
    if (onOpenSetup) {
      onOpenSetup();
    } else {
      setInternalSetupOpen(true);
    }
  };

  if (isLoading && !data) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs animate-pulse">
        <div className="p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      </Card>
    );
  }

  const isConfigured = data?.isConfigured ?? false;
  const isDemoMode = !isConfigured || data?.status === "demo";

  // Comparison metrics with Open-Meteo NWP forecast
  const comparison = data?.comparison;
  const effectiveNwpForecast = nwpForecastMm ?? comparison?.nwpForecastMm;
  const showDifferenceWarning = comparison?.isSignificantDifference || (
    effectiveNwpForecast !== undefined &&
    data?.total_rainfall_mm !== undefined &&
    Math.abs(data.total_rainfall_mm - effectiveNwpForecast) > Math.max(1, (data.total_rainfall_mm + effectiveNwpForecast) / 2) * 0.2
  );

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Header */}
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Satellite className="w-5 h-5 text-[#2563EB]" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {locale === "hi" ? "उपग्रह वर्षा डेटा" : "Satellite Rainfall Data"}
                </CardTitle>
                {/* Badge: Live vs Stale vs Demo */}
                {!isDemoMode ? (
                  isStale || data?.status === "stale" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Clock className="w-3 h-3 text-amber-600" />
                      STALE SATELLITE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      NASA GPM LIVE
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    DEMO SANDBOX
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                NASA GPM IMERG (Integrated Multi-satellitE Retrievals for GPM) Late Run
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isDemoMode && (
                <Button
                  onClick={handleOpenSetup}
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold gap-1.5 border-blue-300 text-[#2563EB] hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "सेटअप निर्देश" : "Setup Instructions"}</span>
                </Button>
              )}
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-2.5 gap-1 border-slate-300 dark:border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                  <span className="hidden sm:inline">{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* DEMO MODE SETUP BANNER */}
          {isDemoMode && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "नासा GPM डेटा सक्रिय करने के लिए Earthdata पंजीकरण आवश्यक"
                      : "NASA Earthdata registration required to activate GPM data."}
                  </p>
                  <p className="opacity-90">
                    {locale === "hi"
                      ? "सर्वर पर वास्तविक GPM वर्षा डेटा प्राप्त करने के लिए क्रेडेंशियल्स दर्ज करें।"
                      : "Configure credentials to fetch operational GPM orbital precipitation telemetry."}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleOpenSetup}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0"
              >
                {locale === "hi" ? "सेटअप करें" : "Setup"}
              </Button>
            </div>
          )}

          {/* TELEMETRY METRIC VALUES (Greyed-out preview in Demo Mode) */}
          <div className={isDemoMode ? "opacity-75 filter grayscale-[25%]" : ""}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-[#2563EB]" />
                {locale === "hi" ? "उपग्रह-अवलोकित वर्षा" : "Satellite-Observed Rainfall"}
                {isDemoMode && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    DEMO
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {locale === "hi" ? "क्षेत्र: " : "District: "}
                {data?.district || "Pune"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Metric 1: 24h Area Average */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 block">
                  {locale === "hi" ? "पिछले 24 घंटे उपग्रह वर्षा (औसत)" : "Last 24h Satellite Rainfall (Area Average)"}
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {data?.total_rainfall_mm !== undefined ? `${data.total_rainfall_mm}` : "--"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mm</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {locale === "hi" ? "संपूर्ण जिला ग्रिड का क्षेत्रीय औसत" : "Area weighted spatial mean"}
                </span>
              </div>

              {/* Metric 2: Peak Maximum in District */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 block">
                  {locale === "hi" ? "जिले में अधिकतम वर्षा (पीक)" : "Maximum in District (Peak Grid Cell)"}
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {data?.max_rainfall_mm !== undefined ? `${data.max_rainfall_mm}` : "--"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mm</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {locale === "hi" ? "0.1° उपग्रह ग्रिड में दर्ज उच्चतम मान" : "Highest 0.1° orbital sensor reading"}
                </span>
              </div>

              {/* Metric 3: Observation Cells */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-1">
                <span className="text-xs text-slate-500 block">
                  {locale === "hi" ? "सक्रिय स्थानिक ग्रिड बिंदु" : "Active Spatial Grid Cells"}
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-[#0F3D66] dark:text-blue-400">
                    {data?.rainfall_spatial_distribution?.length || 121}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">cells</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  ~10 km x 10 km {locale === "hi" ? "रिज़ॉल्यूशन कवरेज" : "resolution coverage"}
                </span>
              </div>
            </div>
          </div>

          {/* WARNING: Difference between Model and Satellite Data (>20%) */}
          {showDifferenceWarning && comparison && (
            <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">
                  {locale === "hi"
                    ? "मॉडल और उपग्रह डेटा में अंतर (20% से अधिक)"
                    : "Difference between model and satellite data (>20% deviation)"}
                </p>
                <p className="opacity-90">
                  {locale === "hi"
                    ? `NWP मॉडल पूर्वानुमान: ${comparison.nwpForecastMm} mm | उपग्रह वास्तविक अवलोकन: ${comparison.satelliteObservedMm} mm (अंतर: ${comparison.differencePercent}%)`
                    : `NWP Model Forecast: ${comparison.nwpForecastMm} mm | Satellite Observed Actual: ${comparison.satelliteObservedMm} mm (${comparison.differencePercent}% variance)`}
                </p>
              </div>
            </div>
          )}

          {/* SCIENTIFIC EXPLANATION OF IMERG & LATENCY */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
              <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  IMERG = Integrated Multi-satellitE Retrievals for GPM
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                  {locale === "hi"
                    ? "यह वास्तविक उपग्रह अवलोकन है, मॉडल पूर्वानुमान नहीं"
                    : "This is actual satellite observation, not model forecast."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>{locale === "hi" ? "विलंबता सूचना:" : "Data Latency Note:"}</strong>{" "}
                {locale === "hi"
                  ? "उपग्रह डेटा में 4-6 घंटे की देरी होती है"
                  : "Satellite data has 4-6 hour latency for orbital pass synthesis."}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Setup Modal */}
      <NasaGpmSetupModal
        isOpen={internalSetupOpen}
        onClose={() => setInternalSetupOpen(false)}
      />
    </>
  );
}
