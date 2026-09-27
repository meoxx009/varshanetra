"use client";

import React from "react";
import {
  HeartPulse,
  Shield,
  Flame,
  Home,
  Bus,
  GraduationCap,
  Waves,
  Building2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import {
  INFRASTRUCTURE_CATEGORIES,
  InfrastructureCategoryFilter,
} from "@/lib/services/risk-zone-locality";

interface FloodInfrastructureFilterBarProps {
  selectedCategory: InfrastructureCategoryFilter;
  onSelectCategory: (cat: InfrastructureCategoryFilter) => void;
  categoryCounts?: Record<InfrastructureCategoryFilter, number>;
  className?: string;
}

export function FloodInfrastructureFilterBar({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  className = "",
}: FloodInfrastructureFilterBarProps) {
  const locale = useLocale();
  const isHi = locale === "hi";

  const renderIcon = (id: InfrastructureCategoryFilter) => {
    const iconClass = "w-3.5 h-3.5 shrink-0";
    switch (id) {
      case "all":
        return <Layers className={iconClass} />;
      case "health":
        return <HeartPulse className={iconClass} />;
      case "police":
        return <Shield className={iconClass} />;
      case "fire":
        return <Flame className={iconClass} />;
      case "shelter":
        return <Home className={iconClass} />;
      case "transport":
        return <Bus className={iconClass} />;
      case "schools":
        return <GraduationCap className={iconClass} />;
      case "drainage":
        return <Waves className={iconClass} />;
      case "government":
        return <Building2 className={iconClass} />;
      case "other":
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  return (
    <div
      role="region"
      aria-label={isHi ? "अवसंरचना फ़िल्टर बार" : "Infrastructure Asset Filter Bar"}
      className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xs backdrop-blur-xs ${className}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Layers className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
          <span>
            {isHi ? "अवसंरचना फ़िल्टर" : "Infrastructure Intelligence"}
          </span>
          <span className="text-[10px] font-normal text-slate-500">
            ({isHi ? "सत्यापित ओपनस्ट्रीटमैप संपत्तियां" : "Verified OSM Assets"})
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {isHi ? "मानचित्र पर प्रदर्शित करने हेतु चुनें" : "Toggle layers on map"}
        </span>
      </div>

      <div
        role="tablist"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
      >
        {INFRASTRUCTURE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts ? categoryCounts[cat.id] ?? 0 : undefined;

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none shrink-0 ${
                isSelected
                  ? "bg-[#0F3D66] text-white shadow-xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {renderIcon(cat.id)}
              <span>{isHi ? cat.labelHi : cat.labelEn}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white font-bold"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
