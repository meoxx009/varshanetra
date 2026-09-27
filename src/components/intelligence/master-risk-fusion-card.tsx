"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CloudRain,
  Satellite,
  Compass,
  Activity,
  Layers,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

export interface MasterRiskFusionProps {
  meteoScore: number;       // 0 - 100 (NWP models)
  satelliteScore: number;   // 0 - 100 (NASA GPM IMERG)
  terrainScore: number;     // 0 - 100 (DEM slope & elevation)
  seismicScore: number;     // 0 - 100 (USGS earthquakes)
  radarScore: number;       // 0 - 100 (RainViewer radar)
  groundReportsScore: number;// 0 - 100 (Field reports)
  districtName: string;
}

export function MasterRiskFusionCard({
  meteoScore,
  satelliteScore,
  terrainScore,
  seismicScore,
  radarScore,
  groundReportsScore,
  districtName,
}: MasterRiskFusionProps) {
  const locale = useLocale();

  // Weighted synthesis score (0 - 100)
  // Weights: Meteo (25%), Sat (20%), Terrain (15%), Radar (15%), Field (15%), Seismic (10%)
  const overallScore = Math.round(
    meteoScore * 0.25 +
      satelliteScore * 0.2 +
      terrainScore * 0.15 +
      radarScore * 0.15 +
      groundReportsScore * 0.15 +
      seismicScore * 0.1
  );

  // Dual-channel severity level
  let level = "LOW";
  let levelHi = "सामान्य / कम जोखिम";
  let badgeClass = "bg-emerald-600 text-white";
  let StatusIcon = ShieldCheck;

  if (overallScore >= 75) {
    level = "SEVERE";
    levelHi = "अति गंभीर जोखिम";
    badgeClass = "bg-red-600 text-white";
    StatusIcon = ShieldAlert;
  } else if (overallScore >= 50) {
    level = "HIGH";
    levelHi = "उच्च जोखिम";
    badgeClass = "bg-orange-500 text-white";
    StatusIcon = AlertTriangle;
  } else if (overallScore >= 25) {
    level = "MODERATE";
    levelHi = "मध्यम जोखिम";
    badgeClass = "bg-amber-500 text-white";
    StatusIcon = AlertTriangle;
  }

  // Radar chart dataset
  const radarData = [
    {
      subject: locale === "hi" ? "मौसम (NWP)" : "Meteorology (NWP)",
      score: meteoScore,
      fullMark: 100,
    },
    {
      subject: locale === "hi" ? "उपग्रह (GPM)" : "Satellite (GPM)",
      score: satelliteScore,
      fullMark: 100,
    },
    {
      subject: locale === "hi" ? "भूभाग संवेदनशीलता" : "Terrain Vulnerability",
      score: terrainScore,
      fullMark: 100,
    },
    {
      subject: locale === "hi" ? "भूकंपीय जोखिम" : "Seismic Risk (USGS)",
      score: seismicScore,
      fullMark: 100,
    },
    {
      subject: locale === "hi" ? "रडार गतिविधि" : "Radar Activity",
      score: radarScore,
      fullMark: 100,
    },
    {
      subject: locale === "hi" ? "मैदानी रिपोर्ट" : "Ground Field Reports",
      score: groundReportsScore,
      fullMark: 100,
    },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "समग्र जोखिम संश्लेषण" : "Comprehensive Risk Synthesis"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? `${districtName} हेतु 6 स्वतंत्र पर्यावरण व भू-स्थानिक आयामों का स्वचालित संश्लेषण`
                  : `Automated multi-source data fusion across 6 independent telemetry vectors for ${districtName}`}
              </CardDescription>
            </div>
          </div>

          <Badge className={`${badgeClass} px-3 py-1 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5`}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{locale === "hi" ? levelHi : level}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Recharts Radar / Spider Chart */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full h-[320px] max-w-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#94A3B8" strokeDasharray="3 3" opacity={0.6} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                    formatter={(val: unknown) => {
                      const num = typeof val === "number" ? val : Number(val);
                      return [`${isNaN(num) ? "0" : num} / 100`, locale === "hi" ? "जोखिम स्कोर" : "Risk Score"];
                    }}
                  />
                  <Radar
                    name={locale === "hi" ? "संश्लेषित जोखिम" : "Synthesized Risk"}
                    dataKey="score"
                    stroke="#DC2626"
                    fill="#DC2626"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-400 text-center italic mt-1">
              {locale === "hi"
                ? "स्पाइडर आरेख 6 स्वतंत्र आयामों में जोखिम का संतुलन दर्शाता है (0 = सामान्य, 100 = चरम)"
                : "Hexagonal spider polygon displays risk equilibrium across all 6 telemetry vectors"}
            </div>
          </div>

          {/* Right Column: Master Score & Axis Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            {/* Master Score Display */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-900/30 text-center shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {locale === "hi" ? "समग्र बहु-स्रोत जोखिम स्कोर" : "Overall Multi-Source Risk Score"}
              </span>
              <div className="flex items-baseline justify-center gap-1.5 my-1">
                <span className="text-4xl sm:text-5xl font-black text-[#0F3D66] dark:text-blue-400">
                  {overallScore}
                </span>
                <span className="text-lg font-bold text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                {locale === "hi"
                  ? "सभी सक्रिय डेटा स्रोतों के भारित औसत (weighted average) पर आधारित समग्र आपातकालीन सूचकांक"
                  : "Synthesized operational decision index weighted proportionally across active live data feeds"}
              </p>
            </div>

            {/* 6 Vectors Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "मौसम मॉडल (ECMWF/GFS)" : "Meteorology NWP (25%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{meteoScore}/100</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Satellite className="h-3.5 w-3.5 text-cyan-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "उपग्रह प्रेक्षण (NASA GPM)" : "Satellite GPM (20%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{satelliteScore}/100</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5 text-amber-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "भूभाग ढलान (DEM SRTM)" : "Terrain DEM Slope (15%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{terrainScore}/100</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-red-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "भूकंपीय अस्थिरता (USGS)" : "Seismic Hazards (10%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{seismicScore}/100</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-orange-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "रडार संवहन (RainViewer)" : "Radar Convection (15%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{radarScore}/100</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-purple-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "मैदानी रिपोर्ट (112 EOC)" : "Field Observer Reports (15%)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{groundReportsScore}/100</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MasterRiskFusionCard;
