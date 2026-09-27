"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Shield } from "lucide-react";
import { NAV_SECTIONS } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/common/language-switcher";

const NAV_ITEM_TRANSLATION_KEYS: Record<string, string> = {
  "/river-gauges": "riverGauges",
  "/dashboard": "dashboard",
  "/situation": "commandCenter",
  "/map": "liveGisMap",
  "/weather": "weatherIntelligence",
  "/flood": "floodIntelligence",
  "/impact": "impactAnalysis",
  "/alerts": "alerts",
  "/recipients": "recipients",
  "/incidents": "incidents",
  "/response": "responseTeams",
  "/resources": "resources",
  "/shelters": "shelters",
  "/fieldReports": "fieldReports",
  "/field-reports": "fieldReports",
  "/analytics": "analytics",
  "/replay": "historicalReplay",
  "/audit": "auditLog",
  "/data-sources": "dataHealth",
  "/intelligence": "dataIntelligence",
  "/notifications": "notifications",
  "/profile": "profile",
  "/settings": "settings",
};

const SECTION_TRANSLATION_KEYS: Record<string, string> = {
  "Overview": "navOverview",
  "Risk & Weather": "navRiskWeather",
  "Response": "navResponse",
  "Insights": "navInsights",
  "Account": "navAccount",
  // Backward-compatibility aliases
  "Command Core": "navOverview",
  "Intelligence & Hydro": "navRiskWeather",
  "Operations & Tactical": "navResponse",
  "Intelligence & Governance": "navInsights",
};

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const tNav = useTranslations("navigation");
  const tCommon = useTranslations("common");

  const getNavTitle = (item: { title: string; href: string }) => {
    const key = NAV_ITEM_TRANSLATION_KEYS[item.href];
    return key ? tNav(key) : item.title;
  };

  const getSectionTitle = (sectionTitle: string) => {
    const key = SECTION_TRANSLATION_KEYS[sectionTitle];
    return key ? tNav(key) : sectionTitle;
  };

  // Close mobile drawer when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tNav("commandCenter")}
        className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#0F3D66] text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-black text-sm tracking-tight text-[#0F3D66] dark:text-white">
              VARSHA<span className="text-[#2563EB]">NETRA</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={locale === "hi" ? "नेविगेशन मेनू बंद करें" : "Close navigation menu"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {getSectionTitle(section.title)}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const localizedTitle = getNavTitle(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition",
                      isActive
                        ? "bg-[#0F3D66] text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
                    <span className="flex-1">{localizedTitle}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {item.badge === "Live" && locale === "hi" ? "लाइव" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile Drawer Footer with Language Switcher */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-500 flex justify-between items-center">
          <LanguageSwitcher compact />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{tCommon("systemBadge")}</span>
        </div>
      </div>
    </div>
  );
}
