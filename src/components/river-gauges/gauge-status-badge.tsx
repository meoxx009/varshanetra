"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, Siren } from "lucide-react";
import { GaugeStatus } from "@/types";

interface GaugeStatusBadgeProps {
  status: GaugeStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  GaugeStatus,
  { label: string; labelHi: string; bgClass: string; textClass: string; borderClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  NORMAL: {
    label: "Normal",
    labelHi: "सामान्य",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    textClass: "text-green-800 dark:text-green-300",
    borderClass: "border-green-300 dark:border-green-800",
    Icon: CheckCircle2,
  },
  WARNING: {
    label: "Warning",
    labelHi: "चेतावनी",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    textClass: "text-yellow-800 dark:text-yellow-300",
    borderClass: "border-yellow-300 dark:border-yellow-800",
    Icon: AlertTriangle,
  },
  DANGER: {
    label: "Danger",
    labelHi: "खतरा",
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
    textClass: "text-orange-800 dark:text-orange-300",
    borderClass: "border-orange-300 dark:border-orange-800",
    Icon: ShieldAlert,
  },
  CRITICAL: {
    label: "Critical",
    labelHi: "अतिखतरा",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    textClass: "text-red-800 dark:text-red-300",
    borderClass: "border-red-300 dark:border-red-800",
    Icon: Siren,
  },
};

export function GaugeStatusBadge({ status, size = "md" }: GaugeStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const { Icon } = cfg;

  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-1"
    : "text-xs px-2 py-1 gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center font-bold rounded border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} ${sizeClass}`}
      role="status"
      aria-label={`River level status: ${cfg.label}`}
    >
      <Icon className={iconSize} aria-hidden="true" />
      <span className="hidden sm:inline">{cfg.labelHi} / </span>
      <span>{cfg.label}</span>
    </span>
  );
}
