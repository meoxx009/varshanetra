"use client";

import React from "react";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export type DataBadgeType =
  | "LIVE"
  | "FORECAST"
  | "HISTORICAL"
  | "MODEL_DERIVED"
  | "USER_REPORTED"
  | "CACHED"
  | "STALE"
  | "UNAVAILABLE"
  | "GOVT_DATA";

export interface DataBadgeProps {
  /** The classification type of the data source/freshness */
  type: DataBadgeType;
  /** Optional timestamp (string, Date, or epoch number) */
  timestamp?: string | Date | number | null;
  /** Optional note to display (e.g., 'SRTM Data', 'OSM Data') */
  note?: string;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional override for the tooltip text */
  customTooltip?: string;
  /** Whether to enable tooltip on hover (default true) */
  showTooltip?: boolean;
  /** Compact mode for narrow cards or small table cells */
  compact?: boolean;
}

/**
 * Helper to determine weather telemetry freshness based on fetch timestamp.
 * - Under 15 minutes: LIVE
 * - 15 to 60 minutes: CACHED
 * - Over 60 minutes: STALE
 * - If no data (hasData = false): UNAVAILABLE
 * - If timestamp missing but data exists: LIVE (default)
 */
export function getFreshnessBadgeType(
  timestamp?: string | Date | number | null,
  hasData: boolean = true
): DataBadgeType {
  if (!hasData) return "UNAVAILABLE";
  if (!timestamp) return "LIVE";

  const time =
    typeof timestamp === "string" || typeof timestamp === "number"
      ? new Date(timestamp).getTime()
      : timestamp instanceof Date
      ? timestamp.getTime()
      : NaN;

  if (isNaN(time)) return "LIVE";

  const ageMs = Date.now() - time;
  const ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes < 15) return "LIVE";
  if (ageMinutes <= 60) return "CACHED";
  return "STALE";
}

interface BadgeConfig {
  labelEn: string;
  labelHi: string;
  containerClass: string;
  tooltipText: string;
  icon?: React.ReactNode;
  pulseDot?: boolean;
}

const BADGE_CONFIGS: Record<DataBadgeType, BadgeConfig> = {
  LIVE: {
    labelEn: "LIVE",
    labelHi: "सजीव",
    containerClass: "bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-700 shadow-2xs",
    tooltipText: "Real-time data from Open-Meteo API.",
    pulseDot: true,
  },
  FORECAST: {
    labelEn: "FORECAST",
    labelHi: "पूर्वानुमान",
    containerClass: "bg-blue-600 dark:bg-blue-600 text-white border-blue-700 shadow-2xs",
    tooltipText: "Predicted future value from weather model.",
  },
  HISTORICAL: {
    labelEn: "HISTORICAL",
    labelHi: "ऐतिहासिक",
    containerClass: "bg-purple-600 dark:bg-purple-600 text-white border-purple-700 shadow-2xs",
    tooltipText: "Past observed rainfall records.",
  },
  MODEL_DERIVED: {
    labelEn: "MODEL",
    labelHi: "मॉडल",
    containerClass: "bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-700 shadow-2xs",
    tooltipText: "Calculated from terrain and weather data by VarshaNetra engine.",
  },
  USER_REPORTED: {
    labelEn: "REPORTED",
    labelHi: "रिपोर्टेड",
    containerClass: "bg-amber-300 text-amber-950 dark:bg-amber-400 dark:text-slate-950 border-amber-400 font-semibold shadow-2xs",
    tooltipText: "Submitted by field officer, may be unverified.",
  },
  CACHED: {
    labelEn: "CACHED",
    labelHi: "कैश्ड",
    containerClass: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-2xs",
    tooltipText: "Cached telemetry from recent sync.",
    icon: <Clock className="w-2.5 h-2.5 shrink-0" />,
  },
  STALE: {
    labelEn: "STALE",
    labelHi: "पुराना",
    containerClass: "bg-red-600 dark:bg-red-600 text-white border-red-700 shadow-2xs",
    tooltipText: "Outdated telemetry requiring refresh.",
    icon: <AlertTriangle className="w-2.5 h-2.5 shrink-0" />,
  },
  UNAVAILABLE: {
    labelEn: "UNAVAILABLE",
    labelHi: "अनुपलब्ध",
    containerClass: "bg-slate-600 dark:bg-slate-800 text-slate-100 border-slate-700 shadow-2xs",
    tooltipText: "Telemetry data is unavailable.",
  },
  GOVT_DATA: {
    labelEn: "GOVT. DATA",
    labelHi: "सरकारी डेटा",
    containerClass: "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black border-amber-600 dark:from-amber-400 dark:to-yellow-400 dark:text-slate-950 shadow-xs ring-1 ring-amber-400/50",
    tooltipText: "Official Indian Government Data from data.gov.in / IMD / NDMA.",
    icon: <ShieldCheck className="w-3 h-3 text-slate-950 shrink-0" />,
  },
};

/**
 * DataBadge
 * Reusable pill-shaped badge displaying provenance, processing model, and freshness of telemetry data.
 * Complies with VarshaNetra Data Honesty & Provenance Directives (W-004).
 */
export function DataBadge({
  type,
  timestamp,
  note,
  className,
  customTooltip,
  showTooltip = true,
  compact = false,
}: DataBadgeProps) {
  const config = BADGE_CONFIGS[type] || BADGE_CONFIGS.LIVE;

  // Build tooltip string
  let tooltipMessage = customTooltip || config.tooltipText;
  if (note) {
    tooltipMessage = `${tooltipMessage} (${note})`;
  }
  if (timestamp) {
    try {
      const dt = typeof timestamp === "string" || typeof timestamp === "number" ? new Date(timestamp) : timestamp;
      if (!isNaN(dt.getTime())) {
        tooltipMessage = `${tooltipMessage} • Updated: ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    } catch {
      // Ignore date formatting errors
    }
  }

  const badgeContent = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase border select-none transition-all leading-none shrink-0 align-middle",
        config.containerClass,
        className
      )}
      title={showTooltip ? undefined : tooltipMessage}
    >
      {/* Optional Pulsing Dot for LIVE */}
      {config.pulseDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-80" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
      )}

      {/* Optional Icon for CACHED / STALE */}
      {config.icon}

      {/* Bilingual Labels */}
      {compact ? (
        <span>{config.labelEn}</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <span>{config.labelEn}</span>
          <span className="opacity-80 font-normal">({config.labelHi})</span>
        </span>
      )}

      {/* Optional Note Tag (e.g. SRTM Data, OSM Data) */}
      {note && (
        <span className="ml-0.5 px-1 py-0.2 rounded text-[8.5px] font-mono tracking-tight bg-black/20 text-white/90">
          {note}
        </span>
      )}
    </span>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <Tooltip content={tooltipMessage} side="top">
      {badgeContent}
    </Tooltip>
  );
}

/**
 * DataHealthBadge (VN-TASK-8.5)
 * Displays specialized telemetry resolution tags, e.g. '1km / 1-min' for Tomorrow.io
 */
export function DataHealthBadge({
  resolution = "1km / 1-min",
  provider = "tomorrowio",
  status = "ONLINE",
  className = "",
}: {
  resolution?: string;
  provider?: string;
  status?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shadow-2xs",
        status === "DEGRADED"
          ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
          : "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
        className
      )}
      title={`${provider} telemetry resolution: ${resolution}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
      <span>{resolution}</span>
      {status === "DEGRADED" && (
        <span className="text-amber-700 dark:text-amber-300 font-bold ml-0.5">(Degraded)</span>
      )}
    </span>
  );
}

export default DataBadge;
