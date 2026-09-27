"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Radio,
  Package,
  FileCheck2,
  Lock,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditLogItem, AuditEntityType } from "@/types/audit-logs";
import { useLocale } from "@/lib/i18n/context";

function getEntityIcon(type: AuditEntityType) {
  switch (type) {
    case "alert":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "incident":
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    case "response_team":
      return <Radio className="h-4 w-4 text-blue-500" />;
    case "resource":
      return <Package className="h-4 w-4 text-emerald-500" />;
    case "field_report":
      return <FileCheck2 className="h-4 w-4 text-indigo-500" />;
    case "auth":
      return <Lock className="h-4 w-4 text-purple-500" />;
    default:
      return <Activity className="h-4 w-4 text-slate-500" />;
  }
}

export function RecentAuditActivity() {
  const locale = useLocale();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit?limit=5");
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        setLogs(json.logs);
      } else {
        setError(json.error || (locale === "hi" ? "ऑडिट ट्रेल लोड करने में विफल" : "Failed to load audit trail"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {locale === "hi" ? "परिचालन ऑडिट ट्रेल" : "Operational Audit Trail"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {locale === "hi"
              ? "स्थिति परिवर्तनों, कार्य आवंटन और सत्यापित कार्रवाइयों का अपरिवर्तनीय लॉग।"
              : "Immutable log of state changes, dispatch tasking, and verified actions."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecentLogs}
            disabled={loading}
            className="h-8 px-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            title={locale === "hi" ? "ऑडिट गतिविधि ताज़ा करें" : "Refresh audit activity"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/audit">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
              <span>{locale === "hi" ? "सभी देखें" : "View All"}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <p className="text-xs">
              {locale === "hi"
                ? "परिचालन गतिविधियां लोड हो रही हैं..."
                : "Loading operational activity..."}
            </p>
          </div>
        )}

        {error && logs.length === 0 && (
          <div className="py-4 text-center text-xs text-red-500 space-y-2">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRecentLogs} className="h-7 text-xs cursor-pointer">
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </Button>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400">
            <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">
              {locale === "hi"
                ? "अभी तक कोई परिचालन घटना दर्ज नहीं हुई है।"
                : "No recorded operational events yet."}
            </p>
            <p className="text-[11px] text-slate-400">
              {locale === "hi"
                ? "अलर्ट, घटनाओं, या टीमों में की गई कार्रवाइयां यहां दिखाई देंगी।"
                : "Actions taken in alerts, incidents, or teams will appear here."}
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {getEntityIcon(log.entity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                      {log.actor_name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug break-words">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
