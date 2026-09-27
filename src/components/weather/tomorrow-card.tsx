"use client";

import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CloudRain,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Snowflake,
  CloudHail,
  Sparkles,
  ShieldAlert,
  Wind,
  Droplets,
  Thermometer,
  Key,
} from "lucide-react";
import { TomorrowApiResponse } from "@/types/tomorrow";
import { useLocale } from "@/lib/i18n/context";

interface TomorrowCardProps {
  data: TomorrowApiResponse | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  openMeteoRainfall24h?: number;
  openMeteoProb?: number;
}

export function TomorrowCard({
  data,
  isLoading = false,
  isRefreshing = false,
  error = null,
  onRefresh,
  openMeteoRainfall24h,
  openMeteoProb,
}: TomorrowCardProps) {
  const locale = useLocale();

  // View State 1: Loading
  if (isLoading && !data) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // View State 2: Fetch Error / Exception
  if (error && !data) {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 shadow-xs">
        <CardContent className="p-5 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <div className="text-xs text-red-800 dark:text-red-200 font-semibold">
            {locale === "hi"
              ? "Tomorrow.io मौसम डेटा लोड करने में त्रुटि।"
              : "Unable to retrieve Tomorrow.io telemetry."}
          </div>
          <p className="text-[11px] text-muted-foreground">{error}</p>
          <p className="text-[11px] text-slate-500 font-medium">
            {locale === "hi"
              ? "ओपन-मेटियो बैकअप डेटा सामान्य रूप से सक्रिय है।"
              : "Open-Meteo fallback is actively serving telemetry."}
          </p>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // View State 3: Empty
  if (!data) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-6 text-center text-xs text-muted-foreground space-y-2">
          <CloudRain className="w-8 h-8 text-slate-400 mx-auto" />
          <p>
            {locale === "hi"
              ? "Tomorrow.io का कोई डेटा उपलब्ध नहीं है।"
              : "No Tomorrow.io data currently available."}
          </p>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {locale === "hi" ? "डेटा लोड करें" : "Fetch Data"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Failure State A: NOT_CONFIGURED
  if (data.api_status === "NOT_CONFIGURED") {
    return (
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-[11px]">Tomorrow.io</Badge>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {locale === "hi" ? "कॉन्फ़िगर नहीं है" : "NOT CONFIGURED"}
            </Badge>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={onRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {locale === "hi"
              ? "Tomorrow.io API कुंजी कॉन्फ़िगर नहीं की गई है"
              : "Tomorrow.io API Key Not Configured"}
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
            {locale === "hi"
              ? "1km/1-min हाइपर-लोकल नाउकास्टिंग सक्रिय करने हेतु सर्वर वातावरण में TOMORROW_API_KEY सेट करें।"
              : "Set TOMORROW_API_KEY in server environment (.env.local or Vercel) to enable hyper-local 1km nowcasting."}
          </p>
          <div className="pt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ {locale === "hi" ? "Open-Meteo स्वचालित बैकअप सक्रिय है" : "Open-Meteo automatic fallback is active"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State A2: CONFIGURED_UNVERIFIED
  if (data.api_status === "CONFIGURED_UNVERIFIED") {
    return (
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-blue-100 dark:border-blue-900/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-[11px]">Tomorrow.io</Badge>
            <Badge className="bg-blue-600 text-white text-[10px] font-bold">
              {locale === "hi" ? "कॉन्फ़िगर (सत्यापन प्रतीक्षित)" : "CONFIGURED (UNVERIFIED)"}
            </Badge>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-800" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5 text-center space-y-2">
          <Key className="w-8 h-8 text-blue-600 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {locale === "hi"
              ? "API कुंजी पहचानी गई • प्रमाणीकरण प्रतीक्षित"
              : "TOMORROW_API_KEY Detected • Awaiting Live Verification"}
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
            {locale === "hi"
              ? "कुंजी सर्वर वातावरण में मौजूद है। वास्तविक टेलीमेट्री पुष्टि हेतु रीफ्रेश पर क्लिक करें।"
              : "TOMORROW_API_KEY is present in the server environment. Click verify to complete initial authenticated connection."}
          </p>
          {onRefresh && (
            <div className="pt-2">
              <Button size="sm" onClick={onRefresh} disabled={isRefreshing} className="text-xs bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {locale === "hi" ? "कनेक्शन सत्यापित करें" : "Verify Connection"}
              </Button>
            </div>
          )}
          <div className="pt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ {locale === "hi" ? "Open-Meteo बैकअप वर्तमान में सक्रिय है" : "Open-Meteo fallback is currently active"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failure State B: AUTH_ERROR / AUTHENTICATION_ERROR
  if (data.api_status === "AUTH_ERROR" || data.api_status === "AUTHENTICATION_ERROR") {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-red-100 dark:border-red-900/60">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-[11px]">Tomorrow.io</Badge>
            <Badge variant="destructive" className="bg-red-600 text-white text-[10px] font-bold">
              {locale === "hi" ? "प्रमाणीकरण त्रुटि" : "AUTH ERROR"}
            </Badge>
          </div>
          {data.lastSuccessfulFetch && (
            <span className="text-[10px] text-muted-foreground">
              {locale === "hi" ? "अंतिम सफल:" : "Last fetch:"} {new Date(data.lastSuccessfulFetch).toLocaleTimeString()}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-center">
          <AlertTriangle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-xs font-bold text-red-800 dark:text-red-200">
            {locale === "hi"
              ? "Tomorrow.io ने API कुंजी को अस्वीकार कर दिया (HTTP 401 अमान्य कुंजी)।"
              : "Tomorrow.io rejected the configured API key (HTTP 401 Invalid Key)."}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {locale === "hi"
              ? "सर्वर परिवेश में TOMORROW_API_KEY सत्यापित करें। Open-Meteo बैकअप वर्तमान में सक्रिय है।"
              : "Verify TOMORROW_API_KEY in server environment. Open-Meteo fallback is currently active."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
            <span>
              <strong>{locale === "hi" ? "अंतिम सफल:" : "Last Fetch:"}</strong>{" "}
              {data.lastSuccessfulFetch ? new Date(data.lastSuccessfulFetch).toLocaleString() : (locale === "hi" ? "कभी नहीं" : "Never")}
            </span>
            <span>•</span>
            <span>
              <strong>{locale === "hi" ? "ताज़गी:" : "Freshness:"}</strong>{" "}
              {data.lastSuccessfulFetch ? (locale === "hi" ? "पुरानी" : "Stale") : (locale === "hi" ? "अनुपलब्ध" : "Not Available")}
            </span>
          </div>
          <div className="pt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ {locale === "hi" ? "Open-Meteo बैकअप वर्तमान में सक्रिय है" : "Open-Meteo fallback is currently active"}
          </div>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs mt-2">
              <RefreshCw className="w-3 h-3 mr-1" />
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Failure State B2: PERMISSION_ERROR
  if (data.api_status === "PERMISSION_ERROR") {
    return (
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-amber-100 dark:border-amber-900/60">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-[11px]">Tomorrow.io</Badge>
            <Badge variant="destructive" className="bg-amber-600 text-white text-[10px] font-bold">
              {locale === "hi" ? "अनुमति त्रुटि" : "PERMISSION ERROR"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-center">
          <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
            {locale === "hi"
              ? "Tomorrow.io API ने अनुरोध अस्वीकार कर दिया (HTTP 403 Forbidden)।"
              : "Tomorrow.io rejected the request permissions (HTTP 403 Forbidden)."}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {locale === "hi"
              ? "खाता सदस्यता योजना या एंडपॉइंट अनुमतियों की जांच करें। Open-Meteo बैकअप सक्रिय है।"
              : "Check your Tomorrow.io account plan or API key endpoint permissions. Open-Meteo fallback is active."}
          </p>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs mt-2">
              <RefreshCw className="w-3 h-3 mr-1" />
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Failure State C: RATE_LIMITED
  if (data.api_status === "RATE_LIMITED") {
    return (
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-amber-100 dark:border-amber-900/60">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-[11px]">Tomorrow.io</Badge>
            <Badge className="bg-amber-500 text-black text-[10px] font-bold">
              {locale === "hi" ? "दर सीमा पार" : "RATE LIMITED"}
            </Badge>
          </div>
          {data.lastSuccessfulFetch && (
            <span className="text-[10px] text-muted-foreground">
              {locale === "hi" ? "अंतिम सफल:" : "Last fetch:"} {new Date(data.lastSuccessfulFetch).toLocaleTimeString()}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-center">
          <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
            {locale === "hi"
              ? "Tomorrow.io दैनिक कोटा (500 कॉल्स/दिन) समाप्त हो गया है।"
              : "Tomorrow.io daily quota (500 calls/day) has been reached."}
          </p>
          <p className="text-[11px] text-slate-500">
            {locale === "hi"
              ? "Open-Meteo में निर्बाध ऑटो-फॉलबैक सक्रिय है।"
              : "Seamless auto-fallback to Open-Meteo is serving all telemetry."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
            <span>
              <strong>{locale === "hi" ? "अंतिम सफल:" : "Last Fetch:"}</strong>{" "}
              {data.lastSuccessfulFetch ? new Date(data.lastSuccessfulFetch).toLocaleString() : (locale === "hi" ? "कभी नहीं" : "Never")}
            </span>
            <span>•</span>
            <span>
              <strong>{locale === "hi" ? "ताज़गी:" : "Freshness:"}</strong>{" "}
              {data.lastSuccessfulFetch ? (locale === "hi" ? "पुरानी" : "Stale") : (locale === "hi" ? "अनुपलब्ध" : "Not Available")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View State 4: Success Operational View (LIVE)
  const { current, next24h } = data;
  const isLive = data.api_status === "LIVE";

  const getPrecipIcon = (type: string) => {
    switch (type) {
      case "Snow":
        return Snowflake;
      case "Freezing Rain":
      case "Sleet":
        return CloudHail;
      case "Rain":
        return CloudRain;
      default:
        return CloudRain;
    }
  };

  const PrecipIcon = getPrecipIcon(next24h?.precipitationType || current.precipitationType);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-2xs">
                Tomorrow.io
              </Badge>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {locale === "hi" ? "उन्नत AI मौसम पूर्वानुमान" : "AI Weather Intelligence"}
              </span>
              {isLive ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                  {locale === "hi" ? "लाइव" : "LIVE"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 dark:text-amber-400">
                  {data.api_status}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-purple-900/80 dark:text-purple-300 font-mono font-medium">
              Model: {data.model_name} (1km / 1-min)
            </p>
          </div>

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 self-end sm:self-auto"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={locale === "hi" ? "डेटा रिफ्रेश करें" : "Refresh Tomorrow.io feed"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* CURRENT OBSERVATIONS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 block flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-red-500" />
              {locale === "hi" ? "तापमान" : "Temperature"}
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {current.temperature}°C
            </span>
            {current.temperatureApparent !== undefined && (
              <span className="text-[10px] text-slate-500 font-medium block">
                {locale === "hi" ? `महसूस: ${current.temperatureApparent}°C` : `Feels: ${current.temperatureApparent}°C`}
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 block flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              {locale === "hi" ? "आर्द्रता" : "Humidity"}
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {current.humidity}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 block flex items-center gap-1">
              <Wind className="w-3 h-3 text-teal-500" />
              {locale === "hi" ? "हवा की गति" : "Wind Speed"}
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {current.windSpeed} <span className="text-xs font-normal">km/h</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 block flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-purple-500" />
              {locale === "hi" ? "वर्षा तीव्रता" : "Rain Intensity"}
            </span>
            <span className="text-lg font-black text-purple-700 dark:text-purple-300 font-mono mt-0.5 block">
              {current.rainIntensity ?? current.precipitationIntensity ?? 0} <span className="text-xs font-normal">mm/h</span>
            </span>
          </div>
        </div>

        {/* KEY METRICS GRID (24h Summary) */}
        {next24h && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30">
              <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 block">
                {locale === "hi" ? "आगामी 24 घंटे कुल वर्षा" : "Next 24h Rainfall"}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
                  {next24h.precipitationTotalMm}
                </span>
                <span className="text-xs text-purple-900 dark:text-purple-400 font-bold">mm</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {locale === "hi" ? "संचयी पूर्वानुमान" : "Cumulative projection"}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                {locale === "hi" ? "वर्षा की संभावना" : "Precipitation Probability"}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                  {next24h.precipitationProbabilityMax}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {locale === "hi" ? "अधिकतम 24h संभावना" : "Peak 24h likelihood"}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                {locale === "hi" ? "वर्षा का प्रकार" : "Precipitation Type"}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <PrecipIcon className="w-5 h-5 text-purple-600 shrink-0" />
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {next24h.precipitationType === "None"
                    ? locale === "hi" ? "कोई नहीं" : "None"
                    : next24h.precipitationType}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {locale === "hi" ? "वायुमंडलीय चरण" : "Atmospheric phase"}
              </span>
            </div>
          </div>
        )}

        {/* SIDE-BY-SIDE COMPARISON WITH OPEN-METEO */}
        {openMeteoRainfall24h !== undefined && next24h && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{locale === "hi" ? "मॉडल तुलना (Tomorrow.io बनाम Open-Meteo)" : "Model Comparison (Tomorrow.io vs Open-Meteo)"}</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Side-by-Side</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-purple-100/50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <div className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300">Tomorrow.io AI</div>
                <div className="text-base font-black text-purple-700 dark:text-purple-300 mt-0.5">
                  {next24h.precipitationTotalMm} mm
                </div>
                <div className="text-[10px] text-purple-800 dark:text-purple-400">
                  {next24h.precipitationProbabilityMax}% prob • {next24h.maxWindSpeedKmH} km/h wind
                </div>
              </div>

              <div className="p-2 rounded bg-blue-100/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300">Open-Meteo ECMWF</div>
                <div className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">
                  {openMeteoRainfall24h} mm
                </div>
                <div className="text-[10px] text-blue-800 dark:text-blue-400">
                  {openMeteoProb !== undefined ? `${openMeteoProb}% prob` : "Standard IFS"}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
              <span>{locale === "hi" ? "पूर्वानुमान अंतर (Spread):" : "Forecast Delta (Spread):"}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {Math.abs(Number((next24h.precipitationTotalMm - openMeteoRainfall24h).toFixed(1)))} mm
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Attribution: <strong>{data.metadata?.provider || "Tomorrow.io"}</strong> • Last updated: {new Date(data.metadata?.lastUpdated || Date.now()).toLocaleTimeString()}
        </span>
        <a
          href="https://www.tomorrow.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Tomorrow.io</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </CardFooter>
    </Card>
  );
}

export default TomorrowCard;
