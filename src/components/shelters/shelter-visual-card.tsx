"use client";

import React from "react";
import { Phone, AlertCircle, Check, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shelter } from "@/types";
import { Locale } from "@/lib/i18n/context";
import { formatNumber, formatStatus } from "@/lib/i18n/formatters";

export interface ShelterVisualCardProps {
  shelter: Shelter;
  locale: Locale;
  onUpdateOccupancy: (shelter: Shelter) => void;
  onReportIssue: (shelter: Shelter) => void;
  className?: string;
}

/**
 * Calculates occupancy tier and color styling as requested in W-014:
 * 0 to 50%: Green ("पर्याप्त स्थान" / "Adequate Space")
 * 51 to 80%: Yellow ("स्थान कम हो रहा है" / "Space Reducing")
 * 81 to 95%: Orange ("लगभग भर गया" / "Nearly Full")
 * 96 to 100%+: Red ("पूरा भर गया" / "FULL")
 */
export function getOccupancyTier(current: number, total: number) {
  const safeTotal = Math.max(1, total);
  const pct = Math.round((current / safeTotal) * 100);

  if (pct <= 50) {
    return {
      pct,
      tier: "ADEQUATE" as const,
      labelHindi: "पर्याप्त स्थान",
      labelEnglish: "Adequate Space",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
      barClass: "bg-emerald-500",
      accentText: "text-emerald-700 dark:text-emerald-400",
    };
  }
  if (pct <= 80) {
    return {
      pct,
      tier: "REDUCING" as const,
      labelHindi: "स्थान कम हो रहा है",
      labelEnglish: "Space Reducing",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800",
      barClass: "bg-amber-400",
      accentText: "text-amber-700 dark:text-amber-400",
    };
  }
  if (pct <= 95) {
    return {
      pct,
      tier: "NEARLY_FULL" as const,
      labelHindi: "लगभग भर गया",
      labelEnglish: "Nearly Full",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800",
      barClass: "bg-orange-500",
      accentText: "text-orange-700 dark:text-orange-400",
    };
  }
  return {
    pct,
    tier: "FULL" as const,
    labelHindi: "पूरा भर गया",
    labelEnglish: "FULL",
    badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800 animate-pulse",
    barClass: "bg-red-600",
    accentText: "text-red-700 dark:text-red-400",
  };
}

