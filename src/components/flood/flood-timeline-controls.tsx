"use client";

import { Clock, Play } from "lucide-react";
import { TimelineHorizon } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface FloodTimelineControlsProps {
  currentHorizon: TimelineHorizon;
  onSelectHorizon: (horizon: TimelineHorizon) => void;
  accumulatedRainMm: number;
  isLoading?: boolean;
  className?: string;
}

const TIMELINE_OPTIONS: { id: TimelineHorizon; labelEn: string; labelHi: string; subtextEn: string; subtextHi: string }[] = [
  { id: "now", labelEn: "Now", labelHi: "अभी", subtextEn: "Current baseline", subtextHi: "वर्तमान बेसलाइन" },
  { id: "3h", labelEn: "+3 Hours", labelHi: "+3 घंटे", subtextEn: "Flash burst", subtextHi: "त्वरित वर्षा" },
  { id: "6h", labelEn: "+6 Hours", labelHi: "+6 घंटे", subtextEn: "Drainage threshold", subtextHi: "जल निकासी सीमा" },
  { id: "12h", labelEn: "+12 Hours", labelHi: "+12 घंटे", subtextEn: "Catchment peak", subtextHi: "जलग्रहण शिखर" },
  { id: "24h", labelEn: "+24 Hours", labelHi: "+24 घंटे", subtextEn: "Diurnal accumulation", subtextHi: "दैनिक संचय" },
];

export const FloodTimelineControls: React.FC<FloodTimelineControlsProps> = ({
  currentHorizon,
  onSelectHorizon,
  accumulatedRainMm,
  isLoading = false,
  className = "",
}) => {
  const locale = useLocale();

  return (
    <div
      className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
          <div>
            <strong className="text-xs text-slate-900 dark:text-white uppercase tracking-wider block">
              {locale === "hi" ? "परिचालन पूर्वानुमान समयरेखा" : "Operational Forecast Timeline"}
            </strong>
            <span className="text-[11px] text-slate-500">
              {locale === "hi" ? "महत्वपूर्ण अग्रिम पूर्वानुमान क्षितिज में बहु-कारक बाढ़ संवेदनशीलता का अनुमान लगाएं।" : "Project multi-factor flood vulnerability across critical forward forecast horizons."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">{locale === "hi" ? "अनुमानित वर्षा:" : "Projected Rain:"}</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {isLoading ? "..." : `${accumulatedRainMm} mm`}
          </span>
        </div>
      </div>

      {/* Timeline Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {TIMELINE_OPTIONS.map((opt) => {
          const isActive = currentHorizon === opt.id;
          const label = locale === "hi" ? opt.labelHi : opt.labelEn;
          const subtext = locale === "hi" ? opt.subtextHi : opt.subtextEn;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectHorizon(opt.id)}
              disabled={isLoading}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                isActive
                  ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs">{label}</span>
                {isActive && <Play className="w-3 h-3 fill-current" />}
              </div>
              <span
                className={`text-[10px] mt-1 ${
                  isActive ? "text-blue-100" : "text-slate-400"
                }`}
              >
                {subtext}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
