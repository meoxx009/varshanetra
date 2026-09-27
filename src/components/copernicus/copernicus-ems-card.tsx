"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Satellite,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Waves,
  Globe,
  Calendar,
  MapPin,
} from "lucide-react";
import { CopernicusApiResponse, CopernicusActivation } from "@/types/copernicus";
import { useLocale } from "@/lib/i18n/context";

interface CopernicusEMSCardProps {
  onOpenMapWms?: () => void;
}

export const CopernicusEMSCard: React.FC<CopernicusEMSCardProps> = ({
  onOpenMapWms,
}) => {
  const locale = useLocale();
  const [data, setData] = useState<CopernicusApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCopernicusData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/copernicus");
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const json: CopernicusApiResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Copernicus EMS data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCopernicusData(false);
  }, [fetchCopernicusData]);

  // View State 1: Loading
  if (loading && !data) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // View State 2: Error
  if (error && !data) {
    return (
      <Card className="border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>🇪🇺 Copernicus EMS ({locale === "hi" ? "त्रुटि" : "Error"})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-red-800 dark:text-red-300">
          <p>{locale === "hi" ? "Copernicus आपातकालीन मानचित्रण सेवा तक पहुंचने में असमर्थ।" : "Unable to reach Copernicus Emergency Management Service feed."}</p>
          <p className="text-[11px] text-muted-foreground">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchCopernicusData(false)}
            className="border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // View State 3: Empty State
  if (!data || !data.activations) {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Satellite className="w-5 h-5 text-blue-600" />
            <span>🇪🇺 Copernicus EMS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-500 py-6 text-center space-y-2">
          <p>{locale === "hi" ? "कोई सक्रियण डेटा उपलब्ध नहीं है।" : "No Copernicus EMS activation data available."}</p>
          <Button size="sm" variant="outline" onClick={() => fetchCopernicusData(true)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {locale === "hi" ? "रिफ्रेश करें" : "Refresh"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // View State 4: Success Operational View
  const lastCheckFormatted = data.last_checked
    ? new Date(data.last_checked).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : "Just now";

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🇪🇺</span>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi"
                  ? "Copernicus EMS - आधिकारिक उपग्रह बाढ़ मानचित्र"
                  : "Copernicus Emergency Management Service - Official Satellite Flood Maps"}
              </CardTitle>
              {/* Badge: EU OFFICIAL SATELLITE in blue */}
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2 py-0.5 tracking-wide">
                EU OFFICIAL SATELLITE
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {locale === "hi"
                ? "यूरोपीय अंतरिक्ष एजेंसी का आपदा मानचित्रण सेवा - भारत में बाढ़ के लिए आधिकारिक उपग्रह आधारित मानचित्र"
                : "European Space Agency emergency mapping service - official satellite-based maps for floods in India."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenMapWms && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={onOpenMapWms}
                title="View on Interactive GIS Map"
              >
                <Waves className="w-3.5 h-3.5 mr-1 text-blue-600" />
                {locale === "hi" ? "मानचित्र पर देखें" : "View on Map"}
              </Button>
            )}
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Checked: {lastCheckFormatted}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              onClick={() => fetchCopernicusData(true)}
              disabled={refreshing}
              title="Refresh Copernicus feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* RECENT INDIA ACTIVATIONS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-blue-600" />
              <span>{locale === "hi" ? "भारत बाढ़ आपातकालीन सक्रियण (Copernicus Rapid Mapping)" : "Recent India Flood Activations (Copernicus Rapid Mapping)"}</span>
            </h4>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              {data.activations.length} {locale === "hi" ? "अभिलेख उपलब्ध" : "Records Available"}
            </span>
          </div>

          {/* Active India event notice banner if NO ongoing activation */}
          {!data.has_active_india_event && (
            <div className="p-3 mb-3 rounded-lg border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs flex items-start gap-2.5 text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {locale === "hi"
                    ? "वर्तमान में भारत के लिए कोई सक्रिय Copernicus EMS सक्रियण नहीं"
                    : "No current Copernicus EMS activation for India."}
                </span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-tight">
                  {locale === "hi"
                    ? "इसका अर्थ है कि हाल ही में किसी बड़ी बाढ़ आपदा ने यूरोपीय उपग्रह सक्रियण को ट्रिगर नहीं किया है। नीचे पूर्व सत्यापित भारतीय बाढ़ सक्रियण संदर्भ हेतु प्रदर्शित हैं।"
                    : "This means no major flood event has triggered EU satellite mapping recently. Documented historic Indian flood activations are displayed below for operational baseline reference."}
                </p>
              </div>
            </div>
          )}

          {/* Activations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.activations.map((activation: CopernicusActivation) => {
              const isOngoing = activation.status === "ONGOING";
              const formattedDate = new Date(activation.date).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={activation.activation_code}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-700 transition flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          {activation.activation_code}
                        </Badge>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formattedDate}
                        </span>
                      </div>

                      {/* Status Badge: ONGOING in red or CLOSED in gray */}
                      {isOngoing ? (
                        <Badge className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 animate-pulse">
                          ONGOING
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500 text-white font-semibold text-[10px] px-2 py-0.5">
                          CLOSED
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                      {activation.title}
                    </h5>

                    {/* Affected Area Description */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <span>{activation.affected_area}</span>
                    </p>
                  </div>

                  {/* Footer Action: View Maps Button */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activation.products_count ? `${activation.products_count} Delineation Products` : "Satellite Delineation"}
                    </span>
                    <a
                      href={activation.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>{locale === "hi" ? "मानचित्र देखें" : "View Maps"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GLOBAL FLOOD AWARENESS SYSTEM (GloFAS) SECTION */}
        <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                GloFAS (Global Flood Awareness System) — Indian River Basins
              </h4>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] w-fit border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-mono"
            >
              {data.glofas.is_key_configured ? "CDS KEY ACTIVE" : "DEMO ENSEMBLE MODE"}
            </Badge>
          </div>

          <p className="text-[11px] text-sky-900 dark:text-sky-300 leading-relaxed">
            {locale === "hi" ? data.glofas.summary_hi : data.glofas.summary}
          </p>

          {/* River Basin Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.glofas.rivers.map((river) => (
              <div
                key={river.river_name}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-sky-200 dark:border-sky-900/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  <span>{river.river_name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      river.alert_level === "ALERT"
                        ? "bg-red-100 text-red-800"
                        : river.alert_level === "WATCH"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {river.alert_level}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {river.basin}
                </div>
                <div className="text-[9px] text-slate-600 dark:text-slate-300 flex justify-between pt-0.5 border-t border-slate-100 dark:border-slate-800">
                  <span>Probability: {river.probability_percent}%</span>
                  <span className="font-mono text-slate-400">{river.forecast_horizon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-900/40 text-[10px]">
            <span className="text-sky-800 dark:text-sky-400">
              ECMWF &amp; Joint Research Centre (JRC) • GloFAS 30-Day Ensemble Forecast
            </span>
            <a
              href={data.glofas.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sky-700 dark:text-sky-300 hover:underline flex items-center gap-1"
            >
              <span>{locale === "hi" ? "GloFAS पोर्टल खोलें" : "Open GloFAS Forecasting Portal"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* STATIC USEFUL COPERNICUS LINKS SECTION */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{locale === "hi" ? "महत्वपूर्ण Copernicus आधिकारिक संसाधन" : "Copernicus Official Resources & Links"}</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <a
              href={data.static_resources.all_india_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold"
            >
              <span className="truncate">🇮🇳 All India Activations</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-1" />
            </a>
            <a
              href={data.static_resources.risk_recovery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold"
            >
              <span className="truncate">🛡️ Risk &amp; Recovery Mapping</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-1" />
            </a>
            <a
              href={data.static_resources.glofas_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold"
            >
              <span className="truncate">🌊 Global Flood Awareness</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-1" />
            </a>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-3 px-6 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <span>
          Attribution: <strong>{data.attribution}</strong>
        </span>
        <span className="text-slate-400">
          European Union Earth Observation Programme • Open Access
        </span>
      </CardFooter>
    </Card>
  );
};

export default CopernicusEMSCard;
