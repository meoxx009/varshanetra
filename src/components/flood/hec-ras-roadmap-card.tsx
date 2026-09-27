"use client";

import React from "react";
import { Cpu, CheckCircle2, ShieldAlert, Waves } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

interface HydraulicRoadmapPhase {
  phase: string;
  titleEn: string;
  titleHi: string;
  status: "current" | "phase2" | "phase3" | "phase4";
  descEn: string;
  descHi: string;
  tagEn: string;
  tagHi: string;
}

const PHASES: HydraulicRoadmapPhase[] = [
  {
    phase: "Current",
    titleEn: "Empirical Susceptibility Mapping",
    titleHi: "अनुभवजन्य संवेदनशीलता मानचित्रण",
    status: "current",
    descEn: "Experimental terrain-based susceptibility mapping using free SRTM DEM and OSM data.",
    descHi: "निःशुल्क SRTM DEM और ओपनस्ट्रीटमैप डेटा का उपयोग करके भूभाग-आधारित प्रायोगिक संवेदनशीलता मानचित्रण।",
    tagEn: "Active Pilot",
    tagHi: "सक्रिय पायलट",
  },
  {
    phase: "Phase 2",
    titleEn: "CWC Gauge Boundary Conditions",
    titleHi: "CWC गेज सीमा शर्तें",
    status: "phase2",
    descEn: "Integration with CWC river gauge boundary conditions for semi-hydraulic analysis.",
    descHi: "अर्ध-हाइड्रोलिक विश्लेषण हेतु CWC नदी गेज सीमा स्थितियों का एकीकरण।",
    tagEn: "Planned",
    tagHi: "प्रस्तावित",
  },
  {
    phase: "Phase 3",
    titleEn: "Full HEC-RAS 2D Hydrodynamic Modeling",
    titleHi: "पूर्ण HEC-RAS 2D हाइड्रोडायनामिक मॉडलिंग",
    status: "phase3",
    descEn: "Full HEC-RAS 2D hydraulic model integration for certified flood depth and extent mapping.",
    descHi: "प्रमाणित बाढ़ गहराई एवं विस्तार मानचित्रण हेतु पूर्ण HEC-RAS 2D हाइड्रोलिक मॉडल एकीकरण।",
    tagEn: "Under Architecture",
    tagHi: "संरचनाधीन",
  },
  {
    phase: "Phase 4",
    titleEn: "Real-Time Telemetric Hydraulics",
    titleHi: "रीयल-टाइम टेलीमेट्रिक हाइड्रोलिक्स",
    status: "phase4",
    descEn: "Real-time hydraulic modeling with automated IMD and CWC input feeds.",
    descHi: "स्वचालित IMD वर्षा और CWC नदी इनपुट फीड के साथ रीयल-टाइम हाइड्रोलिक मॉडलिंग।",
    tagEn: "Target 2027",
    tagHi: "लक्ष्य 2027",
  },
];

export function HecRasRoadmapCard({ className = "" }: { className?: string }) {
  const locale = useLocale();

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Cpu className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
            <span>
              {locale === "hi"
                ? "हाइड्रोलिक मॉडलिंग रोडमैप (HEC-RAS 2D)"
                : "Hydraulic Modeling Roadmap (HEC-RAS 2D)"}
            </span>
          </CardTitle>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            USACE HEC-RAS
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3.5 text-xs">
        {/* Mandatory Prominent Disclaimer Banner */}
        <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/30 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight space-y-1">
            <div className="font-bold text-amber-950 dark:text-amber-200">
              {locale === "hi"
                ? "यह प्रायोगिक संवेदनशीलता मानचित्रण है, वास्तविक बाढ़ गहराई भविष्यवाणी नहीं"
                : "This is EXPERIMENTAL susceptibility mapping, NOT actual flood depth prediction."}
            </div>
            <div className="text-amber-800 dark:text-amber-300 text-[10px]">
              {locale === "hi"
                ? "HEC-RAS 2D सॉफ्टवेयर अमेरिकी सेना कोर ऑफ इंजीनियर्स द्वारा निःशुल्क उपलब्ध है। जिला-विशिष्ट कैलिब्रेशन के लिए CWC सहयोग आवश्यक होगा।"
                : "HEC-RAS 2D software is freely available from US Army Corps of Engineers. District-specific calibration will require CWC collaboration."}
            </div>
          </div>
        </div>

        {/* 4 Phases Timeline */}
        <div className="space-y-2.5">
          {PHASES.map((p, idx) => {
            const isCurrent = p.status === "current";
            return (
              <div
                key={p.phase}
                className={`p-3 rounded-xl border transition ${
                  isCurrent
                    ? "border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                    {isCurrent ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-slate-500 text-[9px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                    )}
                    <span>{p.phase}: {locale === "hi" ? p.titleHi : p.titleEn}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {locale === "hi" ? p.tagHi : p.tagEn}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal pl-5">
                  {locale === "hi" ? p.descHi : p.descEn}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Technical Note */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <span>{locale === "hi" ? "भौतिक 2D सेंट-वेनेंट समीकरण" : "Physical 2D Saint-Venant Equations"}</span>
          <div className="flex items-center gap-1 font-semibold text-[#0F3D66] dark:text-blue-400">
            <Waves className="w-3 h-3" />
            <span>USACE Certified Standard</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
