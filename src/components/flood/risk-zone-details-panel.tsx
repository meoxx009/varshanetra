"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  CheckCircle2,
  Layers,
  HeartPulse,
  Shield,
  Flame,
  Home,
  Bus,
  GraduationCap,
  Waves,
  Building2,
  AlertTriangle,
  X,
  ChevronRight,
} from "lucide-react";
import {
  SpatialRiskCellProperties,
  FacilitiesGroupedResponse,
  SpatialRiskGridFeatureCollection,
} from "@/types";
import { useLocale } from "@/lib/i18n/context";
import {
  resolveLocalAreasForCell,
  computeCellInfrastructureBreakdown,
  InfrastructureCategoryFilter,
} from "@/lib/services/risk-zone-locality";

interface RiskZoneDetailsPanelProps {
  selectedCell: SpatialRiskCellProperties | null;
  onClearSelection: () => void;
  facilities: FacilitiesGroupedResponse | null;
  riskGrid: SpatialRiskGridFeatureCollection | null;
  timelineHorizon: string;
  onFocusAsset?: (lat: number, lon: number) => void;
}

export function RiskZoneDetailsPanel({
  selectedCell,
  onClearSelection,
  facilities,
  riskGrid,
  timelineHorizon,
  onFocusAsset,
}: RiskZoneDetailsPanelProps) {
  const locale = useLocale();
  const isHi = locale === "hi";

  const [isAllAreasModalOpen, setIsAllAreasModalOpen] = useState(false);

  // Compute resolved localities for selected cell
  const resolvedLocality = useMemo(() => {
    if (!selectedCell) return null;
    return resolveLocalAreasForCell(selectedCell.centerLat, selectedCell.centerLon, facilities);
  }, [selectedCell, facilities]);

  // Compute infrastructure breakdown for selected cell
  const infraBreakdown = useMemo(() => {
    if (!selectedCell) return null;
    return computeCellInfrastructureBreakdown(
      selectedCell.centerLat,
      selectedCell.centerLon,
      facilities
    );
  }, [selectedCell, facilities]);

  const displayedAreas = useMemo(() => {
    if (!resolvedLocality) return [];
    const list = isHi ? resolvedLocality.localAreasHi : resolvedLocality.localAreasEn;
    return list;
  }, [resolvedLocality, isHi]);

  const renderCategoryIcon = (category: InfrastructureCategoryFilter) => {
    const iconClass = "w-3.5 h-3.5 shrink-0";
    switch (category) {
      case "health":
        return <HeartPulse className={iconClass} />;
      case "police":
        return <Shield className={iconClass} />;
      case "fire":
        return <Flame className={iconClass} />;
      case "shelter":
        return <Home className={iconClass} />;
      case "transport":
        return <Bus className={iconClass} />;
      case "schools":
        return <GraduationCap className={iconClass} />;
      case "drainage":
        return <Waves className={iconClass} />;
      case "government":
        return <Building2 className={iconClass} />;
      case "other":
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  // If no cell is selected, show Grid Sector Summary
  if (!selectedCell) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <strong className="text-slate-900 dark:text-white uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
            <span>{isHi ? "ग्रिड सेक्टर सारांश" : "Grid Sector Summary"}</span>
          </strong>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold border border-slate-200 dark:border-slate-700">
            +{timelineHorizon}
          </span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">
              {isHi ? "औसत ग्रिड जोखिम स्कोर:" : "Mean Grid Risk Score:"}
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {riskGrid?.summary.meanRiskScore ?? "--"} / 100
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">
              {isHi ? "विश्लेषित ग्रिड मेश:" : "Analyzed Grid Mesh:"}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {riskGrid?.summary.totalCells ?? 0} {isHi ? "सेल" : "cells"}
            </span>
          </div>
          {facilities && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {isHi ? "सत्यापित अवसंरचना संपत्तियां:" : "Verified Infrastructure:"}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {facilities.totalCount} {isHi ? "इकाइयाँ" : "assets mapped"}
              </span>
            </div>
          )}
        </div>

        {riskGrid && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              {isHi ? "जोखिम वितरण" : "Risk Distribution"}
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block text-sm">
                  {riskGrid.summary.riskDistribution.LOW}
                </span>
                <span className="text-[10px]">{isHi ? "कम जोखिम" : "LOW RISK"}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                <span className="font-bold block text-sm">
                  {riskGrid.summary.riskDistribution.MODERATE}
                </span>
                <span className="text-[10px]">{isHi ? "मध्यम" : "MODERATE"}</span>
              </div>
              <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 text-orange-800 dark:text-orange-300">
                <span className="font-bold block text-sm">
                  {riskGrid.summary.riskDistribution.HIGH}
                </span>
                <span className="text-[10px]">{isHi ? "उच्च" : "HIGH RISK"}</span>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300">
                <span className="font-bold block text-sm">
                  {riskGrid.summary.riskDistribution.SEVERE}
                </span>
                <span className="text-[10px]">{isHi ? "अति गंभीर" : "SEVERE"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-tight">
            {isHi
              ? "स्थानीय इलाके, सत्यापित अवसंरचना एवं जोखिम कारकों का विवरण देखने हेतु मानचित्र में किसी भी ज़ोन पर क्लिक करें।"
              : "Click any risk zone on the map or operational table below to inspect localized place names, infrastructure, and contributing factors."}
          </p>
        </div>
      </div>
    );
  }

  // Active Zone Selected View
  const cellNumber = selectedCell.cellId.replace("grid_cell_", "");
  const riskScore = selectedCell.susceptibilityScore ?? selectedCell.riskScore;
  const riskClass = selectedCell.susceptibilityClass || selectedCell.riskLevel;

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3.5 text-xs">
      {/* 1. Header with Risk Level Badge & Score */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-xs shrink-0"
            style={{ backgroundColor: selectedCell.color }}
          />
          <div className="min-w-0">
            <strong className="text-slate-900 dark:text-white uppercase font-bold truncate block">
              {isHi ? "जोखिम ज़ोन" : "Risk Zone"} #{cellNumber}
            </strong>
            <span className="text-[10px] text-slate-400 font-mono block">
              GPS: {selectedCell.centerLat.toFixed(4)}°N, {selectedCell.centerLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow-xs"
            style={{ backgroundColor: selectedCell.color }}
          >
            {riskClass} ({riskScore}/100)
          </span>
          <button
            onClick={onClearSelection}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Clear zone selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Local Areas in / near this risk zone */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
            <span>
              {isHi
                ? "इस जोखिम क्षेत्र में / आसपास के स्थानीय क्षेत्र"
                : "Local areas in / near this risk zone"}
            </span>
          </div>
          {displayedAreas.length > 3 && (
            <button
              onClick={() => setIsAllAreasModalOpen(true)}
              className="text-[10px] font-semibold text-[#2563EB] hover:underline"
            >
              {isHi ? "सभी देखें" : "View all"} ({displayedAreas.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {displayedAreas.slice(0, 3).map((area, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F3D66] dark:bg-blue-400" />
              <span>{area}</span>
            </span>
          ))}
          {displayedAreas.length > 3 && (
            <button
              onClick={() => setIsAllAreasModalOpen(true)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700"
            >
              +{displayedAreas.length - 3} {isHi ? "अन्य..." : "more..."}
            </button>
          )}
        </div>

        {resolvedLocality?.talukEn && (
          <div className="text-[10px] text-slate-500 pt-0.5">
            <span>{isHi ? "तालुका / उप-मंडल:" : "Sub-Division / Taluk:"}</span>{" "}
            <strong>{isHi ? resolvedLocality.talukHi : resolvedLocality.talukEn}</strong>
          </div>
        )}
      </div>

      {/* 3. Key Contributing Factors & Data Completeness */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">
            {isHi ? "अनुमानित वर्षा" : "Forecast Precip"} (+{selectedCell.forecastWindow}):
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {selectedCell.forecastRainMm} mm
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">
            {isHi ? "पूर्ववर्ती (24घं / 48घं):" : "Antecedent (24h / 48h):"}
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {selectedCell.antecedent24hMm} mm / {selectedCell.antecedent48hMm} mm
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{isHi ? "ऊँचाई / ढलान:" : "Elevation / Slope:"}</span>
          <span className="text-slate-800 dark:text-slate-200">
            {selectedCell.elevationMeters}m ({selectedCell.slopePercent}%)
          </span>
        </div>
        {selectedCell.relativeElevationMeters !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{isHi ? "सापेक्ष बेसिन कमी:" : "Relative Deficit:"}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              +{selectedCell.relativeElevationMeters}m
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{isHi ? "जलमार्ग बफर:" : "Waterway Buffer:"}</span>
          <span className="text-slate-800 dark:text-slate-200">
            {selectedCell.distanceToRiverMeters
              ? `${selectedCell.distanceToRiverMeters} m`
              : isHi
              ? "मैप नहीं किया गया"
              : "Not Mapped"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[10px]">
          <div className="flex items-center gap-1 text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{isHi ? "डेटा पूर्णता:" : "Data Completeness:"}</span>
          </div>
          <span className="font-bold text-[#2563EB]">
            {selectedCell.dataCompleteness}% ({selectedCell.dataCompletenessLevel || "HIGH"})
          </span>
        </div>
      </div>

      {/* 4. Infrastructure Breakdown in & near this zone */}
      {infraBreakdown && (
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
              <span>{isHi ? "अवसंरचना संपत्तियां" : "Verified Infrastructure"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                {infraBreakdown.totalInside} {isHi ? "अंदर" : "Inside"}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                {infraBreakdown.totalNear} {isHi ? "समीप" : "Near"}
              </span>
            </div>
          </div>

          {/* List of categories with assets in this zone */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {infraBreakdown.allAssets.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">
                {isHi
                  ? "इस ग्रिड सेल या 1000m बफर में कोई महत्वपूर्ण सार्वजनिक संपत्ति नहीं मिली।"
                  : "No mapped critical infrastructure inside this grid cell or within 1000m buffer."}
              </p>
            ) : (
              infraBreakdown.allAssets.slice(0, 5).map((asset) => (
                <div
                  key={asset.item.id}
                  onClick={() => {
                    if (onFocusAsset) {
                      onFocusAsset(asset.item.latitude, asset.item.longitude);
                    }
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-[#0F3D66] dark:text-blue-400 shrink-0">
                      {renderCategoryIcon(asset.category)}
                    </div>
                    <div className="min-w-0">
                      <strong className="text-slate-900 dark:text-white text-[11px] truncate block leading-snug">
                        {asset.item.name}
                      </strong>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {asset.item.address || `${asset.distanceToCenterMeters}m from center`}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        asset.relationship === "INSIDE"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {asset.relationship === "INSIDE" ? (isHi ? "ज़ोन अंदर" : "INSIDE") : (isHi ? "समीप" : "NEAR")}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))
            )}

            {infraBreakdown.allAssets.length > 5 && (
              <p className="text-[10px] text-slate-400 italic text-center pt-1">
                +{infraBreakdown.allAssets.length - 5} {isHi ? "अन्य संपत्तियां मैप पर दर्शित" : "more assets visible on map"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 5. Plain Language Operational Explanation */}
      {selectedCell.plainLanguageExplanation && (
        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong>{isHi ? "विश्लेषण सारांश:" : "Analysis Summary:"}</strong>{" "}
          {isHi && selectedCell.plainLanguageExplanationHi
            ? selectedCell.plainLanguageExplanationHi
            : selectedCell.plainLanguageExplanation}
        </div>
      )}

      {/* Modal: View All Local Areas for Selected Cell */}
      {isAllAreasModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isHi
                    ? `ज़ोन #${cellNumber} के सभी स्थानीय क्षेत्र`
                    : `All Local Areas in Zone #${cellNumber}`}
                </h3>
              </div>
              <button
                onClick={() => setIsAllAreasModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isHi
                ? "इस जोखिम क्षेत्र में अथवा इसकी परिधि से निकट सत्यापित इलाके, बस्तियाँ एवं वार्ड:"
                : "Verified localities, neighborhoods, and municipal wards falling inside or directly adjacent to this risk zone:"}
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {displayedAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0F3D66] dark:bg-blue-400 shrink-0" />
                    <span>{area}</span>
                  </div>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {isHi ? "प्राथमिक सेक्टर" : "Primary Sector"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAllAreasModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0F3D66] text-white text-xs font-semibold hover:bg-[#0F3D66]/90 transition"
              >
                {isHi ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