export function ShelterVisualCard({
  shelter,
  locale,
  onUpdateOccupancy,
  onReportIssue,
  className,
}: ShelterVisualCardProps) {
  const currentOccupancy = shelter.current_occupancy || 0;
  const capacity = shelter.capacity || 1;
  const availableSpaces = Math.max(0, capacity - currentOccupancy);
  const occupancyTier = getOccupancyTier(currentOccupancy, capacity);

  // Facility definitions per W-014:
  // 💧 Water, 🍱 Food, 💡 Electricity, 🏥 Medical, 🚻 Toilets, 👮 Security
  const facilities = [
    {
      id: "water",
      emoji: "💧",
      titleHindi: "पेयजल",
      titleEnglish: "Water",
      status: shelter.water_available ? ("available" as const) : ("unavailable" as const),
    },
    {
      id: "food",
      emoji: "🍱",
      titleHindi: "भोजन",
      titleEnglish: "Food",
      status: shelter.food_available ? ("available" as const) : ("unavailable" as const),
    },
    {
      id: "electricity",
      emoji: "💡",
      titleHindi: "बिजली",
      titleEnglish: "Electricity",
      status: shelter.electricity ? ("available" as const) : ("unavailable" as const),
    },
    {
      id: "medical",
      emoji: "🏥",
      titleHindi: "चिकित्सा",
      titleEnglish: "Medical",
      status: shelter.medical_support ? ("available" as const) : ("unavailable" as const),
    },
    {
      id: "toilets",
      emoji: "🚻",
      titleHindi: "शौचालय",
      titleEnglish: "Toilets",
      status: "unknown" as const, // Not in basic DB schema -> unknown per prompt
    },
    {
      id: "security",
      emoji: "👮",
      titleHindi: "सुरक्षा",
      titleEnglish: "Security",
      status: "unknown" as const, // Not in basic DB schema -> unknown per prompt
    },
  ];

  // Supply Days logic per W-014
  // If notes contains an explicit supply tag (e.g. "[SUPPLY: X days]"), parse it; otherwise show placeholder
  const supplyDaysMatch = shelter.notes?.match(/(\d+)\s*(days?|दिन)/i);
  const parsedSupplyDays = supplyDaysMatch ? parseInt(supplyDaysMatch[1], 10) : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground shadow-xs p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-md",
        occupancyTier.tier === "FULL" && "border-red-300 dark:border-red-900/50 bg-red-50/20",
        className
      )}
    >
      {/* Header: Shelter Name & Status Badge */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {shelter.name}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {shelter.latitude.toFixed(4)}° N, {shelter.longitude.toFixed(4)}° E
            </p>
          </div>

          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0",
              shelter.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                : shelter.status === "FULL"
                ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300"
                : shelter.status === "STANDBY"
                ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {formatStatus(shelter.status, locale)}
          </span>
        </div>
      </div>

      {/* SECTION 1: Capacity Visualization */}
      <div className="rounded-lg bg-slate-50/90 dark:bg-slate-900/60 p-3.5 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
              <span>{formatNumber(currentOccupancy, locale)}</span>
              <span className="text-slate-400 font-light mx-1.5">/</span>
              <span className="text-slate-600 dark:text-slate-400">
                {formatNumber(capacity, locale)}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>
                {occupancyTier.pct}% {locale === "hi" ? "अधिग्रहित" : "occupied"}
              </span>
              <span className="mx-1.5">&bull;</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatNumber(availableSpaces, locale)}{" "}
                {locale === "hi" ? "स्थान शेष" : "spaces available"}
              </span>
            </div>
          </div>

          <span
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-2xs whitespace-nowrap",
              occupancyTier.badgeClass
            )}
          >
            {locale === "hi" ? occupancyTier.labelHindi : occupancyTier.labelEnglish}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", occupancyTier.barClass)}
            style={{ width: `${Math.min(100, Math.max(0, occupancyTier.pct))}%` }}
            role="progressbar"
            aria-valuenow={currentOccupancy}
            aria-valuemin={0}
            aria-valuemax={capacity}
            aria-label={`Occupancy ${occupancyTier.pct}%`}
          />
        </div>
      </div>

      {/* SECTION 2: Facilities Display (Row of Icon Pills) */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {locale === "hi" ? "उपलब्ध सुविधाएं" : "Essential Facilities"}
        </div>
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
          {facilities.map((fac) => {
            const isGreen = fac.status === "available";
            const isRed = fac.status === "unavailable";
            const isGray = fac.status === "unknown";

            return (
              <div
                key={fac.id}
                title={`${fac.titleEnglish} / ${fac.titleHindi}: ${
                  isGreen
                    ? locale === "hi"
                      ? "उपलब्ध"
                      : "Available"
                    : isRed
                    ? locale === "hi"
                      ? "अनुपलब्ध"
                      : "Not Available"
                    : locale === "hi"
                    ? "अज्ञात स्थिति"
                    : "Status Unknown"
                }`}
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-default select-none",
                  isGreen &&
                    "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
                  isRed &&
                    "bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 opacity-60",
                  isGray &&
                    "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 opacity-70"
                )}
              >
                <span className="text-base leading-none mb-0.5">{fac.emoji}</span>
                <span className="text-[9px] font-bold truncate max-w-full">
                  {locale === "hi" ? fac.titleHindi : fac.titleEnglish}
                </span>
                <span className="text-[8px] mt-0.5">
                  {isGreen ? (
                    <Check className="w-2.5 h-2.5 text-emerald-600 inline" />
                  ) : isRed ? (
                    <XCircle className="w-2.5 h-2.5 text-red-500 inline" />
                  ) : (
                    <HelpCircle className="w-2.5 h-2.5 text-slate-400 inline" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Supply Status */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs flex items-center justify-between gap-2">
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          {locale === "hi" ? "खाद्य आपूर्ति" : "Food Supply"}:
        </span>
        {parsedSupplyDays !== null ? (
          <span
            className={cn(
              "px-2 py-0.5 rounded font-bold text-[11px]",
              parsedSupplyDays < 1
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                : parsedSupplyDays <= 3
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            {parsedSupplyDays} {locale === "hi" ? "दिन शेष" : "days remaining"}
          </span>
        ) : (
          <span className="text-slate-500 italic text-[11px]">
            {locale === "hi" ? "आपूर्ति डेटा अनुपलब्ध" : "Supply data unavailable"}
          </span>
        )}
      </div>

      {/* SECTION 4: Contact Section */}
      <div className="text-xs flex items-center gap-2 pt-0.5">
        <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        {shelter.contact_information ? (
          <a
            href={`tel:${shelter.contact_information.replace(/[^\d+]/g, "")}`}
            className="font-semibold text-blue-700 dark:text-blue-400 hover:underline truncate"
            title={locale === "hi" ? "कॉल करें" : "Call shelter nodal officer"}
          >
            {shelter.contact_information}
          </a>
        ) : (
          <span className="text-slate-400 italic">
            {locale === "hi" ? "संपर्क नंबर उपलब्ध नहीं" : "Contact not listed"}
          </span>
        )}
      </div>

      {/* SECTION 5: Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onUpdateOccupancy(shelter)}
          className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold shadow-2xs transition flex items-center justify-center gap-1.5"
        >
          <span>{locale === "hi" ? "अधिभोग अपडेट" : "Update Occupancy"}</span>
        </button>

        <button
          type="button"
          onClick={() => onReportIssue(shelter)}
          className="h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 text-xs font-bold shadow-2xs transition flex items-center justify-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{locale === "hi" ? "समस्या रिपोर्ट" : "Report Issue"}</span>
        </button>
      </div>
    </div>
  );
}

export default ShelterVisualCard;
