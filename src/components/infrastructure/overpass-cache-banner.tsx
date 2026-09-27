"use client";

import React, { useMemo } from "react";
import { Info, RefreshCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { formatRelativeTime } from "@/lib/services/overpass-client";

interface OverpassCacheBannerProps {
  cacheTimestamp: number | null;
  cooldownSeconds: number;
  isRefreshing?: boolean;
  onRefresh: () => void;
  className?: string;
}

export function OverpassCacheBanner({
  cacheTimestamp,
  cooldownSeconds,
  isRefreshing = false,
  onRefresh,
  className = "",
}: OverpassCacheBannerProps) {
  const locale = useLocale();

  const relativeTimeEn = useMemo(() => {
    return cacheTimestamp ? formatRelativeTime(cacheTimestamp, "en") : "recently";
  }, [cacheTimestamp]);

  const relativeTimeHi = useMemo(() => {
    return cacheTimestamp ? formatRelativeTime(cacheTimestamp, "hi") : "हाल ही में";
  }, [cacheTimestamp]);

  const isCoolingDown = cooldownSeconds > 0;
  const isButtonDisabled = isCoolingDown || isRefreshing;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs transition-all ${className}`}
    >
      {/* Information text & relative time */}
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {locale === "hi"
              ? "बुनियादी ढांचा डेटा कैश से दिखाया जा रहा है"
              : "Infrastructure data loaded from cache"}
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
            {locale === "hi"
              ? `अंतिम अपडेट: ${relativeTimeHi} (Last updated: ${relativeTimeEn})`
              : `Last updated: ${relativeTimeEn}`}
          </span>
        </div>
      </div>

      {/* Action button with live countdown */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isButtonDisabled}
        aria-label={
          isCoolingDown
            ? `Refresh disabled. Please wait ${cooldownSeconds} seconds.`
            : "Refresh infrastructure data from live server"
        }
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-2xs"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
            isRefreshing ? "animate-spin text-[#2563EB]" : ""
          }`}
        />
        <span>
          {isRefreshing ? (
            locale === "hi" ? "अद्यतन हो रहा है..." : "Refreshing..."
          ) : isCoolingDown ? (
            locale === "hi" ? `पुनः प्रयास करें (${cooldownSeconds}s)` : `Refresh (${cooldownSeconds}s)`
          ) : (
            locale === "hi" ? "पुनः प्रयास करें (Refresh)" : "Refresh"
          )}
        </span>
      </button>
    </div>
  );
}
