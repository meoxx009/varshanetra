"use client";

import React from "react";
import {
  ShieldAlert,
  Info,
  Clock,
  UserCheck,
  Edit3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { ImdManualEntry } from "@/types";

export interface ImdBulletinBannerProps {
  entry: ImdManualEntry;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function ImdBulletinBanner({
  entry,
  onEdit,
  canEdit = false,
}: ImdBulletinBannerProps) {
  const locale = useLocale();

  const colorStyles: Record<
    "Green" | "Yellow" | "Orange" | "Red",
    { bg: string; border: string; text: string; labelHi: string; labelEn: string; icon: string }
  > = {
    Green: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-300 dark:border-emerald-800",
      text: "text-emerald-800 dark:text-emerald-200",
      labelHi: "हरा (सामान्य / कोई चेतावनी नहीं)",
      labelEn: "GREEN (Normal / No Warning)",
      icon: "🟢",
    },
    Yellow: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-300 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-200",
      labelHi: "पीला (सतर्कता / निगरानी रखें)",
      labelEn: "YELLOW (Watch / Be Updated)",
      icon: "🟡",
    },
    Orange: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-400 dark:border-orange-800",
      text: "text-orange-900 dark:text-orange-200",
      labelHi: "नारंगी (चेतावनी / तैयार रहें)",
      labelEn: "ORANGE (Alert / Be Prepared)",
      icon: "🟠",
    },
    Red: {
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-500 dark:border-red-800",
      text: "text-red-900 dark:text-red-200",
      labelHi: "लाल (अति गंभीर / त्वरित कार्रवाई)",
      labelEn: "RED (Emergency / Take Action)",
      icon: "🔴",
    },
  };

  const style = colorStyles[entry.imd_color_code] || colorStyles.Orange;

  // Calculate percentage departure from normal
  const departurePercent =
    entry.normal_rainfall > 0
      ? Math.round(((entry.district_rainfall_today - entry.normal_rainfall) / entry.normal_rainfall) * 100)
      : null;

  return (
    <Card className={`border-2 ${style.border} ${style.bg} shadow-md overflow-hidden relative transition-all`}>
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Top Header Row with prominent Green IMD BULLETIN Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prominent Green IMD BULLETIN Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>IMD BULLETIN</span>
            </span>

            {/* Mandatory Sub-label Note */}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {locale === "hi"
                ? "आईएमडी बुलेटिन से दर्ज डेटा"
                : "Data entered from IMD Bulletin"}
            </span>

            {/* Warning Color Code Tag */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${style.text} bg-white/80 dark:bg-slate-900/80 border ${style.border}`}>
              <span>{style.icon}</span>
              <span>{locale === "hi" ? style.labelHi : style.labelEn}</span>
            </span>
          </div>

          {canEdit && onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="text-xs font-semibold gap-1.5 h-7 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs"
            >
              <Edit3 className="w-3 h-3 text-[#0F3D66] dark:text-sky-400" />
              <span>{locale === "hi" ? "बुलेटिन अपडेट करें" : "Update Bulletin"}</span>
            </Button>
          )}
        </div>

        {/* 4 Rainfall Metric Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Today */}
          <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              {locale === "hi" ? "आज की वर्षा" : "Rainfall Today"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {entry.district_rainfall_today}
              </span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            {departurePercent !== null && (
              <span
                className={`text-[10px] font-bold block mt-1 ${
                  departurePercent >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {departurePercent >= 0 ? `+${departurePercent}%` : `${departurePercent}%`}{" "}
                {locale === "hi" ? "सामान्य से" : "vs Normal"}
              </span>
            )}
          </div>

          {/* Yesterday */}
          <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              {locale === "hi" ? "कल की वर्षा" : "Yesterday"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {entry.district_rainfall_yesterday}
              </span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {locale === "hi" ? "24-घंटे संचयी" : "24h cumulative"}
            </span>
          </div>

          {/* This Week */}
          <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              {locale === "hi" ? "इस सप्ताह" : "This Week"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-[#0F3D66] dark:text-sky-400">
                {entry.district_rainfall_week}
              </span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {locale === "hi" ? "7-दिवसीय योग" : "7-day total"}
            </span>
          </div>

          {/* Normal Climatological Rainfall */}
          <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              {locale === "hi" ? "सामान्य वर्षा (IMD)" : "Normal Climatology"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-700 dark:text-slate-300">
                {entry.normal_rainfall}
              </span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {locale === "hi" ? "दीर्घकालिक औसत" : "Long-period average"}
            </span>
          </div>
        </div>

        {/* Forecast Narrative Quote Box */}
        {entry.forecast_narrative && (
          <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0F3D66] dark:text-sky-400" />
              <span>{locale === "hi" ? "IMD आधिकारिक पूर्वानुमान विवरण:" : "IMD Official Forecast Narrative:"}</span>
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &ldquo;{entry.forecast_narrative}&rdquo;
            </p>
          </div>
        )}

        {/* Provenance & Attribution Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {locale === "hi" ? "दर्जकर्ता:" : "Logged by:"}{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-semibold">{entry.entered_by}</strong>
            </span>
            <span>•</span>
            <span>{entry.data_source}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date(entry.entry_datetime).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              IST
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
