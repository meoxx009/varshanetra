"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  ExternalLink,
  Mountain,
  RefreshCw,
  Compass,
  Layers,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { getDistrictTerrain } from "@/data/districtTerrain";
import {
  EarthquakeHazardResponse,
  UsgsEarthquakeFeature,
  LandslideRiskEvaluation,
} from "@/types/earthquake";
import { useLocale } from "@/lib/i18n/context";
import { formatRelativeTime } from "@/lib/i18n/formatters";

interface LandslideRiskCardProps {
  districtName: string;
  latitude: number;
  longitude: number;
  rainfall24hMm?: number;
  className?: string;
}

export function evaluateLandslideRisk(
  earthquakes: UsgsEarthquakeFeature[],
  rainfall24hMm: number,
  isHilly: boolean
): LandslideRiskEvaluation {
  const now = Date.now();

  // Significant recent quake within 100km in the last 48 hours
  const recentModerateQuake = earthquakes.some(
    (e) => e.magnitude >= 4.0 && now - e.timestamp <= 48 * 3600 * 1000 && e.distanceKm <= 100
  );

  // Strong recent quake within 100km
  const recentStrongQuake = earthquakes.some(
    (e) => e.magnitude >= 5.0 && now - e.timestamp <= 7 * 24 * 3600 * 1000 && e.distanceKm <= 100
  );

  // Condition 1: Recent quake > 4.0 within 100km + rainfall > 64.5mm (Heavy Rain)
  if (recentModerateQuake && rainfall24hMm >= 64.5) {
    return {
      level: "ELEVATED",
      titleEn: "ELEVATED LANDSLIDE RISK",
      titleHi: "अत्यधिक भूस्खलन जोखिम (सह-भूकंपीय)",
      badgeClass: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600",
      descriptionEn:
        "Slope stability compromised by recent seismic activity + saturation from heavy rain creates critical landslide conditions.",
      descriptionHi:
        "हालिया भूकंपीय गतिविधि के कारण ढलानों की अस्थिरता और भारी बारिश से जल-संतृप्ति के कारण भूस्खलन की अत्यधिक गंभीर स्थिति उत्पन्न हो गई है।",
      hasRecentQuake: true,
      hasHeavyRain: true,
      isHillyTerrain: isHilly,
    };
  }

  // Condition 2: Extreme rainfall > 115mm (Very Heavy Rain) without recent quake on steep slopes
  if (rainfall24hMm >= 115 && isHilly) {
    return {
      level: "MODERATE",
      titleEn: "MODERATE LANDSLIDE RISK",
      titleHi: "मध्यम भूस्खलन जोखिम (अतिवृष्टि)",
      badgeClass: "bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600",
      descriptionEn:
        "Extreme rainfall on steep terrain creates critical pore-water pressure, debris flow and landslide risk.",
      descriptionHi:
        "तीव्र ढलानी भूभाग पर अत्यधिक वर्षा से मिट्टी का जल-दबाव बढ़ने से मलबा प्रवाह और भूस्खलन का सक्रिय जोखिम है।",
      hasRecentQuake: false,
      hasHeavyRain: true,
      isHillyTerrain: isHilly,
    };
  }

  // Condition 3: Recent earthquake > 5.0 within 100km without heavy rain
  if (recentStrongQuake) {
    return {
      level: "WATCH",
      titleEn: "WATCH FOR LANDSLIDES",
      titleHi: "भूस्खलन निगरानी चेतावनी (भूकंप उपरांत)",
      badgeClass: "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600",
      descriptionEn:
        "Ground shaking may have created slope tension cracks; monitor slope catchments closely if rainfall occurs.",
      descriptionHi:
        "तीव्र भूकंपीय झटकों से ढलानों में दरारें आ सकती हैं; यदि वर्षा होती है तो ढलानों और नदी संकीर्णताओं पर कड़ी निगरानी रखें।",
      hasRecentQuake: true,
      hasHeavyRain: false,
      isHillyTerrain: isHilly,
    };
  }

  // Condition 4: Baseline normal
  return {
    level: "LOW",
    titleEn: "LOW LANDSLIDE RISK",
    titleHi: "सामान्य / न्यूनतम भूस्खलन जोखिम",
    badgeClass: "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600",
    descriptionEn: "Baseline slope stability under current geological and hydrometeorological conditions.",
    descriptionHi: "वर्तमान भूगर्भीय और मौसमी परिस्थितियों में ढलान स्थिरता सामान्य सीमा के भीतर है।",
    hasRecentQuake: false,
    hasHeavyRain: false,
    isHillyTerrain: isHilly,
  };
}

