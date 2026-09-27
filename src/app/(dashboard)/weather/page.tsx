"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CloudRain,
  Wind,
  Droplets,
  RefreshCw,
  AlertTriangle,
  Clock,
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  History,
  FileText,
  Cpu,
  Satellite,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { DataBadge, getFreshnessBadgeType } from "@/components/common/data-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { WeatherCharts } from "@/components/weather/weather-charts";
import { AntecedentRainfallCard } from "@/components/weather/antecedent-rainfall-card";
import { HistoricalRainfallChart } from "@/components/weather/historical-rainfall-chart";
import { IMDThresholdCard } from "@/components/weather/imd-threshold-card";
import { ImdBulletinBanner } from "@/components/weather/imd-bulletin-banner";
import { IMDManualDataEntry } from "@/components/weather/imd-manual-data-entry";
import { DataGovInfoCard } from "@/components/weather/data-gov-info-card";
import { GovernmentDataCard } from "@/components/govdata/government-data-card";
import { GovernmentDataResourcesCard } from "@/components/govdata/government-data-resources-card";
import { ImdIntegrationStatusCard } from "@/components/telemetry/imd-integration-status-card";
import { NwpEnsembleDashboard } from "@/components/weather/nwp-ensemble-dashboard";
import { SatelliteRainfallCard } from "@/components/weather/satellite-rainfall-card";
import { ModelVsSatelliteComparisonCard } from "@/components/weather/model-vs-satellite-comparison-card";
import { BhuvanLinkCard } from "@/components/weather/bhuvan-link-card";
import { NASAGPMCard } from "@/components/weather/nasa-gpm-card";
import { RadarDataCard } from "@/components/radar/radar-data-card";
import { WeatherSourceSummaryBar } from "@/components/weather/weather-source-summary-bar";
import { WeatherSituationAssessment } from "@/components/weather/weather-situation-assessment";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useCanonicalTelemetry } from "@/hooks/use-canonical-telemetry";
import { useWeatherEnsemble } from "@/hooks/use-weather-ensemble";
import { useSatelliteRainfall } from "@/hooks/use-satellite-rainfall";
import { useTomorrowWeather } from "@/hooks/use-tomorrow-weather";
import { useAuth } from "@/hooks/use-auth";
import { coordinatedFetch } from "@/lib/services/request-coordinator";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatWeatherCondition, formatDateTime } from "@/lib/i18n/formatters";
import {
  WeatherForecastData,
  AntecedentRainfallSummary,
  getImdRainfallCategory,
  getWmoWeatherInfo,
  weatherCodeToDescription,
  DataSourceMeta,
} from "@/types";
import { ImdManualEntry } from "@/types/weather";

const FALLBACK_SOURCE_META: DataSourceMeta = {
  provider: "Open-Meteo (ECMWF & GFS Seamless Multi-Model)",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice: "Weather forecast provided by Open-Meteo.com under CC BY 4.0 license.",
  url: "https://open-meteo.com/",
};

