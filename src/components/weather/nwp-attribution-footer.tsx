"use client";

import React from "react";
import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

export function NwpAttributionFooter() {
  const locale = useLocale();

  const models = [
    {
      name: "ECMWF IFS 0.25° Model",
      desc: "European Centre for Medium-Range Weather Forecasts (IFS Cycle 48r1)",
      flag: "🇪🇺",
    },
    {
      name: "NCEP GFS Model",
      desc: "National Centers for Environmental Prediction (NOAA Global Forecast System)",
      flag: "🇺🇸",
    },
    {
      name: "DWD ICON Model",
      desc: "Deutscher Wetterdienst (Icosahedral Nonhydrostatic Global Model)",
      flag: "🇩🇪",
    },
  ];

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs space-y-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500 shrink-0" />
          <strong className="text-slate-900 dark:text-white">
            {locale === "hi"
              ? "डेटा स्रोत: Open-Meteo API"
              : "Data Sources: Open-Meteo API"}
          </strong>
        </div>
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] dark:text-blue-400 hover:underline"
        >
          <span>open-meteo.com</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {models.map((m) => (
          <div
            key={m.name}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
              <span>{m.flag}</span>
              <span>{m.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {m.desc}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
        <p>
          {locale === "hi" ? (
            <>
              <strong>पारदर्शिता सूचना:</strong> ये मुक्त-स्रोत वैश्विक NWP मॉडल हैं। IMD के स्थानीय WRF मॉडल एकीकरण भविष्य में योजनाबद्ध है। आधिकारिक संवैधानिक चेतावनियों के लिए भारत मौसम विज्ञान विभाग (IMD) बुलेटिन को प्राथमिकता दें।
            </>
          ) : (
            <>
              <strong>Transparency Notice:</strong> These are open-source global NWP models. IMD local WRF model integration is planned for future. For statutory warnings, refer to official India Meteorological Department (IMD) bulletins.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
