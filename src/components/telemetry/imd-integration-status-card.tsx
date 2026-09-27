"use client";

import React from "react";
import {
  CheckCircle2,
  Circle,
  Radio,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

// Client-safe source status — reads NEXT_PUBLIC env var only.
// When IMD API is properly configured, set NEXT_PUBLIC_WEATHER_PROVIDER=IMD_API in .env.local
function getClientSourceStatus() {
  const provider =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_WEATHER_PROVIDER || "OPEN_METEO"
      : "OPEN_METEO";
  const isImd = provider === "IMD_API";
  return {
    primarySource: isImd ? "IMD Official API" : "Open-Meteo ECMWF",
    fallbackSource: isImd ? "Open-Meteo ECMWF" : "Not configured",
    isImdActive: isImd,
  };
}

export function ImdIntegrationStatusCard({ className }: { className?: string }) {
  const locale = useLocale();
  const sourceStatus = getClientSourceStatus();

  const steps = [
    {
      step: 1,
      titleHi: "Open-Meteo मौसम डेटा एकीकृत",
      titleEn: "Open-Meteo weather data integrated",
      status: "COMPLETED",
      descHi: "ECMWF और GFS मल्टी-मॉडल से 7-दिवसीय प्रति घंटा व दैनिक टेलीमेट्री सक्रिय।",
      descEn: "Live 7-day hourly & daily telemetry from ECMWF and GFS multi-model operational.",
    },
    {
      step: 2,
      titleHi: "IMD बुलेटिन हस्तचालित डेटा प्रविष्टि तैयार",
      titleEn: "IMD bulletin manual entry interface ready",
      status: "CURRENT", // Current step highlighted
      descHi: "डीएम एवं ईओसी ड्यूटी अधिकारियों द्वारा आधिकारिक बुलेटिन और सीडब्ल्यूसी डेटा प्रविष्टि इंटरफेस सक्रिय।",
      descEn: "Authorized manual entry interface for DM and EOC duty officers active with Supabase persistence.",
    },
    {
      step: 3,
      titleHi: "IMD API MOU प्रक्रिया की शुरुआत (योजनाबद्ध)",
      titleEn: "IMD API MOU initiation (planned)",
      status: "PENDING",
      descHi: "पृथ्वी विज्ञान मंत्रालय (MoES) और मौसम विभाग से प्रत्यक्ष एपीआई एक्सेस हेतु द्विपक्षीय समझौता।",
      descEn: "Bilateral agreement with Ministry of Earth Sciences for direct machine-to-machine API access.",
    },
    {
      step: 4,
      titleHi: "IMD रीयल-टाइम API एकीकरण (चरण 2)",
      titleEn: "IMD real-time API integration (Phase 2)",
      status: "PENDING",
      descHi: "ऑटोमेटेड वेदर स्टेशन (AWS) और डोपलर वेदर रडार (DWR) से वास्तविक समय ऑटोमैटिक डेटा इनजेशन।",
      descEn: "Automated ingestion from IMD Automatic Weather Stations (AWS) and Doppler Weather Radars (DWR).",
    },
    {
      step: 5,
      titleHi: "IMD NWP मॉडल आउटपुट एकीकरण (चरण 3)",
      titleEn: "IMD NWP model output integration (Phase 3)",
      status: "PENDING",
      descHi: "उच्च-रिज़ॉल्यूशन NCUM और WRF न्यूमेरिकल वेदर प्रेडिक्शन मॉडल ग्रिड का प्रत्यक्ष विश्लेषण।",
      descEn: "Direct integration of high-resolution NCUM and WRF Numerical Weather Prediction model grids.",
    },
  ];

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-sm ${className || ""}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0F3D66] dark:text-sky-400" />
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "IMD एकीकरण स्थिति" : "IMD Integration Status"}
            </CardTitle>
          </div>
          {/* Primary & Fallback source telemetry pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span className="font-semibold">{locale === "hi" ? "प्राथमिक स्रोत:" : "Primary:"}</span>
              <span>{sourceStatus.primarySource}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="font-semibold">{locale === "hi" ? "बैकअप स्रोत:" : "Fallback:"}</span>
              <span>{sourceStatus.fallbackSource}</span>
            </span>
          </div>
        </div>
        <CardDescription className="text-xs text-slate-500">
          {locale === "hi"
            ? "भारतीय मौसम विज्ञान विभाग (IMD) के आधिकारिक डेटा स्रोतों के साथ चरणबद्ध एकीकरण रोडमैप।"
            : "Phased integration roadmap for official India Meteorological Department telemetry and bulletins."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Mandatory Policy Statement */}
        <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-950 dark:text-blue-200 space-y-0.5">
            <p className="font-medium">
              {locale === "hi"
                ? "वर्तमान में Open-Meteo ECMWF मॉडल डेटा उपयोग किया जा रहा है। IMD API एकीकरण के लिए MOU प्रक्रिया योजनाबद्ध है।"
                : "Currently using Open-Meteo ECMWF model data. MOU process for IMD API integration is planned."}
            </p>
          </div>
        </div>

        {/* 5-Step Roadmap Stepper */}
        <div className="space-y-2.5">
          {steps.map((s) => {
            const isCompleted = s.status === "COMPLETED";
            const isCurrent = s.status === "CURRENT";

            return (
              <div
                key={`step-${s.step}`}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-400/40"
                    : isCompleted
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                    : "border-slate-100 dark:border-slate-800/40 bg-transparent opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox / Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted || isCurrent ? (
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            isCurrent
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          0{s.step}
                        </span>
                        <h5
                          className={`text-xs font-bold ${
                            isCurrent
                              ? "text-emerald-900 dark:text-emerald-200"
                              : isCompleted
                              ? "text-slate-800 dark:text-slate-200"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {locale === "hi" ? s.titleHi : s.titleEn}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {locale === "hi" ? s.descHi : s.descEn}
                      </p>
                    </div>
                  </div>

                  {/* Stage Badges */}
                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider animate-pulse">
                        {locale === "hi" ? "सक्रिय चरण" : "Current Step"}
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40">
                        {locale === "hi" ? "पूर्ण" : "Done"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800">
                        {locale === "hi" ? "योजनाबद्ध" : "Planned"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
