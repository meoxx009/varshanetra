"use client";

import React from "react";
import {
  CloudRain,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  ExternalLink,
  Users,
  Home,
  Waves,
  Calendar,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGovData } from "@/hooks/use-gov-data";
import { useLocale } from "@/lib/i18n/context";
import { GovDataBadge } from "@/components/common/gov-data-badge";
import { cn } from "@/lib/utils";

interface GovernmentDataCardProps {
  districtName: string;
  stateName?: string;
  openMeteoForecastMm?: number;
  className?: string;
}

export const GovernmentDataCard: React.FC<GovernmentDataCardProps> = ({
  districtName,
  stateName,
  openMeteoForecastMm,
  className = "",
}) => {
  const locale = useLocale();
  const { data, isLoading, isRefreshing, error, refetch } = useGovData(districtName, stateName);

  // Four distinct mandatory view states (Directive #6)
  if (isLoading) {
    return (
      <Card className={cn("border border-slate-200 dark:border-slate-800 shadow-xs", className)}>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 shadow-xs", className)}>
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            {locale === "hi"
              ? "data.gov.in से सरकारी डेटा लोड करने में त्रुटि"
              : "Unable to Load Official Government Data from data.gov.in"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error || (locale === "hi"
              ? "सरकारी पोर्टल से प्रतिक्रिया प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।"
              : "Unable to retrieve response from official government portal. Please try again.")}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry Connection"}</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { imdRainfall, ndmaFlood, cwcRiver, lastUpdated, status } = data;
  const isHighDeparture = (imdRainfall?.departure_percent ?? 0) >= 20;
  const isDeficient = (imdRainfall?.departure_percent ?? 0) <= -20;

  return (
    <Card className={cn("border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden", className)}>
      {/* Header with Indian Flag and Official Badges */}
      <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-slate-900/80 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none" role="img" aria-label="Flag of India">
                🇮🇳
              </span>
              <CardTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "सरकारी खुला डेटा" : "Government Open Data"}</span>
                <span className="text-xs text-muted-foreground font-semibold">
                  ({locale === "hi" ? districtName : `${districtName}, ${data.state}`})
                </span>
              </CardTitle>

              {/* Official Green / Gold Badges (PART 2 & PART 5) */}
              <GovDataBadge source="data.gov.in" size="sm" />
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-2xs gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{locale === "hi" ? "आधिकारिक सरकारी डेटा" : "Official Government Data"}</span>
              </Badge>

              {/* Status Badge */}
              {status === "LIVE" ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                  LIVE API
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300">
                  OFFICIAL ARCHIVE
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {locale === "hi" ? "स्रोत: " : "Source: "}
              </span>
              <span>
                {locale === "hi"
                  ? "data.gov.in - भारत सरकार का आधिकारिक डेटा पोर्टल"
                  : "data.gov.in - Official Government of India Data Portal"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefreshing}
              className="text-xs gap-1 h-8 px-2.5 border-slate-300 dark:border-slate-700"
              title="Refresh government data feed"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-blue-600")} />
              <span className="hidden md:inline">{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open("https://data.gov.in", "_blank")}
              className="text-xs gap-1 h-8 px-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              <span>data.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* SECTION B: PROMINENT NDMA FLOOD ALERT BANNER (If District is affected) */}
        {ndmaFlood && ndmaFlood.isAffected && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500/80 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                <Badge className="bg-red-600 text-white font-black text-xs px-2 py-0.5 tracking-wider uppercase">
                  NDMA OFFICIAL
                </Badge>
                <span className="font-bold text-sm text-red-950 dark:text-red-200">
                  {locale === "hi"
                    ? "NDMA: इस जिले में बाढ़ प्रभावित स्थिति दर्ज"
                    : "NDMA: Flood affected situation recorded in this district"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-red-800 dark:text-red-300 font-semibold">
                {locale === "hi" ? "स्थिति: " : "Status: "}
                {ndmaFlood.severity}
              </span>
            </div>

            <p className="text-xs text-red-900 dark:text-red-300 leading-relaxed">
              {ndmaFlood.statusReport}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-red-200 dark:border-red-900/60 text-xs">
              <div className="flex items-center gap-1.5 text-red-900 dark:text-red-200 font-medium">
                <Users className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>
                  {locale === "hi" ? "प्रभावित जनसंख्या: " : "Affected Pop: "}
                  <strong className="font-bold">
                    {ndmaFlood.affectedPopulation
                      ? Number(ndmaFlood.affectedPopulation).toLocaleString("en-IN")
                      : "--"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-red-900 dark:text-red-200 font-medium">
                <Home className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>
                  {locale === "hi" ? "सक्रिय राहत शिविर: " : "Relief Camps: "}
                  <strong className="font-bold">{ndmaFlood.reliefCampsActive ?? 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-red-900 dark:text-red-200 font-medium">
                <Waves className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>
                  {locale === "hi" ? "जलमग्न गांव: " : "Inundated Villages: "}
                  <strong className="font-bold">{ndmaFlood.inundatedVillages ?? "--"}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-red-900 dark:text-red-200 font-medium">
                <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>
                  {locale === "hi" ? "दिनांक: " : "Date: "}
                  <strong className="font-mono">{ndmaFlood.date}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION A: IMD DISTRICT RAINFALL OBSERVATION */}
        {imdRainfall ? (
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-900">
                  <CloudRain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {locale === "hi"
                        ? `जिला वर्षा (IMD): ${imdRainfall.rainfall_mm} मिमी`
                        : `District Rainfall IMD: ${imdRainfall.rainfall_mm} mm`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {imdRainfall.dataSource}
                  </p>
                </div>
              </div>

              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 gap-1 shadow-2xs self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>IMD OFFICIAL DATA</span>
              </Badge>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {locale === "hi" ? "वास्तविक प्रेक्षित वर्षा" : "Observed Rainfall"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {imdRainfall.rainfall_mm}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mm</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {locale === "hi" ? "अंतिम 24 घंटे की कुल वर्षा" : "Past 24h ending at 08:30 IST"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {locale === "hi" ? "इस तिथि हेतु सामान्य वर्षा" : "Normal for this date"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                    {imdRainfall.normal_rainfall_mm}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mm</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {locale === "hi" ? "दीर्घकालिक मौसमी औसत (LPA)" : "Long Period Average (LPA)"}
                </span>
              </div>

              <div className={cn(
                "p-3 rounded-lg border space-y-0.5",
                isHighDeparture
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/60"
                  : isDeficient
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60"
              )}>
                <span className="text-[11px] font-semibold uppercase tracking-wider block text-slate-500">
                  {locale === "hi" ? "सामान्य से विचलन" : "Departure from normal"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-2xl font-black",
                    isHighDeparture ? "text-red-600 dark:text-red-400" : isDeficient ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {imdRainfall.departure_percent > 0 ? `+${imdRainfall.departure_percent}%` : `${imdRainfall.departure_percent}%`}
                  </span>
                </div>
                <span className={cn("text-[10px] font-bold uppercase", isHighDeparture ? "text-red-600" : "text-slate-500")}>
                  {imdRainfall.category}
                </span>
              </div>
            </div>

            {/* Model Comparison Callout (Directive #16) */}
            {typeof openMeteoForecastMm === "number" && openMeteoForecastMm > 0 && (
              <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>{locale === "hi" ? "तुलना: " : "Comparison: "}</strong>
                  {locale === "hi"
                    ? `Open-Meteo पूर्वानुमान: ${openMeteoForecastMm} मिमी बनाम IMD अवलोकन: ${imdRainfall.rainfall_mm} मिमी`
                    : `Open-Meteo forecast: ${openMeteoForecastMm} mm vs IMD observation: ${imdRainfall.rainfall_mm} mm`}
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                  Δ {Math.abs(openMeteoForecastMm - imdRainfall.rainfall_mm).toFixed(1)} mm
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {locale === "hi"
                  ? "यह वास्तविक IMD जिला वर्षा प्रेक्षण है, संख्यात्मक मॉडल पूर्वानुमान नहीं।"
                  : "This is the actual IMD ground-gauge observation, not a numerical model forecast."}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center text-xs text-slate-500">
            {locale === "hi"
              ? "इस जिले हेतु वर्तमान IMD वर्षा डेटा उपलब्ध नहीं है।"
              : "No current IMD ground rainfall reading available for this district on data.gov.in."}
          </div>
        )}

        {/* SECTION B2: CWC RIVER GAUGE MONITORING (If Available) */}
        {cwcRiver && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {locale === "hi" ? "CWC नदी गेज निगरानी: " : "CWC River Gauge: "}
                  {cwcRiver.river} ({cwcRiver.station})
                </span>
              </div>
              <Badge
                className={cn(
                  "text-[10px] font-bold text-white",
                  cwcRiver.status === "DANGER"
                    ? "bg-red-600"
                    : cwcRiver.status === "WARNING"
                    ? "bg-amber-600"
                    : "bg-emerald-600"
                )}
              >
                {cwcRiver.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block">{locale === "hi" ? "वर्तमान जलस्तर:" : "Current Level:"}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{cwcRiver.currentLevelMeters} m</span>
              </div>
              <div>
                <span className="text-slate-500 block">{locale === "hi" ? "चेतावनी स्तर:" : "Warning Level:"}</span>
                <span className="font-mono text-amber-600 font-semibold">{cwcRiver.warningLevelMeters} m</span>
              </div>
              <div>
                <span className="text-slate-500 block">{locale === "hi" ? "खतरे का निशान:" : "Danger Level:"}</span>
                <span className="font-mono text-red-600 font-semibold">{cwcRiver.dangerLevelMeters} m</span>
              </div>
              <div>
                <span className="text-slate-500 block">{locale === "hi" ? "प्रवृत्ति:" : "Trend:"}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cwcRiver.trend}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* SECTION C: DATA FRESHNESS & FOOTER */}
      <CardFooter className="bg-slate-50 dark:bg-slate-900/60 p-3.5 px-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {locale === "hi" ? "डेटा अंतिम अपडेट: " : "Data last updated: "}
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {new Date(lastUpdated).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </span>
        </div>

        <div className="text-[10px] text-slate-500 italic">
          {locale === "hi"
            ? "data.gov.in पर IMD डेटा सामान्यतः दैनिक अपडेट होता है।"
            : "IMD data on data.gov.in is typically updated daily."}
        </div>
      </CardFooter>
    </Card>
  );
};

export default GovernmentDataCard;
