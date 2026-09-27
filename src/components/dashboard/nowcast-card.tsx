"use client";

/**
 * VarshaNetra - Dashboard Nowcast Card (VN-TASK-8.3 & Acceptance Criteria #2)
 * Switches dynamically between Tomorrow.io (1km) and Open-Meteo based on app_config & rate limit.
 * Transparently displays "Source: Tomorrow.io 1km" when active.
 */

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CloudLightning,
  CloudRain,
  Droplets,
  Wind,
  RefreshCw,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface NowcastPoint {
  time: string;
  temperature: number;
  precipitationIntensity: number;
  precipitationProbability: number;
  condition: string;
  windSpeed: number;
}

interface NowcastApiResponse {
  success: boolean;
  provider: {
    id: string;
    name: string;
    resolution_km: number;
    type: string;
  };
  source_name: string;
  source_label: string; // e.g. "Source: Tomorrow.io 1km"
  resolution: string; // e.g. "1km / 1-min"
  is_degraded: boolean;
  rate_limit_remaining: number;
  current?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitationIntensity: number;
    precipitationProbability: number;
    condition: string;
  };
  nowcast?: NowcastPoint[];
  fusion?: {
    source_contribution: Record<string, number>;
  };
}

interface NowcastCardProps {
  latitude: number;
  longitude: number;
  districtName?: string;
  className?: string;
}

export function NowcastCard({ latitude, longitude, districtName, className = "" }: NowcastCardProps) {
  const locale = useLocale();
  const [data, setData] = useState<NowcastApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNowcast = React.useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weather/nowcast?lat=${latitude}&lon=${longitude}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to retrieve nowcast.`);
      const json: NowcastApiResponse = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error("Unable to retrieve nowcast telemetry.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading nowcast");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchNowcast();
  }, [fetchNowcast]);

  // View State 1: Loading
  if (isLoading && !data) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // View State 2: Error
  if (error && !data) {
    return (
      <Card className={`border-red-200 bg-red-50/30 dark:bg-red-950/20 ${className}`}>
        <CardContent className="p-4 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
          <p className="text-xs text-red-800 dark:text-red-200 font-semibold">{error}</p>
          <Button size="sm" variant="outline" onClick={() => fetchNowcast(true)} className="text-xs cursor-pointer">
            <RefreshCw className="w-3 h-3 mr-1" />
            <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry"}</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isTomorrow = data.provider.id === "tomorrowio";
  const sourceLabel =
    data.source_label ||
    (isTomorrow
      ? locale === "hi"
        ? "स्रोत: Tomorrow.io 1km"
        : "Source: Tomorrow.io 1km"
      : locale === "hi"
        ? "स्रोत: Open-Meteo"
        : "Source: Open-Meteo");
  const current = data.current;
  const nextPoints = (data.nowcast || []).slice(0, 4);

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden ${className}`}>
      <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi" ? "अल्पकालिक वर्षा अनुमान (Nowcast)" : "Rapid Precipitation Nowcast"}
              </CardTitle>

              {/* Acceptance Criteria #2: Dynamic Source Badge */}
              <Badge
                className={`font-bold text-[10px] sm:text-[11px] px-2.5 py-0.5 shadow-2xs ${
                  isTomorrow
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {sourceLabel}
              </Badge>

              {data.is_degraded && (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 dark:text-amber-400">
                  {locale === "hi" ? "कोटा सीमित" : "Quota Degraded"}
                </Badge>
              )}
            </div>

            <CardDescription className="text-xs text-slate-500">
              {districtName ? `${districtName} • ` : ""}
              {locale === "hi" ? "रिज़ॉल्यूशन: " : "Resolution: "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{data.resolution}</span>
              {isTomorrow && data.rate_limit_remaining !== undefined && (
                <span>
                  {" "}• {data.rate_limit_remaining}{" "}
                  {locale === "hi" ? "कॉल्स शेष" : "calls remaining"}
                </span>
              )}
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900 self-end sm:self-auto cursor-pointer"
            onClick={() => fetchNowcast(true)}
            disabled={isRefreshing}
            title={locale === "hi" ? "नाउकास्ट टेलीमेट्री ताज़ा करें" : "Refresh Nowcast Telemetry"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Real-time telemetry summary */}
        {current && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "वर्षा दर" : "Rain Rate"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {current.precipitationIntensity.toFixed(1)} mm/h
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "वर्षा संभावना" : "Rain Prob"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(current.precipitationProbability)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "हवा" : "Wind"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(current.windSpeed)} km/h
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">
                  {locale === "hi" ? "स्थिति" : "Condition"}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                  {current.condition.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4-hour forward timeline projection */}
        {nextPoints.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
              {locale === "hi" ? "आगामी प्रति-घंटे का रुझान:" : "Hourly Near-Term Trajectory:"}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {nextPoints.map((pt, idx) => {
                const timeLabel = pt.time.includes("T") ? pt.time.split("T")[1].slice(0, 5) : pt.time;
                return (
                  <div
                    key={`nowcast-pt-${idx}`}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center space-y-0.5"
                  >
                    <span className="font-mono text-[10px] text-slate-500 block">{timeLabel}</span>
                    <span className="font-bold text-xs text-blue-600 dark:text-blue-400 block">
                      {pt.precipitationIntensity.toFixed(1)} mm/h
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {Math.round(pt.precipitationProbability)}% prob
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NowcastCard;
