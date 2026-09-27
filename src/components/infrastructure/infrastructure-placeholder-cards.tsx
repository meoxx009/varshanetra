"use client";

import React from "react";
import { Building2, Shield, Flame, Home, Info } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface InfrastructurePlaceholderCardsProps {
  className?: string;
}

export function InfrastructurePlaceholderCards({
  className = "",
}: InfrastructurePlaceholderCardsProps) {
  const locale = useLocale();

  const placeholderItems = [
    {
      id: "hospitals",
      labelEn: "Hospitals",
      labelHi: "अस्पताल",
      count: 0,
      icon: Building2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    },
    {
      id: "police",
      labelEn: "Police",
      labelHi: "पुलिस",
      count: 0,
      icon: Shield,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    },
    {
      id: "fire",
      labelEn: "Fire",
      labelHi: "अग्निशमन",
      count: 0,
      icon: Flame,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
    },
    {
      id: "shelters",
      labelEn: "Shelters",
      labelHi: "आश्रय स्थल",
      count: 0,
      icon: Home,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 4 Infrastructure Placeholder Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {placeholderItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {locale === "hi" ? item.labelHi : item.labelEn}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {locale === "hi" ? item.labelEn : item.labelHi}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mandatory Step 5 Bilingual Note */}
      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-xs flex items-start gap-2 shadow-2xs">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-[11px] space-y-0.5">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            ओपनस्ट्रीटमैप पर मैप किया गया डेटा उपलब्ध नहीं। स्थानीय रिकॉर्ड से सत्यापित करें।
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            No mapped data available on OpenStreetMap. Verify with local records.
          </p>
        </div>
      </div>
    </div>
  );
}
