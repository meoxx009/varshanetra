"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import {
  getQueuedOfflineReports,
  syncQueuedOfflineReports,
  QueuedFieldReport,
} from "@/lib/storage/offlineStorage";
import { useLocale } from "@/lib/i18n/context";

export function OfflineQueueBadge() {
  const locale = useLocale();
  const [queuedReports, setQueuedReports] = useState<QueuedFieldReport[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    successful: number;
    failed: number;
    message: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadQueue = useCallback(async () => {
    try {
      const reports = await getQueuedOfflineReports();
      setQueuedReports(reports);
    } catch {
      // IndexedDB not ready
    }
  }, []);

  // Sync execution
  const executeSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncResult({
        successful: 0,
        failed: 0,
        message: locale === "hi"
          ? "डिवाइस अभी भी ऑफ़लाइन है। नेटवर्क उपलब्ध होने पर पुनः प्रयास करें।"
          : "Device is still offline. Reconnect to sync.",
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncQueuedOfflineReports((current, total) => {
        setSyncProgress({ current, total });
      });

      await loadQueue();

      if (result.successful > 0 && result.failed === 0) {
        setSyncResult({
          successful: result.successful,
          failed: 0,
          message: locale === "hi"
            ? "सभी रिपोर्ट सफलतापूर्वक भेजी गईं।"
            : "All reports submitted successfully.",
        });
      } else if (result.failed > 0) {
        setSyncResult({
          successful: result.successful,
          failed: result.failed,
          message: locale === "hi"
            ? `${result.successful} रिपोर्ट भेजी गईं, ${result.failed} विफल।`
            : `${result.successful} submitted, ${result.failed} failed.`,
        });
      }
    } catch (err: unknown) {
      setSyncResult({
        successful: 0,
        failed: 1,
        message: err instanceof Error ? err.message : "Sync encountered an error.",
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [loadQueue, locale]);

  useEffect(() => {
    loadQueue();

    const handleQueueUpdated = () => {
      loadQueue();
    };

    const handleAutoSync = () => {
      console.log("[VarshaNetra:Queue] Online detected, initiating auto-sync...");
      executeSync();
    };

    window.addEventListener("varshanetra:queue-updated", handleQueueUpdated);
    window.addEventListener("varshanetra:trigger-sync", handleAutoSync);

    return () => {
      window.removeEventListener("varshanetra:queue-updated", handleQueueUpdated);
      window.removeEventListener("varshanetra:trigger-sync", handleAutoSync);
    };
  }, [loadQueue, executeSync]);

  if (queuedReports.length === 0 && !isSyncing && !syncResult) {
    return null;
  }

  const count = queuedReports.length;

  return (
    <>
      {/* Floating or Embedded Persistent Badge */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-bold text-xs shadow-xl transition cursor-pointer ${
            isSyncing
              ? "bg-[#2563EB] text-white animate-pulse"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}
          title="Click to view and sync queued offline reports"
        >
          <UploadCloud className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
          <span>
            {isSyncing && syncProgress
              ? locale === "hi"
                ? `रिपोर्ट अपलोड हो रही है ${syncProgress.total} में से ${syncProgress.current}`
                : `Uploading report ${syncProgress.current} of ${syncProgress.total}`
              : locale === "hi"
              ? `${count} रिपोर्ट प्रतीक्षा में`
              : `${count} reports pending`}
          </span>
        </button>
      </div>

      {/* Queue Details Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-amber-600" />
                  <span>
                    {locale === "hi" ? "ऑफ़लाइन फ़ील्ड रिपोर्ट कतार" : "Offline Field Report Queue"}
                  </span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === "hi"
                  ? "डिस्कनेक्ट होने पर सहेजी गई रिपोर्टें। नेटवर्क बहाल होते ही स्वतः अपलोड होंगी।"
                  : "Observations saved while offline. Auto-synchronizes when connection restores."}
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs max-h-80 overflow-y-auto">
              {syncResult && (
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    syncResult.failed === 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {syncResult.failed === 0 ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <span className="font-bold">{syncResult.message}</span>
                  </div>
                </div>
              )}

              {isSyncing && syncProgress && (
                <div className="p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                  <span>
                    {locale === "hi"
                      ? `रिपोर्ट अपलोड हो रही है ${syncProgress.total} में से ${syncProgress.current}...`
                      : `Uploading report ${syncProgress.current} of ${syncProgress.total}...`}
                  </span>
                </div>
              )}

              {queuedReports.length === 0 ? (
                <div className="text-center py-6 text-slate-500 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-xs">
                    {locale === "hi" ? "कतार खाली है" : "All reports are synchronized"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queuedReports.map((item) => {
                    const desc = String(item.payload.description || item.payload.area_name || "Observation");
                    const hazard = String(item.payload.hazard_category || "Field Report");
                    return (
                      <div
                        key={item.localId}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {item.localId}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.queuedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{hazard}: </span>
                          <span className="truncate">{desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3 pb-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                {locale === "hi" ? "बंद करें" : "Close"}
              </Button>

              {queuedReports.length > 0 && (
                <Button
                  size="sm"
                  onClick={executeSync}
                  disabled={isSyncing}
                  className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{locale === "hi" ? "अब सिंक करें" : "Sync Now"}</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
