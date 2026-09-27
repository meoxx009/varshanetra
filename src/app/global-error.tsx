"use client";

import React, { useEffect } from "react";
import { ShieldAlert, RefreshCw, Trash2, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VarshaNetra:GlobalError] Uncaught application exception:", error);
  }, [error]);

  const handleClearCacheAndReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      localStorage.removeItem("varshanetra_operational_location");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Error purging cache:", e);
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-center p-6 sm:p-8 space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full inline-block">
              सिस्टम पुनर्प्राप्ति / System Recovery
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Application Error Recovered
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              A temporary client-side component exception was prevented from crashing the district command terminal.
            </p>
            {error?.digest && (
              <p className="text-[10px] font-mono text-slate-400">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs shadow-md transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>पुनः प्रयास करें / Try Again</span>
            </button>

            <button
              onClick={handleClearCacheAndReload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>कैश साफ़ करें और रीसेट करें / Clear Cache & Reload</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 pt-2 transition font-medium"
            >
              <Home className="w-3 h-3" />
              <span>मुख्य पृष्ठ पर लौटें / Return to Home</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
