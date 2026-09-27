"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GaugeTrend } from "@/types";

interface GaugeTrendIndicatorProps {
  trend: GaugeTrend | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function GaugeTrendIndicator({
  trend,
  size = "md",
  showLabel = true,
}: GaugeTrendIndicatorProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  if (!trend) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} text-slate-400`}>
        <Minus className={iconSize} aria-hidden="true" />
        {showLabel && <span>—</span>}
      </span>
    );
  }

  if (trend === "RISING") {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-semibold text-red-600 dark:text-red-400`}
        aria-label="Rising trend"
        title="Water level is rising"
      >
        <TrendingUp className={iconSize} aria-hidden="true" />
        {showLabel && <span>Rising / बढ़ रहा</span>}
      </span>
    );
  }

  if (trend === "FALLING") {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-semibold text-green-600 dark:text-green-400`}
        aria-label="Falling trend"
        title="Water level is falling"
      >
        <TrendingDown className={iconSize} aria-hidden="true" />
        {showLabel && <span>Falling / घट रहा</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} font-semibold text-slate-500 dark:text-slate-400`}
      aria-label="Steady trend"
      title="Water level is steady"
    >
      <Minus className={iconSize} aria-hidden="true" />
      {showLabel && <span>Steady / स्थिर</span>}
    </span>
  );
}
