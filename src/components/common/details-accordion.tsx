"use client";

import React, { useState, useId } from "react";
import { ChevronDown, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailsAccordionProps {
  title?: React.ReactNode;
  summary?: string;
  defaultOpen?: boolean;
  icon?: "help" | "info" | "none";
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function DetailsAccordion({
  title = "Why am I seeing this?",
  summary,
  defaultOpen = false,
  icon = "help",
  children,
  className,
  badge,
}: DetailsAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  const IconComponent = icon === "help" ? HelpCircle : icon === "info" ? Info : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs overflow-hidden transition-all",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#0F3D66]/20 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {IconComponent && (
            <IconComponent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span>{title}</span>
          {badge && <span className="ml-1">{badge}</span>}
        </span>

        <span className="flex items-center gap-2 shrink-0">
          {summary && !isOpen && (
            <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-xs">
              {summary}
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-slate-600 dark:text-slate-200"
            )}
          />
        </span>
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="px-3.5 pb-3.5 pt-1 text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 animate-in fade-in-50 duration-150"
        >
          {children}
        </div>
      )}
    </div>
  );
}
