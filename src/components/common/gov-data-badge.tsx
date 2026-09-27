"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface GovDataBadgeProps {
  label?: string;
  className?: string;
  source?: "data.gov.in" | "IMD" | "NDMA" | "CWC" | "MOSDAC" | "BHUVAN";
  size?: "sm" | "md" | "lg";
}

export function GovDataBadge({
  label,
  className = "",
  source = "data.gov.in",
  size = "md",
}: GovDataBadgeProps) {
  const locale = useLocale();

  const defaultText = locale === "hi" ? "सरकारी डेटा" : "GOVT. DATA";
  const displayText = label || defaultText;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-black tracking-wide rounded-md shadow-xs border transition-colors",
        "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 border-amber-500/80 ring-1 ring-amber-400/40",
        "dark:from-amber-400 dark:via-yellow-400 dark:to-amber-500 dark:text-slate-950 dark:border-amber-400",
        sizeClasses[size],
        className
      )}
      title={`Official Government of India Data Source: ${source}`}
    >
      <ShieldCheck className={cn("shrink-0 text-slate-950", iconSizes[size])} />
      <span>{displayText}</span>
      {source && (
        <span className="text-[10px] opacity-75 font-semibold uppercase tracking-wider pl-0.5 hidden sm:inline">
          ({source})
        </span>
      )}
    </span>
  );
}

export default GovDataBadge;
