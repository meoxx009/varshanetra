"use client";

/**
 * VarshaNetra - Admin Weather Provider Configuration
 * VN-TASK-8.4: Dynamic Provider Management, Supabase Vault Key Storage,
 * Connection Testing & 500 calls/day Rate Limit Monitoring.
 */

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CloudLightning,
  CloudSun,
  ShieldCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Info,
  Server,
} from "lucide-react";
import type { AppWeatherProviderConfig } from "@/lib/weather/types";
import { useLocale } from "@/lib/i18n/context";

interface ConfigData {
  config: AppWeatherProviderConfig;
  isTomorrowConfigured: boolean;
  rateLimit: {
    dailyQuota: number;
    callsToday: number;
    remaining: number;
    lastSuccessAt: string | null;
  };
}

export default function AdminWeatherConfigPage() {
  const locale = useLocale();
  const [data, setData] = useState<ConfigData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form states
  const [primaryProvider, setPrimaryProvider] = useState<"openmeteo" | "imd">("openmeteo");
  const [nowcastProvider, setNowcastProvider] = useState<"tomorrowio" | "openmeteo" | "none">("tomorrowio");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Action states
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keySaveMessage, setKeySaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    temperature?: number;
    message?: string;
    error?: string;
    raw?: unknown;
  } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configSaveMessage, setConfigSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing configuration on mount
  const loadConfig = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/weather-config");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load weather config.`);
      const json: { success: boolean; config: AppWeatherProviderConfig; isTomorrowConfigured: boolean; rateLimit: ConfigData["rateLimit"] } = await res.json();
      if (json.success) {
        setData({
          config: json.config,
          isTomorrowConfigured: json.isTomorrowConfigured,
          rateLimit: json.rateLimit,
        });
        setPrimaryProvider(json.config.primary || "openmeteo");
        setNowcastProvider(json.config.nowcast || "tomorrowio");
      } else {
        throw new Error("Unable to retrieve weather configuration.");
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load weather configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Save API key to Supabase Vault via server endpoint
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setIsSavingKey(true);
    setKeySaveMessage(null);
    try {
      const res = await fetch("/api/admin/set-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "TOMORROW_API_KEY",
          secret: apiKeyInput.trim(),
          description: "Tomorrow.io API Key (Free Tier: 500/day)",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setKeySaveMessage({
          type: "success",
          text: "API Key successfully stored in Supabase Vault (Zero plaintext in DB).",
        });
        setApiKeyInput("");
        await loadConfig();
      } else {
        throw new Error(json.error || "Failed to commit key to Vault.");
      }
    } catch (err) {
      setKeySaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving key to Supabase Vault.",
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Test Tomorrow.io connection (Delhi 28.6, 77.2)
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/weather-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() || undefined }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult({
          success: true,
          temperature: json.temperature,
          message: json.message,
          raw: json.data,
        });
        await loadConfig();
      } else {
        setTestResult({
          success: false,
          error: json.error || `HTTP ${res.status}: Connection failed`,
          raw: json,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Connection test request failed.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Provider Radio Configurations to app_config
  const handleSaveProviders = async () => {
    setIsSavingConfig(true);
    setConfigSaveMessage(null);
    try {
      const res = await fetch("/api/admin/weather-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary: primaryProvider,
          nowcast: nowcastProvider,
          fallback: ["openmeteo"],
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setConfigSaveMessage({
          type: "success",
          text: "Provider routing preferences updated in app_config.",
        });
        await loadConfig();
      } else {
        throw new Error(json.error || "Failed to save provider config.");
      }
    } catch (err) {
      setConfigSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update configuration.",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // View State 1: Loading
  if (isLoading && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  // View State 2: Error
  if (fetchError && !data) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
            <h2 className="text-base font-bold text-red-900 dark:text-red-200">
              {locale === "hi"
                ? "मौसम प्रदाता कॉन्फ़िगरेशन लोड करने में विफल"
                : "Failed to Load Weather Provider Configuration"}
            </h2>
            <p className="text-xs text-red-700 dark:text-red-300">{fetchError}</p>
            <Button onClick={loadConfig} size="sm" variant="outline" className="cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry Connection"}</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const callsToday = data?.rateLimit.callsToday ?? 0;
  const remainingCalls = data?.rateLimit.remaining ?? 500;
  const dailyQuota = data?.rateLimit.dailyQuota ?? 500;
  const usagePct = Math.min(100, Math.round((callsToday / dailyQuota) * 100));
  const isTomorrowConfigured = data?.isTomorrowConfigured ?? false;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudLightning className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {locale === "hi"
                ? "मौसम प्रदाता कॉन्फ़िगरेशन"
                : "Weather Provider Configuration"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {locale === "hi"
              ? "मौसम संबंधी डेटा एडेप्टर, नाउकास्ट प्राथमिकताएं और सुरक्षित Supabase Vault क्रेडेंशियल प्रबंधित करें।"
              : "Manage meteorological data adapters, nowcast priorities, and secure Supabase Vault credentials."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-1 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30"
          >
            {locale === "hi" ? "एडेप्टर पैटर्न इंजन" : "Adapter Pattern Engine"}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadConfig}
            disabled={isLoading}
            className="h-8 px-2 text-slate-500 hover:text-slate-900"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Grid: Provider Routing Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Primary Forecast Provider Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-blue-600" />
              Primary Forecast Provider (6h - 72h)
            </CardTitle>
            <CardDescription className="text-xs">
              Long-range multi-model numerical prediction engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Open-Meteo Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                primaryProvider === "openmeteo"
                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 ring-1 ring-blue-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="primaryProvider"
                value="openmeteo"
                checked={primaryProvider === "openmeteo"}
                onChange={() => setPrimaryProvider("openmeteo")}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Open-Meteo Seamless
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Default</Badge>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ECMWF & GFS multi-model ensemble. Resolution: 11km. Unlimited free tier usage.
                </p>
              </div>
            </label>

            {/* IMD Stub Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                primaryProvider === "imd"
                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 ring-1 ring-blue-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 opacity-80"
              }`}
            >
              <input
                type="radio"
                name="primaryProvider"
                value="imd"
                checked={primaryProvider === "imd"}
                onChange={() => setPrimaryProvider("imd")}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    India Meteorological Department (IMD)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    MOU Required
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Official national gateway. Falls back to Open-Meteo until MOU endpoint credentials are provided.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* 2. Nowcast Provider Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Nowcast Provider (0 - 6h)
            </CardTitle>
            <CardDescription className="text-xs">
              Hyper-local rapid-update precipitation telemetry for flash flood alert decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Tomorrow.io Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                nowcastProvider === "tomorrowio"
                  ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-400 dark:border-purple-700 ring-1 ring-purple-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="nowcastProvider"
                value="tomorrowio"
                checked={nowcastProvider === "tomorrowio"}
                onChange={() => setNowcastProvider("tomorrowio")}
                className="mt-1 text-purple-600 focus:ring-purple-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Tomorrow.io Hyper-Local
                  </span>
                  <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0">Recommended</Badge>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  1km / 1-min resolution. AI-enhanced precipitation intensity. Ideal for urban waterlogging alerts.
                </p>
              </div>
            </label>

            {/* Open-Meteo Nowcast Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                nowcastProvider === "openmeteo"
                  ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-400 dark:border-purple-700 ring-1 ring-purple-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="nowcastProvider"
                value="openmeteo"
                checked={nowcastProvider === "openmeteo"}
                onChange={() => setNowcastProvider("openmeteo")}
                className="mt-1 text-purple-600 focus:ring-purple-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Open-Meteo Hourly
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Standard 1-hour resolution. Used as reliable zero-cost fallback when API quotas are reached.
                </p>
              </div>
            </label>
          </CardContent>
          <CardFooter className="pt-0 flex items-center justify-between">
            <Button
              size="sm"
              onClick={handleSaveProviders}
              disabled={isSavingConfig}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Save Provider Priorities
            </Button>
            {configSaveMessage && (
              <span className={`text-[11px] font-medium ${configSaveMessage.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {configSaveMessage.text}
              </span>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* 3. Tomorrow.io Dedicated Card & Rate Limit Monitor */}
      <Card className="border-purple-200 dark:border-purple-900/60 shadow-md">
        <CardHeader className="bg-purple-50/40 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold shadow-xs">
                T.io
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Tomorrow.io Configuration</CardTitle>
                  {isTomorrowConfigured ? (
                    <Badge className="bg-emerald-600 text-white text-[11px] px-2 py-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      🟢 Configured (Vault)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-rose-700 border-rose-300 dark:text-rose-400 text-[11px] px-2 py-0.5">
                      🔴 Not Configured
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Secure API Key credentials managed directly in Supabase Vault (vault.secrets).
                </CardDescription>
              </div>
            </div>

            {/* Rate Limit Summary Pill */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-xs">
              <Activity className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Daily Quota Monitor</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {callsToday} <span className="text-slate-400 font-normal">/ {dailyQuota} calls today</span>
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    ({remainingCalls} remaining)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Rate Limit Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Quota Consumption (Free Tier: 500 calls/day)</span>
              <span className="font-mono font-bold">{usagePct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-purple-600"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>

          {/* Info Box: Free Tier Specifications */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Operational Architecture & Rate Limit Protection:
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Free Tier: 500 calls/day. 1km / 1-min Nowcast. Best for Thunderstorm / Urban Flood Nowcasting.
                Responses are aggressively cached (Realtime: 2 min, Forecast: 15 min).
                If the 500-call quota is exhausted, the Adapter Pattern automatically degrades to Open-Meteo with zero system downtime.
              </p>
            </div>
          </div>

          {/* Supabase Vault Key Form */}
          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="tomorrow-api-key"
                className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-purple-600" />
                Tomorrow.io API Key (Write to Supabase Vault)
              </label>
              <div className="relative max-w-lg">
                <input
                  id="tomorrow-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={isTomorrowConfigured ? "••••••••••••••••••••••••••••••••" : "Paste your Tomorrow.io API Key here..."}
                  className="w-full text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={showApiKey ? "Hide Key" : "Show Key"}
                  aria-label="Toggle password visibility"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Zero API keys are exposed to the client bundle or browser network tab (Server-to-Server Vault isolation).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={isSavingKey || !apiKeyInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
              >
                {isSavingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                Save to Supabase Vault
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-xs border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                Test Connection (Delhi Probe)
              </Button>
            </div>

            {keySaveMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  keySaveMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {keySaveMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                <span>{keySaveMessage.text}</span>
              </div>
            )}
          </form>

          {/* Test Connection Results Card / JSON Preview */}
          {testResult && (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                  <Server className="w-4 h-4 text-purple-600" />
                  Connection Diagnostic: Real-Time Telemetry Probe (Delhi: 28.6°N, 77.2°E)
                </span>
                {testResult.success ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">HTTP 200 OK</Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white text-[10px]">FAILED</Badge>
                )}
              </div>

              {testResult.success ? (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>{testResult.message}</span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                      {testResult.temperature}°C
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500">API Response Payload Preview:</span>
                    <pre className="mt-1 p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48">
                      {JSON.stringify(testResult.raw, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs text-rose-800 dark:text-rose-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Connection Probe Error</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.error}</p>
                  {(testResult.error?.includes("401") || testResult.error?.includes("Invalid API Key")) && (
                    <div className="mt-2 p-2.5 rounded bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800/60 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                      <span className="font-semibold text-rose-700 dark:text-rose-300 block">
                        🔑 Tomorrow.io API Key Diagnostic Tip:
                      </span>
                      <p>
                        To generate or verify your Tomorrow.io API key:
                      </p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Log in to <a href="https://app.tomorrow.io/development/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 font-semibold underline">app.tomorrow.io/development/keys</a>.</li>
                        <li>Click <strong>&quot;Create New Key&quot;</strong> or copy your existing active API Key.</li>
                        <li>Configure <code>TOMORROW_API_KEY</code> in your server environment (.env.local or Vercel).</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
