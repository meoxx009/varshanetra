import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SeverityLevel } from "@/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/common/skeleton";
import { cn } from "@/lib/utils";

import { Tooltip } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { DataBadge, DataBadgeType } from "@/components/common/data-badge";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: {
    value: string;
    isUp: boolean;
    label?: string;
  };
  icon: LucideIcon;
  severity?: SeverityLevel;
  sourceLabel?: string;
  tooltip?: string;
  isLoading?: boolean;
  className?: string;
  dataBadgeType?: DataBadgeType;
  dataBadgeTimestamp?: string | Date | number | null;
  dataBadgeNote?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  subtext,
  trend,
  icon: Icon,
  severity,
  sourceLabel,
  tooltip,
  isLoading = false,
  className,
  dataBadgeType,
  dataBadgeTimestamp,
  dataBadgeNote,
}: MetricCardProps) {
  const getSeverityBorder = () => {
    switch (severity) {
      case "CRITICAL":
        return "border-l-4 border-l-emergency-critical";
      case "ALERT":
        return "border-l-4 border-l-emergency-high";
      case "ADVISORY":
        return "border-l-4 border-l-emergency-warning";
      case "NORMAL":
        return "border-l-4 border-l-emergency-success";
      default:
        return "border-l-4 border-l-[#0F3D66]";
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("p-4 space-y-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800", getSeverityBorder(), className)}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 my-1" />
        <Skeleton className="h-3 w-36" />
      </Card>
    );
  }

  const isUnavailable =
    dataBadgeType === "UNAVAILABLE" ||
    value === null ||
    value === undefined ||
    value === "--";

  return (
    <Card
      className={cn(
        "p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm",
        getSeverityBorder(),
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          {tooltip && (
            <Tooltip content={tooltip} side="top">
              <span className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <Info className="w-3.5 h-3.5" />
              </span>
            </Tooltip>
          )}
        </div>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="my-2">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isUnavailable && dataBadgeType === "UNAVAILABLE" ? (
              <span className="text-base font-bold italic text-slate-400 dark:text-slate-500">अनुपलब्ध</span>
            ) : (
              value
            )}
          </span>
          {unit && !(isUnavailable && dataBadgeType === "UNAVAILABLE") && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          )}
          {dataBadgeType && (
            <DataBadge
              type={dataBadgeType}
              timestamp={dataBadgeTimestamp}
              note={dataBadgeNote}
              compact={true}
            />
          )}
        </div>

        {subtext && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {subtext}
          </p>
        )}
      </div>

      <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 flex-wrap gap-1">
        {trend ? (
          <div
            className={cn(
              "flex items-center gap-0.5 font-semibold",
              trend.isUp ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {trend.isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-slate-400 font-normal ml-1">({trend.label})</span>}
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">Telemetry Feed</span>
        )}

        {sourceLabel && (
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
            {sourceLabel}
          </span>
        )}
      </div>
    </Card>
  );
}
