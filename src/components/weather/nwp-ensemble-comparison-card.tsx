"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert, Cpu, Wind, CloudRain, Droplets } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EnsembleComparison, ModelAgreementLevel } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface NwpEnsembleComparisonCardProps {
  comparison: EnsembleComparison;
  isStale?: boolean;
  cacheAgeMinutes?: number;
}

export function NwpEnsembleComparisonCard({
  comparison,
  isStale = false,
  cacheAgeMinutes = 0,
}: NwpEnsembleComparisonCardProps) {
  const locale = useLocale();
  const { ecmwf, gfs, icon, ensemble } = comparison;

  // Rainfall color coding helper based on IMD categories:
  // Red: > 115mm
  // Orange: > 64.5mm
  // Yellow: > 15.6mm
  // Green: <= 15.6mm
  const getRainfallColorClasses = (rainMm: number, available: boolean) => {
    if (!available) return "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40";
    if (rainMm >= 115.0) {
      return "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800";
    }
    if (rainMm >= 64.5) {
      return "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";
    }
    if (rainMm >= 15.6) {
      return "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    }
    return "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
  };

  const getAgreementBadge = (agreement: ModelAgreementLevel) => {
    switch (agreement) {
      case "HIGH":
        return {
          labelEn: "HIGH AGREEMENT (Within 20% Spread)",
          labelHi: "उच्च सहमति (20% से कम अंतर)",
          bgClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
          icon: CheckCircle2,
          textEn: "When models agree, forecast is more reliable",
          textHi: "जब मॉडल सहमत हों तो पूर्वानुमान अधिक विश्वसनीय होता है",
        };
      case "MODERATE":
        return {
          labelEn: "MODERATE AGREEMENT (20% – 40% Spread)",
          labelHi: "मध्यम सहमति (20% से 40% अंतर)",
          bgClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700",
          icon: AlertTriangle,
          textEn: "Moderate spread observed across global NWP models",
          textHi: "वैश्विक मॉडल के बीच मध्यम अंतर देखा गया है",
        };
      case "LOW":
      default:
        return {
          labelEn: "LOW AGREEMENT (Significant Spread >40%)",
          labelHi: "कम सहमति (विभिन्न मॉडल असहमत)",
          bgClass: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border-red-300 dark:border-red-700",
          icon: ShieldAlert,
          textEn: "Models disagree - high uncertainty",
          textHi: "विभिन्न मॉडल असहमत हैं - उच्च अनिश्चितता",
        };
    }
  };

  const agreementMeta = getAgreementBadge(ensemble.agreement);
  const AgreementIcon = agreementMeta.icon;

  const modelsList = [
    { key: "ecmwf", data: ecmwf, label: "ECMWF IFS (European)", flag: "🇪🇺" },
    { key: "gfs", data: gfs, label: "GFS (American)", flag: "🇺🇸" },
    { key: "icon", data: icon, label: "ICON (German)", flag: "🇩🇪" },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Cpu className="w-5 h-5 text-[#0F3D66] dark:text-blue-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi"
                  ? "बहु-मॉडल मौसम पूर्वानुमान"
                  : "Multi-Model NWP Ensemble Forecast"}
              </CardTitle>
              {isStale && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  {locale === "hi" ? `कैश (${cacheAgeMinutes}m पुराना)` : `STALE (${cacheAgeMinutes}m old)`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "ECMWF IFS + GFS + ICON मॉडल औसत"
                : "ECMWF IFS + GFS + ICON Model Average"}
            </p>
          </div>

          {/* Model Agreement Badge */}
          <div className="flex flex-col sm:items-end gap-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${agreementMeta.bgClass}`}
            >
              <AgreementIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{locale === "hi" ? agreementMeta.labelHi : agreementMeta.labelEn}</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              {locale === "hi" ? agreementMeta.textHi : agreementMeta.textEn}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 min-w-[140px]">
                  {locale === "hi" ? "पैरामीटर / मॉडल" : "Parameter / Model"}
                </th>
                <th className="p-3 min-w-[130px] text-center">
                  <div className="font-bold text-blue-700 dark:text-blue-300">
                    🇪🇺 ECMWF IFS
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">European 0.25°</div>
                </th>
                <th className="p-3 min-w-[130px] text-center">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">
                    🇺🇸 GFS
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">American NOAA</div>
                </th>
                <th className="p-3 min-w-[130px] text-center">
                  <div className="font-bold text-orange-700 dark:text-orange-300">
                    🇩🇪 ICON
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">German DWD</div>
                </th>
                <th className="p-3 min-w-[140px] text-center bg-[#0F3D66]/5 dark:bg-blue-950/30 border-l border-slate-200 dark:border-slate-800">
                  <div className="font-black text-[#0F3D66] dark:text-blue-300 uppercase tracking-wide">
                    {locale === "hi" ? "मॉडल औसत" : "Ensemble Average"}
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">Multi-Model Mean</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Row 1: 24h Rainfall */}
              <tr>
                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                  <span>{locale === "hi" ? "24घं वर्षा पूर्वानुमान" : "24h Rainfall Forecast"}</span>
                </td>
                {modelsList.map((m) => (
                  <td key={m.key} className="p-3 text-center">
                    {m.data.available ? (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md font-mono font-bold border ${getRainfallColorClasses(
                          m.data.rainfall24h,
                          true
                        )}`}
                      >
                        {m.data.rainfall24h} <span className="text-[10px] font-normal">mm</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        {m.data.unavailableReason || "Unavailable"}
                      </span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center bg-[#0F3D66]/5 dark:bg-blue-950/30 border-l border-slate-200 dark:border-slate-800">
                  <span
                    className={`inline-block px-3 py-1 rounded-md font-mono text-sm font-black border ${getRainfallColorClasses(
                      ensemble.rainfall24h,
                      true
                    )}`}
                  >
                    {ensemble.rainfall24h} <span className="text-[10px] font-normal">mm</span>
                  </span>
                </td>
              </tr>

              {/* Row 2: Probability of Precipitation */}
              <tr>
                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  <span>{locale === "hi" ? "वर्षा की संभावना" : "Precipitation Probability"}</span>
                </td>
                {modelsList.map((m) => (
                  <td key={m.key} className="p-3 text-center">
                    {m.data.available ? (
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {m.data.precipitationProbability}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">--</span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center bg-[#0F3D66]/5 dark:bg-blue-950/30 border-l border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-[#0F3D66] dark:text-blue-300">
                    {ensemble.precipitationProbability}%
                  </span>
                </td>
              </tr>

              {/* Row 3: Maximum Wind Speed */}
              <tr>
                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-slate-500" />
                  <span>{locale === "hi" ? "अधिकतम हवा की गति" : "Maximum Wind Speed"}</span>
                </td>
                {modelsList.map((m) => (
                  <td key={m.key} className="p-3 text-center">
                    {m.data.available ? (
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {m.data.maxWindSpeed}{" "}
                        <span className="text-[10px] text-slate-500">km/h</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">--</span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center bg-[#0F3D66]/5 dark:bg-blue-950/30 border-l border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-[#0F3D66] dark:text-blue-300">
                    {ensemble.maxWindSpeed}{" "}
                    <span className="text-[10px] font-normal text-slate-500">km/h</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Spread & Range Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-slate-500">
              {locale === "hi" ? "मॉडल वर्षा प्रसार (Spread):" : "Model Spread Range:"}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {ensemble.spread} mm ({ensemble.minRainfall24h} – {ensemble.maxRainfall24h} mm)
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-slate-500">
              {locale === "hi" ? "सक्रिय मॉडल गणना:" : "Active NWP Feeds:"}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {modelsList.filter((m) => m.data.available).length} / 3 Operational
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-slate-500">
              {locale === "hi" ? "आईएमडी सीमा संदर्भ:" : "IMD Reference Threshold:"}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {ensemble.rainfall24h >= 115.6
                ? "Very Heavy Rain"
                : ensemble.rainfall24h >= 64.5
                ? "Heavy Rain"
                : ensemble.rainfall24h >= 15.6
                ? "Moderate Rain"
                : "Light / Normal"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
