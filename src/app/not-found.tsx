import React from "react";
import Link from "next/link";
import { Shield, Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#0F3D66] dark:text-blue-400 flex items-center justify-center shadow-xs">
          <Shield className="w-8 h-8 text-[#0F3D66] dark:text-blue-400" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full inline-block">
            404 • Page Not Found / पृष्ठ नहीं मिला
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Resource Unavailable
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The requested emergency monitoring route or operational resource does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D66] text-white font-bold text-xs hover:bg-[#0c2f4f] transition shadow-xs focus:ring-2 focus:ring-[#0F3D66]"
          >
            <Home className="w-4 h-4" />
            <span>Home Portal</span>
          </Link>
          <Link
            href="/public"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400"
          >
            <Compass className="w-4 h-4" />
            <span>Public Warning</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
