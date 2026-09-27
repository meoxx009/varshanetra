"use client";

/**
 * VarshaNetra Map-Click Point Nowcast Popup (VN-NOWCAST-001 - Phase 6 / Section F7)
 *
 * Requirements:
 * - Single click anywhere on map while radar layer is enabled
 * - Calls /api/v1/nowcast/point?lat=&lon=
 * - Coordinates to 4 decimal places
 * - Bold headline: "Next 2 hours: {next_2h_total_mm} mm"
 * - Sub-line: "Peak at {peak_time} — {peak_mm} mm / 15 min"
 * - CSS sparkline bar chart of the series array (8 intervals)
 * - Muted source line: "Open-Meteo (ECMWF/ICON blend)"
 */

import React, { useState } from "react";
import { useMapEvents, Popup } from "react-leaflet";
import { CloudRain, RefreshCw, AlertCircle } from "lucide-react";

export interface PointSeriesItem {
  t: string;
  mm: number;
}

export interface PointNowcastResponse {
  lat: number;
  lon: number;
  next_2h_total_mm: number;
  peak_time: string;
  peak_mm_per_15min: number;
  series: PointSeriesItem[];
  source: string;
}

export function NowcastClickPopup({ active = true }: { active?: boolean }) {
  const [clickCoord, setClickCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [data, setData] = useState<PointNowcastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useMapEvents({
    click: async (e) => {
      if (!active) return;

      const lat = Number(e.latlng.lat.toFixed(4));
      const lon = Number(e.latlng.lng.toFixed(4));
      setClickCoord({ lat, lon });
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        let res: Response | null = null;
        try {
          res = await fetch(`/api/v1/nowcast/point?lat=${lat}&lon=${lon}`);
        } catch {
          res = null;
        }

        if (!res || !res.ok) {
          res = await fetch(`http://localhost:8000/api/v1/nowcast/point?lat=${lat}&lon=${lon}`);
        }

        if (!res.ok) {
          throw new Error(`Nowcast point telemetry HTTP ${res.status}`);
        }

        const json: PointNowcastResponse = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load nowcast data");
      } finally {
        setIsLoading(false);
      }
    },
  });

  if (!clickCoord || !active) return null;

  // Max value for scaling CSS sparkline bars
  const maxMm = data?.series?.length
    ? Math.max(...data.series.map((s) => s.mm), 1.0)
    : 1.0;

  // Format peak time
  const formattedPeak = data?.peak_time
    ? data.peak_time.includes("T")
      ? data.peak_time.split("T")[1]
      : data.peak_time
    : "--:--";

  return (
    <Popup
      position={[clickCoord.lat, clickCoord.lon]}
      eventHandlers={{
        remove: () => setClickCoord(null),
      }}
      minWidth={260}
      maxWidth={320}
    >
      <div className="p-1 space-y-2 font-sans text-xs">
        {/* Header with GPS */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <span>वर्षा अनुमान (Rain Nowcast)</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            {clickCoord.lat.toFixed(4)}°N, {clickCoord.lon.toFixed(4)}°E
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-4 flex flex-col items-center justify-center gap-1.5 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-[11px]">Fetching 15-min numeric telemetry...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="py-2 text-center text-red-600 flex items-center justify-center gap-1.5 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Data readout & sparkline */}
        {data && (
          <div className="space-y-2 pt-0.5">
            {/* Bold Headline & Peak Sub-line */}
            <div>
              <div className="text-sm font-bold text-slate-950">
                Next 2 hours: <span className="text-blue-700 font-extrabold">{data.next_2h_total_mm} mm</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Peak at <span className="font-mono font-semibold text-slate-800">{formattedPeak} IST</span> —{" "}
                <span className="font-semibold text-slate-800">{data.peak_mm_per_15min} mm</span> / 15 min
              </div>
            </div>

            {/* CSS Sparkline Bar Chart (8 fifteen-minute intervals) */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-1 flex justify-between">
                <span>15-min precipitation trend (mm):</span>
                <span className="font-mono text-slate-400">Next 120m</span>
              </div>
              <div className="flex items-end gap-1 h-12 bg-slate-50 p-1 rounded-md border border-slate-200">
                {data.series.map((item, idx) => {
                  const barHeight = Math.max(4, Math.round((item.mm / maxMm) * 38));
                  const isHigh = item.mm > 10;
                  const isMed = item.mm > 4;
                  const isLow = item.mm > 0;
                  const barBg = isHigh
                    ? "bg-red-500"
                    : isMed
                    ? "bg-amber-500"
                    : isLow
                    ? "bg-blue-500"
                    : "bg-slate-300";

                  const timeLabel = item.t.includes("T") ? item.t.split("T")[1] : item.t;

                  return (
                    <div
                      key={`sparkline-${idx}`}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                      title={`${timeLabel} IST: ${item.mm} mm`}
                    >
                      <div
                        className={`w-full rounded-t-xs transition-all ${barBg} group-hover:brightness-110`}
                        style={{ height: `${barHeight}px` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Sparkline Time Axis Labels */}
              <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-0.5 px-0.5">
                <span>+15m</span>
                <span>+60m</span>
                <span>+120m</span>
              </div>
            </div>

            {/* Muted Source Line */}
            <div className="pt-1 border-t border-slate-100 text-[9px] text-slate-400 text-right">
              {data.source || "Open-Meteo (ECMWF/ICON blend)"}
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}

export default NowcastClickPopup;
