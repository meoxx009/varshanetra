"use client";

import React, { useState, useEffect } from "react";
import { DataSourceMeta } from "@/types";
import { Info, Database, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/i18n/formatters";

interface DataSourceBadgeProps {
  metadata: DataSourceMeta;
  className?: string;
  showAttributionText?: boolean;
  compact?: boolean;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  metadata,
  className,
  showAttributionText = true,
  compact = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSimulated = metadata.origin === "SIMULATED" || metadata.origin === "DEMO_SANDBOX";
  const isEstimated = metadata.origin === "ESTIMATED";

  const getOriginBadge = () => {
    switch (metadata.origin) {
      case "LIVE_API":
        return {
          label: locale === "hi" ? "लाइव फीड" : "Live Feed",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
          icon: Database,
        };
      case "ESTIMATED":
        return {
          label: locale === "hi" ? "मॉडल अनुमान" : "Model Estimate",
          bg: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
          icon: Sparkles,
        };
      case "SIMULATED":
        return {
          label: locale === "hi" ? "सिमुलेटेड डेटा" : "Simulated Data",
          bg: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
          icon: AlertCircle,
        };
      case "DEMO_SANDBOX":
        return {
          label: locale === "hi" ? "प्रदर्शन सैंडबॉक्स" : "Demonstration Sandbox",
          bg: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
          icon: Info,
        };
      default:
        return {
          label: metadata.origin || (locale === "hi" ? "डेटा स्रोत" : "Data Source"),
          bg: "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          icon: Database,
        };
    }
  };

  const badge = getOriginBadge();
  const IconComponent = badge.icon;
  const displayTime = mounted && metadata.lastUpdated ? formatDateTime(metadata.lastUpdated, locale) : "";

  const resolutionTag =
    metadata.resolution ||
    (metadata.provider.toLowerCase().includes("tomorrow") ? "1km / 1-min" : null);

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 text-xs shadow-2xs text-slate-700 dark:text-slate-300",
          className
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium border text-xs",
            badge.bg
          )}
        >
          <IconComponent className="w-3 h-3" />
          {badge.label}
        </span>
        <span
          className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[260px] sm:max-w-none"
          title={metadata.provider}
        >
          {metadata.provider}
        </span>
        {resolutionTag && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {resolutionTag}
          </span>
        )}
        <span suppressHydrationWarning className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
          {displayTime ? `• ${displayTime}` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col gap-1 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 shadow-2xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium border text-xs",
              badge.bg
            )}
          >
            <IconComponent className="w-3 h-3" />
            {badge.label}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.provider}</span>
          {resolutionTag && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {resolutionTag}
            </span>
          )}
          <span suppressHydrationWarning className="text-slate-500 dark:text-slate-400 text-xs">
            {displayTime
              ? `${locale === "hi" ? "अपडेट:" : "Updated:"} ${displayTime}`
              : `${locale === "hi" ? "अपडेट: लाइव" : "Updated: Live"}`}
          </span>
        </div>

        {metadata.attributionNotice && (
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium underline underline-offset-2 ml-auto cursor-pointer"
          >
            {showDetails ? (locale === "hi" ? "कम देखें" : "Less") : (locale === "hi" ? "विवरण" : "Details")}
          </button>
        )}
      </div>

      {(showDetails || (showAttributionText && !compact)) && metadata.attributionNotice && (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
          {metadata.attributionNotice}
        </p>
      )}

      {isSimulated && (
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          {locale === "hi"
            ? "सूचना: जिला आपदा प्रशिक्षण एवं मूल्यांकन हेतु सिमुलेटेड डेटा परिदृश्य। यह आधिकारिक आईएमडी/सीडब्ल्यूसी प्रसारण नहीं है।"
            : "Notice: Synthetic scenario data for district training & evaluation. Not an official IMD/CWC broadcast."}
        </p>
      )}

      {isEstimated && (
        <p className="text-xs text-sky-700 dark:text-sky-400">
          {locale === "hi"
            ? "हाइड्रोलॉजिकल अपवाह गणना से अनुमानित। मैदानी सत्यापन अनुशंसित।"
            : "Derived from hydrological runoff calculations. Field verification recommended."}
        </p>
      )}
    </div>
  );
};
