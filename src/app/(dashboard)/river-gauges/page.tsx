"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Waves, ShieldAlert, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import {
  GaugeCard,
  UpdateReadingModal,
  StationSetupWizard,
} from "@/components/river-gauges";
import { useLocale } from "@/lib/i18n/context";
import { useAuth } from "@/hooks/use-auth";
import { RiverGauge } from "@/types";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PAGE_SOURCE_META = {
  provider: "CWC Manual Entry via ffis.cwc.gov.in",
  lastUpdated: new Date().toISOString(),
  origin: "ESTIMATED" as const,
  attributionNotice:
    "River level data is manually entered by district officers from the CWC Flood Forecasting & Warning Portal. Not an automated feed.",
  url: "https://ffis.cwc.gov.in",
};

// Officers allowed to update gauge readings
const UPDATE_ALLOWED_ROLES = [
  "ADMIN",
  "DM_COLLECTOR",
  "DDMA",
  "EOC",
  "IRRIGATION_DEPT",
];

export default function RiverGaugesPage() {
  const locale = useLocale();
  const { profile, isAuthenticated } = useAuth();

  // ── State ──────────────────────────────────────────────────
  const [gauges, setGauges] = useState<RiverGauge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGauge, setSelectedGauge] = useState<RiverGauge | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // ── Auth ───────────────────────────────────────────────────
  const canUpdate =
    isAuthenticated &&
    profile?.role !== undefined &&
    UPDATE_ALLOWED_ROLES.includes(profile.role.toUpperCase());

  // ── Data fetching ──────────────────────────────────────────
  const fetchGauges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/river-gauges");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch gauges");
      setGauges(json.data as RiverGauge[]);
      setLastFetched(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load river gauges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGauges();
  }, [fetchGauges]);

  // ── Derived stats ──────────────────────────────────────────
  const dangerGauges = useMemo(
    () => gauges.filter((g) => g.status === "DANGER" || g.status === "CRITICAL"),
    [gauges]
  );
  const warningGauges = useMemo(
    () => gauges.filter((g) => g.status === "WARNING"),
    [gauges]
  );
  const normalGauges = useMemo(
    () => gauges.filter((g) => g.status === "NORMAL"),
    [gauges]
  );

  // ── Handlers ───────────────────────────────────────────────
  const handleUpdateSuccess = useCallback((updatedGauge: RiverGauge) => {
    setGauges((prev) =>
      prev.map((g) => (g.id === updatedGauge.id ? updatedGauge : g))
    );
  }, []);

  const handleSetupComplete = useCallback((newGauges: RiverGauge[]) => {
    setGauges(newGauges);
  }, []);

  // ── Render: Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={locale === "hi" ? "नदी जलस्तर निगरानी" : "River Level Monitoring"}
          description={locale === "hi" ? "CWC नदी गेज स्टेशन लोड हो रहे हैं…" : "Loading CWC river gauge stations…"}
          breadcrumbs={[
            { label: locale === "hi" ? "होम" : "Home", href: "/dashboard" },
            { label: locale === "hi" ? "नदी जलस्तर" : "River Gauges" },
          ]}
          sourceMeta={PAGE_SOURCE_META}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 animate-pulse"
              aria-label="Loading gauge card"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────
  if (error && gauges.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={locale === "hi" ? "नदी जलस्तर निगरानी" : "River Level Monitoring"}
          description=""
          breadcrumbs={[
            { label: locale === "hi" ? "होम" : "Home", href: "/dashboard" },
            { label: locale === "hi" ? "नदी जलस्तर" : "River Gauges" },
          ]}
          sourceMeta={PAGE_SOURCE_META}
        />
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-red-800 dark:text-red-300 mb-1">
            {locale === "hi" ? "डेटा लोड करने में विफल" : "Failed to Load Gauge Data"}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchGauges}
            className="px-4 py-2 rounded-lg bg-[#0F3D66] hover:bg-[#0a2d4f] text-white font-semibold text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" aria-hidden="true" />
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Empty (First-run Setup Wizard) ─────────────────
  if (!loading && gauges.length === 0) {
    return (
      <>
        <div className="space-y-6">
          <PageHeader
            title={locale === "hi" ? "नदी जलस्तर निगरानी" : "River Level Monitoring"}
            description={locale === "hi" ? "अभी तक कोई गेज स्टेशन कॉन्फ़िगर नहीं किया गया है।" : "No gauge stations configured yet."}
            breadcrumbs={[
              { label: locale === "hi" ? "होम" : "Home", href: "/dashboard" },
              { label: locale === "hi" ? "नदी जलस्तर" : "River Gauges" },
            ]}
            sourceMeta={PAGE_SOURCE_META}
          />
        </div>
        {isAuthenticated && (
          <StationSetupWizard onComplete={handleSetupComplete} />
        )}
      </>
    );
  }

  // ── Render: Success ────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "hi" ? "नदी जलस्तर निगरानी" : "River Level Monitoring"}
        description={
          locale === "hi"
            ? `${gauges.length} CWC गेज स्टेशन सक्रिय। ${dangerGauges.length > 0 ? `${dangerGauges.length} खतरा स्तर पर।` : "सभी सामान्य।"}`
            : `${gauges.length} CWC gauge stations active. ${dangerGauges.length > 0 ? `${dangerGauges.length} at danger level.` : "All within safe limits."}`
        }
        breadcrumbs={[
          { label: locale === "hi" ? "होम" : "Home", href: "/dashboard" },
          { label: locale === "hi" ? "नदी जलस्तर" : "River Gauges" },
        ]}
        sourceMeta={PAGE_SOURCE_META}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchGauges}
              title={locale === "hi" ? "ताज़ा करें" : "Refresh"}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Refresh</span>
            </button>
            {canUpdate && (
              <button
                type="button"
                onClick={() => {
                  // Show setup wizard for additional stations
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0F3D66] hover:bg-[#0a2d4f] text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{locale === "hi" ? "स्टेशन जोड़ें" : "Add Station"}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Danger Banner */}
      {dangerGauges.length > 0 && (
        <div className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" aria-hidden="true" />
            <div>
              <span className="block text-xs font-bold text-red-700 dark:text-red-300">
                ⚠ नदी खतरा स्तर पर • RIVER AT DANGER LEVEL
              </span>
              <p className="text-xs text-red-600 dark:text-red-400">
                {dangerGauges.map((g) => `${g.river_name} at ${g.station_name}: ${g.current_level_m?.toFixed(2) ?? "—"} m (Danger: ${g.danger_level_m?.toFixed(2) ?? "—"} m)`).join(" | ")}
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white shrink-0"
            aria-label="Danger level alert"
          >
            {dangerGauges.length} STATION{dangerGauges.length > 1 ? "S" : ""}
          </span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <Waves className="w-4.5 h-4.5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{gauges.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {locale === "hi" ? "कुल स्टेशन" : "Total Stations"}
            </p>
          </div>
        </div>

        {/* Danger / Critical */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 ${dangerGauges.length > 0 ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dangerGauges.length > 0 ? "bg-red-100 dark:bg-red-950/50" : "bg-slate-100 dark:bg-slate-800"}`}>
            <ShieldAlert className={`w-4.5 h-4.5 ${dangerGauges.length > 0 ? "text-red-600" : "text-slate-400"}`} aria-hidden="true" />
          </div>
          <div>
            <p className={`text-xl font-black leading-none ${dangerGauges.length > 0 ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>{dangerGauges.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {locale === "hi" ? "खतरा/अतिखतरा" : "Danger/Critical"}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 ${warningGauges.length > 0 ? "border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${warningGauges.length > 0 ? "bg-yellow-100 dark:bg-yellow-950/50" : "bg-slate-100 dark:bg-slate-800"}`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${warningGauges.length > 0 ? "text-yellow-600" : "text-slate-400"}`} aria-hidden="true" />
          </div>
          <div>
            <p className={`text-xl font-black leading-none ${warningGauges.length > 0 ? "text-yellow-700 dark:text-yellow-400" : "text-slate-900 dark:text-white"}`}>{warningGauges.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {locale === "hi" ? "चेतावनी स्तर" : "Warning Level"}
            </p>
          </div>
        </div>

        {/* Normal */}
        <div className="p-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-black text-green-700 dark:text-green-400 leading-none">{normalGauges.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {locale === "hi" ? "सामान्य" : "Normal Level"}
            </p>
          </div>
        </div>
      </div>

      {/* Data Source Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <DataSourceBadge
          metadata={{
            provider: "CWC Manual Entry — ffis.cwc.gov.in",
            lastUpdated: lastFetched?.toISOString() ?? new Date().toISOString(),
            origin: "ESTIMATED",
            attributionNotice:
              "River level data is manually entered by district officers from the CWC Flood Forecasting & Warning Portal. Not an automated feed.",
            url: "https://ffis.cwc.gov.in",
          }}
          compact={true}
        />
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Activity className="w-3 h-3" aria-hidden="true" />
          <span>
            {lastFetched
              ? `Last refreshed: ${lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Not yet fetched"}
          </span>
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {gauges.map((gauge) => (
          <GaugeCard
            key={gauge.id}
            gauge={gauge}
            onUpdateClick={setSelectedGauge}
            canUpdate={canUpdate}
          />
        ))}
      </div>

      {/* Update Reading Modal */}
      <UpdateReadingModal
        gauge={selectedGauge}
        onClose={() => setSelectedGauge(null)}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  );
}
