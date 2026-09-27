"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const locale = useLocale();
  const defaultTitle =
    locale === "hi" ? "टेलीमेट्री फीड अनुपलब्ध" : "Telemetry Feed Unavailable";
  const retryLabel = locale === "hi" ? "पुनः प्रयास करें" : "Retry Request";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-900 dark:text-red-200 min-h-[200px]",
        className
      )}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-red-950 dark:text-red-100">
        {title || defaultTitle}
      </h4>
      <p className="text-xs text-red-700 dark:text-red-300 max-w-md mt-1 mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
}
