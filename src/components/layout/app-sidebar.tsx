"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  CloudRain,
  Waves,
  Building2,
  BellRing,
  ClipboardList,
  Siren,
  Package,
  FileSpreadsheet,
  LineChart,
  Database,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bell,
  Sparkles,
  Activity,
  History,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "@/lib/i18n/context";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

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

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Command Center", href: "/situation", icon: Sparkles },
      { title: "Live Map", href: "/map", icon: Map },
    ],
  },
  {
    title: "Risk & Weather",
    items: [
      { title: "Weather", href: "/weather", icon: CloudRain },
      { title: "Flood Risk", href: "/flood", icon: Waves },
      { title: "River Gauges", href: "/river-gauges", icon: Waves },
      { title: "Impact Analysis", href: "/impact", icon: Building2 },
      { title: "Alerts", href: "/alerts", icon: BellRing, badge: "Live" },
      { title: "Recipients", href: "/recipients", icon: Users },
    ],
  },
  {
    title: "Response",
    items: [
      { title: "Incidents", href: "/incidents", icon: ClipboardList },
      { title: "Response Teams", href: "/response", icon: Siren },
      { title: "Resources", href: "/resources", icon: Package },
      { title: "Field Reports", href: "/field-reports", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Insights",
    items: [
      { title: "Analytics", href: "/analytics", icon: LineChart },
      { title: "Historical Replay", href: "/replay", icon: History },
      { title: "Audit Log", href: "/audit", icon: Activity },
      { title: "Data Health", href: "/data-sources", icon: Database },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Profile", href: "/profile", icon: UserCircle },
    ],
  },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const locale = useLocale();
  const tNav = useTranslations("navigation");

  const getNavTitle = (item: NavItem) => {
    const key = NAV_ITEM_TRANSLATION_KEYS[item.href];
    return key ? tNav(key) : item.title;
  };

  const getSectionTitle = (sectionTitle: string) => {
    const key = SECTION_TRANSLATION_KEYS[sectionTitle];
    return key ? tNav(key) : sectionTitle;
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 select-none",
        isCollapsed ? "w-18" : "w-64",
        className
      )}
      aria-label="Sidebar Navigation"
    >
      {/* Sidebar Header Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-md bg-[#0F3D66] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight">
              <span className="font-black text-sm tracking-tight text-[#0F3D66] dark:text-white">
                VARSHA<span className="text-[#2563EB]">NETRA</span>
              </span>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                District EOC
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {getSectionTitle(section.title)}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const localizedTitle = getNavTitle(item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? localizedTitle : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative",
                    isActive
                      ? "bg-[#0F3D66] text-white font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                      isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{localizedTitle}</span>
                  )}
                  {!isCollapsed && item.badge && (
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

      {/* Sidebar Footer Collapse Toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="text-[10px] text-slate-400 font-medium">
            <span>{locale === "hi" ? "परिचालन सैंडबॉक्स" : "Operational Sandbox"}</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition ml-auto"
          aria-label={isCollapsed ? tNav("expandSidebar") : tNav("collapseSidebar")}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
