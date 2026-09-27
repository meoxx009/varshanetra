"use client";

import React from "react";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

export type ComponentViewState = "loading" | "empty" | "error" | "success";

interface StateContainerProps {
  state: ComponentViewState;
  onRetry?: () => void;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingMessage?: string;
  children?: React.ReactNode;
  className?: string;
}

export const StateContainer: React.FC<StateContainerProps> = ({
  state,
  onRetry,
  errorMessage,
  emptyTitle,
  emptyDescription,
  loadingMessage,
  children,
  className,
}) => {
  const locale = useLocale();

  const resolvedErrorMessage =
    errorMessage ||
    (locale === "hi"
      ? "टेलीमेट्री डेटा लोड करने में असमर्थ। कृपया नेटवर्क कनेक्टिविटी जांचें।"
      : "Unable to load telemetry data. Please verify network connectivity.");

  const resolvedEmptyTitle =
    emptyTitle ||
    (locale === "hi"
      ? "कोई सक्रिय घटना रिकॉर्ड नहीं"
      : "No Active Incident Records");

  const resolvedEmptyDesc =
    emptyDescription ||
    (locale === "hi"
      ? "वर्तमान में इन मानदंडों से मेल खाने वाला कोई अलर्ट या प्रेषण नहीं है।"
      : "There are currently no alerts or dispatches matching this criteria.");

  const resolvedLoadingMsg =
    loadingMessage ||
    (locale === "hi"
      ? "ज़िला टेलीमेट्री सिंक्रनाइज़ हो रही है..."
      : "Synchronizing district telemetry...");

  if (state === "loading") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 min-h-[200px]",
          className
        )}
        aria-live="polite"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-[#0F3D66] dark:text-blue-400 mb-2" />
        <p className="text-sm font-medium">{resolvedLoadingMsg}</p>
        <span className="text-xs text-slate-400 mt-1">
          {locale === "hi"
            ? "परिचालन एंडपॉइंट्स से संपर्क हो रहा है"
            : "Contacting operational endpoints"}
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 border border-red-200 dark:border-red-900/60 rounded-lg bg-red-50/50 dark:bg-red-950/30 text-red-800 dark:text-red-200 min-h-[200px]",
          className
        )}
        role="alert"
      >
        <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
        <h4 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
          {locale === "hi" ? "परिचालन डेटा त्रुटि" : "Operational Data Error"}
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300 max-w-md text-center mb-4 leading-relaxed">
          {resolvedErrorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-xs font-semibold text-red-800 dark:text-red-300 rounded shadow-xs hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry Request"}</span>
          </button>
        )}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/30 text-slate-500 min-h-[200px]",
          className
        )}
      >
        <Inbox className="w-8 h-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {resolvedEmptyTitle}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center mt-1">
          {resolvedEmptyDesc}
        </p>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};