export function getMagnitudeBadge(mag: number): {
  badgeClass: string;
  label: string;
} {
  if (mag >= 5.0) {
    return {
      badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
      label: `M ${mag.toFixed(1)} Strong`,
    };
  }
  if (mag >= 4.0) {
    return {
      badgeClass:
        "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
      label: `M ${mag.toFixed(1)} Moderate`,
    };
  }
  return {
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
    label: `M ${mag.toFixed(1)} Minor`,
  };
}

export function LandslideRiskCard({
  districtName,
  latitude,
  longitude,
  rainfall24hMm = 0,
  className = "",
}: LandslideRiskCardProps) {
  const locale = useLocale();
  const [data, setData] = useState<EarthquakeHazardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check terrain data from district terrain DB
  const terrain = getDistrictTerrain(districtName);
  const isHilly = terrain ? terrain.elevation_mean_m > 200 || terrain.slope_mean_degrees > 5 : false;

  const fetchEarthquakes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/hazards/earthquake?lat=${latitude}&lon=${longitude}&district=${encodeURIComponent(
          districtName
        )}&radius=200`
      );
      if (!res.ok) {
        throw new Error(`Earthquake hazards API responded with status ${res.status}`);
      }
      const json: EarthquakeHazardResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seismic telemetry");
    } finally {
      setLoading(false);
    }
  }, [districtName, latitude, longitude]);

  useEffect(() => {
    if (isHilly) {
      fetchEarthquakes();
    }
  }, [isHilly, fetchEarthquakes]);

  // If not a hilly / mountainous district, do not render this card
  if (!isHilly) {
    return null;
  }

  // Four mandatory view states:
  // 1. Loading
  if (loading) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-amber-600 animate-pulse" />
              <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="h-14 w-full bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Error state
  if (error && !data) {
    return (
      <Card className={`border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 shadow-sm ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              {locale === "hi" ? "भूकंपीय डेटा लोड करने में त्रुटि" : "USGS Earthquake Service Telemetry Error"}
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
            onClick={fetchEarthquakes}
            className="text-xs border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry Connection"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Risk evaluation
  const earthquakes = data?.earthquakes || [];
  const evaluation = evaluateLandslideRisk(earthquakes, rainfall24hMm, isHilly);

  // Status icon based on level
  const StatusIcon =
    evaluation.level === "ELEVATED"
      ? ShieldAlert
      : evaluation.level === "MODERATE" || evaluation.level === "WATCH"
      ? AlertTriangle
      : ShieldCheck;

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Mountain className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{locale === "hi" ? "पर्वतीय भूस्खलन जोखिम मूल्यांकन" : "Mountainous Landslide Risk Assessment"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>
                  {locale === "hi" ? "औसत ऊंचाई:" : "Mean Elev:"}{" "}
                  <strong className="text-slate-700 dark:text-slate-300">{terrain?.elevation_mean_m}m</strong>
                </span>
                <span>•</span>
                <span>
                  {locale === "hi" ? "ढलान:" : "Slope:"}{" "}
                  <strong className="text-slate-700 dark:text-slate-300">{terrain?.slope_mean_degrees}°</strong>
                </span>
                <span>•</span>
                <span>
                  {locale === "hi" ? "24h वर्षा:" : "24h Rain:"}{" "}
                  <strong className="text-slate-700 dark:text-slate-300">{rainfall24hMm.toFixed(1)} mm</strong>
                </span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${evaluation.badgeClass} flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider`}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{locale === "hi" ? evaluation.titleHi : evaluation.titleEn}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Risk Trigger Explanation Banner */}
        <div
          className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
            evaluation.level === "ELEVATED"
              ? "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60"
              : evaluation.level === "MODERATE"
              ? "bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900/60"
              : evaluation.level === "WATCH"
              ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60"
              : "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60"
          }`}
        >
          <StatusIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">
              {locale === "hi" ? "ट्रिगर विश्लेषण:" : "Trigger Assessment & Slope Mechanics:"}
            </div>
            <div>{locale === "hi" ? evaluation.descriptionHi : evaluation.descriptionEn}</div>
          </div>
        </div>

        {/* Recent Earthquakes List (within 200km) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {locale === "hi"
                  ? `हालिया भूकंप (200km परिधि में • कुल ${earthquakes.length})`
                  : `Recent Earthquakes (within 200km • Total ${earthquakes.length})`}
              </span>
            </h4>
            <span className="text-[11px] text-slate-400">
              {locale === "hi" ? "USGS FDSN 7-दिवसीय विंडो" : "USGS FDSN 7-Day Window"}
            </span>
          </div>

          {earthquakes.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded-lg text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
              {locale === "hi"
                ? "पिछले 7 दिनों में 200km के भीतर कोई महत्वपूर्ण भूकंप (M ≥ 3.0) दर्ज नहीं किया गया।"
                : "No significant earthquakes (M ≥ 3.0) recorded within 200km over the past 7 days."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden bg-white dark:bg-slate-900/50">
              {earthquakes.slice(0, 4).map((eq) => {
                const magBadge = getMagnitudeBadge(eq.magnitude);
                return (
                  <div
                    key={eq.id}
                    className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-md border shrink-0 mt-0.5 ${magBadge.badgeClass}`}
                      >
                        {magBadge.label}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {eq.place}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Compass className="h-3 w-3 text-slate-400" />
                            {eq.distanceKm.toFixed(1)} km {locale === "hi" ? "दूर" : "away"}
                          </span>
                          <span>•</span>
                          <span>
                            {locale === "hi" ? "गहराई:" : "Depth:"} {eq.depthKm.toFixed(1)} km
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(eq.timestamp, locale)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {eq.shakemapUrl && (
                        <a
                          href={eq.shakemapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50"
                        >
                          <span>{locale === "hi" ? "ShakeMap / विवरण" : "USGS ShakeMap"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scientific Rationale Note */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>
              {locale === "hi"
                ? "आपदा प्रबंधन में भूकंप डेटा एकीकरण का वैज्ञानिक आधार:"
                : "Scientific Rationale: Why Earthquake Data is Integrated into Flood Intelligence:"}
            </span>
          </div>
          <p>
            {locale === "hi"
              ? "भूकंपीय गतिविधि ढलानों को अस्थिर करके, नदियों पर अस्थायी भूस्खलन बांध (landslide dams) बनाकर और तलछट भार (sediment load) बढ़ाकर भूस्खलन और अचानक बाढ़ (flash flood) के जोखिम को कई गुना बढ़ा देती है। वायनाड (2024 त्रासदी) और चमोली (2021 आपदा) जैसे पहाड़ी जिलों में मानसून के दौरान ढलानों का गिरना अक्सर पूर्व भूकंपीय झटकों से चट्टानों के कमजोर होने और अत्यधिक वर्षा से संतृप्त मिट्टी के संयुक्त प्रभाव से शुरू होता है।"
              : "Seismic activity significantly increases landslide and flash flood risk by destabilizing slopes, creating temporary landslide dams on rivers, and increasing sediment load. In hilly districts like Wayanad (2024 disaster) and Chamoli (2021 disaster), slope failure during monsoon is often triggered by the combination of prior seismic ground weakening and saturated soil."}
          </p>
        </div>

        {/* Footer Provenance */}
        {data?.metadata && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <DataSourceBadge metadata={data.metadata} compact />
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" />
              <span>USGS NEIC FDSN Event Web Services</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LandslideRiskCard;
