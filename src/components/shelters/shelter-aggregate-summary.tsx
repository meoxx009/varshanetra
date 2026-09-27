"use client";

import React from "react";
import { Home, Users, CheckCircle2, ShieldAlert, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shelter } from "@/types";
import { Locale } from "@/lib/i18n/context";
import { formatNumber } from "@/lib/i18n/formatters";
import { Tooltip } from "@/components/ui/tooltip";
import { getOccupancyTier } from "./shelter-visual-card";

export interface ShelterAggregateSummaryProps {
  shelters: Shelter[];
  locale: Locale;
  onOpenNdmaReport: () => void;
  className?: string;
}

export function ShelterAggregateSummary({
  shelters,
  locale,
  onOpenNdmaReport,
  className,
}: ShelterAggregateSummaryProps) {
  const totalShelters = shelters.length;
  const totalCapacity = shelters.reduce((acc, s) => acc + (s.capacity || 0), 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + (s.current_occupancy || 0), 0);
  const totalAvailable = Math.max(0, totalCapacity - totalOccupancy);

  const overallTier = getOccupancyTier(totalOccupancy, totalCapacity);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-xs space-y-4",
        className
      )}
    >
      {/* Header Row: Title & NDMA Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {locale === "hi"
                  ? "जिला राहत आश्रय समग्र क्षमता एवं स्थिति"
                  : "District Relief Shelter Capacity & Aggregate Status"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "आपदा प्रबंधन विस्थापित नियंत्रण प्रकोष्ठ • लाइव अधिभोग निगरानी"
                  : "Disaster Management Evacuee Cell • Live Occupancy Telemetry"}
              </p>
            </div>
          </div>
        </div>

        {/* NDMA Report Generation Button with Mandatory Tooltip */}
        <div>
          <Tooltip
            content={
              <div className="text-center max-w-xs">
                <span className="font-bold block">
                  {locale === "hi"
                    ? "यह NDMA मानक प्रारूप में दैनिक आश्रय रिपोर्ट है"
                    : "This is the daily shelter report in NDMA standard format"}
                </span>
                <span className="text-[10px] text-slate-300">
                  {locale === "hi"
                    ? "राज्य आपदा प्रबंधन प्राधिकरण (SDMA) को दैनिक प्रेषण हेतु"
                    : "For daily dispatch to State Disaster Management Authority"}
                </span>
              </div>
            }
            side="bottom"
          >
            <button
              type="button"
              onClick={onOpenNdmaReport}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs shadow-xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-300" />
              <span>{locale === "hi" ? "जनरेट रिपोर्ट" : "Generate Report"}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-700/80 text-white font-mono uppercase">
                NDMA
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Shelters */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>{locale === "hi" ? "पंजीकृत आश्रय" : "Total Shelters"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            {formatNumber(totalShelters, locale)}
          </div>
          <div className="text-[11px] text-slate-500">
            {locale === "hi" ? "सत्यापित निकासी स्थल" : "Verified assembly points"}
          </div>
        </div>

        {/* Total Rated Capacity */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{locale === "hi" ? "कुल निर्धारित क्षमता" : "Total Capacity"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            {formatNumber(totalCapacity, locale)}
          </div>
          <div className="text-[11px] text-slate-500">
            {locale === "hi" ? "नाममात्र विस्थापित आवास" : "Maximum accommodation"}
          </div>
        </div>

        {/* Current Occupancy */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>{locale === "hi" ? "वर्तमान अधिभोग" : "Current Occupancy"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            {formatNumber(totalOccupancy, locale)}
          </div>
          <div className="text-[11px] text-slate-500">
            {overallTier.pct}% {locale === "hi" ? "क्षमता का उपयोग" : "capacity utilized"}
          </div>
        </div>

        {/* Available Spaces */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "hi" ? "उपलब्ध रिक्तियां" : "Available Spaces"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatNumber(totalAvailable, locale)}
          </div>
          <div className="text-[11px] text-slate-500">
            {locale === "hi" ? "तत्काल प्रवेश हेतु तैयार" : "Ready for immediate intake"}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 p-3 border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 dark:text-slate-300">
              {locale === "hi"
                ? "समग्र जिला आश्रय अधिभोग उपयोग:"
                : "Overall District Shelter Capacity Used:"}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold border",
                overallTier.badgeClass
              )}
            >
              {locale === "hi" ? overallTier.labelHindi : overallTier.labelEnglish}
            </span>
          </div>
          <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
            {formatNumber(totalOccupancy, locale)} / {formatNumber(totalCapacity, locale)} (
            {overallTier.pct}%)
          </span>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", overallTier.barClass)}
            style={{ width: `${Math.min(100, Math.max(0, overallTier.pct))}%` }}
            role="progressbar"
            aria-valuenow={totalOccupancy}
            aria-valuemin={0}
            aria-valuemax={totalCapacity}
            aria-label={`Overall Occupancy ${overallTier.pct}%`}
          />
        </div>
      </div>
    </div>
  );
}

export default ShelterAggregateSummary;
