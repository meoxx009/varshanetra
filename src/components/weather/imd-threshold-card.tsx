"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IMDThresholdCardProps {
  /** 24-hour rainfall forecast accumulation in mm */
  rainfall24h?: number | null;
  /** Optional custom container class */
  className?: string;
}

interface IMDCategoryRow {
  id: string;
  hindiName: string;
  englishName: string;
  rangeText: string;
  min: number;
  max: number | null;
  dotColorClass: string;
  badgeText?: string;
  badgeVariantClass?: string;
  highlightClass: string;
}

const IMD_CATEGORIES: IMDCategoryRow[] = [
  {
    id: "no-rain",
    hindiName: "कोई वर्षा नहीं",
    englishName: "No Rain",
    rangeText: "0 to 2.5mm",
    min: 0,
    max: 2.5,
    dotColorClass: "bg-slate-400",
    highlightClass: "bg-slate-100/90 dark:bg-slate-800/80 border-l-4 border-l-slate-400",
  },
  {
    id: "light-rain",
    hindiName: "हल्की वर्षा",
    englishName: "Light Rain",
    rangeText: "2.5 to 15.5mm",
    min: 2.5,
    max: 15.5,
    dotColorClass: "bg-green-500",
    highlightClass: "bg-green-50 dark:bg-green-950/40 border-l-4 border-l-green-500",
  },
  {
    id: "moderate-rain",
    hindiName: "मध्यम वर्षा",
    englishName: "Moderate Rain",
    rangeText: "15.6 to 64.4mm",
    min: 15.6,
    max: 64.4,
    dotColorClass: "bg-emerald-600",
    highlightClass: "bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600",
  },
  {
    id: "heavy-rain",
    hindiName: "भारी वर्षा",
    englishName: "Heavy Rain",
    rangeText: "64.5 to 115.5mm",
    min: 64.5,
    max: 115.5,
    dotColorClass: "bg-yellow-500",
    badgeText: "WATCH",
    badgeVariantClass: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-200 dark:border-yellow-700",
    highlightClass: "bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-l-yellow-500",
  },
  {
    id: "very-heavy-rain",
    hindiName: "बहुत भारी वर्षा",
    englishName: "Very Heavy Rain",
    rangeText: "115.6 to 204.4mm",
    min: 115.6,
    max: 204.4,
    dotColorClass: "bg-orange-500",
    badgeText: "ALERT",
    badgeVariantClass: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-700",
    highlightClass: "bg-orange-50 dark:bg-orange-950/40 border-l-4 border-l-orange-500",
  },
  {
    id: "extremely-heavy-rain",
    hindiName: "अत्यंत भारी वर्षा",
    englishName: "Extremely Heavy Rain",
    rangeText: "above 204.4mm",
    min: 204.4,
    max: null,
    dotColorClass: "bg-red-600",
    badgeText: "WARNING",
    badgeVariantClass: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-700",
    highlightClass: "bg-red-50 dark:bg-red-950/40 border-l-4 border-l-red-600",
  },
];

/**
 * IMDThresholdCard
 * Government-credibility reference card showcasing statutory IMD rainfall classification
 * and highlighting the current 24-hour rainfall forecast.
 */
export function IMDThresholdCard({
  rainfall24h,
  className,
}: IMDThresholdCardProps) {
  // Determine which row matches current 24h rainfall
  const activeRowId = useMemo(() => {
    if (typeof rainfall24h !== "number" || isNaN(rainfall24h)) {
      return null;
    }
    if (rainfall24h <= 2.5) return "no-rain";
    if (rainfall24h <= 15.5) return "light-rain";
    if (rainfall24h <= 64.4) return "moderate-rain";
    if (rainfall24h <= 115.5) return "heavy-rain";
    if (rainfall24h <= 204.4) return "very-heavy-rain";
    return "extremely-heavy-rain";
  }, [rainfall24h]);

  const hasValidRainfall = typeof rainfall24h === "number" && !isNaN(rainfall24h);

  return (
    <Card className={cn("border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900", className)}>
      {/* CARD TITLE ROW */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            IMD वर्षा वर्गीकरण
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            IMD Rainfall Classification
          </p>
        </div>

        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold px-2.5 py-0.5 shrink-0">
          IMD Official Standard
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Rainfall Unavailable Banner (if rainfall value is not available) */}
        {!hasValidRainfall && (
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>वर्षा डेटा उपलब्ध नहीं • Rainfall data unavailable</span>
          </div>
        )}

        {/* THRESHOLD TABLE */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                  श्रेणी (हिन्दी)
                </th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                  Category (English)
                </th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                  वर्षा सीमा (24h Range)
                </th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                  आईएमडी रंग कोड (Color Code)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {IMD_CATEGORIES.map((row) => {
                const isSelected = activeRowId === row.id;

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      isSelected
                        ? row.highlightClass
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    )}
                  >
                    {/* Column 1: Hindi Category + Arrow/Badge if current */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSelected && (
                          <span className="text-sm select-none" aria-label="Current Forecast Indicator">
                            👉
                          </span>
                        )}
                        <span>{row.hindiName}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            वर्तमान पूर्वानुमान ({rainfall24h?.toFixed(1)} mm)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: English Category */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{row.englishName}</span>
                        {isSelected && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            (Current Forecast)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Rainfall Range in mm per day */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {row.rangeText}
                    </td>

                    {/* Column 4: IMD Color Code Dot + Optional Text Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-xs", row.dotColorClass)}
                          aria-hidden="true"
                        />
                        {row.badgeText ? (
                          <span
                            className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider",
                              row.badgeVariantClass
                            )}
                          >
                            {row.badgeText}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 capitalize">
                            {row.dotColorClass.replace("bg-", "").replace("-500", "").replace("-600", "").replace("-400", "")}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FLASH FLOOD NOTE: Small orange info box */}
        <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Flash Flood Risk Threshold: </span>
            <span>अगर 1 घंटे में 50mm से अधिक वर्षा हो</span>
            <span className="mx-1">•</span>
            <span>If rainfall exceeds 50mm in 1 hour.</span>
            <span className="block mt-0.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
              Source: IMD Nowcast Guidelines
            </span>
          </div>
        </div>

        {/* FOOTER & VARSHANETRA ALIGNMENT NOTE */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            स्रोत: भारत मौसम विज्ञान विभाग, आधिकारिक वर्गीकरण प्रणाली
            <span className="mx-1">•</span>
            Source: India Meteorological Department, Official Classification System
          </p>

          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 pt-0.5">
            VarshaNetra जोखिम स्तर IMD मानकों के अनुरूप हैं: LOW equals IMD Green, MODERATE equals IMD Yellow Watch, HIGH equals IMD Orange Alert, SEVERE equals IMD Red Warning.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default IMDThresholdCard;
