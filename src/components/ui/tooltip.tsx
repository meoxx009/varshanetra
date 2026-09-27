"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = React.useId();

  const getSideClasses = () => {
    switch (side) {
      case "bottom":
        return "top-full mt-1.5 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-1.5 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-1.5 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "bottom-full mb-1.5 left-1/2 -translate-x-1/2";
    }
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {/* Trigger element with aria association */}
      <span aria-describedby={isVisible ? tooltipId : undefined}>
        {children}
      </span>

      {/* Tooltip bubble */}
      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-50 px-2.5 py-1 text-[11px] font-medium leading-tight rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap pointer-events-none animate-in fade-in-50 duration-100",
            getSideClasses(),
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
