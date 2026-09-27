"use client";

import React from "react";
import { Info, Activity, Mountain, Layers, ShieldCheck, Gauge } from "lucide-react";
import { HydraulicModelConfig } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface HydraulicModelBannerProps {
  config: HydraulicModelConfig;
  className?: string;
}

export const HydraulicModelBanner: React.FC<HydraulicModelBannerProps> = ({
  config,
  className = "",
}) => {
  const locale = useLocale();

  return (
    <div
      className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3.5 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0" />
          <strong className="text-xs uppercase tracking-wider text-slate-900 dark:text-white">
            {locale === "hi"
              ? "जलभराव संवेदनशीलता एवं मॉडलिंग ढांचा स्थिति"
              : "Inundation Intelligence & Modelling Framework"}
          </strong>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          {locale === "hi" ? "जिला आपदा निर्णय समर्थन V1" : "District Disaster Decision Support V1"}
        </span>
      </div>

      {/* 4-Card Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Flood Risk Assessment */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {locale === "hi" ? "बाढ़ जोखिम मूल्यांकन" : "Flood Risk Assessment"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {locale === "hi" ? "सक्रिय" : "ACTIVE"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            {locale === "hi"
              ? "बहु-कारक स्थितिजन्य निगरानी स्तर (वर्षा + पूर्ववर्ती आर्द्रता)"
              : "Multi-factor situational watch level (rainfall + soil saturation)"}
          </p>
        </div>

        {/* Card 2: Terrain Analysis */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {locale === "hi" ? "भूभाग विश्लेषण" : "Terrain Analysis"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              {locale === "hi" ? "डीईएम सत्यापित" : "DEM VERIFIED"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            {locale === "hi"
              ? "नासा एसआरटीएम एवं कॉपरनिकस 30मी डिजिटल एलिवेशन मॉडल"
              : "NASA SRTM & Copernicus 30m Digital Elevation Model"}
          </p>
        </div>

        {/* Card 3: Experimental Inundation Susceptibility */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
              {locale === "hi" ? "प्रायोगिक जलभराव संवेदनशीलता" : "Inundation Susceptibility"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
              {locale === "hi" ? "सक्रिय (V1 इंजन)" : "ACTIVE (V1)"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            {locale === "hi"
              ? "सापेक्ष ऊंचाई, ढलान, वर्षा एवं नदी निकटता का एकीकृत सूचकांक"
              : "Relative elevation deficit, slope, rain & river reach index"}
          </p>
        </div>

        {/* Card 4: Calibrated Hydraulic Water Depth (Neutral Slate Informational) */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              {locale === "hi" ? "कैलिब्रेटेड हाइड्रोलिक गहराई" : "Hydraulic Water Depth"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-mono">
              {config.status === "NOT_CONFIGURED" ? (locale === "hi" ? "कॉन्फ़िगर नहीं" : "NOT CONFIGURED") : config.statusText}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            {locale === "hi"
              ? `2D HEC-RAS / LISFLOOD (इंजन: ${config.modelType}) गेज सत्यापन प्रतीक्षारत (मीटर मान रोके गए)`
              : `Awaiting 2D hydrodynamic gauge calibration (Engine: ${config.modelType}, depth in m withheld)`}
          </p>
        </div>
      </div>

      {/* Scientific Transparency & Non-Fabrication Notice */}
      <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
        <p>
          {locale === "hi" ? (
            <>
              <strong>वैज्ञानिक एवं परिचालन पारदर्शिता:</strong> वर्षानेत्र वास्तविक, नियतात्मक और स्थलाकृतिक-जागरूक <em>प्रायोगिक जलभराव संवेदनशीलता इंजन (V1)</em> संचालित करता है जो वर्षा पूर्वानुमान, पूर्ववर्ती मृदा संतृप्ति, डीईएम सापेक्ष ऊंचाई कमी और जलमार्ग निकटता का संयोजन करता है। आपदा कमान इंजीनियरिंग निर्देशों (नियम #14, #18) के सख्त अनुपालन में, भौतिक 2D हाइड्रोडायनामिक सिमुलेशन (HEC-RAS 2D / LISFLOOD-FP) के बिना मीटर में संख्यात्मक बाढ़ गहराई को <strong>मनगढ़ंत नहीं बनाया गया है</strong>।
            </>
          ) : (
            <>
              <strong>Scientific & Operational Transparency:</strong> VarshaNetra operates a real, deterministic, terrain-aware{" "}
              <em>Experimental Inundation Susceptibility Engine (V1)</em> combining meteorological precipitation forecasts, antecedent soil moisture, DEM relative elevation deficits, and river proximity vectors. In strict adherence to disaster command engineering directives (#14, #18), numerical water depth in metres is{" "}
              <strong>NOT fabricated</strong> without calibrated 2D hydrodynamic simulation (HEC-RAS 2D / LISFLOOD-FP) against verified river gauge telemetry.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
