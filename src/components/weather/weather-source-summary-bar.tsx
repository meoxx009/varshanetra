"use client";

import React from "react";
import { Radio } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface WeatherSourceSummaryBarProps {
  tomorrowStatus?:
    | "LIVE"
    | "CONFIGURED_UNVERIFIED"
    | "DEMO"
    | "ERROR"
    | "NOT_CONFIGURED"
    | "DEGRADED"
    | "AUTH_ERROR"
    | "PERMISSION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "RATE_LIMITED"
    | "PROVIDER_ERROR"
    | "TIMEOUT"
    | "UNAVAILABLE";
  gpmStatus?: "LIVE" | "CACHED" | "DEMO" | "ERROR" | "NOT_CONFIGURED";
  radarStatus?: "LIVE" | "STALE" | "ERROR";
  ecmwfActive?: boolean;
  gfsActive?: boolean;
}

export function WeatherSourceSummaryBar({
  tomorrowStatus = "NOT_CONFIGURED",
  gpmStatus = "LIVE",
  radarStatus = "LIVE",
  ecmwfActive = true,
  gfsActive = true,
}: WeatherSourceSummaryBarProps) {
  const locale = useLocale();

  // Strict Rule (VNET-TOMORROW-FINAL-001): Tomorrow.io is counted active only when LIVE
  const isTomorrowActive = tomorrowStatus === "LIVE";
  const isGpmActive = gpmStatus === "LIVE" || gpmStatus === "CACHED" || gpmStatus === "DEMO";
  const isRadarActive = radarStatus === "LIVE" || radarStatus === "STALE";

  const getTomorrowStatusConfig = () => {
    switch (tomorrowStatus) {
      case "LIVE":
        return { label: "LIVE", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" };
      case "CONFIGURED_UNVERIFIED":
        return { label: "CONFIGURED", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" };
      case "DEGRADED":
        return { label: "DEGRADED", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" };
      case "RATE_LIMITED":
        return { label: "RATE LIMITED", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" };
      case "AUTH_ERROR":
      case "AUTHENTICATION_ERROR":
        return { label: "AUTH ERROR", dot: "bg-red-500", text: "text-red-700 dark:text-red-300" };
      case "PERMISSION_ERROR":
        return { label: "PERMISSION ERROR", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" };
      case "TIMEOUT":
        return { label: "TIMEOUT", dot: "bg-red-500", text: "text-red-700 dark:text-red-300" };
      case "PROVIDER_ERROR":
        return { label: "PROVIDER ERROR", dot: "bg-red-500", text: "text-red-700 dark:text-red-300" };
      case "ERROR":
      case "UNAVAILABLE":
        return { label: "UNAVAILABLE", dot: "bg-red-500", text: "text-red-700 dark:text-red-300" };
      case "DEMO":
        return { label: "DEMO", dot: "bg-purple-500", text: "text-purple-700 dark:text-purple-300" };
      case "NOT_CONFIGURED":
      default:
        return { label: "NOT CONFIGURED", dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" };
    }
  };

  const tomorrowCfg = getTomorrowStatusConfig();

  // Calculate count: X of Y weather sources active (SOURCES-002 PART 5)
  const sources = [
    {
      id: "ecmwf",
      name: "Open-Meteo ECMWF",
      status: ecmwfActive ? "LIVE" : "OFFLINE",
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-300",
      active: ecmwfActive,
      type: "NWP",
    },
    {
      id: "gfs",
      name: "Open-Meteo GFS",
      status: gfsActive ? "LIVE" : "OFFLINE",
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-300",
      active: gfsActive,
      type: "NWP",
    },
    {
      id: "tomorrow",
      name: "Tomorrow.io",
      status: tomorrowCfg.label,
      dotColor: tomorrowCfg.dot,
      textColor: tomorrowCfg.text,
      active: isTomorrowActive,
      type: "AI",
    },
    {
      id: "nasa-gpm",
      name: "NASA GPM",
      status: "SATELLITE",
      dotColor: "bg-blue-500",
      textColor: "text-blue-700 dark:text-blue-300",
      active: isGpmActive,
      type: "SAT",
    },
    {
      id: "rainviewer",
      name: "RainViewer",
      status: "RADAR",
      dotColor: "bg-amber-500",
      textColor: "text-amber-700 dark:text-amber-300",
      active: isRadarActive,
      type: "RAD",
    },
  ];

  const totalSources = sources.length; // 5
  const activeCount = sources.filter((s) => s.active).length;

  return (
    <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 px-3 sm:px-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
      {/* Title & Count */}
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {locale === "hi" ? "सक्रिय मौसम डेटा स्रोत:" : "Active Weather Data Sources:"}
        </span>
        <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
          {locale === "hi"
            ? `${totalSources} में से ${activeCount} सक्रिय`
            : `${activeCount} of ${totalSources} active`}
        </span>
      </div>

      {/* Horizontal Status Dots Row */}
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 md:pb-0 text-xs">
        {sources.map((src) => (
          <div
            key={src.id}
            className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
          >
            <span
              className={`w-2 h-2 rounded-full ${src.dotColor} shrink-0 animate-pulse`}
              aria-hidden="true"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
              {src.name}
            </span>
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider ${src.textColor}`}
            >
              {src.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeatherSourceSummaryBar;
