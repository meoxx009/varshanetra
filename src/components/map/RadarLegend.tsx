"use client";

/**
 * VarshaNetra Doppler Radar Reflectivity Legend (VN-NOWCAST-001 - Phase 6)
 *
 * Requirements:
 * - Position: absolute top-4 right-4 z-[1000]
 * - Collapsible: expanded on desktop, collapsed on mobile
 * - Title: Reflectivity (dBZ) / परावर्तकता (dBZ)
 * - Color swatches, dBZ, English/Hindi labels, and approx rain rates
 * - Attribution footer
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface LegendRow {
  color: string;
  dbz: number;
  labelEn: string;
  labelHi: string;
  rate: string;
}

const REFLECTIVITY_ROWS: LegendRow[] = [
  { color: "#00ecec", dbz: 15, labelEn: "Light", labelHi: "हल्की वर्षा", rate: "~0.5 mm/hr" },
  { color: "#00a0f6", dbz: 25, labelEn: "Moderate", labelHi: "मध्यम वर्षा", rate: "~2 mm/hr" },
  { color: "#00ff00", dbz: 35, labelEn: "Heavy", labelHi: "तेज़ वर्षा", rate: "~8 mm/hr" },
  { color: "#ffff00", dbz: 45, labelEn: "Very Heavy", labelHi: "बहुत तेज़ वर्षा", rate: "~30 mm/hr" },
  { color: "#ff0000", dbz: 55, labelEn: "Intense", labelHi: "अत्यधिक वर्षा", rate: "~100 mm/hr" },
  { color: "#ff00ff", dbz: 65, labelEn: "Extreme / Hail", labelHi: "ओलावृष्टि / भीषण", rate: ">150 mm/hr" },
];

export function RadarLegend({ className = "" }: { className?: string }) {
  // Start expanded on desktop, can be toggled
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div
      className={`absolute top-4 right-4 z-[1000] max-w-[280px] sm:max-w-[310px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl text-slate-100 overflow-hidden transition-all ${className}`}
      role="region"
      aria-label="Doppler Radar Reflectivity Scale"
    >
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-xs font-bold tracking-tight text-white">
            Reflectivity (dBZ)
          </span>
          <span className="text-[10px] text-slate-400 font-hindi">परावर्तकता</span>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-white transition-colors p-0.5"
          aria-label={isExpanded ? "Collapse radar legend" : "Expand radar legend"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1 space-y-2 border-t border-white/5 animate-in fade-in duration-150">
          <div className="space-y-1 text-[11px]">
            {REFLECTIVITY_ROWS.map((row) => (
              <div
                key={`dbz-${row.dbz}`}
                className="flex items-center justify-between py-0.5 hover:bg-white/5 px-1 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="font-mono font-bold text-slate-200 w-6">
                    {row.dbz}
                  </span>
                  <span className="text-slate-200 font-medium">
                    {row.labelEn}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({row.labelHi})
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {row.rate}
                </span>
              </div>
            ))}
          </div>

          {/* Footer attribution */}
          <div className="pt-1.5 border-t border-white/5 text-[9px] text-slate-400 leading-tight">
            Radar © RainViewer · Satellite © NASA GIBS · Official © IMD
          </div>
        </div>
      )}
    </div>
  );
}

export default RadarLegend;
