"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Compass,
  Info,
  Radio,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { FirmsHazardResponse } from "@/types/firms";
import { useLocale } from "@/lib/i18n/context";
import { formatRelativeTime } from "@/lib/i18n/formatters";

interface NASAFIRMSCardProps {
  districtName: string;
  latitude: number;
  longitude: number;
  className?: string;
}

export function NASAFIRMSCard({
  districtName,
  latitude,
  longitude,
  className = "",
}: NASAFIRMSCardProps) {
  const locale = useLocale();
  const [data, setData] = useState<FirmsHazardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFirmsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/hazards/firms?lat=${latitude}&lon=${longitude}&district=${encodeURIComponent(
          districtName
        )}&radius=80`
      );
      if (!res.ok) {
        throw new Error(`NASA FIRMS API error (${res.status})`);
      }
      const json: FirmsHazardResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NASA FIRMS data");
    } finally {
      setLoading(false);
    }
  }, [districtName, latitude, longitude]);

  useEffect(() => {
    fetchFirmsData();
  }, [fetchFirmsData]);

  // 1. Loading State
  if (loading) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-600 animate-pulse" />
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-20 w-full bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // 2. Error State
  if (error && !data) {
    return (
      <Card className={`border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 shadow-sm ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              {locale === "hi" ? "NASA FIRMS डेटा लोड करने में त्रुटि" : "NASA FIRMS Telemetry Load Error"}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-red-600/80">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchFirmsData}
            className="text-xs border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry Connection"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const fireLocations = data?.fire_locations || [];
  const hasFiresNearDistrict = data?.has_fires_near_district ?? false;
  const firesWithin20kmCount = data?.fires_within_20km_count ?? 0;
  const highConfidenceCount = data?.high_confidence_fires ?? 0;
  const nearestFireKm = data?.nearest_fire_km;

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{locale === "hi" ? "🔥 NASA FIRMS - ताप विसंगति और अग्नि संसूचन" : "NASA FIRMS - Heat Anomaly & Fire Detection"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                VIIRS C2 Near Real-time Fire Detection - South Asia
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] tracking-wider uppercase px-2.5 py-0.5">
              NASA VIIRS SATELLITE
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Critical Alert Banner if fire detected within 20km */}
        {hasFiresNearDistrict && (
          <div className="p-3 rounded-lg bg-red-600 text-white shadow-sm flex items-start gap-2.5 text-xs animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-300" />
            <div>
              <strong className="font-black text-sm block">
                {locale === "hi"
                  ? "सतर्कता: जिले के निकट ताप विसंगति संसूचित"
                  : "ALERT: Heat anomaly detected near district"}
              </strong>
              <span className="text-red-100 text-[11px] leading-relaxed block mt-0.5">
                {locale === "hi"
                  ? `जिला मुख्यालय से 20 किमी के भीतर ${firesWithin20kmCount} अग्नि/ताप विसंगतियाँ दर्ज की गई हैं। औद्योगिक क्षेत्रों एवं राहत शिविरों के पास संभावित आग पर नजर रखें।`
                  : `${firesWithin20kmCount} active heat anomaly detections confirmed within 20km of district center. Monitor chemical plants and temporary relief shelters for localized fire outbreaks.`}
              </span>
            </div>
          </div>
        )}

        {/* 4 Summary Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Tile 1: Fires within 20km */}
          <div
            className={`p-3 rounded-lg border ${
              hasFiresNearDistrict
                ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "जिले के 20km में अग्नि" : "Within 20km of District"}
            </div>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1">
              <span>{firesWithin20kmCount}</span>
              <span className="text-[10px] font-normal text-slate-500">
                {locale === "hi" ? "स्थान" : "hotspots"}
              </span>
            </div>
          </div>

          {/* Tile 2: High Confidence */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "उच्च विश्वसनीयता संसूचन" : "High Confidence Fires"}
            </div>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1 text-orange-600 dark:text-orange-400">
              <span>{highConfidenceCount}</span>
              <span className="text-[10px] font-normal text-slate-500">
                {locale === "hi" ? "सत्यापित" : "confirmed"}
              </span>
            </div>
          </div>

          {/* Tile 3: Nearest Fire Distance */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "निकटतम अग्नि संसूचन" : "Nearest Fire Distance"}
            </div>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1 font-mono text-slate-900 dark:text-slate-100">
              <span>{typeof nearestFireKm === "number" ? `${nearestFireKm.toFixed(1)}` : "—"}</span>
              <span className="text-[10px] font-normal text-slate-500">km</span>
            </div>
          </div>

          {/* Tile 4: Total Detections in Perimeter */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "80km परिधि में कुल" : "Total in 80km Range"}
            </div>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1 text-[#0F3D66] dark:text-blue-400">
              <span>{data?.fire_count ?? 0}</span>
              <span className="text-[10px] font-normal text-slate-500">
                {locale === "hi" ? "चिह्नित" : "detections"}
              </span>
            </div>
          </div>
        </div>

        {/* Relevance Explanation Box */}
        <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              {locale === "hi"
                ? "बाढ़ प्रबंधन में अग्नि संसूचन क्यों (Why fire detection in flood management):"
                : "Operational Rationale: Why Fire & Thermal Detection in Flood Disaster Management:"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/40">
              <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">
                {locale === "hi" ? "1) रासायनिक संयंत्र/गोदाम में आग" : "1) Industrial / Chemical Hazard"}
              </strong>
              <span>
                {locale === "hi"
                  ? "जलभराव वाले रासायनिक कारखानों व गोदामों में शॉर्ट सर्किट व रिसाव से आग का गंभीर जोखिम।"
                  : "Electrical short-circuits and reactive chemical storage breaches in inundated industrial estates."}
              </span>
            </div>
            <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/40">
              <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">
                {locale === "hi" ? "2) राहत शिविर के पास आग" : "2) Relief Camp & Settlement Safety"}
              </strong>
              <span>
                {locale === "hi"
                  ? "अस्थायी टेंट बस्तियों एवं राहत शिविरों में खाना पकाने और खुली आग से जलती झोपड़ियों का खतरा।"
                  : "Cooking fires and fuel storage hazards adjacent to crowded temporary relief shelters."}
              </span>
            </div>
            <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/40">
              <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">
                {locale === "hi" ? "3) मलबे का जलना" : "3) Post-Flood Debris Burning"}
              </strong>
              <span>
                {locale === "hi"
                  ? "बाढ़ के बाद मलबे व कचरे का अनियंत्रित दहन जो वायु प्रदूषण और द्वितीयक आपदा उत्पन्न करता है।"
                  : "Uncontrolled post-flood agricultural and structural debris combustion creating toxic smoke."}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Detections List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-red-600 animate-pulse" />
              <span>
                {locale === "hi"
                  ? `सक्रिय ताप विसंगति संसूचन (कुल ${fireLocations.length})`
                  : `Active Thermal Anomaly Detections (Total ${fireLocations.length})`}
              </span>
            </h4>
            <span className="text-[11px] text-slate-400">
              VIIRS 375m • NOAA-20 24h Feed
            </span>
          </div>

          {fireLocations.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded-lg text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
              <ShieldCheck className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <span>
                {locale === "hi"
                  ? "जिले के 80 किमी के भीतर कोई सक्रिय अग्नि या असामान्य ताप विसंगति नहीं मिली।"
                  : "No active thermal anomalies or fire hotspots detected within 80km over the last 24 hours."}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden bg-white dark:bg-slate-900/50">
              {fireLocations.slice(0, 5).map((fire) => {
                const isNear = fire.distanceKm <= 20;
                return (
                  <div
                    key={fire.id}
                    className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-md border shrink-0 mt-0.5 ${
                          fire.confidence === "high"
                            ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                            : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {fire.confidence === "high" ? "High Conf" : "Nominal Conf"}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>
                            {fire.latitude.toFixed(4)}° N, {fire.longitude.toFixed(4)}° E
                          </span>
                          {isNear && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-600 text-white uppercase">
                              Near District (&lt;20km)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Compass className="h-3 w-3 text-slate-400" />
                            {fire.distanceKm.toFixed(1)} km {locale === "hi" ? "दूर" : "away"}
                          </span>
                          <span>•</span>
                          {fire.frp !== undefined && (
                            <>
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                <Zap className="h-3 w-3" />
                                FRP: {fire.frp.toFixed(1)} MW
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatRelativeTime(fire.detectedAtIso, locale)} ({fire.acq_time} UTC)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono self-end sm:self-center shrink-0">
                      {fire.satellite} • {fire.daynight === "D" ? "Day" : "Night"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Provenance */}
        {data?.metadata && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <DataSourceBadge metadata={data.metadata} compact />
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" />
              <span>NASA LANCE / EOSDIS NRT Active Fire</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NASAFIRMSCard;
