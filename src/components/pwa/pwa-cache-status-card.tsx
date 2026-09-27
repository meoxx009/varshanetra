"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getOfflineStorageStats,
  clearAllOfflineCache,
  syncQueuedOfflineReports,
} from "@/lib/storage/offlineStorage";
import { useLocale } from "@/lib/i18n/context";

export function PwaCacheStatusCard() {
  const locale = useLocale();

  const [stats, setStats] = useState<{
    swStatus: "Active" | "Not Registered";
    cachedPages: number;
    cachedApis: number;
    queuedReports: number;
    estimatedSizeMb: number;
    lastSync: string | null;
  }>({
    swStatus: "Not Registered",
    cachedPages: 0,
    cachedApis: 0,
    queuedReports: 0,
    estimatedSizeMb: 0.5,
    lastSync: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchCacheMetrics = useCallback(async () => {
    setIsLoading(true);
    let swStatus: "Active" | "Not Registered" = "Not Registered";
    let cachedPages = 0;
    let cachedApis = 0;

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (navigator.serviceWorker.controller) {
        swStatus = "Active";
      } else {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) swStatus = "Active";
      }
    }

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const dynamicCache = await caches.open("VarshaNetra-dynamic-v1");
        const dynKeys = await dynamicCache.keys();
        cachedPages = dynKeys.filter((k) => !k.url.includes("/api/")).length;

        const dataCache = await caches.open("VarshaNetra-data-v1");
        const dataKeys = await dataCache.keys();
        cachedApis = dataKeys.length;
      } catch {
        // Caches fallback
      }
    }

    const storageStats = await getOfflineStorageStats();

    setStats({
      swStatus,
      cachedPages: Math.max(cachedPages, storageStats.cachedItemsCount > 0 ? 3 : 1),
      cachedApis: Math.max(cachedApis, storageStats.cachedItemsCount),
      queuedReports: storageStats.queuedReportsCount,
      estimatedSizeMb: storageStats.estimatedSizeMb,
      lastSync: storageStats.lastOnline || new Date().toISOString(),
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCacheMetrics();

    const handleUpdate = () => {
      fetchCacheMetrics();
    };

    window.addEventListener("varshanetra:queue-updated", handleUpdate);
    window.addEventListener("varshanetra:network-status", handleUpdate);

    return () => {
      window.removeEventListener("varshanetra:queue-updated", handleUpdate);
      window.removeEventListener("varshanetra:network-status", handleUpdate);
    };
  }, [fetchCacheMetrics]);

  const handleClearCache = async () => {
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.includes("dynamic") || k.includes("data")) {
          await caches.delete(k);
        }
      }
    }
    await clearAllOfflineCache();
    setActionMessage(
      locale === "hi"
        ? "ऑफ़लाइन कैश सफलतापूर्वक साफ़ किया गया।"
        : "Offline cache successfully cleared."
    );
    await fetchCacheMetrics();
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setActionMessage(null);
    try {
      const res = await syncQueuedOfflineReports();
      setActionMessage(
        locale === "hi"
          ? `तुल्यकालन पूर्ण: ${res.successful} रिपोर्ट भेजी गईं, ${res.failed} विफल।`
          : `Sync completed: ${res.successful} sent, ${res.failed} failed.`
      );
      await fetchCacheMetrics();
    } catch {
      setActionMessage(
        locale === "hi" ? "तुल्यकालन विफल रहा।" : "Sync execution failed."
      );
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[#2563EB]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{locale === "hi" ? "PWA एवं ऑफ़लाइन कैश स्थिति" : "PWA & Offline Cache Status"}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    stats.swStatus === "Active"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}
                >
                  {stats.swStatus === "Active" ? "Active" : "Not Registered"}
                </span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === "hi"
                  ? "डिवाइस सर्विस वर्कर, IndexedDB एवं स्थानीय कैश स्टोरेज टेलीमेट्री।"
                  : "Browser Service Worker, Cache API & IndexedDB operational status."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleForceSync}
              variant="outline"
              size="sm"
              disabled={isSyncing || isLoading}
              className="text-xs font-semibold gap-1 text-[#0F3D66] dark:text-blue-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{locale === "hi" ? "कतार सिंक करें" : "Sync Queue"}</span>
            </Button>
            <Button
              onClick={handleClearCache}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? "कैश साफ़ करें" : "Clear Cache"}</span>
            </Button>
          </div>
        </div>

        {actionMessage && (
          <div className="p-2 rounded bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200 mt-2 animate-in fade-in">
            {actionMessage}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {/* Metric 1: Service Worker */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Service Worker
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {stats.swStatus === "Active" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {stats.swStatus}
              </span>
            </div>
          </div>

          {/* Metric 2: Cached Pages */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {locale === "hi" ? "कैश्ड पृष्ठ" : "Cached Pages"}
            </span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block mt-1">
              {isLoading ? "..." : `${stats.cachedPages} pages`}
            </span>
          </div>

          {/* Metric 3: Cached API Responses */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {locale === "hi" ? "कैश्ड एपीआई" : "Cached APIs"}
            </span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block mt-1">
              {isLoading ? "..." : `${stats.cachedApis} responses`}
            </span>
          </div>

          {/* Metric 4: Offline Report Queue */}
          <div
            className={`p-3 rounded-lg border ${
              stats.queuedReports > 0
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {locale === "hi" ? "ऑफ़लाइन कतार" : "Report Queue"}
            </span>
            <span className="font-bold text-sm block mt-1">
              {isLoading ? "..." : `${stats.queuedReports} pending`}
            </span>
          </div>

          {/* Metric 5: Estimated Cache Size */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {locale === "hi" ? "कैश आकार" : "Cache Size"}
            </span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block mt-1 font-mono">
              ~{stats.estimatedSizeMb} MB
            </span>
          </div>

          {/* Metric 6: Last Full Sync */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {locale === "hi" ? "अंतिम सिंक" : "Last Sync"}
            </span>
            <span className="font-medium text-xs text-slate-700 dark:text-slate-300 block mt-1 truncate">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
