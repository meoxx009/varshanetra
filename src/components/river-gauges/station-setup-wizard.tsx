"use client";

import React, { useState } from "react";
import { MapPin, Waves, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CWC_PRELOADED_STATIONS, PreloadedStationTemplate, RiverGauge } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface StationSetupWizardProps {
  onComplete: (gauges: RiverGauge[]) => void;
}

export function StationSetupWizard({ onComplete }: StationSetupWizardProps) {
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleStation = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === CWC_PRELOADED_STATIONS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(CWC_PRELOADED_STATIONS.map((_, i) => i)));
    }
  };

  const handleLoad = async () => {
    if (selected.size === 0) return;

    setLoading(true);
    setError(null);
    const created: RiverGauge[] = [];

    const stationsToLoad: PreloadedStationTemplate[] = Array.from(selected).map(
      (i) => CWC_PRELOADED_STATIONS[i]
    );

    for (let i = 0; i < stationsToLoad.length; i++) {
      const station = stationsToLoad[i];
      setProgress(`Loading ${i + 1}/${stationsToLoad.length}: ${station.river_name} at ${station.station_name}…`);

      try {
        const res = await fetch("/api/river-gauges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(station),
        });
        const json = await res.json();
        if (json.success && json.data) {
          created.push(json.data as RiverGauge);
        }
      } catch {
        // Continue loading others even if one fails
      }
    }

    setLoading(false);
    setProgress(null);

    if (created.length > 0) {
      onComplete(created);
    } else {
      setError("Failed to load stations. Please check your session or try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2
            id="wizard-title"
            className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"
          >
            <Waves className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <span>नदी निगरानी स्टेशन सेटअप</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            River Level Monitoring Setup — Select the CWC gauge stations relevant to your district.
            Data will be entered manually from{" "}
            <a
              href="https://ffis.cwc.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              ffis.cwc.gov.in
            </a>
            .
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 my-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {selected.size} of {CWC_PRELOADED_STATIONS.length} selected
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              {selected.size === CWC_PRELOADED_STATIONS.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {CWC_PRELOADED_STATIONS.map((station, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                selected.has(idx)
                  ? "border-[#0F3D66] bg-blue-50 dark:bg-blue-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(idx)}
                onChange={() => toggleStation(idx)}
                className="mt-0.5 w-4 h-4 accent-[#0F3D66] shrink-0"
                aria-label={`${station.river_name} at ${station.station_name}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {station.river_name}
                    </span>
                    <span className="text-slate-500 text-xs"> at </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {station.station_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    <span className="text-[10px] text-slate-400">{station.state}</span>
                  </div>
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-slate-500">
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Danger: {station.danger_level_m} m
                  </span>
                  {station.warning_level_m !== null && (
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      Warning: {station.warning_level_m} m
                    </span>
                  )}
                </div>
              </div>
              {selected.has(idx) && (
                <CheckCircle2 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0" aria-hidden="true" />
              )}
            </label>
          ))}
        </div>

        {/* Progress */}
        {progress && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-2 mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400">
            {locale === "hi"
              ? "आप बाद में और अधिक स्टेशन मैन्युअल रूप से जोड़ सकते हैं।"
              : "You can add more stations manually later."}
          </p>
          <Button
            onClick={handleLoad}
            disabled={selected.size === 0 || loading}
            className="bg-[#0F3D66] hover:bg-[#0a2d4f] text-white font-bold text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{locale === "hi" ? "लोड हो रहा है…" : "Loading…"}</span>
              </>
            ) : (
              locale === "hi"
                ? `${selected.size} स्टेशन लोड करें`
                : `Load ${selected.size} Station${selected.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
