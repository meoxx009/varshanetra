"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { useLocale } from "@/lib/i18n/context";

export function OfflineStatusBanner() {
  const { isOffline, lastOnlineTime, cachedDataAge, retryConnection } = useOfflineStatus();
  const locale = useLocale();

  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isOffline) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryConnection();
    setIsRetrying(false);
  };

  const formattedTime = lastOnlineTime
    ? lastOnlineTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Recently";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 bg-[#DC2626] text-white shadow-lg border-b border-red-700 animate-in slide-in-from-top-3 duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Title & Timestamp */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-full bg-white/20 shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>

            <div className="min-w-0 leading-tight">
              <div className="font-bold text-xs sm:text-sm flex flex-wrap items-center gap-x-2">
                <span>
                  {locale === "hi"
                    ? `ऑफलाइन मोड - अंतिम सिंक: ${formattedTime}`
                    : `OFFLINE MODE - Last synced: ${formattedTime}`}
                </span>
                {cachedDataAge && (
                  <span className="text-[11px] font-normal text-red-100 bg-red-800/80 px-1.5 py-0.2 rounded">
                    ({cachedDataAge})
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-red-100 hidden sm:block">
                {locale === "hi"
                  ? "डिवाइस ऑफ़लाइन है। स्थानीय रूप से कैश्ड डेटा और ऑफ़लाइन रिपोर्ट कतार सक्रिय है।"
                  : "Device is disconnected. Serving cached telemetry and queuing field submissions."}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-semibold underline text-red-100 hover:text-white flex items-center gap-0.5 px-1 py-0.5"
            >
              <span>{locale === "hi" ? "सुविधा सूची" : "Feature Details"}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <Link
              href="/offline"
              className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition"
            >
              <Info className="w-3 h-3" />
              <span>{locale === "hi" ? "एसओपी एवं फोन" : "Emergency Numbers"}</span>
            </Link>

            <Button
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-white hover:bg-slate-100 text-[#DC2626] font-bold text-xs h-7 px-2.5 shadow-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{locale === "hi" ? "कनेक्शन पुनः जांचें" : "Retry Connection"}</span>
            </Button>
          </div>
        </div>

        {/* Collapsible Feature Availability Grid */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-red-500/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-red-800/60 p-2 rounded-lg">
              <span className="font-bold flex items-center gap-1 text-emerald-300 text-[11px] mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                {locale === "hi" ? "क्या काम करता है (सक्रिय ऑफ़लाइन)" : "What Works Offline"}
              </span>
              <ul className="text-[11px] space-y-0.5 text-red-100 list-disc pl-4">
                <li>कैश्ड मौसम पूर्वानुमान एवं बाढ़ जोखिम (Open-Meteo 15m)</li>
                <li>कैश्ड मैप टाइल्स एवं आपातकालीन आश्रय सूची</li>
                <li>ऑफ़लाइन फ़ील्ड रिपोर्टिंग (स्थानीय कतार में स्वतः सुरक्षित)</li>
                <li>हार्डकोडेड आपातकालीन टेलीफोन निर्देशिका (112, 108, NDRF)</li>
              </ul>
            </div>

            <div className="bg-red-800/60 p-2 rounded-lg">
              <span className="font-bold flex items-center gap-1 text-amber-300 text-[11px] mb-1">
                <XCircle className="w-3.5 h-3.5 text-amber-300" />
                {locale === "hi" ? "क्या रुका हुआ है (नेटवर्क आवश्यक)" : "What is Paused (Requires Network)"}
              </span>
              <ul className="text-[11px] space-y-0.5 text-red-100 list-disc pl-4">
                <li>लाइव रीयल-टाइम आईएमडी रडार और सैटेलाइट स्ट्रीम</li>
                <li>Twilio एसएमएस प्रसारण प्रेषण (नेटवर्क आने पर उपलब्ध)</li>
                <li>रिमोट सर्वर डेटाबेस का वास्तविक समय तुल्यकालन</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
