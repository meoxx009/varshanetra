import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

export interface MapLegendProps {
  isSusceptibilityActive?: boolean;
  isNasaGpmActive?: boolean;
  isRadarActive?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  isSusceptibilityActive = false,
  isNasaGpmActive = false,
  isRadarActive = false,
}) => {
  const locale = useLocale();

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          {locale === "hi" ? "मानचित्र संकेत एवं गंभीरता कुंजी" : "Map Legend & Severity Key"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-[11px]">
        {/* RainViewer Live Radar Intensity Scale (RADAR-001) */}
        {isRadarActive && (
          <div className="p-2.5 rounded-lg border border-sky-400 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/30 space-y-2">
            <div>
              <span className="font-bold text-sky-950 dark:text-sky-200 block text-xs flex items-center gap-1.5">
                <span>🛰️</span>
                {locale === "hi" ? "रडार वर्षा तीव्रता (Radar Rainfall Intensity)" : "Radar Rainfall Intensity (RainViewer)"}
              </span>
              <p className="text-[10px] text-sky-800 dark:text-sky-300 mt-0.5 leading-tight">
                {locale === "hi"
                  ? "लाइव मौसम रडार समग्र तीव्रता पैमाना (dBZ से mm/hr)"
                  : "Live weather radar composite reflectivity scale (dBZ to mm/hr)"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-sky-300 border border-sky-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "बहुत हल्की (0.1-1 mm/hr)" : "Very Light (0.1-1 mm/hr)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "हल्की (1-4 mm/hr)" : "Light (1-4 mm/hr)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-green-500 border border-green-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "मध्यम (4-16 mm/hr)" : "Moderate (4-16 mm/hr)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-yellow-400 border border-yellow-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "भारी (16-36 mm/hr)" : "Heavy (16-36 mm/hr)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-orange-500 border border-orange-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "अति भारी (36-64 mm/hr)" : "Very Heavy (36-64 mm/hr)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-600 border border-red-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "अत्यधिक भारी (>64 mm/hr)" : "Extreme (>64 mm/hr)"}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-sky-200/60 dark:border-sky-900/40 text-[9px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
              <span>RainViewer API • 10-min updates</span>
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Standard Radar Color 4</span>
            </div>
          </div>
        )}
        {/* NASA GPM Satellite Rainfall Intensity Legend (LIVE-002) */}
        {isNasaGpmActive && (
          <div className="p-2.5 rounded-lg border border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
            <div>
              <span className="font-bold text-blue-900 dark:text-blue-300 block text-xs flex items-center gap-1">
                <span>🛰️</span>
                {locale === "hi" ? "NASA GPM उपग्रह वर्षा (IMERG)" : "NASA GPM Satellite Rainfall (IMERG)"}
              </span>
              <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5 leading-tight">
                {locale === "hi"
                  ? "कक्षीय उपग्रह अवलोकित वर्षा तीव्रता (0.1° ग्रिड)"
                  : "Spaceborne satellite observed precipitation intensity (0.1° grid)"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#60A5FA] border border-blue-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "हल्की (0-15 mm)" : "Light (0-15 mm)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2563EB] border border-blue-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "मध्यम (15-64 mm)" : "Moderate (15-64 mm)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EA580C] border border-orange-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "भारी (64-115 mm)" : "Heavy (64-115 mm)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DC2626] border border-red-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "अति भारी (>115 mm)" : "Very Heavy (>115 mm)"}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 text-[9px] text-slate-500 dark:text-slate-400">
              NASA Earthdata URS • GPM IMERG Late Run Product (4-6h latency)
            </div>
          </div>
        )}

        {/* Susceptibility Map Section (Appears prominently when active or always available) */}
        {isSusceptibilityActive && (
          <div className="p-2.5 rounded-lg border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 space-y-2">
            <div>
              <span className="font-bold text-red-900 dark:text-red-300 block text-xs">
                {locale === "hi" ? "बाढ़ संवेदनशीलता मानचित्र प्रायोगिक" : "Flood Susceptibility Map EXPERIMENTAL"}
              </span>
              <p className="text-[10px] text-amber-900 dark:text-amber-300 font-bold mt-0.5 leading-tight">
                {locale === "hi"
                  ? "यह प्रायोगिक संवेदनशीलता मानचित्रण है, वास्तविक बाढ़ गहराई भविष्यवाणी नहीं"
                  : "This is EXPERIMENTAL susceptibility mapping, NOT actual flood depth prediction."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#DC2626] border border-red-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "अत्यधिक उच्च (76-100)" : "Very High (76-100)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#EA580C] border border-orange-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "उच्च (51-75)" : "High (51-75)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#EAB308] border border-yellow-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "मध्यम (26-50)" : "Moderate (26-50)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#15803D] border border-green-700 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {locale === "hi" ? "कम (0-25)" : "Low (0-25)"}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-red-200/60 dark:border-red-900/40 text-[9px] text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "डेटा स्रोत: SRTM DEM, OpenStreetMap, Open-Meteo"
                : "Data Sources: SRTM DEM, OpenStreetMap, Open-Meteo"}
            </div>
          </div>
        )}

        {/* Symbology */}
        <div>
          <span className="font-bold text-slate-500 block mb-1 uppercase tracking-wider text-[10px]">
            {locale === "hi" ? "मार्कर प्रतीक" : "Marker Symbology"}
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0F3D66] border border-white text-white text-[9px] flex items-center justify-center font-bold">★</span>
              <span>{locale === "hi" ? "जिला मुख्यालय (केंद्र)" : "District HQ (Center)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#15803D] text-white text-[9px] flex items-center justify-center font-bold">+</span>
              <span>{locale === "hi" ? "अस्पताल / ट्रॉमा" : "Hospital / Trauma"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0D9488] text-white text-[9px] flex items-center justify-center font-bold">✚</span>
              <span>{locale === "hi" ? "क्लीनिक / औषधालय" : "Clinic / Dispensary"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#2563EB] text-white text-[9px] flex items-center justify-center">🛡</span>
              <span>{locale === "hi" ? "पुलिस स्टेशन" : "Police Station"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#DC2626] text-white text-[9px] flex items-center justify-center">🔥</span>
              <span>{locale === "hi" ? "अग्निशमन एवं बचाव" : "Fire & Rescue"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#4F46E5] text-white text-[9px] flex items-center justify-center">🏫</span>
              <span>{locale === "hi" ? "स्कूल / आश्रय" : "School / Shelter"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#059669] text-white text-[9px] flex items-center justify-center">⛺</span>
              <span>{locale === "hi" ? "राहत शिविर" : "Relief Shelter"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0284C7] text-white text-[9px] flex items-center justify-center">〰</span>
              <span>{locale === "hi" ? "नदी जलविज्ञान" : "River Hydrology"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#D97706] text-white text-[9px] flex items-center justify-center">📝</span>
              <span>{locale === "hi" ? "मैदानी संकट रिपोर्ट" : "Field SOS Report"}</span>
            </div>
          </div>
        </div>

        {/* Spatial Flood Risk Grid (VARSHANETRA-11) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="font-bold text-slate-500 block mb-1 uppercase tracking-wider text-[10px]">
            {locale === "hi" ? "स्थानिक बाढ़ जोखिम ग्रिड (पायलट)" : "Spatial Flood Risk Grid (Pilot)"}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs border border-emerald-700 bg-[#16A34A] opacity-90" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{locale === "hi" ? "कम" : "LOW"} (0 - 24.9)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs border border-yellow-600 bg-[#EAB308] opacity-90" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{locale === "hi" ? "मध्यम" : "MODERATE"} (25 - 49.9)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs border border-orange-700 bg-[#EA580C] opacity-90" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{locale === "hi" ? "उच्च" : "HIGH"} (50 - 74.9)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs border border-red-800 bg-[#DC2626] opacity-90" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{locale === "hi" ? "अति गंभीर" : "SEVERE"} (75 - 100)</span>
            </div>
          </div>
        </div>

        {/* Dual-Channel Severity Colors */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="font-bold text-slate-500 block mb-1 uppercase tracking-wider text-[10px]">
            {locale === "hi" ? "घटना गंभीरता स्पेक्ट्रम" : "Incident Severity Spectrum"}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
              <span className="text-slate-600 dark:text-slate-400">{locale === "hi" ? "सामान्य (0-15 मिमी)" : "Normal (0-15mm)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span className="text-slate-600 dark:text-slate-400">{locale === "hi" ? "सलाह (निगरानी)" : "Advisory (Watch)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
              <span className="text-slate-600 dark:text-slate-400">{locale === "hi" ? "अलर्ट (चेतावनी)" : "Alert (Warning)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span className="text-slate-600 dark:text-slate-400">{locale === "hi" ? "अति गंभीर (निकासी)" : "Critical (Evacuate)"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

