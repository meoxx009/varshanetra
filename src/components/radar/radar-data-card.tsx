"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radio,
  RefreshCw,
  AlertCircle,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { resolveRadarStationContext } from "@/lib/radar/station-registry";
import { DataBadge } from "@/components/common/data-badge";
import { cn } from "@/lib/utils";

interface RadarDataCardProps {
  districtName?: string;
  latitude?: number;
  longitude?: number;
  onOpenMap?: () => void;
}

interface IMDRadarMeta {
  success: boolean;
  station: string;
  product: string;
  lastModified?: string;
  sizeBytes?: number;
  cached?: boolean;
}

export const RadarDataCard: React.FC<RadarDataCardProps> = ({
  districtName = "pune",
  latitude = 18.5204,
  longitude = 73.8567,
  onOpenMap,
}) => {
  const locale = useLocale();

  const coverageContext = useMemo(
    () => resolveRadarStationContext(districtName, latitude, longitude, districtName),
    [districtName, latitude, longitude]
  );

  const [meta, setMeta] = useState<IMDRadarMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());

  const fetchRadarMeta = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(
        `/api/radar/imd?station=${coverageContext.station.code}&product=caz&meta=true&t=${Date.now()}`
      );
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const json: IMDRadarMeta = await res.json();
      setMeta(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load radar metadata";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coverageContext.station.code]);

  useEffect(() => {
    fetchRadarMeta(false);
    const interval = setInterval(() => fetchRadarMeta(true), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRadarMeta]);

  const handleManualRefresh = () => {
    setRefreshKey(Date.now());
    fetchRadarMeta(true);
  };

  // View State 1: Loading
  if (loading && !meta) {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // View State 2: Error
  if (error && !meta) {
    return (
      <Card className="border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>{locale === "hi" ? "डॉपलर रडार (अनुपलब्ध)" : "Doppler Weather Radar (Unavailable)"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-red-800 dark:text-red-300">
          <p>
            {locale === "hi"
              ? "आईएमडी रडार सेवा से संपर्क करने में असमर्थ।"
              : "Unable to contact official IMD Doppler Weather Radar feed."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            className="border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastUpdatedFormatted = meta?.lastModified
    ? new Date(meta.lastModified).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : "Just now";

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0F3D66] dark:text-blue-400">
              <Radio className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "डॉपलर मौसम रडार" : "Doppler Weather Radar"}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono"
                >
                  MAX(Z) dBZ
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {locale === "hi"
                  ? "लाइव परावर्तकता • भारत मौसम विज्ञान विभाग"
                  : "Live Reflectivity Intelligence • IMD Doppler Network"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DataBadge type="GOVT_DATA" compact={true} note="Official IMD DWR" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh radar telemetry"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-blue-600")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Core Radar Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Station */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-500" />
              {locale === "hi" ? "रडार स्टेशन" : "Station"}
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {coverageContext.station.name} ({coverageContext.station.band})
            </p>
          </div>

          {/* Distance */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" />
              {locale === "hi" ? "दूरी" : "Distance"}
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {coverageContext.distanceKm} km
            </p>
          </div>

          {/* Coverage Status */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              {locale === "hi" ? "कवरेज" : "Coverage"}
            </span>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {coverageContext.coverageStatus === "DIRECT" ? "DIRECT (250 km)" : coverageContext.coverageStatus}
            </p>
          </div>

          {/* Scan Time */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {locale === "hi" ? "स्कैन समय" : "Scan Time"}
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {lastUpdatedFormatted}
            </p>
          </div>
        </div>

        {/* Live Radar Thumbnail Preview */}
        <div className="relative rounded-xl border border-slate-800 bg-black overflow-hidden h-48 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/radar/imd?station=${coverageContext.station.code}&product=caz&t=${refreshKey}`}
            alt={`${coverageContext.station.name} DWR MAX(Z)`}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          {/* Overlay Tag */}
          <div className="absolute top-2 left-2 bg-black/80 text-cyan-300 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded">
            MAX(Z) Composite Reflectivity • 250 km
          </div>
          <div className="absolute bottom-2 right-2 bg-black/80 text-amber-300 border border-amber-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            <span>Target: {districtName}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 px-5 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {locale === "hi" ? "वैज्ञानिक 250 किमी अवलोकन डिस्क" : "Scientific 250 km Observation Disk"}
        </span>

        <Link
          href="/map?layer=radar"
          onClick={onOpenMap}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F3D66] hover:bg-[#1E4E79] text-white transition cursor-pointer"
        >
          <span>{locale === "hi" ? "पूर्ण रडार वर्कस्टेशन खोलें" : "Open Radar Workstation"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
};

export default RadarDataCard;
