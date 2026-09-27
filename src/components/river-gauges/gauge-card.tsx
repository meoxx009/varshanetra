"use client";

import React from "react";
import { Clock, RefreshCw, ExternalLink, Waves } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/common/data-badge";
import { GaugeStatusBadge } from "./gauge-status-badge";
import { GaugeTrendIndicator } from "./gauge-trend-indicator";
import { GaugeSparkline } from "./gauge-sparkline";
import { RiverGauge } from "@/types";

interface GaugeCardProps {
  gauge: RiverGauge;
  onUpdateClick: (gauge: RiverGauge) => void;
  canUpdate: boolean;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never updated";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_BORDER: Record<string, string> = {
  NORMAL: "border-l-green-500",
  WARNING: "border-l-yellow-500",
  DANGER: "border-l-orange-500",
  CRITICAL: "border-l-red-600",
};

const LEVEL_COLOR: Record<string, string> = {
  NORMAL: "text-green-700 dark:text-green-400",
  WARNING: "text-yellow-700 dark:text-yellow-400",
  DANGER: "text-orange-700 dark:text-orange-400",
  CRITICAL: "text-red-700 dark:text-red-400",
};

export function GaugeCard({ gauge, onUpdateClick, canUpdate }: GaugeCardProps) {
  const status = gauge.status ?? "NORMAL";
  const borderClass = STATUS_BORDER[status] ?? "border-l-slate-300";
  const levelColorClass = LEVEL_COLOR[status] ?? "text-slate-800";
  const lastUpdateStr = formatRelativeTime(gauge.last_updated);

  // Stale if not updated in >6 hours
  const isStale = gauge.last_updated
    ? Date.now() - new Date(gauge.last_updated).getTime() > 6 * 60 * 60 * 1000
    : true;

  return (
    <Card
      className={`border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 ${borderClass} overflow-hidden`}
    >
      <CardHeader className="p-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-blue-500 shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {gauge.station_name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {gauge.river_name} • {gauge.district}, {gauge.state}
            </p>
          </div>
          <GaugeStatusBadge status={status} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {/* Current Level Display */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">
              Current Level / वर्तमान जलस्तर
            </p>
            {gauge.current_level_m !== null ? (
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tabular-nums ${levelColorClass}`}>
                  {gauge.current_level_m.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-medium">m</span>
              </div>
            ) : (
              <span className="text-sm text-slate-400 italic">No reading</span>
            )}
          </div>
          <GaugeTrendIndicator trend={gauge.level_trend} size="sm" showLabel={false} />
        </div>

        {/* Benchmark Reference Levels */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {gauge.danger_level_m !== null && (
            <div className="flex items-center justify-between px-2 py-1 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <span className="text-red-700 dark:text-red-400 font-medium">खतरा / Danger</span>
              <span className="font-bold text-red-800 dark:text-red-300 tabular-nums">
                {gauge.danger_level_m.toFixed(2)} m
              </span>
            </div>
          )}
          {gauge.warning_level_m !== null && (
            <div className="flex items-center justify-between px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <span className="text-yellow-700 dark:text-yellow-400 font-medium">चेतावनी / Warning</span>
              <span className="font-bold text-yellow-800 dark:text-yellow-300 tabular-nums">
                {gauge.warning_level_m.toFixed(2)} m
              </span>
            </div>
          )}
        </div>

        {/* Trend Sparkline */}
        <GaugeSparkline
          gaugeId={gauge.id}
          dangerLevelM={gauge.danger_level_m}
          warningLevelM={gauge.warning_level_m}
          height={80}
        />

        {/* Footer: last updated + actions */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span className={isStale ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
              {lastUpdateStr}
            </span>
            <DataBadge type="USER_REPORTED" compact={true} note="CWC Manual" />
          </div>
          <div className="flex items-center gap-1.5">
            {gauge.cwc_station_url && (
              <a
                href={gauge.cwc_station_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open CWC station page"
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">Open CWC station page</span>
              </a>
            )}
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateClick(gauge)}
                className="h-7 px-2.5 text-[11px] font-semibold border-[#0F3D66] text-[#0F3D66] hover:bg-[#0F3D66] hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white"
              >
                <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
                Update
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
