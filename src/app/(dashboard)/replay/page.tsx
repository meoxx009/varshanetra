"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ShieldAlert,
  Clock,
  MapPin,
  Calendar,
  CloudRain,
  Activity,
  ArrowRight,
  TrendingUp,
  Sliders,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { SeverityBadge } from "@/components/common/severity-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { DetailsAccordion } from "@/components/common/details-accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HistoricalReplaySession,
  ReplayTimestep,
  ReplayPlaybackSpeed,
} from "@/types/replay";
import {
  HISTORICAL_EVENT_PRESETS,
  createReplayMetadata,
} from "@/lib/services/replay-presets";
import {
  FacilitiesGroupedResponse,
  ActiveMapLayerId,
  MapFeatureItem,
} from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

import { useLocale, useTranslations } from "@/lib/i18n/context";

// Client-only Leaflet GIS Map
const GisMap = dynamic(() => import("@/components/map/gis-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#0F3D66] dark:border-t-blue-400 animate-spin" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Loading Historical GIS Replay Layer...
      </span>
    </div>
  ),
});

const MAP_LAYERS: Record<ActiveMapLayerId, boolean> = {
  basemap: true,
  floodRisk: true,
  hospitals: true,
  clinics: false,
  police: true,
  fire: true,
  schools: false,
  rivers: true,
  riverGauges: false,
  fieldReports: false,
  incidents: true,
  responseTeams: false,
  shelters: true,
  floodSusceptibility: false,
  nasaGpmRainfall: false,
  radar: false,
  copernicusWms: false,
  earthquakes: false,
  firmsFire: false,
};

