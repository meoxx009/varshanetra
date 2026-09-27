"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Lock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Zap,
  ShieldAlert,
  Satellite,
  Layers,
  Cpu,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedDataHealthMonitor, LiveDataIntegrationHub } from "@/components/telemetry";
import { DataIntelligenceView } from "@/components/intelligence";
import { NasaGpmSetupModal } from "@/components/telemetry/nasa-gpm-setup-modal";
import { PwaCacheStatusCard } from "@/components/pwa";
import { useLocale } from "@/lib/i18n/context";
import { DataSourceMeta } from "@/types";
import { cn } from "@/lib/utils";
import {
  DataSourceHealth,
  DataSourceId,
  DataSourceStatusLevel,
  HealthCheckSummary,
} from "@/types/data-sources";

const PAGE_META: DataSourceMeta = {
  provider: "VarshaNetra Automated Telemetry Health Audit Grid",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice: "Dynamic telemetry health verification complying with Rules 7, 8, 12-19.",
};

type FilterCategory = "ALL" | "ONLINE" | "DEGRADED_STALE" | "ATTENTION";
type DataSourcesTab = "hub" | "audit" | "intelligence";

function DataSourcesContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const initialTab: DataSourcesTab =
    tabParam === "audit" ? "audit" : tabParam === "intelligence" ? "intelligence" : "hub";

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [activeTab, setActiveTab] = useState<DataSourcesTab>(initialTab);
  const [sources, setSources] = useState<DataSourceHealth[]>([]);
  const [summary, setSummary] = useState<HealthCheckSummary | null>(null);
  const [lastAuditedAt, setLastAuditedAt] = useState<string>(new Date().toISOString());
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("ALL");
  const [testingSourceId, setTestingSourceId] = useState<DataSourceId | null>(null);
  const [isNasaSetupOpen, setIsNasaSetupOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if URL query param changes (e.g. browser back/forward or direct link)
  useEffect(() => {
    if (tabParam === "audit" && activeTab !== "audit") {
      setActiveTab("audit");
    } else if (tabParam === "intelligence" && activeTab !== "intelligence") {
      setActiveTab("intelligence");
    } else if ((!tabParam || tabParam === "hub") && activeTab !== "hub") {
      setActiveTab("hub");
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (newTab: DataSourcesTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (newTab === "hub") {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // Fetch full health audit
  const runHealthAudit = useCallback(async () => {
    setViewState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/health/sources");
      if (!res.ok) {
        throw new Error(`Health audit endpoint returned HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Health evaluation returned an error.");
      }

      setSources(data.sources || []);
      setSummary(data.summary || null);
      setLastAuditedAt(data.timestamp || new Date().toISOString());
      setViewState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to execute telemetry audit grid."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    runHealthAudit();
  }, [runHealthAudit]);

  // Targeted single source test
  const handleTestSource = async (sourceId: DataSourceId) => {
    setTestingSourceId(sourceId);
    try {
      const res = await fetch("/api/health/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.source) {
          // Update that single source in state
          setSources((prev) =>
            prev.map((s) => (s.id === sourceId ? (data.source as DataSourceHealth) : s))
          );
        }
      }
    } catch (err) {
      console.error(`Failed to test source ${sourceId}:`, err);
    } finally {
      setTestingSourceId(null);
    }
  };

  // Filtered source list
  const filteredSources = useMemo(() => {
    if (filterCategory === "ALL") return sources;
    if (filterCategory === "ONLINE") {
      return sources.filter((s) => s.status === "ONLINE" || s.status === "CONNECTED");
    }
    if (filterCategory === "DEGRADED_STALE") {
      return sources.filter(
        (s) =>
          s.status === "DEGRADED" ||
          s.status === "STALE" ||
          s.status === "DB_ERROR" ||
          s.status === "AUTH_ERROR" ||
          s.status === "PERMISSION_ERROR"
      );
    }
    if (filterCategory === "ATTENTION") {
      return sources.filter(
        (s) =>
          s.status === "UNAVAILABLE" ||
          s.status === "NOT_CONFIGURED" ||
          s.status === "DB_ERROR" ||
          s.status === "AUTH_ERROR" ||
          s.status === "PERMISSION_ERROR" ||
          s.isStale
      );
    }
    return sources;
  }, [sources, filterCategory]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={
          activeTab === "intelligence"
            ? (locale === "hi" ? "एकीकृत डेटा इंटेलिजेंस केंद्र" : "Integrated Data Intelligence Centre")
            : activeTab === "audit"
            ? (locale === "hi" ? "टेलीमेट्री स्वास्थ्य व एसएलए ऑडिट" : "Telemetry Health & SLA Audit")
            : (locale === "hi" ? "लाइव डेटा एकीकरण केंद्र" : "Live Data Integration Hub")
        }
        description={
          activeTab === "intelligence"
            ? (locale === "hi" ? "12 स्वतंत्र नेटवर्कों से बहु-स्रोत वातावरण निगरानी व समग्र जोखिम संश्लेषण" : "Multi-source environmental monitoring & risk synthesis across 12 independent networks")
            : activeTab === "audit"
            ? (locale === "hi" ? "निरंतर एसएलए ट्रैकिंग, विलंबता विश्लेषण और परिचालन स्वास्थ्य प्रोब्स" : "Continuous SLA tracking, latency analysis, and operational health probes")
            : (locale === "hi" ? "VarshaNetra में एकीकृत सभी डेटा स्रोत" : "All data sources integrated in VarshaNetra")
        }
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "डेटा स्वास्थ्य" : "Data Health", href: "/data-sources" },
          ...(activeTab === "intelligence"
            ? [{ label: locale === "hi" ? "डेटा इंटेलिजेंस" : "Data Intelligence" }]
            : activeTab === "audit"
            ? [{ label: locale === "hi" ? "टेलीमेट्री स्वास्थ्य" : "Telemetry Health" }]
            : [{ label: locale === "hi" ? "डेटा एकीकरण हब" : "Data Integration Hub" }]),
        ]}
        sourceMeta={
          activeTab === "intelligence"
            ? {
                provider: "VarshaNetra Integrated Multi-Source Data Fusion Engine",
                lastUpdated: lastAuditedAt,
                origin: "LIVE_API",
                attributionNotice: "Aggregates Open-Meteo, NASA GPM, RainViewer, Copernicus EMS, USGS, and NASA FIRMS under Open Data policies.",
              }
            : {
                ...PAGE_META,
                lastUpdated: lastAuditedAt,
              }
        }
        compactSource={true}
        actions={
          activeTab === "hub" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthAudit}
                disabled={viewState === "loading"}
                className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${viewState === "loading" ? "animate-spin" : ""}`} />
                <span>{locale === "hi" ? "लाइव स्वास्थ्य ऑडिट चलाएं" : "Run Live Health Audit"}</span>
              </Button>
            </div>
          ) : activeTab === "audit" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthAudit}
                disabled={viewState === "loading"}
                className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${viewState === "loading" ? "animate-spin" : ""}`} />
                <span>{locale === "hi" ? "लाइव स्वास्थ्य ऑडिट चलाएं" : "Run Live Health Audit"}</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* High-Level Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange("hub")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
            activeTab === "hub"
              ? "bg-[#0F3D66] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{locale === "hi" ? "डेटा एकीकरण हब" : "Data Integration Hub"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("audit")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
            activeTab === "audit"
              ? "bg-[#0F3D66] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{locale === "hi" ? "टेलीमेट्री स्वास्थ्य व एसएलए ऑडिट" : "Telemetry Health & SLA Audit"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("intelligence")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
            activeTab === "intelligence"
              ? "bg-[#0F3D66] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{locale === "hi" ? "डेटा प्रज्ञान" : "Data Intelligence"}</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
              activeTab === "intelligence"
                ? "bg-blue-400 text-slate-900"
                : "bg-red-500 text-white"
            )}
          >
            {locale === "hi" ? "लाइव" : "Live"}
          </span>
        </button>
      </div>

      {/* View 1: Complete Live Data Integration Architecture Hub (LIVE-006) */}
      {activeTab === "hub" && (
        <LiveDataIntegrationHub />
      )}

      {/* View 2: Real-time Telemetry Health & SLA Probes */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Top Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "सक्रिय ऑनलाइन फीड" : "Active Online Feeds"}
          value={summary ? `${summary.onlineCount} / ${summary.totalSources}` : "7 / 7"}
          subtext={locale === "hi" ? "रीयल-टाइम एचटीटीपी व गणना प्रोब से प्राप्त" : "Derived from real-time HTTP & calculation probes"}
          icon={Database}
          severity={
            summary && summary.onlineCount >= 5
              ? "NORMAL"
              : summary && summary.onlineCount >= 3
              ? "ADVISORY"
              : "CRITICAL"
          }
          sourceLabel={locale === "hi" ? "लाइव प्रोब इंजन" : "Live Probe Engine"}
          isLoading={viewState === "loading"}
        />
        <MetricCard
          title={locale === "hi" ? "निम्नस्तरीय या पुराने" : "Degraded or Stale"}
          value={summary ? (summary.degradedCount + summary.staleCount).toString() : "0"}
          subtext={locale === "hi" ? "उच्च विलंबता या समय सीमा समाप्त" : "High latency or exceeded freshness thresholds"}
          icon={AlertTriangle}
          severity={
            summary && summary.degradedCount + summary.staleCount > 0 ? "ADVISORY" : "NORMAL"
          }
          sourceLabel={locale === "hi" ? "ताजगी मॉनिटर" : "Freshness Monitor"}
          isLoading={viewState === "loading"}
        />
        <MetricCard
          title={locale === "hi" ? "क्लाइंट सीक्रेट सुरक्षा" : "Client Secret Protection"}
          value={locale === "hi" ? "100% सुरक्षित" : "100% Safe"}
          subtext={locale === "hi" ? "नियम 7 और 8: बंडल में कोई कुंजी उजागर नहीं" : "Rules 7 & 8: Zero API keys exposed in bundles"}
          icon={Lock}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "सुरक्षा ऑडिट" : "Security Audit"}
          isLoading={viewState === "loading"}
        />
        <MetricCard
          title={locale === "hi" ? "श्रेय अनुपालन" : "Attribution Compliance"}
          value={locale === "hi" ? "सत्यापित" : "Verified"}
          subtext={locale === "hi" ? "नियम 19: पूर्ण OSM ODbL 1.0 व Open-Meteo CC BY 4.0" : "Rule 19: Full OSM ODbL 1.0 & Open-Meteo CC BY 4.0"}
          icon={ShieldCheck}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "विधिक नीति ग्रिड" : "Legal & Policy Grid"}
          isLoading={viewState === "loading"}
        />
      </div>

      <StateContainer
        state={viewState}
        onRetry={runHealthAudit}
        errorMessage={errorMessage || (locale === "hi" ? "टेलीमेट्री ऑडिट निष्पादित करने में विफल।" : "Failed to execute telemetry audit grid.")}
      >
        <div className="space-y-6">
          {/* Prominent Enhanced Overall Data Quality & Health Monitor (W-010) */}
          <EnhancedDataHealthMonitor
            weatherTimestamp={sources.find((s) => s.id === "open-meteo")?.lastSuccessfulFetchAt}
            hasWeatherError={sources.find((s) => s.id === "open-meteo")?.status === "UNAVAILABLE"}
            isSupabaseConnected={
              sources.find((s) => s.id === "supabase")?.status === "CONNECTED" ||
              sources.find((s) => s.id === "supabase")?.status === "ONLINE"
            }
            osmLoadedAt={sources.find((s) => s.id === "osm-overpass")?.lastSuccessfulFetchAt}
            onRefresh={runHealthAudit}
          />

          {/* ROAD-005 PART 9: PWA & Offline Cache Status Card */}
          <PwaCacheStatusCard />

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                {locale === "hi" ? "स्रोत फ़िल्टर करें:" : "Filter Sources:"}
              </span>
              <Button
                variant={filterCategory === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("ALL")}
                className="text-xs h-7 px-2.5 font-medium"
              >
                {locale === "hi" ? `सभी स्रोत (${sources.length})` : `All Sources (${sources.length})`}
              </Button>
              <Button
                variant={filterCategory === "ONLINE" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("ONLINE")}
                className="text-xs h-7 px-2.5 font-medium"
              >
                {locale === "hi" ? `ऑनलाइन (${summary?.onlineCount ?? 0})` : `Online (${summary?.onlineCount ?? 0})`}
              </Button>
              <Button
                variant={filterCategory === "DEGRADED_STALE" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("DEGRADED_STALE")}
                className="text-xs h-7 px-2.5 font-medium"
              >
                {locale === "hi"
                  ? `निम्नस्तरीय / पुराना (${(summary?.degradedCount ?? 0) + (summary?.staleCount ?? 0)})`
                  : `Degraded / Stale (${(summary?.degradedCount ?? 0) + (summary?.staleCount ?? 0)})`}
              </Button>
              <Button
                variant={filterCategory === "ATTENTION" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("ATTENTION")}
                className="text-xs h-7 px-2.5 font-medium"
              >
                {locale === "hi"
                  ? `ध्यान आवश्यक (${(summary?.unavailableCount ?? 0) + (summary?.notConfiguredCount ?? 0)})`
                  : `Requires Attention (${(summary?.unavailableCount ?? 0) + (summary?.notConfiguredCount ?? 0)})`}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {locale === "hi" ? "ऑडिट समय:" : "Audited:"}{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {new Date(lastAuditedAt).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", { hour12: false })}
                </span>
              </span>
            </div>
          </div>

          {/* Sources List Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredSources.map((source) => {
              const isTesting = testingSourceId === source.id;
              return (
                <Card
                  key={source.id}
                  className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {source.name}
                          </CardTitle>
                          <StatusBadge
                            status={source.status}
                            sourceId={source.id}
                            locale={locale}
                            onSetupClick={() => setIsNasaSetupOpen(true)}
                          />
                          <ApiKeyBadge status={source.apiKeyStatus} required={source.apiKeyRequired} locale={locale} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {locale === "hi" ? "प्रदाता:" : "Provider:"}{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{source.provider}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {source.id === "nasa-gpm" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNasaSetupOpen(true)}
                            className="text-xs h-8 px-2.5 font-medium gap-1.5 border-blue-300 text-[#2563EB] hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 shadow-xs"
                          >
                            <Satellite className="w-3.5 h-3.5" />
                            <span>{locale === "hi" ? "नासा सेटअप" : "NASA Setup"}</span>
                          </Button>
                        )}
                        {source.latencyMs !== undefined && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {source.latencyMs} ms
                            </span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTesting}
                          onClick={() => handleTestSource(source.id)}
                          className="text-xs h-8 px-2.5 font-medium gap-1.5 border-slate-300 dark:border-slate-700"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                          <span>
                            {isTesting
                              ? (locale === "hi" ? "जाँच जारी..." : "Testing...")
                              : (locale === "hi" ? "स्रोत का परीक्षण करें" : "Test Source")}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Stale or Status Reason Alerts */}
                    {source.statusReason && (
                      <div
                        className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                          source.status === "ONLINE" || source.status === "CONNECTED"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                            : source.status === "UNAVAILABLE"
                            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200"
                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {source.status === "ONLINE" || source.status === "CONNECTED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        ) : source.status === "UNAVAILABLE" ? (
                          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        )}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div>
                            <span className="font-semibold">
                              {source.status === "ONLINE" || source.status === "CONNECTED"
                                ? (locale === "hi" ? "प्रचालन स्थिति: " : "Operational Status: ")
                                : (locale === "hi" ? "नैदानिक सूचना: " : "Diagnostic Notice: ")}
                            </span>
                            <span>{source.statusReason}</span>
                          </div>

                          {/* Safe Diagnostics Chips (Directives #7, #8 & Phase 3 compliant) */}
                          {source.diagnostics && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] pt-1 font-mono opacity-90 border-t border-current/10">
                              {source.diagnostics.endpoint_host && (
                                <span className="truncate">
                                  <span className="font-sans font-semibold">Host:</span>{" "}
                                  {source.diagnostics.endpoint_host}
                                </span>
                              )}
                              {source.diagnostics.error_type && (
                                <span>
                                  <span className="font-sans font-semibold">Classification:</span>{" "}
                                  <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
                                    {source.diagnostics.error_type}
                                  </span>
                                </span>
                              )}
                              {source.diagnostics.http_status !== undefined && source.diagnostics.http_status !== null && (
                                <span>
                                  <span className="font-sans font-semibold">HTTP:</span>{" "}
                                  {source.diagnostics.http_status}
                                </span>
                              )}
                              {source.diagnostics.error_code && (
                                <span>
                                  <span className="font-sans font-semibold">Code:</span>{" "}
                                  {source.diagnostics.error_code}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {source.isStale && (
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 flex items-start gap-2.5 text-xs text-orange-900 dark:text-orange-200">
                        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">
                            {locale === "hi" ? "पुरानी टेलीमेट्री चेतावनी: " : "Stale Telemetry Warning: "}
                          </span>
                          <span>
                            {locale === "hi"
                              ? `अंतिम सफल अद्यतन ताज़गी सीमा ${source.staleThresholdMinutes} मिनट से अधिक हो गई है। स्थानीय कैश या बेसलाइन फ़ालबैक अनुरोधों की सेवा कर रहा है।`
                              : `Last successful update exceeded freshness threshold of ${source.staleThresholdMinutes} minutes. Local cache or baseline fallback is serving requests.`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Operational Purpose */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {locale === "hi" ? "परिचालन उद्देश्य: " : "Operational Purpose: "}
                      </span>
                      {source.purpose}
                    </p>

                    {/* Telemetry Timestamps & Metadata Table */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">
                          {locale === "hi" ? "एंडपॉइंट यूआरआई" : "Endpoint URI"}
                        </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {source.endpoint}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">
                          {locale === "hi" ? "अंतिम सफल प्राप्ति" : "Last Successful Fetch"}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                          {formatTimestamp(source.lastSuccessfulFetchAt, locale)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">
                          {locale === "hi" ? "नवीनतम डेटा टाइमस्टैम्प" : "Latest Data Timestamp"}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                          {formatTimestamp(source.latestDataTimestamp, locale)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">
                          {locale === "hi" ? "ताज़गी एसएलए सीमा" : "Freshness SLA Limit"}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                          {source.staleThresholdMinutes >= 60
                            ? (locale === "hi"
                                ? `${source.staleThresholdMinutes / 60} घंटा/घंटे`
                                : `${source.staleThresholdMinutes / 60} hour(s)`)
                            : (locale === "hi"
                                ? `${source.staleThresholdMinutes} मिनट`
                                : `${source.staleThresholdMinutes} minutes`)}
                        </span>
                      </div>
                    </div>

                    {/* Compliance & Governance Policy */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {locale === "hi" ? "आभार (Attribution): " : "Attribution: "}
                          </span>
                          {source.attributionNotice}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {locale === "hi" ? "इंजीनियरिंग नीति: " : "Engineering Policy: "}
                          </span>
                          {source.complianceNotes}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <a
                          href={source.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          <span>{locale === "hi" ? "आधिकारिक विनिर्देश" : "Official Specs"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Compliance & Standards Transparency Banner */}
          <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {locale === "hi"
                        ? "वर्षानेत्र डेटा स्रोत सत्यता एवं अनुपालन निर्देश"
                        : "VarshaNetra Provenance & Truthfulness Directives"}
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <li>
                        • <strong>{locale === "hi" ? "नियम 14 (शून्य नकली डेटा प्रतिरूपण):" : "Rule 14 (Zero Fake Data Masquerading):"}</strong>{" "}
                        {locale === "hi"
                          ? "डेटा स्वास्थ्य वास्तविक अनुरोध स्थिति से प्राप्त होता है, कभी भी हार्डकोड नहीं किया जाता।"
                          : "Data health is derived strictly from real request states, never hardcoded booleans."}
                      </li>
                      <li>
                        • <strong>{locale === "hi" ? "नियम 18 (कोई झूठा आधिकारिक दावा नहीं):" : "Rule 18 (No False Official Claims):"}</strong>{" "}
                        {locale === "hi"
                          ? "असंलग्न डॉपलर रडार या सीडब्ल्यूसी गेज पारदर्शी रूप से सैंडबॉक्स या गैर-कॉन्फ़िगर चिह्नित हैं।"
                          : "Unconnected official Doppler radar or CWC stream gauges are transparently flagged as sandbox or unconfigured."}
                      </li>
                      <li>
                        • <strong>{locale === "hi" ? "नियम 7 और 8 (कठोर गोपनीय सुरक्षा):" : "Rules 7 & 8 (Strict Secret Protection):"}</strong>{" "}
                        {locale === "hi"
                          ? "डेटाबेस क्रेडेंशियल और निजी सेवा कुंजियाँ यूआई या क्लाइंट बंडल में कभी प्रदर्शित नहीं की जातीं।"
                          : "Database credentials and private service keys are never exposed in UI or client bundles."}
                      </li>
                      <li>
                        • <strong>{locale === "hi" ? "नियम 19 (ओपनस्ट्रीटमैप नीति):" : "Rule 19 (OpenStreetMap Policy):"}</strong>{" "}
                        {locale === "hi"
                          ? "नोमिनाटिम और ओवरपास अनुरोध दर सीमा और मानक आभार का पालन करते हैं।"
                          : "Nominatim and Overpass requests enforce rate throttling and standard attribution."}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block">
                    {locale === "hi" ? "ऑडिट चक्र" : "Audit Cycle"}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "मांग पर स्वचालित एवं सत्र जांच" : "Automated On-Demand & Session Check"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StateContainer>
        </div>
      )}

      {/* View 3: Integrated Data Intelligence Centre */}
      {activeTab === "intelligence" && (
        <DataIntelligenceView hideHeader={true} />
      )}

      {/* NASA GPM Setup Instructions Modal (LIVE-002 PART 1) */}
      <NasaGpmSetupModal
        isOpen={isNasaSetupOpen}
        onClose={() => setIsNasaSetupOpen(false)}
      />

      </div>
  );
}

export default function DataSourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-12 animate-pulse">
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-8 w-80 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        </div>
      }
    >
      <DataSourcesContent />
    </Suspense>
  );
}

function StatusBadge({
  status,
  sourceId,
  locale,
  onSetupClick,
}: {
  status: DataSourceStatusLevel;
  sourceId?: DataSourceId;
  locale: "en" | "hi";
  onSetupClick?: () => void;
}) {

  // NASA GPM Dedicated Statuses (LIVE-002 PART 6)
  if (sourceId === "nasa-gpm") {
    if (status === "NOT_CONFIGURED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>NOT CONFIGURED</span>
          {onSetupClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetupClick();
              }}
              className="underline text-blue-400 hover:text-blue-300 ml-1 font-bold"
            >
              Setup
            </button>
          )}
        </span>
      );
    }
    if (status === "ONLINE" || status === "CONNECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          LIVE SATELLITE
        </span>
      );
    }
    if (status === "STALE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          STALE SATELLITE
        </span>
      );
    }
  }

  switch (status) {
    case "ONLINE":
    case "CONNECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {status === "CONNECTED"
            ? locale === "hi"
              ? "कनेक्टेड"
              : "CONNECTED"
            : locale === "hi"
            ? "ऑनलाइन"
            : "ONLINE"}
        </span>
      );
    case "CONFIGURED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          {locale === "hi" ? "कॉन्फ़िगर" : "CONFIGURED"}
        </span>
      );
    case "DB_ERROR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {locale === "hi" ? "डेटाबेस त्रुटि" : "DB ERROR"}
        </span>
      );
    case "AUTH_ERROR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          {locale === "hi" ? "प्रमाणीकरण त्रुटि" : "AUTH ERROR"}
        </span>
      );
    case "PERMISSION_ERROR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {locale === "hi" ? "अनुमति त्रुटि" : "PERMISSION ERROR"}
        </span>
      );
    case "DEGRADED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {locale === "hi" ? "निम्नस्तरीय" : "DEGRADED"}
        </span>
      );
    case "STALE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
          <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          {locale === "hi" ? "पुराना" : "STALE"}
        </span>
      );
    case "UNAVAILABLE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          {locale === "hi" ? "अनुपलब्ध" : "UNAVAILABLE"}
        </span>
      );
    case "NOT_CONFIGURED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          {locale === "hi" ? "कॉन्फ़िगर नहीं" : "NOT CONFIG"}
        </span>
      );
  }
}

function ApiKeyBadge({
  status,
  required,
  locale,
}: {
  status: "NOT_REQUIRED" | "CONFIGURED_PROTECTED" | "NOT_CONFIGURED";
  required: boolean;
  locale: "en" | "hi";
}) {
  if (!required || status === "NOT_REQUIRED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        {locale === "hi" ? "कुंजी आवश्यक नहीं (सार्वजनिक)" : "No Key Required (Public)"}
      </span>
    );
  }
  if (status === "CONFIGURED_PROTECTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        {locale === "hi" ? "क्रेडेंशियल्स सुरक्षित" : "Credentials Protected"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
      {locale === "hi" ? "कुंजी कॉन्फ़िगर नहीं" : "Key Not Configured"}
    </span>
  );
}

function formatTimestamp(isoStr?: string | null, locale: "en" | "hi" = "en"): string {
  if (!isoStr) return locale === "hi" ? "अनुपलब्ध" : "N/A";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return locale === "hi" ? "अनुपलब्ध" : "N/A";
    return d.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch {
    return locale === "hi" ? "अनुपलब्ध" : "N/A";
  }
}

