"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VarshaNetra:DashboardError] Caught dashboard exception:", error);
  }, [error]);

  return (
    <Card className="border-red-200 dark:border-red-900/60 shadow-md max-w-2xl mx-auto my-8">
      <CardHeader className="bg-red-50/60 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              मॉड्यूल लोडिंग त्रुटि / Operational Module Interruption
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The telemetry stream encountered a rendering exception. Your system connection remains active.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          This could be caused by an updated application build or temporary network latency while fetching sensor telemetry.
        </p>

        {error?.digest && (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            Error Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            size="sm"
            className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>पुनः लोड करें / Retry Telemetry</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if ("caches" in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
              }
              window.location.reload();
            }}
            className="text-xs font-semibold"
          >
            <span>कैश साफ़ करें / Hard Reload</span>
          </Button>

          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-blue-600 dark:text-blue-400">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>मुख्य डैशबोर्ड / Main Dashboard</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
