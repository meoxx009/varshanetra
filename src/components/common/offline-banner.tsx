"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WifiOff, Info, X } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useLocale, useTranslations } from "@/lib/i18n/context";

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);
  const locale = useLocale();
  const tCommon = useTranslations("common");

  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-amber-600 dark:bg-amber-700 text-white px-3 py-2 text-xs shadow-md flex items-center justify-between gap-2 border-b border-amber-500 animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded bg-black/20 shrink-0">
          <WifiOff className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-bold truncate text-[11px] sm:text-xs flex items-center gap-1.5">
            <span>{tCommon("offlineMode")}</span>
            <span className="hidden sm:inline text-amber-200 font-normal">|</span>
            <span className="hidden sm:inline font-normal text-amber-100">
              {tCommon("cachedShellActive")}
            </span>
          </p>
          <p className="text-[10px] text-amber-100 truncate">
            {locale === "hi"
              ? "नेटवर्क बहाल होने तक नया मौसम रडार और जीआईएस टेलीमेट्री अनुपलब्ध है।"
              : "New weather radar and GIS telemetry unavailable until network restores."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/offline"
          className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition flex items-center gap-1"
        >
          <Info className="h-3 w-3" />
          <span>{tCommon("offlineHelp")}</span>
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          aria-label={locale === "hi" ? "ऑफ़लाइन बैनर हटाएं" : "Dismiss offline banner"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
