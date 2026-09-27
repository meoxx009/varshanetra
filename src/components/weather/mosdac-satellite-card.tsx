"use client";

import React, { useState } from "react";
import {
  Satellite,
  AlertTriangle,
  Clock,
  RefreshCw,
  Info,
  Sliders,
  Thermometer,
  CloudRain,
  Flame,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MosdacRainfallResponse } from "@/types/mosdac";
import { useLocale } from "@/lib/i18n/context";
import { MosdacSetupModal } from "@/components/telemetry/mosdac-setup-modal";

interface MosdacSatelliteCardProps {
  data: MosdacRainfallResponse | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isStale?: boolean;
  onRefresh?: () => void;
  onOpenSetup?: () => void;
}

export function MosdacSatelliteCard({
  data,
  isLoading = false,
  isRefreshing = false,
  isStale = false,
  onRefresh,
  onOpenSetup,
}: MosdacSatelliteCardProps) {
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
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      </Card>
    );
  }

  const isConfigured = data?.isConfigured ?? false;
  const isDemoMode = !isConfigured || data?.status === "demo";

  const cloudTemp = data?.cloud_top_temperature ?? 216.5;
  const isSevereTemp = cloudTemp < 220;
  const isModerateTemp = cloudTemp >= 220 && cloudTemp <= 240;

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Tricolor ISRO Top Banner */}
        <div className="h-1 w-full bg-linear-to-r from-orange-500 via-white to-emerald-600" />

        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Satellite className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {locale === "hi"
                    ? "🇮🇳 ISRO MOSDAC - INSAT-3D उपग्रह डेटा"
                    : "🇮🇳 ISRO MOSDAC - INSAT-3D Satellite Data"}
                </CardTitle>

                {/* Saffron Indian Satellite Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {locale === "hi" ? "भारतीय उपग्रह डेटा" : "Indian Satellite Data"}
                </span>

                {/* Status Badge */}
                {!isDemoMode ? (
                  isStale || data?.status === "stale" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Clock className="w-3 h-3 text-amber-600" />
                      STALE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ISRO INSAT-3D LIVE
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
                Space Applications Centre (SAC), Ahmedabad &bull; Geostationary Meteorological Observation
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isDemoMode && (
                <Button
                  onClick={handleOpenSetup}
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/50 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-orange-600" />
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
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
                  <span className="hidden sm:inline">{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* DEMO MODE NOTICE BANNER */}
          {isDemoMode && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "MOSDAC पंजीकरण से वास्तविक INSAT-3D डेटा सक्रिय करें"
                      : "Activate real INSAT-3D data with MOSDAC registration."}
                  </p>
                  <p className="opacity-90">
                    {locale === "hi"
                      ? "SAC अहमदाबाद पोर्टल से क्रेडेंशियल्स दर्ज करके उपग्रह उत्पाद प्राप्त करें।"
                      : "Configure credentials to fetch operational SAC Ahmedabad satellite telemetry."}
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

          {/* TELEMETRY METRICS SECTION (Greyed in demo mode) */}
          <div className={isDemoMode ? "opacity-80 filter grayscale-[20%]" : ""}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Current Rainfall Rate (Large Number) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{locale === "hi" ? "वर्तमान वर्षा दर" : "Rainfall Rate (INSAT-3D)"}</span>
                  <CloudRain className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {data?.rainfall_rate_mmhr !== undefined ? data.rainfall_rate_mmhr : "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mm / hr</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {locale === "hi" ? "Hydroestimator तात्कालिक दर" : "Hydroestimator instant rate"}
                </p>
              </div>

              {/* Metric 2: Cloud Top Temperature */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{locale === "hi" ? "बादल शीर्ष तापमान" : "Cloud Top Temperature"}</span>
                  <Thermometer className={`w-4 h-4 ${isSevereTemp ? "text-red-600" : isModerateTemp ? "text-amber-500" : "text-emerald-500"}`} />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-black ${isSevereTemp ? "text-red-600 dark:text-red-400" : isModerateTemp ? "text-amber-600" : "text-emerald-600"}`}>
                    {data?.cloud_top_temperature !== undefined ? `${data.cloud_top_temperature}` : "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">K</span>
                </div>
                <p className="text-[11px] font-semibold mt-1">
                  {isSevereTemp ? (
                    <span className="text-red-600 dark:text-red-400">
                      &lt;220 K: {locale === "hi" ? "अति तीव्र संवहन" : "Very Deep Convection"}
                    </span>
                  ) : isModerateTemp ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      220-240 K: {locale === "hi" ? "मध्यम संवहन" : "Moderate Convection"}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      &gt;240 K: {locale === "hi" ? "कमजोर संवहन" : "Weak Convection"}
                    </span>
                  )}
                </p>
              </div>

              {/* Metric 3: Hydroestimator 3-Hour Accumulation */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{locale === "hi" ? "3-घंटे संचयी वर्षा" : "3-Hour Accumulation"}</span>
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {data?.three_hour_accum !== undefined ? data.three_hour_accum : "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mm</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {locale === "hi" ? "Hydroestimator 3h संचयी" : "Hydroestimator 3h cumulative"}
                </p>
              </div>

              {/* Metric 4: Hydroestimator 6-Hour Accumulation */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{locale === "hi" ? "6-घंटे संचयी वर्षा" : "6-Hour Accumulation"}</span>
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {data?.six_hour_accum !== undefined ? data.six_hour_accum : "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mm</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {locale === "hi" ? "Hydroestimator 6h संचयी" : "Hydroestimator 6h cumulative"}
                </p>
              </div>
            </div>

            {/* Cloud Top Storm Severity Indicator Banner */}
            {isSevereTemp && (
              <div className="mt-3 p-3.5 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "तीव्र संवहनी तूफान का संकेत - अचानक बाढ़ का जोखिम"
                      : "Intense convective storm detected - flash flood risk elevated"}
                  </p>
                  <p className="opacity-90">
                    {locale === "hi"
                      ? data?.storm_intensity_reason?.hi || "बादल शीर्ष तापमान 220 K से नीचे होने के कारण तीव्र वर्षा और जलभराव का खतरा है।"
                      : data?.storm_intensity_reason?.en || "Cloud top temperature below 220 K indicates severe convective towers and heightened cloud-burst potential."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Official IMD Alignment Note */}
          <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/60 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {locale === "hi"
                  ? "यह भारतीय मौसम सेवा के लिए वही उपग्रह डेटा है जो IMD उपयोग करती है"
                  : "This is the same satellite data used by IMD for Indian weather services."}
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {locale === "hi"
                  ? "INSAT-3D (82°E) और INSAT-3DR (74°E) भारतीय उपमहाद्वीप का निरंतर 24 घंटे मल्टीस्पेक्ट्रल अवलोकन प्रदान करते हैं, जो स्थानीय स्तर पर सटीक और कैलिब्रेटेड डेटा सुनिश्चित करते हैं।"
                  : "INSAT-3D (located geostationary at 82°E) and INSAT-3DR (at 74°E) provide continuous round-the-clock multispectral scanning of the Indian subcontinent, ensuring superior local calibration compared to global orbital satellites."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Setup Modal */}
      <MosdacSetupModal
        isOpen={internalSetupOpen}
        onClose={() => setInternalSetupOpen(false)}
      />
    </>
  );
}
