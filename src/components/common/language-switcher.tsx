"use client";

import React from "react";
import { useI18n, Locale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

/**
 * Prominent bilingual pill toggle (W-012):
 * Displays EN on left and हिं on right with the active language highlighted.
 * Switches all text immediately without page reload.
 */
export function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const handleToggle = (code: Locale) => {
    if (code !== locale) {
      setLocale(code);
    }
  };

  return (
    <div
      role="group"
      aria-label={t("accessibility.toggleLanguage") || "Language switcher (भाषा चयन)"}
      className={cn(
        "inline-flex items-center rounded-full p-0.5 bg-slate-200/90 dark:bg-slate-700/90 border border-slate-300 dark:border-slate-600 transition-all select-none shadow-inner shrink-0",
        compact ? "h-7" : "h-8 sm:h-9",
        className
      )}
    >
      <button
        type="button"
        onClick={() => handleToggle("en")}
        aria-pressed={locale === "en"}
        title="Switch to English"
        className={cn(
          "flex items-center justify-center font-bold tracking-tight transition-all duration-200 rounded-full cursor-pointer",
          compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
          locale === "en"
            ? "bg-[#0F3D66] dark:bg-blue-600 text-white shadow-xs font-extrabold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => handleToggle("hi")}
        aria-pressed={locale === "hi"}
        title="हिन्दी में बदलें"
        className={cn(
          "flex items-center justify-center font-bold tracking-tight transition-all duration-200 rounded-full cursor-pointer",
          compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
          locale === "hi"
            ? "bg-[#0F3D66] dark:bg-blue-600 text-white shadow-xs font-extrabold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        हिं
      </button>
    </div>
  );
}

export default LanguageSwitcher;