export default function WeatherPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tWeather = useTranslations("weather");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("navigation");
  const { profile } = useAuth();

  const [forecast, setForecast] = useState<WeatherForecastData | null>(null);
  const [antecedent, setAntecedent] = useState<AntecedentRainfallSummary | null>(null);
  const [antecedentMeta, setAntecedentMeta] = useState<DataSourceMeta | null>(null);

  // IMD Bulletin state
  const [imdEntries, setImdEntries] = useState<ImdManualEntry[]>([]);
  const [showImdForm, setShowImdForm] = useState<boolean>(false);

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Multi-Model NWP Ensemble Hook (LIVE-001)
  const {
    ensemble,
    isLoading: isEnsembleLoading,
    isRefreshing: isEnsembleRefreshing,
    isStale: isEnsembleStale,
    cacheAgeMinutes: ensembleCacheAge,
    error: ensembleError,
    refetch: refetchEnsemble,
  } = useWeatherEnsemble({
    latitude: location.latitude,
    longitude: location.longitude,
  });

  const ensembleViewState: ComponentViewState =
    isEnsembleLoading && !ensemble
      ? "loading"
      : ensembleError && !ensemble
      ? "error"
      : !ensemble
      ? "empty"
      : "success";

  // NASA GPM IMERG Satellite Rainfall (LIVE-002)
  const {
    data: satelliteData,
    isLoading: isSatelliteLoading,
    isRefreshing: isSatelliteRefreshing,
    isStale: isSatelliteStale,
    refetch: refetchSatellite,
  } = useSatelliteRainfall({
    latitude: location.latitude,
    longitude: location.longitude,
    district: location.shortName || location.displayName,
    nwpForecastMm: ensemble?.comparison?.ensemble?.rainfall24h ?? forecast?.accumulations?.next24h,
    autoFetch: true,
  });

  // Tomorrow.io Proprietary Weather Integration (SOURCES-002 PART 1)
  const {
    data: tomorrowData,
    isLoading: isTomorrowLoading,
    isRefreshing: isTomorrowRefreshing,
    error: tomorrowError,
    refetch: refetchTomorrow,
  } = useTomorrowWeather({
    latitude: location.latitude,
    longitude: location.longitude,
    district: location.shortName || location.displayName,
    autoFetch: true,
  });

  // Canonical Multi-Factor Telemetry Snapshot (VNET-WEATHER-INTEL-004)
  const {
    snapshot: canonicalSnapshot,
    isLoading: isCanonicalLoading,
    isRefreshing: isCanonicalRefreshing,
    error: canonicalError,
    refetch: refetchCanonical,
  } = useCanonicalTelemetry({
    districtId: location.district || location.shortName,
    latitude: location.latitude,
    longitude: location.longitude,
    enabled: true,
  });

  const satelliteViewState: ComponentViewState =
    isSatelliteLoading && !satelliteData
      ? "loading"
      : !satelliteData
      ? "empty"
      : "success";

  // Tabs: Multi-Model NWP Ensemble vs NASA GPM Satellite vs Hourly Forecast & Radar vs Historical & Antecedent
  const [activeTab, setActiveTab] = useState<"ensemble" | "satellite" | "forecast" | "history">("ensemble");
  const [viewMode, setViewMode] = useState<"24h" | "7d">("24h");
  const [showHourlyTable, setShowHourlyTable] = useState<boolean>(false);
  const [showHistoricalTable, setShowHistoricalTable] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // Role check for IMD bulletin entry
  const userRole = (profile?.role || "").toUpperCase();
  const canEnterImdData =
    userRole.includes("ADMIN") ||
    userRole.includes("DM") ||
    userRole.includes("MAGISTRATE");

  const fetchWeatherData = useCallback(
    async (bypassCache = false) => {
      if (bypassCache) {
        setIsRefreshing(true);
      } else {
        setViewState("loading");
      }
      setErrorMessage("");

      try {
        const districtParam = encodeURIComponent(location.shortName || location.displayName);
        const forecastUrl = `/api/weather/forecast?lat=${location.latitude}&lon=${location.longitude}&days=7${
          bypassCache ? "&refresh=true" : ""
        }&district=${districtParam}`;

        const antecedentUrl = `/api/weather/antecedent?lat=${location.latitude}&lon=${location.longitude}&days=3${
          bypassCache ? "&refresh=true" : ""
        }&district=${districtParam}`;

        // Coordinated fetch for forecast telemetry, antecedent history, and IMD bulletin entries
        const [forecastJson, antecedentJson, imdJson] = await Promise.all([
          coordinatedFetch<{ success: boolean; data: WeatherForecastData; error?: string }>(forecastUrl, { bypassCache, ttlMs: 60000 }),
          coordinatedFetch<{ success: boolean; data: AntecedentRainfallSummary; metadata?: DataSourceMeta }>(antecedentUrl, { bypassCache, ttlMs: 60000 }).catch(() => null),
          coordinatedFetch<{ success: boolean; data: ImdManualEntry[] }>("/api/weather/imd-manual", { bypassCache, ttlMs: 120000 }).catch(() => null),
        ]);

        if (!forecastJson || !forecastJson.success || !forecastJson.data) {
          throw new Error(forecastJson?.error || "Telemetry request failed");
        }

        setForecast(forecastJson.data);

        if (antecedentJson && antecedentJson.success && antecedentJson.data) {
          setAntecedent(antecedentJson.data);
          setAntecedentMeta(antecedentJson.metadata || null);
        }

        // IMD bulletin entries — graceful fallback if endpoint unavailable
        if (imdJson && imdJson.success && Array.isArray(imdJson.data)) {
          setImdEntries(imdJson.data);
        }

        setViewState("success");
        setLastFetchTime(new Date());
        setIsStale(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error connecting to telemetry service";
        setForecast((prev) => {
          if (prev) {
            setIsStale(true);
            setErrorMessage(`Telemetry sync failed: ${message}. Retaining cached operational picture.`);
            return prev;
          }
          setErrorMessage(message);
          setViewState("error");
          return null;
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [location.latitude, location.longitude, location.shortName, location.displayName]
  );

  useEffect(() => {
    fetchWeatherData(false);
  }, [fetchWeatherData]);

  // Check data staleness periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastFetchTime && Date.now() - lastFetchTime.getTime() > 30 * 60 * 1000) {
        setIsStale(true);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);

  const getWeatherIcon = (code: number) => {
    const info = getWmoWeatherInfo(code);
    switch (info.iconName) {
      case "Sun":
        return Sun;
      case "CloudSun":
        return CloudSun;
      case "Cloud":
        return Cloud;
      case "CloudFog":
        return CloudFog;
      case "CloudDrizzle":
        return CloudDrizzle;
      case "CloudRain":
        return CloudRain;
      case "CloudSnow":
        return CloudSnow;
      case "CloudLightning":
        return CloudLightning;
      default:
        return Cloud;
    }
  };

  const current = forecast?.current;
  const accumulations = forecast?.accumulations;
  const currentIcon = current ? getWeatherIcon(current.weatherCode) : CloudRain;
  const currentImd = accumulations ? getImdRainfallCategory(accumulations.next24h) : null;
  const sourceMeta: DataSourceMeta =
    activeTab === "satellite"
      ? {
          provider: "NASA GPM IMERG (Integrated Multi-satellitE Retrievals)",
          lastUpdated: satelliteData?.lastUpdated || new Date().toISOString(),
          origin: satelliteData?.status === "live" ? "LIVE_API" : "DEMO_SANDBOX",
          attributionNotice: "Global precipitation observation by NASA Earthdata GES DISC.",
          url: "https://gpm.nasa.gov/",
        }
      : activeTab === "ensemble"
      ? (ensemble?.metadata || FALLBACK_SOURCE_META)
      : activeTab === "history" && antecedentMeta
      ? antecedentMeta
      : (forecast?.metadata || FALLBACK_SOURCE_META);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${tWeather("title")}: ${location.shortName || (locale === "hi" ? "जिला कमान" : "District Command")}`}
        description={`${locale === "hi" ? `${location.displayName} हेतु उच्च-रिज़ॉल्यूशन वायुमंडलीय पैरामीटर, पूर्ववर्ती भूमि संतृप्ति एवं वर्षा प्रक्षेपण। ओपन-मेटियो सौजन्य से लाइव मल्टी-मॉडल फीड।` : `High-resolution atmospheric parameters, antecedent ground saturation, and precipitation projections for ${location.displayName}. Live multi-model feeds courtesy of Open-Meteo.`}`}
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: tNav("weather") || "Weather Intelligence" },
        ]}
        sourceMeta={sourceMeta}
        actions={
          <div className="flex items-center gap-2">
            {/* Main Tab Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab("ensemble")}
                className={`px-3 py-1 rounded font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "ensemble"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                {locale === "hi" ? "NWP मल्टी-मॉडल औसत" : "Multi-Model NWP"}
              </button>
              <button
                onClick={() => setActiveTab("satellite")}
                className={`px-3 py-1 rounded font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "satellite"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                {locale === "hi" ? "नासा GPM उपग्रह" : "NASA GPM Satellite"}
              </button>
              <button
                onClick={() => setActiveTab("forecast")}
                className={`px-3 py-1 rounded font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "forecast"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                {locale === "hi" ? "प्रति घंटा पूर्वानुमान" : "Hourly & Radar"}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {locale === "hi" ? "पूर्ववर्ती एवं इतिहास" : "Antecedent & History"}
              </button>
            </div>

            {/* Forecast View Mode Toggle (Only on Forecast tab) */}
            {activeTab === "forecast" && (
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setViewMode("24h")}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    viewMode === "24h"
                      ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {locale === "hi" ? "24 घंटे" : "24h"}
                </button>
                <button
                  onClick={() => setViewMode("7d")}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    viewMode === "7d"
                      ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {locale === "hi" ? "7 दिन" : "7d"}
                </button>
              </div>
            )}

            {/* IMD Bulletin Entry Button — role-gated */}
            {canEnterImdData && (
              <button
                onClick={() => setShowImdForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold shadow-xs transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {locale === "hi" ? "IMD बुलेटिन दर्ज करें" : "Enter IMD Bulletin"}
                </span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchWeatherData(true);
                refetchEnsemble(true);
                refetchSatellite(true);
                refetchTomorrow(true);
                refetchCanonical(true);
              }}
              disabled={isRefreshing || isEnsembleRefreshing || isSatelliteRefreshing || isTomorrowRefreshing || isCanonicalRefreshing || (viewState === "loading" && isEnsembleLoading)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isEnsembleRefreshing || isSatelliteRefreshing || isTomorrowRefreshing || isCanonicalRefreshing ? "animate-spin text-[#2563EB]" : ""}`} />
              <span className="hidden sm:inline">{tCommon("refresh") || "Refresh"}</span>
            </button>
          </div>
        }
      />

      {/* IMD Official Bulletin Banner — shown when a bulletin has been entered */}
      {imdEntries.length > 0 && imdEntries[0] && (
        <ImdBulletinBanner
          entry={imdEntries[0]}
          canEdit={canEnterImdData}
          onEdit={() => setShowImdForm(true)}
        />
      )}

      {/* IMD Manual Data Entry Modal — role-gated */}
      {showImdForm && (
        <IMDManualDataEntry
          isOpen={showImdForm}
          onClose={() => setShowImdForm(false)}
          onSuccess={(entry) => {
            setImdEntries((prev) => [entry, ...prev]);
            setShowImdForm(false);
          }}
        />
      )}

      {/* Stale Telemetry Advisory Banner */}
      {isStale && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{locale === "hi" ? "पुरानी टेलीमेट्री सलाह:" : "Stale Telemetry Advisory:"}</strong>{" "}
              {errorMessage || (locale === "hi" ? "डेटा 30 मिनट से अधिक समय पूर्व प्राप्त हुआ था। स्वचालित पृष्ठभूमि पुनः सत्यापन जारी है।" : "Data was retrieved over 30 minutes ago. Automatic background revalidation in progress.")}
            </span>
          </div>
          <button
            onClick={() => fetchWeatherData(true)}
            className="underline font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 shrink-0"
          >
            {locale === "hi" ? "अभी सिंक करें" : "Sync Now"}
          </button>
        </div>
      )}

      {/* Weather Data Source Summary Bar (SOURCES-002 PART 5) */}
      <WeatherSourceSummaryBar
        tomorrowStatus={tomorrowData?.api_status || "NOT_CONFIGURED"}
        gpmStatus={satelliteData ? "LIVE" : "DEMO"}
        radarStatus="LIVE"
        ecmwfActive={Boolean(ensemble?.comparison?.ecmwf)}
        gfsActive={Boolean(ensemble?.comparison?.gfs)}
      />

      {/* Weather Situation & Flood Outlook Master Assessment (VNET-WEATHER-INTEL-004) */}
      <WeatherSituationAssessment
        location={location}
        snapshot={canonicalSnapshot}
        isLoading={isCanonicalLoading}
        isRefreshing={isCanonicalRefreshing}
        onRefresh={() => refetchCanonical(true)}
        error={canonicalError}
      />

      {/* Top Telemetry KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={tWeather("temperature") || "Current Temperature"}
          value={current ? `${Math.round(current.temperature)}` : "--"}
          unit="°C"
          subtext={
            current
              ? `${weatherCodeToDescription(current.weatherCode).emoji} ${
                  locale === "hi"
                    ? weatherCodeToDescription(current.weatherCode).textHi
                    : weatherCodeToDescription(current.weatherCode).textEn
                }`
              : (locale === "hi" ? "टेलीमेट्री की प्रतीक्षा..." : "Awaiting telemetry")
          }
          icon={currentIcon}
          severity={current ? getWmoWeatherInfo(current.weatherCode).severity : "NORMAL"}
          sourceLabel="Open-Meteo"
          isLoading={viewState === "loading"}
          dataBadgeType={getFreshnessBadgeType(lastFetchTime, Boolean(current))}
          dataBadgeTimestamp={lastFetchTime}
        />

        <MetricCard
          title={tWeather("humidity") || "Relative Humidity"}
          value={current ? `${current.relativeHumidity}` : "--"}
          unit="%"
          subtext={
            current && current.relativeHumidity > 85
              ? (locale === "hi" ? "उच्च वायुमंडलीय संतृप्ति (कोहरा/वर्षा संभावना)" : "High atmospheric saturation (Fog/Rain potential)")
              : (locale === "hi" ? "मानक सतही आर्द्रता" : "Standard surface humidity")
          }
          icon={Droplets}
          severity={current && current.relativeHumidity > 90 ? "ADVISORY" : "NORMAL"}
          sourceLabel="Surface Sensor Grid"
          isLoading={viewState === "loading"}
          dataBadgeType={getFreshnessBadgeType(lastFetchTime, Boolean(current))}
          dataBadgeTimestamp={lastFetchTime}
        />

        <MetricCard
          title={locale === "hi" ? "पूर्ववर्ती 72 घंटे वर्षा" : "Antecedent 72h Rain"}
          value={antecedent ? `${antecedent.precip72h}` : "--"}
          unit="mm"
          subtext={
            antecedent
              ? `${locale === "hi" ? "सूचकांक" : "Index"}: ${antecedent.soilMoistureIndex} (${antecedent.runoffRiskMultiplier}x ${locale === "hi" ? "अपवाह कारक" : "runoff factor"})`
              : (locale === "hi" ? "ऐतिहासिक संचय" : "Historical accumulation")
          }
          icon={History}
          severity={antecedent && antecedent.precip72h > 45 ? "ALERT" : "NORMAL"}
          sourceLabel="ERA5 Reanalysis"
          isLoading={viewState === "loading"}
          dataBadgeType="HISTORICAL"
          dataBadgeTimestamp={antecedentMeta?.lastUpdated}
        />

        <MetricCard
          title={tWeather("windSpeed") || (locale === "hi" ? "हवा गति" : "Wind Speed")}
          value={current ? `${current.windSpeed}` : "--"}
          unit="km/h"
          subtext={
            current
              ? `${locale === "hi" ? "दिशा" : "Bearing"}: ${current.windDirectionCompass} (${current.windDirection}°)`
              : (locale === "hi" ? "एनीमोमीटर बेसलाइन" : "Anemometer baseline")
          }
          icon={Wind}
          severity={current && current.windSpeed > 35 ? "ALERT" : "NORMAL"}
          sourceLabel="10m AGL Anemometer"
          isLoading={viewState === "loading"}
          dataBadgeType={getFreshnessBadgeType(lastFetchTime, Boolean(current))}
          dataBadgeTimestamp={lastFetchTime}
        />
      </div>
 
      {/* Tab 0: Multi-Model NWP Ensemble View (LIVE-001) */}
      {activeTab === "ensemble" && (
        <StateContainer
          state={ensembleViewState}
          onRetry={() => refetchEnsemble(false)}
          errorMessage={
            ensembleError ||
            (locale === "hi"
              ? "NWP मल्टी-मॉडल एंडपॉइंट तक पहुंचने में असमर्थ। कृपया नेटवर्क कनेक्शन जांचें।"
              : "Unable to reach Multi-Model NWP forecast endpoint. Please check your network connection.")
          }
          emptyTitle={
            locale === "hi"
              ? "कोई NWP मॉडल डेटा उपलब्ध नहीं"
              : "No NWP Multi-Model Data Available"
          }
          emptyDescription={
            locale === "hi"
              ? "ECMWF, GFS और ICON मॉडल टेलीमेट्री वर्तमान में उपलब्ध नहीं है।"
              : "ECMWF, GFS, and ICON model telemetry is currently unavailable for this location."
          }
        >
          <NwpEnsembleDashboard
            ensemble={ensemble}
            tomorrowData={tomorrowData}
            isTomorrowLoading={isTomorrowLoading}
            isTomorrowRefreshing={isTomorrowRefreshing}
            tomorrowError={tomorrowError}
            onRefreshTomorrow={() => refetchTomorrow(true)}
            isStale={isEnsembleStale}
            cacheAgeMinutes={ensembleCacheAge}
            isLoading={isEnsembleLoading || isEnsembleRefreshing}
            onRefresh={() => refetchEnsemble(true)}
          />
        </StateContainer>
      )}

      {/* Tab: NASA GPM IMERG Satellite Rainfall View (LIVE-002) */}
      {activeTab === "satellite" && (
        <StateContainer
          state={satelliteViewState}
          onRetry={() => refetchSatellite(true)}
          errorMessage={
            locale === "hi"
              ? "नासा उपग्रह वर्षा डेटा लोड करने में त्रुटि। कृपया पुनः प्रयास करें।"
              : "Error retrieving NASA satellite rainfall telemetry. Please retry."
          }
          emptyTitle={
            locale === "hi"
              ? "कोई उपग्रह डेटा उपलब्ध नहीं"
              : "No Satellite Telemetry Available"
          }
          emptyDescription={
            locale === "hi"
              ? "नासा GPM एंडपॉइंट ने कोई डेटा वापस नहीं किया।"
              : "NASA GPM endpoint did not return telemetry."
          }
        >
          <div className="space-y-6">
            {/* data.gov.in Official Government Open Data Integration (LIVE-005) */}
            <GovernmentDataCard
              districtName={location.district || location.shortName || "Pune"}
              stateName={location.state}
              openMeteoForecastMm={ensemble?.comparison?.ensemble?.rainfall24h ?? forecast?.accumulations?.next24h}
            />

            {/* ISRO Bhuvan Disaster Services & Flood Inundation Link (LIVE-003 PART 5) */}
            <BhuvanLinkCard />

            {/* NASA GPM IMERG Orbital Observation (LIVE-002) */}
            <SatelliteRainfallCard
              data={satelliteData}
              isLoading={isSatelliteLoading}
              isRefreshing={isSatelliteRefreshing}
              isStale={isSatelliteStale}
              onRefresh={() => refetchSatellite(true)}
              nwpForecastMm={ensemble?.comparison?.ensemble?.rainfall24h ?? forecast?.accumulations?.next24h}
            />

            {/* NASA POWER GPM Ground Point Observation */}
            <NASAGPMCard
              latitude={location.latitude}
              longitude={location.longitude}
              districtName={location.district || "Pune"}
              openMeteoRainfall={ensemble?.comparison?.ensemble?.rainfall24h ?? forecast?.accumulations?.next24h}
            />

            {/* IMD Doppler Weather Radar Telemetry (VNET-DWR-REFLECTIVITY-003) */}
            <RadarDataCard
              districtName={location.district || location.shortName}
              latitude={location.latitude}
              longitude={location.longitude}
            />

            <ModelVsSatelliteComparisonCard
              nwpForecastMm={ensemble?.comparison?.ensemble?.rainfall24h ?? forecast?.accumulations?.next24h ?? 28.5}
              satelliteObservedMm={satelliteData?.total_rainfall_mm ?? 34.5}
              comparison={satelliteData?.comparison}
              isDemo={satelliteData?.status === "demo"}
            />

            {/* Government Data Resources Quick Links (LIVE-005 PART 4) */}
            <GovernmentDataResourcesCard />
          </div>
        </StateContainer>
      )}

      {/* Tab 1: Forecast & Projections View */}
      {activeTab === "forecast" && (
        <StateContainer
          state={viewState}
          onRetry={() => fetchWeatherData(false)}
          errorMessage={errorMessage || (locale === "hi" ? "ओपन-मेटियो मौसम टेलीमेट्री एंडपॉइंट तक पहुंचने में असमर्थ। कृपया नेटवर्क कनेक्शन जांचें।" : "Unable to reach Open-Meteo weather telemetry endpoint. Please check your network connection.")}
          emptyTitle={locale === "hi" ? "कोई मौसम डेटा उपलब्ध नहीं" : "No Weather Data Available"}
          emptyDescription={locale === "hi" ? "ओपन-मेटियो ने निर्दिष्ट भौगोलिक निर्देशांक हेतु टेलीमेट्री वापस नहीं की।" : "Open-Meteo did not return telemetry for the specified geographic coordinates."}
        >
          {forecast && (
            <div className="space-y-6">
              {/* Rainfall Accumulation Horizon Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">{tWeather("next3h") || "Next 3 Hours"}</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <DataBadge type="FORECAST" compact={true} />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {accumulations?.next3h ?? 0}{" "}
                    <span className="text-xs font-normal text-slate-500">mm</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">{locale === "hi" ? "अल्पकालिक त्वरित अपवाह" : "Short-term flash runoff"}</span>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">{tWeather("next6h") || "Next 6 Hours"}</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <DataBadge type="FORECAST" compact={true} />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {accumulations?.next6h ?? 0}{" "}
                    <span className="text-xs font-normal text-slate-500">mm</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">{locale === "hi" ? "नाली क्षमता शीर्ष भार" : "Storm drain capacity peak"}</span>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">{tWeather("next12h") || "Next 12 Hours"}</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <DataBadge type="FORECAST" compact={true} />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {accumulations?.next12h ?? 0}{" "}
                    <span className="text-xs font-normal text-slate-500">mm</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">{locale === "hi" ? "नदी जलग्रहण आवक" : "River catchment inflow"}</span>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                    <span className="font-bold">{tWeather("next24h") || "Next 24 Hours"}</span>
                    <div className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                      <DataBadge type="FORECAST" compact={true} />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-[#0F3D66] dark:text-blue-400">
                    {accumulations?.next24h ?? 0}{" "}
                    <span className="text-xs font-normal text-slate-500">mm</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                      {locale === "hi" ? "आईएमडी वर्गीकरण:" : "IMD Classification:"}
                    </span>
                    {currentImd && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentImd.badgeClass}`}>
                        {currentImd.category.split("(")[0].trim()}
                      </span>
                    )}
                  </div>
                </Card>
              </div>

              {/* IMD Official Threshold Reference Card */}
              <IMDThresholdCard rainfall24h={accumulations?.next24h ?? null} />

              {/* Extended Atmospheric Parameters Card (CAPE, Lifted Index, Visibility, etc.) */}
              {forecast.hourly.length > 0 && (
                <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Wind className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                      {locale === "hi"
                        ? "विस्तृत वायुमंडलीय पैरामीटर (वर्तमान घंटा)"
                        : "Extended Atmospheric Parameters (Current Hour)"}
                    </CardTitle>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {locale === "hi"
                        ? "संवहन अस्थिरता, दृश्यता एवं पवन झोंका सूचक — ओपन-मेटियो ECMWF मॉडल"
                        : "Convective instability, visibility & wind gust indicators — Open-Meteo ECMWF model"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {/* CAPE */}
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">CAPE</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {forecast.hourly[0].cape != null ? `${Math.round(forecast.hourly[0].cape)}` : "--"}
                          <span className="text-xs font-normal text-slate-500 ml-1">J/kg</span>
                        </div>
                        <div className={`text-[10px] font-semibold ${
                          (forecast.hourly[0].cape ?? 0) > 1500
                            ? "text-red-600 dark:text-red-400"
                            : (forecast.hourly[0].cape ?? 0) > 500
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {(forecast.hourly[0].cape ?? 0) > 1500
                            ? (locale === "hi" ? "अत्यधिक अस्थिर" : "Extremely Unstable")
                            : (forecast.hourly[0].cape ?? 0) > 500
                            ? (locale === "hi" ? "मध्यम अस्थिर" : "Moderately Unstable")
                            : (locale === "hi" ? "स्थिर" : "Stable")}
                        </div>
                      </div>

                      {/* Lifted Index */}
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === "hi" ? "लिफ्टेड इंडेक्स" : "Lifted Index"}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {forecast.hourly[0].liftedIndex != null ? forecast.hourly[0].liftedIndex.toFixed(1) : "--"}
                        </div>
                        <div className={`text-[10px] font-semibold ${
                          (forecast.hourly[0].liftedIndex ?? 0) < -6
                            ? "text-red-600 dark:text-red-400"
                            : (forecast.hourly[0].liftedIndex ?? 0) < -2
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {(forecast.hourly[0].liftedIndex ?? 0) < -6
                            ? (locale === "hi" ? "गंभीर संवहन" : "Severe Convection")
                            : (forecast.hourly[0].liftedIndex ?? 0) < -2
                            ? (locale === "hi" ? "तूफान संभव" : "Thunderstorm Risk")
                            : (locale === "hi" ? "स्थिर वायुमंडल" : "Stable Atmosphere")}
                        </div>
                      </div>

                      {/* Cloud Cover */}
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === "hi" ? "बादल आवरण" : "Cloud Cover"}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {forecast.hourly[0].cloudCover != null ? `${forecast.hourly[0].cloudCover}` : "--"}
                          <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {(forecast.hourly[0].cloudCover ?? 0) > 80
                            ? (locale === "hi" ? "पूर्णतः आच्छादित" : "Overcast")
                            : (forecast.hourly[0].cloudCover ?? 0) > 40
                            ? (locale === "hi" ? "आंशिक बादल" : "Partly Cloudy")
                            : (locale === "hi" ? "स्वच्छ आकाश" : "Clear Sky")}
                        </div>
                      </div>

                      {/* Visibility */}
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === "hi" ? "दृश्यता" : "Visibility"}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {forecast.hourly[0].visibility != null
                            ? `${(forecast.hourly[0].visibility / 1000).toFixed(1)}`
                            : "--"}
                          <span className="text-xs font-normal text-slate-500 ml-1">km</span>
                        </div>
                        <div className={`text-[10px] font-semibold ${
                          (forecast.hourly[0].visibility ?? 10000) < 1000
                            ? "text-red-600 dark:text-red-400"
                            : (forecast.hourly[0].visibility ?? 10000) < 4000
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {(forecast.hourly[0].visibility ?? 10000) < 1000
                            ? (locale === "hi" ? "कोहरा / खतरनाक" : "Fog / Hazardous")
                            : (forecast.hourly[0].visibility ?? 10000) < 4000
                            ? (locale === "hi" ? "कम दृश्यता" : "Reduced Visibility")
                            : (locale === "hi" ? "सामान्य" : "Good Visibility")}
                        </div>
                      </div>

                      {/* Wind Gusts */}
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === "hi" ? "हवा झोंका" : "Wind Gusts"}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {forecast.hourly[0].windGusts != null ? `${Math.round(forecast.hourly[0].windGusts)}` : "--"}
                          <span className="text-xs font-normal text-slate-500 ml-1">km/h</span>
                        </div>
                        <div className={`text-[10px] font-semibold ${
                          (forecast.hourly[0].windGusts ?? 0) > 60
                            ? "text-red-600 dark:text-red-400"
                            : (forecast.hourly[0].windGusts ?? 0) > 35
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {(forecast.hourly[0].windGusts ?? 0) > 60
                            ? (locale === "hi" ? "तूफानी झोंका" : "Storm Gusts")
                            : (forecast.hourly[0].windGusts ?? 0) > 35
                            ? (locale === "hi" ? "तेज़ झोंका" : "Strong Gusts")
                            : (locale === "hi" ? "सामान्य" : "Moderate")}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1">
                      <span className="font-mono font-bold">OPEN-METEO</span>
                      <span>·</span>
                      <span>ECMWF IFS Seamless</span>
                      <span>·</span>
                      <span>{locale === "hi" ? "वास्तविक समय अनुमान" : "Real-time estimate"}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Forecast Charts */}
              <WeatherCharts
                hourly={forecast.hourly}
                daily={forecast.daily}
                viewMode={viewMode}
              />

              {/* Granular Hourly Forecast Table (Deferred Priority 2 DOM rendering) */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Clock className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                      {locale === "hi"
                        ? `विस्तृत प्रति घंटा पूर्वानुमान फीड (${viewMode === "24h" ? "अगले 24 घंटे" : "अगले 48 घंटे"})`
                        : `Detailed Hourly Forecast Feed (${viewMode === "24h" ? "Next 24 Hours" : "Next 48 Hours"})`}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-normal">
                        {locale === "hi"
                          ? `${viewMode === "24h" ? 24 : 48} प्रति घंटा समय-चरण`
                          : `${viewMode === "24h" ? 24 : 48} timesteps`}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHourlyTable((prev) => !prev)}
                        className="h-7 text-xs flex items-center gap-1.5 border-slate-300 dark:border-slate-700"
                        aria-expanded={showHourlyTable}
                      >
                        {showHourlyTable ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            {locale === "hi" ? "तालिका छिपाएं" : "Collapse"}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            {locale === "hi" ? "तालिका देखें" : "View Table"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {locale === "hi"
                      ? "मौसम विज्ञान इंजन द्वारा रिकॉर्ड एवं अनुमानित सूक्ष्म प्रति घंटा वायुमंडलीय पैरामीटर।"
                      : "Granular hourly atmospheric parameters recorded and forecasted by the meteorological engine."}
                  </CardDescription>
                </CardHeader>
                {showHourlyTable ? (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                            <th className="py-2.5 px-3">{locale === "hi" ? "समय" : "Time"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "स्थिति" : "Condition"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "अनुमानित वर्षा" : "Rain Expected"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "संभावना" : "Probability"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "तापमान" : "Temperature"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "आर्द्रता" : "Humidity"}</th>
                            <th className="py-2.5 px-3">{locale === "hi" ? "हवा की गति" : "Wind Speed"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {(viewMode === "24h" ? forecast.hourly.slice(0, 24) : forecast.hourly.slice(0, 48)).map(
                            (row, idx) => {
                              const dateObj = new Date(row.time);
                              const timeStr = dateObj.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              });
                              const dayStr = dateObj.toLocaleDateString([], {
                                weekday: "short",
                                day: "numeric",
                              });

                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                                >
                                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    <span>{timeStr}</span>
                                    {viewMode === "7d" && (
                                      <span className="text-[10px] text-slate-400 font-normal block">
                                        {dayStr}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                                    {formatWeatherCondition(row.weatherCode, locale)}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F3D66] dark:text-blue-400">
                                    {row.precipitation > 0 ? `${row.precipitation} mm` : "0.0 mm"}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded font-medium ${
                                        row.precipitationProbability >= 70
                                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                          : row.precipitationProbability >= 40
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`}
                                    >
                                      {row.precipitationProbability}%
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                                    {Math.round(row.temperature)}°C
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    {row.relativeHumidity}%
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                    {row.windSpeed} km/h
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span>
                        {locale === "hi"
                          ? `${viewMode === "24h" ? 24 : 48} प्रति घंटा रिकॉर्ड उपलब्ध हैं। विस्तृत समय-वार विवरण देखने के लिए विस्तार करें।`
                          : `${viewMode === "24h" ? 24 : 48} hourly timesteps loaded. Expand to view row-by-row meteorological breakdown.`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHourlyTable(true)}
                        className="h-6 text-xs text-[#0F3D66] dark:text-blue-400 font-medium hover:underline p-0"
                      >
                        {locale === "hi" ? "विस्तार करें" : "Expand"}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Source Badge & Transparency Footer */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                <DataSourceBadge metadata={sourceMeta} />
                <div className="text-[11px] text-slate-500">
                  <span>{locale === "hi" ? "अंतिम सफल टेलीमेट्री मतदान: " : "Last successful telemetry poll: "}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lastFetchTime ? formatDateTime(lastFetchTime, locale) : (locale === "hi" ? "अभी-अभी" : "Just now")}
                  </span>
                </div>
              </div>

              {/* IMD Integration Status & Roadmap */}
              <ImdIntegrationStatusCard />
            </div>
          )}
        </StateContainer>
      )}

      {/* Tab 2: Antecedent Rainfall & History View */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Antecedent Soil Moisture & Runoff Evaluation Card */}
          <AntecedentRainfallCard
            antecedent={antecedent}
            isLoading={viewState === "loading"}
          />

          {/* Historical Precipitation Recharts Visualizations */}
          {antecedent && (
            <HistoricalRainfallChart
              hourly={antecedent.hourlyHistory}
              lookbackDays={3}
            />
          )}

          {/* Historical Hourly Observations Table (Deferred Priority 2 DOM rendering) */}
          {antecedent && antecedent.hourlyHistory.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {locale === "hi"
                        ? "अवलोकित ऐतिहासिक वर्षा लॉग (विगत 72 घंटे)"
                        : "Observed Historical Precipitation Log (Preceding 72 Hours)"}
                    </CardTitle>
                    <DataBadge type="HISTORICAL" compact={true} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-normal">
                      {locale === "hi"
                        ? `${antecedent.hourlyHistory.length} अवलोकन बिंदु`
                        : `${antecedent.hourlyHistory.length} observation points`}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHistoricalTable((prev) => !prev)}
                      className="h-7 text-xs flex items-center gap-1.5 border-slate-300 dark:border-slate-700"
                      aria-expanded={showHistoricalTable}
                    >
                      {showHistoricalTable ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          {locale === "hi" ? "तालिका छिपाएं" : "Collapse"}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          {locale === "hi" ? "तालिका देखें" : "View Table"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {locale === "hi"
                    ? "जलग्रहण संतृप्ति का आकलन करने के लिए बाढ़ आसूचना इंजन द्वारा उपयोग किए गए पुनर्निर्मित मौसम विज्ञान रिकॉर्ड।"
                    : "Reconstructed meteorological records utilized by the flood intelligence engine to assess catchment saturation."}
                </CardDescription>
              </CardHeader>
              {showHistoricalTable ? (
                <CardContent>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr className="text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">{locale === "hi" ? "अवलोकन समय" : "Observation Time"}</th>
                          <th className="py-2.5 px-3">{locale === "hi" ? "वर्षा (मिमी)" : "Precipitation (mm)"}</th>
                          <th className="py-2.5 px-3">{locale === "hi" ? "तरल वर्षा (मिमी)" : "Liquid Rain (mm)"}</th>
                          <th className="py-2.5 px-3">{locale === "hi" ? "तापमान" : "Temperature"}</th>
                          <th className="py-2.5 px-3">{locale === "hi" ? "आर्द्रता" : "Humidity"}</th>
                          <th className="py-2.5 px-3">{locale === "hi" ? "रिसाव स्थिति" : "Infiltration Status"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {[...antecedent.hourlyHistory].reverse().map((pt, idx) => {
                          const d = new Date(pt.time);
                          const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
                          const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                                {dateStr} {timeStr}
                              </td>
                              <td className="py-2 px-3 font-bold text-[#0F3D66] dark:text-blue-400 font-mono">
                                {pt.precipitation > 0 ? `${pt.precipitation} mm` : "0.0 mm"}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono">
                                {pt.rain > 0 ? `${pt.rain} mm` : "0.0 mm"}
                              </td>
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                {pt.temperature !== undefined ? `${Math.round(pt.temperature)}°C` : "--"}
                              </td>
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                {pt.relativeHumidity !== undefined ? `${pt.relativeHumidity}%` : "--"}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  pt.precipitation > 5
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                                    : pt.precipitation > 0
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400"
                                }`}>
                                  {pt.precipitation > 5
                                    ? (locale === "hi" ? "तीव्र अपवाह" : "Runoff Surge")
                                    : pt.precipitation > 0
                                    ? (locale === "hi" ? "मृदा आर्द्रण" : "Soil Wetting")
                                    : (locale === "hi" ? "सूखी भूमि" : "Dry Ground")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="py-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span>
                      {locale === "hi"
                        ? `${antecedent.hourlyHistory.length} अवलोकित घंटे रिकॉर्ड में उपलब्ध हैं। विस्तृत लॉग देखने के लिए विस्तार करें।`
                        : `${antecedent.hourlyHistory.length} observed hourly records loaded. Expand to view row-by-row meteorological log.`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistoricalTable(true)}
                      className="h-6 text-xs text-[#0F3D66] dark:text-blue-400 font-medium hover:underline p-0"
                    >
                      {locale === "hi" ? "विस्तार करें" : "Expand"}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* data.gov.in Historical Data Portal Card */}
          <DataGovInfoCard />

          {/* Provenance Footer */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
            <DataSourceBadge metadata={sourceMeta} />
            <div className="text-[11px] text-slate-500">
              <span>{locale === "hi" ? "ऐतिहासिक पुनर्विश्लेषण मॉडल: " : "Historical reanalysis model: "}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ECMWF ERA5 / IFS Seamless Reanalysis (0.05° resolution)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