export default function HistoricalReplayPage() {
  const locale = useLocale();
  const tReplay = useTranslations("historicalReplay");

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Presets & Active Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>("pune-2024");
  const [session, setSession] = useState<HistoricalReplaySession | null>(null);

  // Custom event inputs dialog
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [customForm, setCustomForm] = useState({
    latitude: 18.5204,
    longitude: 73.8567,
    startDate: "2024-07-24",
    endDate: "2024-07-26",
    districtName: "Pune District",
  });

  // Playback state
  const [currentHourIndex, setCurrentHourIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<ReplayPlaybackSpeed>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Playback timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Replay Session
  const fetchSession = useCallback(
    async (presetId?: string, customParams?: typeof customForm) => {
      setViewState("loading");
      setErrorMessage("");
      setIsPlaying(false);

      try {
        let url = "/api/replay/event";
        if (presetId) {
          url += `?preset=${presetId}`;
        } else if (customParams) {
          url += `?lat=${customParams.latitude}&lon=${customParams.longitude}&startDate=${customParams.startDate}&endDate=${customParams.endDate}&district=${encodeURIComponent(
            customParams.districtName
          )}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to retrieve historical replay data.");
        }

        setSession(json.data);
        setCurrentHourIndex(0);
        setViewState("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error connecting to historical archive";
        setErrorMessage(msg);
        setViewState("error");
      }
    },
    []
  );

  useEffect(() => {
    fetchSession(selectedPresetId);
  }, [selectedPresetId, fetchSession]);

  // Handle Timeline Playback Timer
  useEffect(() => {
    if (!isPlaying || !session || session.timesteps.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = speed === 1 ? 1000 : speed === 2 ? 500 : 200;

    timerRef.current = setInterval(() => {
      setCurrentHourIndex((prev) => {
        if (prev >= session.timesteps.length - 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, speed, session, isLooping]);

  // Current active timestep
  const currentStep: ReplayTimestep | null = useMemo(() => {
    if (!session || session.timesteps.length === 0) return null;
    const clampedIndex = Math.min(
      Math.max(0, currentHourIndex),
      session.timesteps.length - 1
    );
    return session.timesteps[clampedIndex] || null;
  }, [session, currentHourIndex]);

  // GIS Map Facilities data for historical point
  const mapFacilitiesData: FacilitiesGroupedResponse = useMemo(() => {
    if (!session || !currentStep) {
      return {
        hospitals: [],
        clinics: [],
        police: [],
        fire: [],
        schools: [],
        rivers: [],
        fieldReports: [],
        incidents: [],
        totalCount: 0,
        metadata: createReplayMetadata(),
      };
    }

    const incidentMarker: MapFeatureItem = {
      id: `replay-epicenter-${session.eventId}`,
      name: `[HISTORICAL REPLAY] ${session.title}`,
      category: "INCIDENT",
      latitude: session.latitude,
      longitude: session.longitude,
      address: `${session.districtName} (Historical Pilot Coordinate)`,
      status: currentStep.riskCalculation.riskLevel === "SEVERE" ? "CRITICAL" : "ACTIVE",
      severity:
        currentStep.riskCalculation.riskLevel === "SEVERE"
          ? "CRITICAL"
          : currentStep.riskCalculation.riskLevel === "HIGH"
          ? "ALERT"
          : currentStep.riskCalculation.riskLevel === "MODERATE"
          ? "ADVISORY"
          : "NORMAL",
      details: `Simulated Time: ${currentStep.formattedTime} • Risk Score: ${currentStep.riskCalculation.riskScore.toFixed(
        1
      )}/100 • Hourly Precip: ${currentStep.hourlyPrecipitationMm} mm/h • Cumulative: ${currentStep.cumulativeRainfallMm} mm`,
      reportedAt: currentStep.timeIso,
      operator: "Historical Simulation Controller",
      metadata: createReplayMetadata(),
    };

    return {
      hospitals: [],
      clinics: [],
      police: [],
      fire: [],
      schools: [],
      rivers: [],
      fieldReports: [],
      incidents: [incidentMarker],
      totalCount: 1,
      metadata: createReplayMetadata(),
    };
  }, [session, currentStep]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!session) return [];
    return session.timesteps.map((ts) => ({
      hourIndex: ts.hourIndex,
      label: ts.relativeHourLabel,
      time: ts.formattedTime,
      hourlyMm: ts.hourlyPrecipitationMm,
      cumulativeMm: ts.cumulativeRainfallMm,
      riskScore: ts.riskCalculation.riskScore,
    }));
  }, [session]);

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* COMPACT HISTORICAL REPLAY BANNER (Directive #14, #15, #18)     */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/80 bg-amber-50/90 dark:bg-amber-950/30 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs shrink-0">
              <HistoryIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-black text-[11px] tracking-wider uppercase">
                  {locale === "hi" ? "ऐतिहासिक पुनरावलोकन मोड" : "HISTORICAL REPLAY MODE"}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-[10px] tracking-wide">
                  {locale === "hi" ? "प्रदर्शन एवं मॉडल बेंचमार्क" : "DEMONSTRATION & BENCHMARK"}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 mt-0.5">
                {locale === "hi"
                  ? `सक्रिय रीप्ले: ${session?.title || "ऐतिहासिक आपदा लोड हो रहा है..."}`
                  : `Active Replay: ${session?.title || "Loading Historical Disaster Dataset..."}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            {currentStep && (
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 shadow-xs text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  {locale === "hi" ? "अनुकरण समय" : "Simulated Timeline"}
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-[#0F3D66] dark:text-blue-400">
                  {currentStep.formattedTime} ({currentStep.relativeHourLabel})
                </span>
              </div>
            )}

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 gap-1.5 shadow-xs"
              >
                <span>{locale === "hi" ? "रीप्ले छोड़ें" : "Exit Replay"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        title={tReplay("title", "Historical Event Replay & Model Evaluation Console")}
        description={tReplay(
          "subtitle",
          "Scrub through historical flood disasters, test multi-factor rainfall risk equations on ECMWF/ERA5 reanalysis, and validate model outputs against real-world observations."
        )}
        breadcrumbs={[
          { label: locale === "hi" ? "आसूचना" : "Intelligence", href: "/dashboard" },
          { label: tReplay("title", "Historical Event Replay") },
        ]}
        compactSource={true}
        sourceMeta={session?.metadata || createReplayMetadata()}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              className="text-xs font-semibold gap-1.5 h-9 px-3"
            >
              <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>
                {isCustomOpen
                  ? (locale === "hi" ? "कस्टम विंडो बंद करें" : "Close Custom")
                  : (locale === "hi" ? "कस्टम तिथि व निर्देशांक" : "Custom Range")}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSession(selectedPresetId)}
              disabled={viewState === "loading"}
              className="text-xs font-semibold gap-1.5 h-9 px-3"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${viewState === "loading" ? "animate-spin" : ""}`} />
              <span>{locale === "hi" ? "पुनः लोड करें" : "Reload"}</span>
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* STREAMLINED PRESET EVENT SELECTOR TABS                        */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
            {tReplay("selectEvent", "Select Verified Historical Disaster Event")}:
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            {HISTORICAL_EVENT_PRESETS.length} {locale === "hi" ? "सत्यापित परिदृश्य" : "verified disaster scenarios"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {HISTORICAL_EVENT_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id && !isCustomOpen;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setIsCustomOpen(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 cursor-pointer min-h-[78px] flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-md ring-2 ring-blue-500/40"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span
                    className={`font-black text-xs ${
                      isSelected ? "text-white" : "text-[#0F3D66] dark:text-blue-400"
                    }`}
                  >
                    {preset.districtName}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {preset.startDate}
                  </span>
                </div>
                <p
                  className={`text-xs font-semibold leading-tight line-clamp-1 ${
                    isSelected ? "text-slate-100" : "text-slate-900 dark:text-slate-100"
                  }`}
                  title={preset.title}
                >
                  {preset.title}
                </p>
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <span className={isSelected ? "text-blue-200" : "text-slate-500"}>
                    {preset.peakRainfallMm} mm {locale === "hi" ? "चरम" : "peak"}
                  </span>
                  <span className={`font-bold uppercase ${isSelected ? "text-amber-300" : "text-amber-700 dark:text-amber-400"}`}>
                    {preset.benchmark?.evaluationAlignment || (locale === "hi" ? "ऐतिहासिक परिदृश्य" : "Historical Event")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM DATE / LOCATION DRAWER                                 */}
      {/* ------------------------------------------------------------- */}
      {isCustomOpen && (
        <Card className="border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <CardHeader className="pb-3 border-b border-blue-200 dark:border-blue-900">
            <CardTitle className="text-sm font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563EB]" />
              <span>Define Custom Historical Date Window & Coordinates</span>
            </CardTitle>
            <CardDescription className="text-xs text-blue-800 dark:text-blue-300">
              Fetch historical archive records for any Indian district between 1940 and yesterday via Open-Meteo Archive API.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSelectedPresetId("");
                fetchSession(undefined, customForm);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs items-end"
            >
              <div>
                <label className="font-semibold block mb-1">Start Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={customForm.startDate}
                  onChange={(e) => setCustomForm({ ...customForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">End Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={customForm.endDate}
                  onChange={(e) => setCustomForm({ ...customForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Latitude (° N)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={customForm.latitude}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, latitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Longitude (° E)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={customForm.longitude}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, longitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold min-h-[40px] text-xs shadow-xs"
                >
                  Load Custom Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4 MANDATORY VIEW STATES                                        */}
      {/* ------------------------------------------------------------- */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchSession(selectedPresetId, isCustomOpen ? customForm : undefined)}
        errorMessage={errorMessage || "Failed to load historical weather archive telemetry."}
        emptyTitle="No Replay Data"
        emptyDescription="Please select a historical event preset or specify a date range to begin playback."
      >
        {session && currentStep && (
          <div className="space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* INTERACTIVE TIMELINE CONTROLLER                               */}
            {/* ------------------------------------------------------------- */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2563EB]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Timeline Playback Head:</span>
                        <span className="font-mono text-[#0F3D66] dark:text-blue-400">
                          {currentStep.relativeHourLabel} ({currentStep.formattedTime})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Hour {currentStep.hourIndex + 1} of {session.totalDurationHours} total event hours.
                      </p>
                    </div>
                  </div>

                    {/* Playback Controls Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentHourIndex(0)}
                      disabled={currentHourIndex === 0}
                      className="min-h-[40px] px-3 text-xs gap-1"
                      title="Reset to Hour 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{locale === "hi" ? "रीसेट" : "Reset"}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentHourIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentHourIndex === 0}
                      className="min-h-[40px] px-3 text-xs gap-1"
                      title="Step -1 Hour"
                    >
                      <SkipBack className="w-4 h-4" />
                      <span className="hidden sm:inline">-1h</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="min-h-[40px] px-5 bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-2 shadow-xs"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>
                        {isPlaying
                          ? (locale === "hi" ? "रोकें" : "Pause Playback")
                          : (locale === "hi" ? "चलाएं" : "Play Timeline")}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentHourIndex((prev) =>
                          Math.min(session.timesteps.length - 1, prev + 1)
                        )
                      }
                      disabled={currentHourIndex >= session.timesteps.length - 1}
                      className="min-h-[40px] px-3 text-xs gap-1"
                      title="Step +1 Hour"
                    >
                      <span className="hidden sm:inline">+1h</span>
                      <SkipForward className="w-4 h-4" />
                    </Button>

                    {/* Speed Selector */}
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-bold">
                      {([1, 2, 5] as ReplayPlaybackSpeed[]).map((sp) => (
                        <button
                          key={sp}
                          onClick={() => setSpeed(sp)}
                          className={`px-2.5 py-1.5 rounded-md transition min-h-[36px] ${
                            speed === sp
                              ? "bg-white dark:bg-slate-900 text-[#0F3D66] dark:text-blue-400 shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>

                    {/* Loop Toggle */}
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-bold transition min-h-[40px] flex items-center gap-1 ${
                        isLooping
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-700 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700"
                      }`}
                      title="Loop playback at end"
                    >
                      <span>{locale === "hi" ? "लूप" : "Loop"}</span>
                    </button>
                  </div>
                </div>

                {/* Timeline Scrubber Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>{session.startDate} 00:00 ({locale === "hi" ? "प्रारंभ" : "Start"})</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {locale === "hi" ? "स्क्रबिंग: घंटा" : "Scrubbing: Hour"} {currentStep.hourIndex} / {session.totalDurationHours - 1}
                    </span>
                    <span>{session.endDate} 23:00 ({locale === "hi" ? "समाप्त" : "End"})</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={session.timesteps.length - 1}
                    value={currentHourIndex}
                    onChange={(e) => setCurrentHourIndex(parseInt(e.target.value, 10))}
                    className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0F3D66] dark:accent-blue-500"
                    aria-label="Timeline scrubber slider"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* SYNCHRONIZED METRICS STRIP                                     */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title={locale === "hi" ? "तात्कालिक वर्षा दर" : "Instant Rainfall Rate"}
                value={currentStep.hourlyPrecipitationMm.toString()}
                unit="mm/h"
                subtext={
                  locale === "hi"
                    ? `कुल संचयी: ${currentStep.cumulativeRainfallMm} मिमी`
                    : `Cumulative: ${currentStep.cumulativeRainfallMm} mm`
                }
                icon={CloudRain}
                severity={
                  currentStep.hourlyPrecipitationMm >= 35
                    ? "CRITICAL"
                    : currentStep.hourlyPrecipitationMm >= 15
                    ? "ALERT"
                    : currentStep.hourlyPrecipitationMm >= 5
                    ? "ADVISORY"
                    : "NORMAL"
                }
                sourceLabel="ECMWF ERA5 Archive"
              />

              <MetricCard
                title={locale === "hi" ? "पूर्ववर्ती जलग्रहण वर्षा" : "Antecedent Catchment Rain"}
                value={currentStep.antecedent48hMm.toString()}
                unit="mm (48h)"
                subtext={
                  locale === "hi"
                    ? `पूर्ववर्ती 24h: ${currentStep.antecedent24hMm} मिमी`
                    : `Prior 24h: ${currentStep.antecedent24hMm} mm`
                }
                icon={Activity}
                severity={
                  currentStep.antecedent48hMm >= 75
                    ? "CRITICAL"
                    : currentStep.antecedent48hMm >= 35
                    ? "ALERT"
                    : currentStep.antecedent48hMm >= 15
                    ? "ADVISORY"
                    : "NORMAL"
                }
                sourceLabel="Catchment Ingress"
              />

              <MetricCard
                title={locale === "hi" ? "मृदा नमी की स्थिति" : "Soil Moisture Condition"}
                value={currentStep.soilMoistureCategory.replace(/_/g, " ")}
                unit=""
                subtext={
                  locale === "hi"
                    ? `अपवाह कारक: ${currentStep.runoffRiskMultiplier}x`
                    : `Runoff Factor: ${currentStep.runoffRiskMultiplier}x`
                }
                icon={TrendingUp}
                severity={
                  currentStep.soilMoistureCategory === "CRITICAL_SATURATION"
                    ? "CRITICAL"
                    : currentStep.soilMoistureCategory === "SATURATED"
                    ? "ALERT"
                    : currentStep.soilMoistureCategory === "MODERATE"
                    ? "ADVISORY"
                    : "NORMAL"
                }
                sourceLabel="SCS-CN Watershed AMC"
              />

              <MetricCard
                title={locale === "hi" ? "प्रायोगिक जोखिम सूचकांक" : "Experimental Risk Index"}
                value={currentStep.riskCalculation.riskScore.toFixed(1)}
                unit="/100"
                subtext={
                  locale === "hi"
                    ? `स्तर: ${currentStep.riskCalculation.riskLevel}`
                    : `Level: ${currentStep.riskCalculation.riskLevel}`
                }
                icon={ShieldAlert}
                severity={
                  currentStep.riskCalculation.riskLevel === "SEVERE"
                    ? "CRITICAL"
                    : currentStep.riskCalculation.riskLevel === "HIGH"
                    ? "ALERT"
                    : currentStep.riskCalculation.riskLevel === "MODERATE"
                    ? "ADVISORY"
                    : "NORMAL"
                }
                sourceLabel="Flood Risk Engine V1"
              />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CHARTS: HYETOGRAPH & DETERMINISTIC RISK PROGRESSION           */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Hyetograph & Risk Score Chart */}
              <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                        <span>
                          {locale === "hi"
                            ? "वर्षा हाइटोमीटर एवं जोखिम सूचकांक विकास"
                            : "Precipitation Hyetograph & Risk Score Evolution"}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {locale === "hi"
                          ? "प्रति घंटा वर्षा मात्रा (बार, बायाँ अक्ष) और गतिशील बाढ़ जोखिम स्कोर (रेखा, दायाँ अक्ष)।"
                          : "Hourly rain volume (bars, left axis) overlaid with dynamic Flood Risk Engine score (line, right axis)."}
                      </CardDescription>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                      {locale === "hi" ? "कर्सर:" : "CURSOR:"} {currentStep.relativeHourLabel}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          interval={Math.floor(chartData.length / 8)}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10 }}
                          label={{
                            value: locale === "hi" ? "वर्षा (मिमी/घंटा)" : "Rain (mm/h)",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 10,
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          tick={{ fontSize: 10 }}
                          label={{
                            value: locale === "hi" ? "जोखिम (0-100)" : "Risk (0-100)",
                            angle: 90,
                            position: "insideRight",
                            fontSize: 10,
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                                  <p className="font-bold">{d.time} ({d.label})</p>
                                  <p className="text-blue-300">
                                    {locale === "hi" ? "वर्षा:" : "Rain:"} {d.hourlyMm} mm/h
                                  </p>
                                  <p className="text-emerald-300">
                                    {locale === "hi" ? "संचयी:" : "Cumulative:"} {d.cumulativeMm} mm
                                  </p>
                                  <p className="text-amber-300">
                                    {locale === "hi" ? "जोखिम स्कोर:" : "Risk Score:"} {d.riskScore.toFixed(1)}/100
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          yAxisId="left"
                          x={currentStep.relativeHourLabel}
                          stroke="#DC2626"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          label={{
                            value: locale === "hi" ? "सक्रिय समय" : "Active Head",
                            fill: "#DC2626",
                            fontSize: 10,
                            position: "top",
                          }}
                        />
                        <Bar yAxisId="left" dataKey="hourlyMm" fill="#2563EB" opacity={0.8} radius={[2, 2, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="riskScore" stroke="#EA580C" strokeWidth={2} dot={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Right 1 Col: GIS Map Inspection */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
                <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>{locale === "hi" ? "स्थानिक संदर्भ" : "Spatial Pilot Context"}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "hi"
                      ? `${session.districtName} पर केंद्रित ऐतिहासिक निर्देशांक।`
                      : `Historical coordinates centered on ${session.districtName}.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 flex-1 flex flex-col">
                  <GisMap
                    location={{
                      displayName: session.title,
                      shortName: session.districtName,
                      latitude: session.latitude,
                      longitude: session.longitude,
                      type: "historical_pilot",
                      state: "",
                      district: session.districtName,
                    }}
                    facilities={mapFacilitiesData}
                    activeLayers={MAP_LAYERS}
                    inspectorData={null}
                    onInspectLocation={() => {}}
                    isFullscreen={false}
                    onToggleFullscreen={() => {}}
                    className="h-64 w-full rounded-lg"
                  />
                  <div className="mt-2.5 p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>{locale === "hi" ? "निर्देशांक:" : "Coordinates:"}</strong> {session.latitude.toFixed(4)}° N, {session.longitude.toFixed(4)}° E
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* MODEL EVALUATION BENCHMARK vs FIELD GROUND TRUTH              */}
            {/* ------------------------------------------------------------- */}
            <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
              <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        {locale === "hi"
                          ? "मॉडल मूल्यांकन बेंचमार्क: एल्गोरिथम बनाम ज़मीनी वास्तविकता"
                          : "Model Evaluation Benchmark: Algorithm vs Ground Truth Observations"}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-indigo-800 dark:text-indigo-300">
                      {locale === "hi"
                        ? "राजस्व विभाग के आधिकारिक बाढ़ रिकॉर्ड के विरुद्ध मॉडल सत्यापन।"
                        : "Empirical validation against official revenue flood records without synthetic fabrication."}
                    </CardDescription>
                  </div>
                  {session.benchmark && (
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                        session.benchmark.evaluationAlignment === "MATCH"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {locale === "hi" ? "संरेखण:" : "ALIGNMENT:"} {session.benchmark.evaluationAlignment}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {session.benchmark ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Left: Model Algorithm Prediction */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[11px]">
                            {locale === "hi" ? "मॉडल पूर्वानुमान" : "Model Algorithmic Prediction"}
                          </span>
                          <SeverityBadge
                            severity={
                              currentStep.riskCalculation.riskLevel === "SEVERE"
                                ? "CRITICAL"
                                : currentStep.riskCalculation.riskLevel === "HIGH"
                                ? "ALERT"
                                : currentStep.riskCalculation.riskLevel === "MODERATE"
                                ? "ADVISORY"
                                : "NORMAL"
                            }
                            size="sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="text-[10px] text-slate-500 block">{locale === "hi" ? "चरम जोखिम स्कोर" : "Peak Risk Score"}</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{session.peakRiskScore}/100</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">{locale === "hi" ? "सक्रिय चरण स्कोर" : "Active Step Score"}</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{currentStep.riskCalculation.riskScore.toFixed(1)}/100</span>
                          </div>
                        </div>
                        <p className="text-slate-500 italic text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                          {currentStep.riskCalculation.summaryReasons?.[0] || currentStep.riskCalculation.technicalExplanation || (locale === "hi" ? "मॉडल गणना पूर्ण" : "Model calculation verified")}
                        </p>
                      </div>

                      {/* Right: Certified Historical Ground Truth Benchmark */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[11px]">
                            {locale === "hi" ? "ज़मीनी अवलोकन बेंचमार्क" : "Ground Observation Benchmark"}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {locale === "hi" ? "सत्यापित रिकॉर्ड" : "VERIFIED RECORD"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="text-[10px] text-slate-500 block">{locale === "hi" ? "चरम दिनांक" : "Peak Date"}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{session.benchmark.eventDate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">{locale === "hi" ? "प्रभावित नागरिक" : "Affected Civilians"}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{session.benchmark.observedCiviliansAffected || 0}</span>
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800 line-clamp-2">
                          {session.benchmark.observedIncidentsSummary}
                        </p>
                      </div>
                    </div>

                    {/* Expandable Empirical Rationale Drawer */}
                    <DetailsAccordion
                      title={locale === "hi" ? "अनुभवजन्य मूल्यांकन औचित्य एवं स्रोत विवरण" : "Empirical Evaluation Rationale & Ground Truth Source"}
                      badge={session.benchmark.verificationSource}
                    >
                      <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        <p className="leading-relaxed">
                          <strong>{locale === "hi" ? "विश्लेषण सारांश:" : "Analysis Notes:"}</strong> {session.benchmark.analysisNotes}
                        </p>
                        {session.benchmark.observedRoadStatus && (
                          <p>
                            <strong>{locale === "hi" ? "सड़क प्रभाव स्थिति:" : "Road Status:"}</strong> {session.benchmark.observedRoadStatus.replace(/_/g, " ")}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          <strong>{locale === "hi" ? "आधिकारिक स्रोत:" : "Official Source:"}</strong> {session.benchmark.verificationSource}
                        </p>
                      </div>
                    </DetailsAccordion>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border text-center text-xs text-slate-500">
                    {locale === "hi"
                      ? "इस कस्टम निर्देशांक क्वेरी से कोई ऐतिहासिक ज़मीनी सत्यता बेंचमार्क संलग्न नहीं है।"
                      : "No historical ground truth benchmark dataset attached to this custom coordinate query."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* RISK ENGINE FACTOR BREAKDOWN ACCORDION                        */}
            {/* ------------------------------------------------------------- */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                  <span>
                    {locale === "hi"
                      ? `जोखिम इंजन कारक विवरण (सक्रिय घंटा: ${currentStep.relativeHourLabel})`
                      : `Deterministic Risk Engine Factor Breakdown (Active Hour: ${currentStep.relativeHourLabel})`}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {locale === "hi"
                    ? "सक्रिय समयरेखा चरण के लिए बहु-कारक बाढ़ जोखिम एल्गोरिथ्म द्वारा परिकलित सटीक योगदान।"
                    : "Exact mathematical contributions computed by the multi-factor flood risk algorithm for the active timeline step."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {currentStep.riskCalculation.contributingFactors.map((f) => (
                    <div
                      key={f.key}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {f.label}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">
                          {(f.weight * 100).toFixed(0)}% {locale === "hi" ? "भार" : "Wt"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-[#0F3D66] dark:text-blue-400">
                          {typeof f.rawValue === "number" ? f.rawValue.toFixed(1) : f.rawValue}
                        </span>
                        <span className="text-[10px] text-slate-500">{f.unit}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                        {f.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </StateContainer>
    </div>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
