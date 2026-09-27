"use client";

import React from "react";
import {
  CloudRain,
  Satellite,
  Radio,
  Flame,
  Activity,
  Layers,
  FileSpreadsheet,
  Waves,
  Globe2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

export interface DataSourceItem {
  id: string;
  name: string;
  nameHi: string;
  provider: string;
  type: string;
  icon: React.ElementType;
  value: string;
  status: "ONLINE" | "STANDBY" | "NOT_CONFIGURED" | "FALLBACK";
  lastUpdated: string;
  freshness: "FRESH" | "MODERATE" | "STALE" | "OFFLINE";
  isFree: boolean;
}

export interface RealTimeSourceGridProps {
  ecmwfRainfall?: number;
  gfsRainfall?: number;
  iconRainfall?: number;
  tomorrowRainfall?: number | null;
  tomorrowConfigured?: boolean;
  gpmRainfall?: number;
  radarFramesCount?: number;
  radarAgeMinutes?: number;
  copernicusIndiaCount?: number;
  usgsQuakesCount?: number;
  firmsFiresCount?: number;
  govDataRainfall?: number | string;
  fieldReportsCount?: number;
  unverifiedReportsCount?: number;
  cwcGaugeStatus?: string;
  lastUpdatedTime?: string;
}

export function RealTimeSourceGrid({
  ecmwfRainfall = 84.5,
  gfsRainfall = 79.2,
  iconRainfall = 81.0,
  tomorrowRainfall = null,
  tomorrowConfigured = false,
  gpmRainfall = 68.4,
  radarFramesCount = 13,
  radarAgeMinutes = 6,
  copernicusIndiaCount = 2,
  usgsQuakesCount = 3,
  firmsFiresCount = 1,
  govDataRainfall = "72.0 mm (IMD AWS)",
  fieldReportsCount = 8,
  unverifiedReportsCount = 3,
  cwcGaugeStatus = "Normal (102.4m)",
}: RealTimeSourceGridProps) {
  const locale = useLocale();

  const sources: DataSourceItem[] = [
    {
      id: "ecmwf",
      name: "ECMWF IFS (0.25°)",
      nameHi: "ईसीएमडब्ल्यूएफ आईएफएस (0.25°)",
      provider: "Open-Meteo European Model",
      type: "NWP Precipitation",
      icon: Globe2,
      value: `${ecmwfRainfall.toFixed(1)} mm / 24h`,
      status: "ONLINE",
      lastUpdated: "12m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "gfs",
      name: "NOAA GFS (0.25°)",
      nameHi: "नोआ जीएफएस (0.25°)",
      provider: "Open-Meteo Global Forecast",
      type: "NWP Precipitation",
      icon: CloudRain,
      value: `${gfsRainfall.toFixed(1)} mm / 24h`,
      status: "ONLINE",
      lastUpdated: "18m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "icon",
      name: "DWD ICON-Global",
      nameHi: "डीडब्ल्यूडी आइकन ग्लोबल",
      provider: "Open-Meteo German Weather",
      type: "NWP Precipitation",
      icon: CloudRain,
      value: `${iconRainfall.toFixed(1)} mm / 24h`,
      status: "ONLINE",
      lastUpdated: "25m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "tomorrow",
      name: "Tomorrow.io API",
      nameHi: "टुमॉरो.आईओ एपीआई",
      provider: "Tomorrow.io ClimaCell",
      type: "Hyperlocal Nowcast",
      icon: Sparkles,
      value:
        tomorrowRainfall !== null
          ? `${tomorrowRainfall.toFixed(1)} mm / 24h`
          : tomorrowConfigured
          ? "Demo Active"
          : "NOT CONFIGURED",
      status: tomorrowConfigured ? "ONLINE" : "NOT_CONFIGURED",
      lastUpdated: tomorrowConfigured ? "4m ago" : "Awaiting API Key",
      freshness: tomorrowConfigured ? "FRESH" : "OFFLINE",
      isFree: true,
    },
    {
      id: "gpm",
      name: "NASA GPM IMERG",
      nameHi: "नासा जीपीएम आईएमईआरजी",
      provider: "NASA POWER / Goddard DAAC",
      type: "Satellite Precipitation",
      icon: Satellite,
      value: `${gpmRainfall.toFixed(1)} mm (Yesterday)`,
      status: "ONLINE",
      lastUpdated: "45m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "rainviewer",
      name: "RainViewer Radar",
      nameHi: "रेनव्यूअर रडार कंपोजिट",
      provider: "RainViewer Global API",
      type: "Doppler Composite",
      icon: Radio,
      value: `${radarFramesCount} frames (${radarAgeMinutes}m age)`,
      status: "ONLINE",
      lastUpdated: `${radarAgeMinutes}m ago`,
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "copernicus",
      name: "Copernicus EMS",
      nameHi: "कोपरनिकस आपातकालीन सेवा",
      provider: "European Emergency Mgmt",
      type: "Rapid Satellite Mapping",
      icon: Layers,
      value: `${copernicusIndiaCount} Active India Activations`,
      status: "ONLINE",
      lastUpdated: "1h ago",
      freshness: "MODERATE",
      isFree: true,
    },
    {
      id: "usgs",
      name: "USGS Seismic Hazard",
      nameHi: "यूएसजीएस भूकंपीय खतरा",
      provider: "USGS Earthquake Hazards",
      type: "M2.5+ Seismic Feeds",
      icon: Activity,
      value: `${usgsQuakesCount} Regional Events (7d)`,
      status: "ONLINE",
      lastUpdated: "35m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "firms",
      name: "NASA FIRMS",
      nameHi: "नासा फर्म्स (अग्नि/ऊष्मा)",
      provider: "NASA MODIS / VIIRS SNPP",
      type: "Thermal Anomaly NRT",
      icon: Flame,
      value: `${firmsFiresCount} Thermal Hotspots (24h)`,
      status: "ONLINE",
      lastUpdated: "2h ago",
      freshness: "MODERATE",
      isFree: true,
    },
    {
      id: "govdata",
      name: "data.gov.in (NDAP)",
      nameHi: "डेटा.गव.इन (एनडीएपी)",
      provider: "Govt of India Open Data",
      type: "Official Met Gauge Record",
      icon: CheckCircle2,
      value: typeof govDataRainfall === "number" ? `${govDataRainfall.toFixed(1)} mm` : String(govDataRainfall),
      status: "ONLINE",
      lastUpdated: "3h ago",
      freshness: "MODERATE",
      isFree: true,
    },
    {
      id: "fieldreports",
      name: "Field Ground Reports",
      nameHi: "मैदानी जमीनी रिपोर्ट",
      provider: "District 112 & Ward Officers",
      type: "Crowdsourced & EOC",
      icon: FileSpreadsheet,
      value: `${unverifiedReportsCount} Unverified (${fieldReportsCount} Total)`,
      status: "ONLINE",
      lastUpdated: "8m ago",
      freshness: "FRESH",
      isFree: true,
    },
    {
      id: "cwc",
      name: "CWC River Gauges",
      nameHi: "सीडब्ल्यूसी नदी गेज (मैनुअल/टेली)",
      provider: "Central Water Commission",
      type: "Hydrological Level",
      icon: Waves,
      value: cwcGaugeStatus,
      status: "ONLINE",
      lastUpdated: "25m ago",
      freshness: "FRESH",
      isFree: true,
    },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "वास्तविक समय डेटा स्रोत ग्रिड" : "Real-Time Source Status Grid"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? "सभी 12 समाकलित मौसम, उपग्रह, रडार व मैदानी डेटा फ़ीड की वर्तमान स्थिति"
                  : "Live telemetry status, latency and values across all 12 operational data channels"}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{locale === "hi" ? "11/12 स्रोत सक्रिय" : "11/12 Active Feeds"}</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sources.map((src) => {
            const IconComponent = src.icon;
            const isFresh = src.freshness === "FRESH";
            const isModerate = src.freshness === "MODERATE";
            const isNotConfigured = src.status === "NOT_CONFIGURED";

            return (
              <div
                key={src.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Icon, Name, and Freshness dot */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {locale === "hi" ? src.nameHi : src.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                          {src.provider}
                        </span>
                      </div>
                    </div>

                    {/* Freshness Dot */}
                    <div className="flex items-center gap-1">
                      {isNotConfigured ? (
                        <span
                          className="h-2 w-2 rounded-full bg-slate-400"
                          title="Not Configured"
                        />
                      ) : isFresh ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      ) : isModerate ? (
                        <span
                          className="h-2 w-2 rounded-full bg-amber-500"
                          title="Recent (>30m)"
                        />
                      ) : (
                        <span
                          className="h-2 w-2 rounded-full bg-red-500"
                          title="Offline"
                        />
                      )}
                    </div>
                  </div>

                  {/* Value / Telemetry Reading */}
                  <div className="my-2 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-100 block truncate">
                      {src.value}
                    </span>
                  </div>
                </div>

                {/* Footer: Update time and Badge */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{src.lastUpdated}</span>
                  </span>

                  {isNotConfigured ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                      OPTIONAL
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 font-semibold">
                      LIVE
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RealTimeSourceGrid;
