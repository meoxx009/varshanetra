"use client";

import React, { useEffect } from "react";
import { ShieldAlert, RefreshCw, Home, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VarshaNetra:RootError] Caught page error:", error);
  }, [error]);

  const handleHardRefresh = () => {
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      });
    }
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-center p-6 sm:p-8 space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full inline-block">
            ऑपरेशनल एरर / Operational Notice
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Navigation Interrupted
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The requested module encountered an unexpected runtime state. You can retry the operation or refresh the command stream.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-slate-400">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs shadow-md gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>पुनः प्रयास करें / Retry Operation</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleHardRefresh}
            className="w-full text-xs font-semibold gap-2 border-slate-300 dark:border-slate-700"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>कैश साफ़ करें / Hard Refresh</span>
          </Button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline pt-2 font-medium"
          >
            <Home className="w-3 h-3" />
            <span>डैशबोर्ड पर लौटें / Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
