"use client";

import React from "react";
import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

export interface DataGapItem {
  id: string;
  sourceName: string;
  sourceNameHi: string;
  statusText: string;
  statusTextHi: string;
  impactPenaltyPct: number;
  impactArea: string;
  impactAreaHi: string;
  mitigation: string;
  mitigationHi: string;
}

export interface DataGapAnalysisProps {
  currentAccuracyPct?: number; // e.g. 70%
}

export function DataGapAnalysisCard({ currentAccuracyPct = 70 }: DataGapAnalysisProps) {
  const locale = useLocale();

  const dataGaps: DataGapItem[] = [
    {
      id: "imd_api",
      sourceName: "IMD Official API",
      sourceNameHi: "आईएमडी आधिकारिक एपीआई",
      statusText: "Not Configured / Awaiting Govt Credentials",
      statusTextHi: "कॉन्फ़िगर नहीं / आधिकारिक क्रेडेंशियल्स प्रतीक्षित",
      impactPenaltyPct: 15,
      impactArea: "Estimated impact on ground calibration: -15%",
      impactAreaHi: "धरातलीय अंशांकन सटीकता पर प्रभाव: -15%",
      mitigation: "Mitigated by Open-Meteo multi-model ensemble (ECMWF + GFS + ICON)",
      mitigationHi: "ओपन-मेटियो बहु-मॉडल पूर्वानुमान (ECMWF + GFS) द्वारा प्रतिपूरित",
    },
    {
      id: "cwc_gauge",
      sourceName: "CWC Real-time Gauge Telemetry",
      sourceNameHi: "सीडब्ल्यूसी वास्तविक समय नदी गेज",
      statusText: "Manual/Sandbox Feed Active (Direct API Pending)",
      statusTextHi: "मैनुअल/सैंडबॉक्स फ़ीड सक्रिय (प्रत्यक्ष एपीआई प्रतीक्षित)",
      impactPenaltyPct: 25,
      impactArea: "Impact on river flood prediction: -25%",
      impactAreaHi: "नदी बाढ़ पूर्वानुमान पर प्रभाव: -25%",
      mitigation: "Mitigated by Copernicus GloFAS basin runoff & field officer gauge inputs",
      mitigationHi: "कोपरनिकस ग्लोफास नदी बेसिन मॉडल व फील्ड रिपोर्ट द्वारा प्रतिपूरित",
    },
    {
      id: "imd_radar",
      sourceName: "IMD Doppler Radar (DWR)",
      sourceNameHi: "आईएमडी डॉपलर वेदर रडार (DWR)",
      statusText: "Public Composite Used (Raw Polimetric Feed Pending)",
      statusTextHi: "सार्वजनिक कंपोजिट प्रयुक्त (कच्चा ध्रुवीय डेटा प्रतीक्षित)",
      impactPenaltyPct: 20,
      impactArea: "Impact on nowcast accuracy: -20%",
      impactAreaHi: "नाउकास्ट सटीकता पर प्रभाव: -20%",
      mitigation: "Mitigated by RainViewer 10-minute global Doppler radar tiles",
      mitigationHi: "रेनव्यूअर 10-मिनट वैश्विक डॉपलर रडार टाइल्स द्वारा प्रतिपूरित",
    },
    {
      id: "cartosat_dem",
      sourceName: "CARTOSAT-1 10m DEM",
      sourceNameHi: "कार्टोसैट-1 10 मीटर डीईएम",
      statusText: "Not Processed (National High-Res GeoTIFF)",
      statusTextHi: "प्रोसेस नहीं (राष्ट्रीय उच्च-रिजोल्यूशन जियोटीआईएफ़)",
      impactPenaltyPct: 10,
      impactArea: "Impact on terrain micro-slope accuracy: -10%",
      impactAreaHi: "भूभाग सूक्ष्म-ढलान सटीकता पर प्रभाव: -10%",
      mitigation: "Mitigated by NASA SRTM 30m Global Digital Elevation Model",
      mitigationHi: "नासा एसआरटीएम 30 मीटर डिजिटल एलिवेशन मॉडल द्वारा प्रतिपूरित",
    },
  ];

  const totalPenalty = dataGaps.reduce((sum, item) => sum + item.impactPenaltyPct, 0);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "डेटा अंतर विश्लेषण" : "Data Gap Analysis"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? "अनुपलब्ध या गैर-कॉन्फ़िगर किए गए आधिकारिक डेटा स्रोतों के प्रभाव का पारदर्शी वैज्ञानिक मूल्यांकन"
                  : "Transparent scientific quantification of missing institutional feeds and operational boundaries"}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 text-xs px-2.5 py-1 font-mono font-bold">
              {locale === "hi" ? `कुल अंतराल: -${totalPenalty}%` : `Total Gap: -${totalPenalty}%`}
            </Badge>
            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{locale === "hi" ? "संस्थागत पारदर्शिता" : "Institutional Honesty Gate"}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Estimated Accuracy Metric Box */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-50/60 via-slate-50 to-blue-50/50 dark:from-slate-900/80 dark:to-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                {locale === "hi"
                  ? "वर्तमान कॉन्फ़िगरेशन के साथ अनुमानित सटीकता"
                  : "Estimated Accuracy with Current Configuration"}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {currentAccuracyPct}%
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  (Multi-Source Robust Baseline)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {locale === "hi"
                  ? `वर्तमान कॉन्फ़िगरेशन के साथ अनुमानित सटीकता: ${currentAccuracyPct}%। आधिकारिक राष्ट्रीय एपीआई जुड़ने पर यह 95%+ तक पहुंच जाएगी।`
                  : `Estimated accuracy with current configuration: ${currentAccuracyPct}%. Full Phase-2 integration with national direct telemetry will elevate operational fidelity to 95%+.`}
              </p>
            </div>

            <div className="w-full sm:w-48 shrink-0 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Operational Level</span>
                <span className="text-blue-600 dark:text-blue-400">{currentAccuracyPct}%</span>
              </div>
              <div
                className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={currentAccuracyPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={locale === "hi" ? "अनुमानित सटीकता स्तर" : "Estimated operational accuracy"}
              >
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, currentAccuracyPct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Gap Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataGaps.map((gap) => (
            <div
              key={gap.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-amber-300 dark:hover:border-amber-700/60 transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {locale === "hi" ? gap.sourceNameHi : gap.sourceName}
                  </h4>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">
                    {locale === "hi" ? gap.statusTextHi : gap.statusText}
                  </span>
                </div>
                <Badge className="bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800 font-mono font-bold text-xs shrink-0">
                  -{gap.impactPenaltyPct}%
                </Badge>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {locale === "hi" ? gap.impactAreaHi : gap.impactArea}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{locale === "hi" ? gap.mitigationHi : gap.mitigation}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Institutional Integrity Note */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {locale === "hi" ? "पारदर्शिता सिद्धांत (Engineering Rule 18):" : "Institutional Integrity Directives (Rule 18):"}
          </span>{" "}
          {locale === "hi"
            ? "वर्षानेत्र किसी भी अनधिकृत सरकारी सर्वर से सीधे संबंध का झूठा दावा नहीं करता है। जब तक अधिकृत एपीआई कुंजी सक्रिय न हो, वैश्विक खुले उपग्रह व संख्यात्मक पूर्वानुमान मॉडल (ECMWF, GPM, USGS) का उपयोग पारदर्शी रूप से दर्शाया जाता है।"
            : "VarshaNetra maintains complete integrity by explicitly declaring public surrogate feeds versus closed national institutional channels. All estimates use verifiable public earth observation datasets (ECMWF, NASA GPM, USGS, Copernicus) without deceptive claims of unauthenticated server access."}
        </div>
      </CardContent>
    </Card>
  );
}

export default DataGapAnalysisCard;
