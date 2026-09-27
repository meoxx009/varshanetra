"use client";

import React from "react";
import {
  Layers,
  Building2,
  Stethoscope,
  Shield,
  Flame,
  GraduationCap,
  Waves,
  FileText,
  AlertTriangle,
  CloudRain,
  Radio,
  MapPin,
  Home,
  CheckSquare,
  Square,
  Sparkles,
  Satellite,
  Globe,
  Activity,
  ExternalLink,
} from "lucide-react";
import { ActiveMapLayerId, FutureMapLayerId, ForecastWindow } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

interface LayerControlProps {
  activeLayers: Record<ActiveMapLayerId, boolean>;
  onToggleLayer: (layerId: ActiveMapLayerId) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  counts: Partial<Record<ActiveMapLayerId, number>>;
  isLoading?: boolean;
  forecastWindow?: ForecastWindow;
  onSelectForecastWindow?: (window: ForecastWindow) => void;
  isGridLoading?: boolean;
  onOpenCopernicus?: () => void;
}

interface LayerItemDef {
  id: ActiveMapLayerId;
  labelEn: string;
  labelHi: string;
  icon: React.ElementType;
  color: string;
}

const ACTIVE_LAYER_DEFS: LayerItemDef[] = [
  { id: "floodRisk", labelEn: "Flood Risk Grid", labelHi: "बाढ़ जोखिम ग्रिड", icon: Waves, color: "text-amber-600 dark:text-amber-400" },
  { id: "hospitals", labelEn: "Hospitals & Trauma", labelHi: "अस्पताल एवं ट्रॉमा सेंटर", icon: Building2, color: "text-emerald-600 dark:text-emerald-400" },
  { id: "clinics", labelEn: "Clinics & Dispensaries", labelHi: "क्लीनिक एवं औषधालय", icon: Stethoscope, color: "text-teal-600 dark:text-teal-400" },
  { id: "police", labelEn: "Police & Security", labelHi: "पुलिस एवं सुरक्षा केंद्र", icon: Shield, color: "text-blue-600 dark:text-blue-400" },
  { id: "fire", labelEn: "Fire & Rescue Stations", labelHi: "अग्निशमन एवं बचाव केंद्र", icon: Flame, color: "text-red-600 dark:text-red-400" },
  { id: "schools", labelEn: "Schools & Evac Shelters", labelHi: "विद्यालय एवं आश्रय स्थल", icon: GraduationCap, color: "text-indigo-600 dark:text-indigo-400" },
  { id: "shelters", labelEn: "Designated Relief Shelters", labelHi: "नामित राहत आश्रय", icon: Home, color: "text-emerald-700 dark:text-emerald-300" },
  { id: "rivers", labelEn: "Rivers & Drainage Basins", labelHi: "नदियाँ एवं जल निकासी बेसिन", icon: Waves, color: "text-sky-600 dark:text-sky-400" },
  { id: "riverGauges", labelEn: "CWC River Gauge Stations", labelHi: "CWC नदी गेज स्टेशन", icon: Waves, color: "text-blue-700 dark:text-blue-300" },
  { id: "floodSusceptibility", labelEn: "Flood Susceptibility", labelHi: "बाढ़ संवेदनशीलता", icon: Waves, color: "text-red-600 dark:text-red-400" },
  { id: "nasaGpmRainfall", labelEn: "NASA GPM Rainfall", labelHi: "NASA GPM वर्षा", icon: Satellite, color: "text-blue-600 dark:text-cyan-400" },
  { id: "radar", labelEn: "Radar (Live)", labelHi: "🛰️ रडार (Radar)", icon: CloudRain, color: "text-blue-600 dark:text-cyan-400" },
  { id: "copernicusWms", labelEn: "Copernicus Flood Maps", labelHi: "Copernicus बाढ़ मानचित्र", icon: Globe, color: "text-blue-700 dark:text-cyan-300" },
  { id: "earthquakes", labelEn: "Earthquakes (USGS)", labelHi: "भूकंप (USGS)", icon: Activity, color: "text-red-500 dark:text-red-400" },
  { id: "firmsFire", labelEn: "NASA FIRMS Fire", labelHi: "NASA FIRMS अग्नि", icon: Flame, color: "text-red-600 dark:text-red-400" },
  { id: "fieldReports", labelEn: "Field Observer Reports", labelHi: "मैदानी पर्यवेक्षक रिपोर्ट", icon: FileText, color: "text-amber-600 dark:text-amber-400" },
  { id: "incidents", labelEn: "Emergency Distress Tickets", labelHi: "आपातकालीन संकट टिकट", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400" },
  { id: "responseTeams", labelEn: "Tactical Response Teams", labelHi: "सामरिक प्रतिक्रिया दल", icon: MapPin, color: "text-[#0F3D66] dark:text-blue-400" },
];

const FUTURE_PLACEHOLDER_DEFS: { id: FutureMapLayerId; labelEn: string; labelHi: string; icon: React.ElementType }[] = [
  { id: "inundationExtent", labelEn: "Hydrodynamic Water Depth", labelHi: "हाइड्रोडायनामिक जल गहराई", icon: Radio },
];


export const MapLayerControls: React.FC<LayerControlProps> = ({
  activeLayers,
  onToggleLayer,
  onSelectAll,
  onDeselectAll,
  counts,
  isLoading = false,
  forecastWindow = "24h",
  onSelectForecastWindow,
  isGridLoading = false,
  onOpenCopernicus,
}) => {
  const locale = useLocale();

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Layers className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
            {locale === "hi" ? "सामरिक जीआईएस परतें" : "Tactical GIS Layers"}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
            >
              {locale === "hi" ? "सभी" : "All"}
            </button>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">•</span>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              {locale === "hi" ? "कोई नहीं" : "None"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-0">
        {/* Active Overlays List - Compact & Accessible */}
        <div className="space-y-1 text-xs">
          {ACTIVE_LAYER_DEFS.map((layer) => {
            const Icon = layer.icon;
            const isChecked = activeLayers[layer.id] ?? false;
            const count = counts[layer.id] ?? 0;
            const label = locale === "hi" ? layer.labelHi : layer.labelEn;

            return (
              <div key={layer.id} className="space-y-1">
                {layer.id === "floodSusceptibility" && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[10px] space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      {locale === "hi"
                        ? "यह प्रायोगिक संवेदनशीलता मानचित्रण है, वास्तविक बाढ़ गहराई भविष्यवाणी नहीं"
                        : "This is EXPERIMENTAL susceptibility mapping, NOT actual flood depth prediction."}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300 leading-tight">
                      {locale === "hi"
                        ? "नोट: यह ग्रिड SRTM भूभाग डेटा और मौसम अनुमानों पर आधारित अनुमानित संवेदनशीलता दर्शाता है। वास्तविक बाढ़ सीमाएं भिन्न हो सकती हैं।"
                        : "NOTE: This grid shows estimated susceptibility based on SRTM terrain data and weather forecasts. Actual flood boundaries may vary significantly."}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onToggleLayer(layer.id)}
                  title={label}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                    isChecked
                      ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      : "bg-white dark:bg-slate-900/50 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <Icon className={`w-3.5 h-3.5 ${layer.color} shrink-0`} />
                    <span className="text-xs font-medium leading-tight truncate">{label}</span>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      isChecked
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {layer.id === "floodRisk" && isGridLoading ? "..." : isLoading ? "..." : count}
                  </span>
                </button>

                {/* Sub-selector: Forecast Horizons when Flood Risk is checked */}
                {layer.id === "floodRisk" && isChecked && onSelectForecastWindow && (
                  <div className="ml-5 mr-0.5 p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 font-semibold">
                      <span>{locale === "hi" ? "पूर्वानुमान विंडो:" : "Forecast Window:"}</span>
                      <span className="font-mono uppercase font-bold text-[#0F3D66] dark:text-blue-400">
                        +{forecastWindow || "24h"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(["3h", "6h", "12h", "24h"] as ForecastWindow[]).map((win) => {
                        const isWinActive = (forecastWindow || "24h") === win;
                        return (
                          <button
                            key={win}
                            type="button"
                            onClick={() => onSelectForecastWindow(win)}
                            disabled={isGridLoading}
                            className={`h-7 text-xs font-semibold rounded-md border text-center transition cursor-pointer ${
                              isWinActive
                                ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-2xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                            } disabled:opacity-50`}
                          >
                            +{win}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Copernicus Flood Maps Quick Button (SOURCES-001 PART 3) */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (onOpenCopernicus) {
                onOpenCopernicus();
              } else {
                onToggleLayer("copernicusWms");
              }
            }}
            className="w-full py-2 px-3 rounded-lg border border-blue-300 dark:border-blue-700/80 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center justify-between transition shadow-2xs cursor-pointer"
            title="Open Copernicus Emergency Flood Maps Viewer"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🇪🇺</span>
              <span>{locale === "hi" ? "Copernicus बाढ़ मानचित्र" : "Copernicus Flood Maps"}</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <span>{activeLayers.copernicusWms ? "Active" : "Open"}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </span>
          </button>
        </div>

        {/* Platform Capabilities Section - High Contrast & Standard Typography */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{locale === "hi" ? "प्लेटफ़ॉर्म क्षमता मैट्रिक्स" : "Platform Capability Matrix"}</span>
          </div>

          <div className="space-y-1">
            {FUTURE_PLACEHOLDER_DEFS.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.id}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{locale === "hi" ? f.labelHi : f.labelEn}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                    Phase 2
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
