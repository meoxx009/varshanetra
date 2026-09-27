"use client";

import React, { useState } from "react";
import {
  Mountain,
  Waves,
  Compass,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Droplets,
  Trees,
  Building,
  Wheat,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  getDistrictTerrain,
  DistrictTerrainData,
  DISTRICT_TERRAIN_DATABASE,
} from "@/data/districtTerrain";
import { getTerrainRiskScore } from "@/lib/services/flood-risk-engine";

interface TerrainIntelligenceCardProps {
  districtName: string;
  className?: string;
}

const LAND_USE_COLORS = {
  agriculture: "#16a34a", // Green
  settlement: "#64748b",  // Slate Gray
  water_bodies: "#2563eb", // Blue
  forest: "#065f46",      // Dark Green
};

export const TerrainIntelligenceCard: React.FC<TerrainIntelligenceCardProps> = ({
  districtName,
  className = "",
}) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const terrain: DistrictTerrainData | null = getDistrictTerrain(districtName);

  // If district is not yet processed, show informative state
  if (!terrain) {
    const availableDistricts = Object.values(DISTRICT_TERRAIN_DATABASE)
      .map((d) => d.name)
      .join(", ");

    return (
      <Card className={`w-full border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Mountain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>भूभाग एवं भूमि उपयोग विश्लेषण (Terrain & Land Use Analysis)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                स्रोत: NASA SRTM 30m, ESA WorldCover 2021 (Source: NASA SRTM 30m, ESA WorldCover 2021)
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Phase 2 Planned</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Mountain className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              इस जिले के लिए भूभाग डेटा अभी संसाधित नहीं हुआ है
            </p>
            <p className="text-xs text-muted-foreground">
              Terrain data for &quot;{districtName}&quot; is not yet processed. High-resolution DEM &amp; land use extraction is scheduled for Phase 2.
            </p>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <strong>वर्तमान में उपलब्ध जिले (Available Districts):</strong> {availableDistricts}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate terrain risk contribution
  const terrainRisk = getTerrainRiskScore(terrain);

  // Slope classification
  const getSlopeCategory = (deg: number) => {
    if (deg < 1.0) {
      return {
        label: "FLAT (समतल)",
        severity: "CRITICAL",
        colorClass: "bg-red-500 text-white",
        textClass: "text-red-600 dark:text-red-400",
        note: "उच्च बाढ़ जोखिम (High flood risk)",
      };
    }
    if (deg <= 5.0) {
      return {
        label: "GENTLE (धीमा)",
        severity: "WARNING",
        colorClass: "bg-orange-500 text-white",
        textClass: "text-orange-600 dark:text-orange-400",
        note: "मध्यम बाढ़ जोखिम (Moderate flood risk)",
      };
    }
    if (deg <= 15.0) {
      return {
        label: "MODERATE (मध्यम)",
        severity: "ADVISORY",
        colorClass: "bg-yellow-500 text-black",
        textClass: "text-yellow-600 dark:text-yellow-400",
        note: "संतुलित ढलान (Balanced slope)",
      };
    }
    return {
      label: "STEEP (खड़ा/तीव्र)",
      severity: "NORMAL",
      colorClass: "bg-emerald-600 text-white",
      textClass: "text-emerald-600 dark:text-emerald-400",
      note: "कम बाढ़ जोखिम (Lower flood risk)",
    };
  };

  // Flood plain classification
  const getFloodPlainCategory = (pct: number) => {
    if (pct > 60) {
      return {
        label: "HIGH FLOOD PLAIN (उच्च बाढ़ मैदान)",
        colorClass: "bg-red-500",
        badgeColor: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    }
    if (pct >= 30) {
      return {
        label: "MODERATE FLOOD PLAIN (मध्यम)",
        colorClass: "bg-yellow-500",
        badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
      };
    }
    return {
      label: "LOW FLOOD PLAIN (कम)",
      colorClass: "bg-emerald-500",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    };
  };

  // Drainage class details
  const getDrainageBadge = (cls: string) => {
    switch (cls) {
      case "POORLY_DRAINED":
        return {
          label: "जल निकासी कमजोर (POORLY DRAINED)",
          badgeColor: "bg-red-600 text-white",
        };
      case "MODERATELY_DRAINED":
        return {
          label: "मध्यम जल निकासी (MODERATELY DRAINED)",
          badgeColor: "bg-yellow-500 text-black",
        };
      case "WELL_DRAINED":
      default:
        return {
          label: "उत्कृष्ट जल निकासी (WELL DRAINED)",
          badgeColor: "bg-emerald-600 text-white",
        };
    }
  };

  const slopeCat = getSlopeCategory(terrain.slope_mean_degrees);
  const fpCat = getFloodPlainCategory(terrain.flood_plain_percent);
  const drainageBadge = getDrainageBadge(terrain.drainage_class);

  // Pie chart data
  const pieData = [
    { name: "कृषि (Agriculture)", value: terrain.land_use_distribution.agriculture, color: LAND_USE_COLORS.agriculture },
    { name: "बस्ती/शहरी (Settlement)", value: terrain.land_use_distribution.settlement, color: LAND_USE_COLORS.settlement },
    { name: "जल निकाय (Water Bodies)", value: terrain.land_use_distribution.water_bodies, color: LAND_USE_COLORS.water_bodies },
    { name: "वन (Forest)", value: terrain.land_use_distribution.forest, color: LAND_USE_COLORS.forest },
  ];

  return (
    <Card className={`w-full border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
      {/* CARD HEADER */}
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Mountain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>भूभाग एवं भूमि उपयोग विश्लेषण (Terrain and Land Use Analysis)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              स्रोत: NASA SRTM 30m, ESA WorldCover 2021 • {terrain.name}, {terrain.state}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[11px] border-indigo-200 text-indigo-700 dark:text-indigo-300">
              NASA SRTM 30m
            </Badge>
            <Badge variant="outline" className="text-[11px] border-emerald-200 text-emerald-700 dark:text-emerald-300">
              ESA WorldCover 10m
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* TOP ROW: ELEVATION & SLOPE METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Mean Elevation */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-indigo-500" />
                औसत ऊंचाई (Mean)
              </span>
              <span className="text-[10px] font-mono">SRTM</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {terrain.elevation_mean_m} <span className="text-xs font-normal text-muted-foreground">m MSL</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>निम्नतम (Low point): <strong>{terrain.elevation_min_m}m</strong></span>
              <span>अधिकतम: <strong>{terrain.elevation_max_m}m</strong></span>
            </div>
          </div>

          {/* 2. Elevation Range & Susceptibility */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>ऊंचाई प्रसार (Range)</span>
              <span className="text-[10px] font-mono">Δh</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {terrain.elevation_max_m - terrain.elevation_min_m}{" "}
              <span className="text-xs font-normal text-muted-foreground">m range</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800">
              निचला क्षेत्र बाढ़ के प्रति अधिक संवेदनशील होता है (Lower elevation areas are more susceptible to flooding).
            </p>
          </div>

          {/* 3. Mean Slope */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-orange-500" />
                औसत ढलान (Slope)
              </span>
              <Badge className={`text-[10px] py-0 px-1.5 ${slopeCat.colorClass}`}>{slopeCat.label}</Badge>
            </div>
            <div className={`text-2xl font-black ${slopeCat.textClass}`}>
              {terrain.slope_mean_degrees}° <span className="text-xs font-normal text-muted-foreground">degrees</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800">
              समतल भूभाग में जल जमाव अधिक होता है (Flat terrain experiences more waterlogging).
            </p>
          </div>

          {/* 4. River Network Density */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-blue-500" />
                नदी नेटवर्क घनत्व
              </span>
              <span className="text-[10px] font-mono">HydroSHEDS</span>
            </div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {terrain.river_density_km_per_sqkm}{" "}
              <span className="text-xs font-normal text-muted-foreground">km/km²</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800">
              उच्च घनत्व अधिक जल निकासी लेकिन अधिक बाढ़ क्षेत्र दर्शाता है (Higher drainage density).
            </p>
          </div>
        </div>

        {/* FLOOD PLAIN & DRAINAGE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flood Plain Progress Bar */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                बाढ़ मैदान प्रतिशत (Flood Plain Percent)
              </span>
              <Badge className={`text-xs ${fpCat.badgeColor}`}>{fpCat.label}</Badge>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fpCat.colorClass}`}
                  style={{ width: `${Math.min(100, terrain.flood_plain_percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>0% (पहाड़ी/ऊंचा)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{terrain.flood_plain_percent}%</span>
                <span>100% (पूर्ण मैदान)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              बाढ़ मैदान प्रतिशत नदी के आसपास की समतल भूमि दर्शाता है (Flood plain percentage indicates flat land around rivers).
            </p>
          </div>

          {/* Drainage Class & Soil Type */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                जल निकासी एवं मृदा वर्ग (Drainage & Soil)
              </span>
              <Badge className={drainageBadge.badgeColor}>{drainageBadge.label}</Badge>
            </div>
            <div className="text-xs space-y-1">
              <p>
                <strong>मृदा प्रकार (Soil Type):</strong>{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {terrain.soil_type_hi} ({terrain.soil_type})
                </span>
              </p>
              <p className="text-muted-foreground text-[11px]">
                खराब जल निकासी वाले क्षेत्रों में वर्षा के बाद जल तेजी से जमा होता है (Areas with poor drainage accumulate water quickly after rainfall).
              </p>
            </div>
          </div>
        </div>

        {/* LAND USE PIE CHART & LEGEND */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>भूमि उपयोग वितरण (Land Use Distribution — ESA WorldCover 2021)</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                शहरी क्षेत्र जल अवशोषण कम करते हैं, कृषि भूमि मध्यम, वन क्षेत्र अधिक (Urban areas reduce water absorption, agricultural moderate, forest areas more).
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">10m Ground Resolution</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Pie Chart */}
            <div className="md:col-span-5 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val?: string | number | readonly (string | number)[]) => [`${val ?? 0}%`, "क्षेत्रफल (Area)"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Land Use Badges & Distribution */}
            <div className="md:col-span-7 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>कृषि (Agriculture)</span>
                </div>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{terrain.land_use_distribution.agriculture}%</span>
              </div>

              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>बस्ती/शहरी (Settlement)</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{terrain.land_use_distribution.settlement}%</span>
              </div>

              <div className="p-2.5 rounded border border-blue-200 dark:border-blue-950 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>जल निकाय (Water Bodies)</span>
                </div>
                <span className="font-bold text-blue-700 dark:text-blue-400">{terrain.land_use_distribution.water_bodies}%</span>
              </div>

              <div className="p-2.5 rounded border border-emerald-900/30 bg-emerald-900/10 dark:bg-emerald-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trees className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
                  <span>वन क्षेत्र (Forest)</span>
                </div>
                <span className="font-bold text-emerald-900 dark:text-emerald-300">{terrain.land_use_distribution.forest}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* PART 3: TERRAIN RISK CONTRIBUTION PANEL */}
        <div className="p-3.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🗺️</span>
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                भूभाग जोखिम: {terrainRisk.score} अंक (Terrain Risk: {terrainRisk.score} points)
              </span>
            </div>
            <Badge className="bg-indigo-600 text-white text-[11px]">
              {terrainRisk.score > 60 ? "उच्च संवेदनशीलता (High)" : terrainRisk.score > 30 ? "मध्यम (Moderate)" : "कम (Low)"}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">सक्रिय कारक (Sub-factors):</span>
            {terrainRisk.subFactors.length > 0 ? (
              terrainRisk.subFactors.map((sf, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                >
                  {terrainRisk.subFactorsHi[idx]} ({sf})
                </Badge>
              ))
            ) : (
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                सामान्य जल निकासी क्षमता (No elevated terrain vulnerabilities)
              </span>
            )}
          </div>
        </div>

        {/* PART 4: EXPANDABLE DATA SOURCES ACCORDION */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
          <button
            type="button"
            className="w-full p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left"
            onClick={() => setSourcesOpen(!sourcesOpen)}
          >
            <span className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              भूभाग डेटा स्रोत (Terrain Data Sources &amp; Methodology)
            </span>
            {sourcesOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {sourcesOpen && (
            <div className="p-4 bg-white dark:bg-slate-950 space-y-3 text-muted-foreground border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">🛰️ NASA SRTM (Shuttle Radar Topography Mission):</p>
                <p className="text-[11px]">
                  शटल रडार स्थलाकृति मिशन, 30m रिज़ॉल्यूशन, 2000 का डेटा, NASA द्वारा निःशुल्क (Shuttle Radar Topography Mission, 30m resolution, year 2000 data, free from NASA).
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">🛰️ ESA WorldCover (Global Land Cover):</p>
                <p className="text-[11px]">
                  यूरोपीय अंतरिक्ष एजेंसी भूमि उपयोग, 10m रिज़ॉल्यूशन, 2021 डेटा, निःशुल्क (European Space Agency land use, 10m resolution, 2021 data, free from ESA).
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">⚙️ GIS Processing Pipeline:</p>
                <p className="text-[11px]">
                  इस डेटा को QGIS और Python GeoPandas से पूर्व-संसाधित किया गया है (This data was pre-processed using QGIS and Python GeoPandas zonal raster stats).
                </p>
              </div>

              <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-[11px]">
                📌 <strong>Phase 2 Roadmap:</strong> और जिलों के लिए भूभाग डेटा Phase 2 में जोड़ा जाएगा (Terrain data for more districts will be added in Phase 2).
              </div>
            </div>
          )}
        </div>

        {/* PART 5: BHUVAN INTEGRATION LINK BANNER */}
        <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-200">
              <span className="text-base">🇮🇳</span>
              <span>ISRO Bhuvan पर विस्तृत भूभाग मानचित्र देखें (View detailed terrain maps on ISRO Bhuvan)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              NRSC CARTOSAT-3 DEM (10m) एकीकरण Phase 2 में योजनाबद्ध है (NRSC CARTOSAT-3 DEM 10m integration planned for Phase 2).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1 border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shrink-0"
            onClick={() => window.open("https://bhuvan.nrsc.gov.in", "_blank")}
          >
            bhuvan.nrsc.gov.in <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/60 dark:bg-slate-900/40 p-3 px-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
        <span>Computed via Python GeoPandas &amp; GDAL Rasterio zonal analysis</span>
        <span>Directive #12 &amp; #15 Compliant • Free Data Sources</span>
      </CardFooter>
    </Card>
  );
};

export default TerrainIntelligenceCard;
