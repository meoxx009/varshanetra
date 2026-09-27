"use client";

import React, { useState, useEffect } from "react";
import { Database, Sparkles, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashboardSubtleBanner({ className }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("varshanetra_disclaimer_dashboard_banner");
      if (stored !== null) {
        setIsVisible(stored === "true");
      }
    } catch {
      // Local storage unavailable
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem("varshanetra_disclaimer_dashboard_banner", "false");
    } catch {}
  };

  if (mounted && !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 py-1.5 px-3 sm:px-6 transition-all",
        className
      )}
      role="note"
      aria-label="Data Source Attribution and System Status"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>डेटा स्रोत (Data Sources):</span>
          </span>
          <span className="font-mono text-[10.5px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            Open-Meteo • OpenStreetMap • SRTM DEM
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
            <span>भविष्य में IMD और CWC एकीकरण योजनाबद्ध</span>
            <span className="text-slate-500 dark:text-slate-500 text-[10px]">
              (IMD &amp; CWC integration planned)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/weather"
            className="text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>विवरण (Details)</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
