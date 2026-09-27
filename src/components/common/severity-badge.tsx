"use client";

import React from "react";
import { SeverityLevel } from "@/types";
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";
import { formatSeverity } from "@/lib/i18n/formatters";

interface SeverityBadgeProps {
  severity?: SeverityLevel | string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  customLabel?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className,
  size = "md",
  customLabel,
}) => {
  const locale = useLocale();
  const normalized = String(severity || "").trim().toUpperCase();

  const getDetails = () => {
    switch (normalized) {
      case "NORMAL":
      case "SAFE":
      case "LOW":
      case "ROUTINE":
        return {
          label: formatSeverity(normalized, locale),
          icon: CheckCircle2,
          bg: "bg-emerald-100 text-[#15803D] border-[#15803D]/40",
          iconColor: "text-[#15803D]",
        };
      case "ADVISORY":
      case "WATCH":
      case "MODERATE":
      case "MEDIUM":
      case "NOTICE":
        return {
          label: formatSeverity(normalized, locale),
          icon: AlertCircle,
          bg: "bg-amber-100 text-[#D97706] border-[#D97706]/40",
          iconColor: "text-[#D97706]",
        };
      case "ALERT":
      case "SEVERE":
      case "HIGH":
      case "WARNING":
        return {
          label: formatSeverity(normalized, locale),
          icon: AlertTriangle,
          bg: "bg-orange-100 text-[#EA580C] border-[#EA580C]/40",
          iconColor: "text-[#EA580C]",
        };
      case "CRITICAL":
      case "EMERGENCY":
      case "EXTREME":
      case "DANGER":
        return {
          label: formatSeverity(normalized, locale),
          icon: ShieldAlert,
          bg: "bg-red-100 text-[#DC2626] border-[#DC2626]/50 font-bold",
          iconColor: "text-[#DC2626]",
        };
      default:
        return {
          label: customLabel || formatSeverity(normalized, locale) || (locale === "hi" ? "अनिर्दिष्ट" : "UNSPECIFIED"),
          icon: Info,
          bg: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          iconColor: "text-slate-500",
        };
    }
  };

  const { label, icon: Icon, bg, iconColor } = getDetails();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold tracking-wide uppercase shadow-xs",
        bg,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`Severity status: ${customLabel || label}`}
    >
      <Icon className={cn(iconSizes[size], iconColor, "shrink-0")} aria-hidden="true" />
      <span>{customLabel || label}</span>
    </span>
  );
};
