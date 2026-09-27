"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Satellite,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface NASAGPMCardProps {
  latitude: number;
  longitude: number;
  districtName: string;
  openMeteoRainfall?: number; // Optional comparison prop
}

interface GPMDataResponse {
  status: "LIVE" | "CACHED" | "NOT_CONFIGURED" | "ERROR" | "CACHED_FALLBACK";
  demo_mode?: boolean;
  today_rainfall_mm: number | null;
  yesterday_rainfall_mm: number | null;
  two_day_total_mm: number | null;
  latency_note?: string;
  attribution?: string;
  sample_data?: {
    note?: string;
    rainfall_mm?: number;
    today_rainfall_mm?: number;
    yesterday_rainfall_mm?: number;
    two_day_total_mm?: number;
    max_intensity_mmhr?: number;
    data_quality?: string;
    source?: string;
  };
}

export const NASAGPMCard: React.FC<NASAGPMCardProps> = ({
  latitude,
  longitude,
  districtName,
  openMeteoRainfall,
}) => {
  const locale = useLocale();
  const [data, setData] = useState<GPMDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/rainfall/nasa-gpm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, districtName }),
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Failed to load NASA GPM data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [latitude, longitude, districtName]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 3 * 60 * 60 * 1000); // Refetch every 3 hrs
    return () => clearInterval(interval);
  }, [fetchData]);

  // Metric color coding based on IMD threshold
  const getMetricColor = (val: number | null) => {
    if (val === null) return "text-muted-foreground";
    if (val > 115.6) return "text-red-600 dark:text-red-400 font-bold";
    if (val > 64.5) return "text-orange-500 font-semibold";
    if (val > 15.6) return "text-yellow-600 dark:text-yellow-400 font-medium";
    return "text-green-600 dark:text-green-400";
  };

  const getIMDCategory = (val: number | null) => {
    if (val === null) return { hi: "अनुपलब्ध", en: "No Data", color: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300" };
    if (val > 204.4) return { hi: "अत्यंत भारी वर्षा", en: "Extremely Heavy", color: "bg-red-900 text-white" };
    if (val > 115.6) return { hi: "बहुत भारी वर्षा", en: "Very Heavy", color: "bg-red-500 text-white" };
    if (val > 64.5) return { hi: "भारी वर्षा", en: "Heavy Rain", color: "bg-orange-500 text-white" };
    if (val > 15.6) return { hi: "मध्यम वर्षा", en: "Moderate Rain", color: "bg-yellow-500 text-black" };
    if (val > 2.5) return { hi: "हल्की वर्षा", en: "Light Rain", color: "bg-green-500 text-white" };
    return { hi: "शुष्क / बहुत हल्की वर्षा", en: "Very Light Rain", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
  };

  // Compare Open-Meteo with Satellite GPM
  const renderComparison = (gpmVal: number | null) => {
    if (openMeteoRainfall === undefined || gpmVal === null) return null;

    const diff = Math.abs(openMeteoRainfall - gpmVal);
    const maxVal = Math.max(openMeteoRainfall, gpmVal, 1);
    const percentageDiff = (diff / maxVal) * 100;

    if (percentageDiff < 20) {
      return (
        <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>
            {locale === "hi"
              ? `NWP मॉडल (${openMeteoRainfall}mm) बनाम उपग्रह अवलोकन (${gpmVal}mm): `
              : `NWP Model (${openMeteoRainfall}mm) vs Satellite Observation (${gpmVal}mm): `}
            <strong>{locale === "hi" ? "✅ उच्च सहमति" : "✅ High Agreement"}</strong>
          </span>
        </div>
      );
    } else if (percentageDiff <= 40) {
      return (
        <div className="flex items-center gap-2 text-xs bg-yellow-50 dark:bg-yellow-950 p-2 rounded border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300">
          <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
          <span>
            {locale === "hi"
              ? `NWP मॉडल (${openMeteoRainfall}mm) बनाम उपग्रह अवलोकन (${gpmVal}mm): `
              : `NWP Model (${openMeteoRainfall}mm) vs Satellite Observation (${gpmVal}mm): `}
            <strong>{locale === "hi" ? "⚠️ मध्यम अंतर" : "⚠️ Moderate Difference"}</strong>
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            {locale === "hi"
              ? `NWP मॉडल (${openMeteoRainfall}mm) बनाम उपग्रह अवलोकन (${gpmVal}mm): `
              : `NWP Model (${openMeteoRainfall}mm) vs Satellite Observation (${gpmVal}mm): `}
            <strong>{locale === "hi" ? "❌ महत्वपूर्ण अंतर - उपग्रह डेटा को प्राथमिकता दें" : "❌ Significant Difference - Prioritize Satellite Data"}</strong>
          </span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-12" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isDemo = data?.demo_mode || data?.status === "NOT_CONFIGURED";
  const todayVal: number | null = isDemo
    ? (data?.sample_data?.rainfall_mm ?? 45.2)
    : (data?.today_rainfall_mm ?? null);
  const yesterdayVal: number | null = isDemo ? 12.8 : (data?.yesterday_rainfall_mm ?? null);
  const twoDayTotal: number | null = isDemo ? 58.0 : (data?.two_day_total_mm ?? null);

  return (
    <Card className="w-full relative overflow-hidden border-2 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Satellite className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {locale === "hi" ? "🛰️ NASA GPM उपग्रह वर्षा" : "🛰️ NASA GPM Satellite Rainfall"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              NASA Global Precipitation Measurement Mission • {districtName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title={locale === "hi" ? "डेटा रीफ्रेश करें" : "Refresh telemetry"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {data?.status === "LIVE" && <Badge className="bg-emerald-600 text-white">NASA GPM LIVE</Badge>}
            {data?.status === "CACHED" && <Badge className="bg-yellow-500 text-black">NASA GPM CACHED</Badge>}
            {isDemo && <Badge variant="destructive">DEMO MODE</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* DEMO MODE BANNER */}
        {isDemo && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {locale === "hi"
                    ? "यह डेमो मोड है। NASA Earthdata token .env.local में कॉन्फ़िगर करें।"
                    : "This is demo mode. Configure NASA Earthdata token in .env.local."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 border-blue-300 dark:border-blue-700"
              onClick={() => window.open("https://urs.earthdata.nasa.gov", "_blank")}
            >
              {locale === "hi" ? "Earthdata Token बनाएँ" : "Create Earthdata Token"} <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* METRICS GRID */}
        <div className="relative">
          {isDemo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-6xl font-black text-gray-400/10 tracking-widest uppercase">
                DEMO DATA
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <p className="text-xs text-muted-foreground font-medium">
                {locale === "hi" ? "आज की वर्षा" : "Today Rainfall"}
              </p>
              <p className={`text-2xl font-bold mt-1 ${getMetricColor(todayVal)}`}>
                {todayVal !== null ? `${todayVal} mm` : locale === "hi" ? "अनुपलब्ध" : "Unavailable"}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <p className="text-xs text-muted-foreground font-medium">
                {locale === "hi" ? "कल की वर्षा" : "Yesterday Rainfall"}
              </p>
              <p className={`text-2xl font-bold mt-1 ${getMetricColor(yesterdayVal)}`}>
                {yesterdayVal !== null ? `${yesterdayVal} mm` : locale === "hi" ? "अनुपलब्ध" : "Unavailable"}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <p className="text-xs text-muted-foreground font-medium">
                {locale === "hi" ? "2 दिन कुल" : "2-Day Total"}
              </p>
              <p className={`text-2xl font-bold mt-1 ${getMetricColor(twoDayTotal)}`}>
                {twoDayTotal !== null ? `${twoDayTotal} mm` : locale === "hi" ? "अनुपलब्ध" : "Unavailable"}
              </p>
            </div>
          </div>
        </div>

        {/* IMD CLASSIFICATION BADGE */}
        {todayVal !== null && (
          <div className="flex items-center justify-between text-xs p-2 bg-slate-100 dark:bg-slate-800 rounded">
            <span className="font-medium text-muted-foreground">
              {locale === "hi" ? "IMD श्रेणी:" : "IMD Category:"}
            </span>
            <Badge className={getIMDCategory(todayVal).color}>
              {locale === "hi" ? getIMDCategory(todayVal).hi : getIMDCategory(todayVal).en}
            </Badge>
          </div>
        )}

        {/* MODEL COMPARISON ROW */}
        {renderComparison(todayVal)}

        {/* LATENCY NOTE */}
        <p className="text-[11px] text-muted-foreground italic">
          {locale === "hi"
            ? "नोट: NASA POWER डेटा में 1-3 दिन की गुणवत्ता-नियंत्रण विलंबता होती है।"
            : "Note: NASA POWER data has 1-3 day quality-controlled latency."}
        </p>
      </CardContent>

      <CardFooter className="bg-slate-50 dark:bg-slate-900 text-[10px] text-muted-foreground flex flex-col items-start gap-1 pt-2 pb-2 border-t">
        <div>
          Data from NASA POWER Project, NASA Earth Science Directorate. Product: PRECTOTCORR using GPM IMERG. Free API, no cost.
        </div>
        <a
          href="https://power.larc.nasa.gov"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline flex items-center gap-1"
        >
          power.larc.nasa.gov <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </CardFooter>
    </Card>
  );
};
