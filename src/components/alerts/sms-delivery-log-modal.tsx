"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Phone,
  User,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { useLocale } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/i18n/formatters";
import { AlertItem, SmsDeliveryRecord } from "@/types";

interface SmsDeliveryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertItem;
}

export function SmsDeliveryLogModal({
  isOpen,
  onClose,
  alert,
}: SmsDeliveryLogModalProps) {
  const locale = useLocale();

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [logs, setLogs] = useState<SmsDeliveryRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setViewState("loading");
    else setIsRefreshing(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/alerts/${alert.id}/sms-logs`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load SMS logs.");
      }

      setLogs(data.data || []);
      if (data.data && data.data.length > 0) {
        setViewState("success");
      } else {
        setViewState("empty");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching logs");
      setViewState("error");
    } finally {
      setIsRefreshing(false);
    }
  }, [alert.id]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  if (!isOpen) return null;

  // Breakdown statistics
  const total = logs.length;
  const sentCount = logs.filter((l) => l.status === "sent" || l.status === "simulated_trial").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-logs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <Card className="w-full max-w-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 sm:my-6 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[#0F3D66] dark:text-blue-300">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle id="sms-logs-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{locale === "hi" ? "एसएमएस डिलीवरी एवं ऑडिट लॉग" : "SMS Delivery & Audit Logs"}</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {alert.title} ({alert.area_name})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(true)}
                disabled={isRefreshing}
                className="text-xs font-semibold gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{locale === "hi" ? "रीफ्रेश" : "Refresh"}</span>
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  {locale === "hi" ? "कुल प्रेषित" : "Total Logged"}
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{total}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] uppercase font-semibold">
                  {locale === "hi" ? "सफल / सिम्युलेटेड" : "Successful / Trial"}
                </span>
                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">{sentCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <span className="text-rose-700 dark:text-rose-300 block text-[10px] uppercase font-semibold">
                  {locale === "hi" ? "विफल" : "Failed"}
                </span>
                <span className="font-bold text-sm text-rose-700 dark:text-rose-300">{failedCount}</span>
              </div>
            </div>
          )}
        </CardHeader>

        {/* Content Body with View States */}
        <CardContent className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
          <StateContainer
            state={viewState}
            onRetry={() => fetchLogs()}
            errorMessage={errorMessage}
            loadingMessage={locale === "hi" ? "एसएमएस डिलीवरी लॉग लोड हो रहे हैं..." : "Loading SMS delivery logs..."}
            emptyTitle={locale === "hi" ? "कोई एसएमएस प्रसारण रिकॉर्ड नहीं मिला" : "No SMS Broadcast Records Found"}
            emptyDescription={
              locale === "hi"
                ? "इस चेतावनी के लिए अभी तक कोई एसएमएस प्रसारण नहीं किया गया है।"
                : "No SMS broadcasts have been initiated for this issued alert yet."
            }
          >
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{locale === "hi" ? "प्राप्तकर्ता (गोपनीय)" : "Recipient (Masked)"}</th>
                    <th className="py-2.5 px-3 font-semibold">{locale === "hi" ? "स्थिति" : "Status"}</th>
                    <th className="py-2.5 px-3 font-semibold">{locale === "hi" ? "भाषा" : "Lang"}</th>
                    <th className="py-2.5 px-3 font-semibold">{locale === "hi" ? "प्रेषक" : "Dispatched By"}</th>
                    <th className="py-2.5 px-3 font-semibold">{locale === "hi" ? "समय" : "Timestamp"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((record) => {
                    const isSuccess = record.status === "sent" || record.status === "simulated_trial";
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{record.recipient_number}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {record.status === "simulated_trial" ? "Trial Simulated" : "Delivered"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px] font-bold text-slate-500">
                          {record.language}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{record.sent_by || "Command Center"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTime(record.sent_at, locale)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StateContainer>
        </CardContent>

        {/* Footer */}
        <CardFooter className="pt-3 pb-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "hi" ? "नागरिक गोपनीयता: फोन नंबर स्वचालित रूप से मास्क किए गए हैं।" : "Privacy Protected: Mobile numbers are masked per security policy."}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
            {locale === "hi" ? "बंद करें" : "Close"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
