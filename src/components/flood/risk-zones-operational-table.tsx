"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import {
  SpatialRiskGridFeatureCollection,
  SpatialRiskGridFeature,
  SpatialRiskCellProperties,
  FacilitiesGroupedResponse,
  FloodRiskLevel,
} from "@/types";
import { useLocale } from "@/lib/i18n/context";
import {
  resolveLocalAreasForCell,
  computeCellInfrastructureBreakdown,
  CellInfrastructureBreakdown,
  ResolvedLocalAreas,
} from "@/lib/services/risk-zone-locality";

interface RiskZonesOperationalTableProps {
  riskGrid: SpatialRiskGridFeatureCollection | null;
  facilities: FacilitiesGroupedResponse | null;
  selectedCellId?: string | null;
  onSelectZone: (cell: SpatialRiskCellProperties) => void;
  isLoading?: boolean;
}

interface EnrichedRiskZoneRow {
  feature: SpatialRiskGridFeature;
  properties: SpatialRiskCellProperties;
  cellNumber: string;
  localities: ResolvedLocalAreas;
  infrastructure: CellInfrastructureBreakdown;
  primaryAreaText: string;
  allAreasText: string;
  infrastructureSummaryEn: string;
  infrastructureSummaryHi: string;
}

const STORAGE_KEY = "varshanetra_risk_zones_expanded_session";

export function RiskZonesOperationalTable({
  riskGrid,
  facilities,
  selectedCellId,
  onSelectZone,
  isLoading = false,
}: RiskZonesOperationalTableProps) {
  const locale = useLocale();
  const isHi = locale === "hi";

  // Session-bound collapsible state (defaults to COLLAPSED to prevent vertical clutter)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored !== null) return stored === "true";
      } catch {
        // Fallback for private browsing/sandboxes
      }
    }
    return false; // Default: COLLAPSED
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"score" | "zone" | "assets">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Total zone count calculated cheaply
  const totalZonesCount = riskGrid?.features?.length ?? 0;

  // Lazy-render / lazy-compute enriched rows: only calculated when the section is expanded
  const enrichedRows = useMemo<EnrichedRiskZoneRow[]>(() => {
    if (!isExpanded || !riskGrid || !riskGrid.features) return [];

    return riskGrid.features.map((feature) => {
      const props = feature.properties;
      const cellNumber = props.cellId.replace("grid_cell_", "");
      const localities = resolveLocalAreasForCell(props.centerLat, props.centerLon, facilities);
      const infrastructure = computeCellInfrastructureBreakdown(
        props.centerLat,
        props.centerLon,
        facilities
      );

      const areaList = isHi ? localities.localAreasHi : localities.localAreasEn;
      const primaryAreaText = areaList[0] || (isHi ? "स्थानीय सेक्टर" : "Local Sector");
      const allAreasText = areaList.join(", ");

      // Summarize key infrastructure
      const partsEn: string[] = [];
      const partsHi: string[] = [];

      const healthCount = infrastructure.byCategory.health.inside + infrastructure.byCategory.health.near;
      if (healthCount > 0) {
        partsEn.push(`${healthCount} Health`);
        partsHi.push(`${healthCount} स्वास्थ्य केंद्र`);
      }
      const fireCount = infrastructure.byCategory.fire.inside + infrastructure.byCategory.fire.near;
      if (fireCount > 0) {
        partsEn.push(`${fireCount} Fire`);
        partsHi.push(`${fireCount} अग्निशमन`);
      }
      const policeCount = infrastructure.byCategory.police.inside + infrastructure.byCategory.police.near;
      if (policeCount > 0) {
        partsEn.push(`${policeCount} Police`);
        partsHi.push(`${policeCount} पुलिस`);
      }
      const shelterCount = infrastructure.byCategory.shelter.inside + infrastructure.byCategory.shelter.near;
      if (shelterCount > 0) {
        partsEn.push(`${shelterCount} Shelter`);
        partsHi.push(`${shelterCount} आश्रय`);
      }
      const drainCount = infrastructure.byCategory.drainage.inside + infrastructure.byCategory.drainage.near;
      if (drainCount > 0) {
        partsEn.push(`${drainCount} Waterways`);
        partsHi.push(`${drainCount} जलमार्ग`);
      }

      const totalAssets = infrastructure.totalInside + infrastructure.totalNear;
      const infrastructureSummaryEn =
        partsEn.length > 0
          ? partsEn.join(" • ")
          : totalAssets > 0
          ? `${totalAssets} Mapped Assets`
          : "None within 1km";

      const infrastructureSummaryHi =
        partsHi.length > 0
          ? partsHi.join(" • ")
          : totalAssets > 0
          ? `${totalAssets} सत्यापित संपत्तियां`
          : "1km में कोई नहीं";

      return {
        feature,
        properties: props,
        cellNumber,
        localities,
        infrastructure,
        primaryAreaText,
        allAreasText,
        infrastructureSummaryEn,
        infrastructureSummaryHi,
      };
    });
  }, [isExpanded, riskGrid, facilities, isHi]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    if (!isExpanded) return [];
    let result = [...enrichedRows];

    // Filter by risk level
    if (filterLevel !== "ALL") {
      result = result.filter(
        (row) =>
          (row.properties.susceptibilityClass || row.properties.riskLevel) === filterLevel
      );
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.cellNumber.includes(q) ||
          row.allAreasText.toLowerCase().includes(q) ||
          row.infrastructureSummaryEn.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "score") {
        const scoreA = a.properties.susceptibilityScore ?? a.properties.riskScore;
        const scoreB = b.properties.susceptibilityScore ?? b.properties.riskScore;
        comparison = scoreA - scoreB;
      } else if (sortField === "zone") {
        comparison = parseInt(a.cellNumber, 10) - parseInt(b.cellNumber, 10);
      } else if (sortField === "assets") {
        const countA = a.infrastructure.totalInside + a.infrastructure.totalNear;
        const countB = b.infrastructure.totalInside + b.infrastructure.totalNear;
        comparison = countA - countB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [isExpanded, enrichedRows, filterLevel, searchQuery, sortField, sortOrder]);

  const handleRowClick = (props: SpatialRiskCellProperties) => {
    onSelectZone(props);
    const mapEl = document.getElementById("flood-map-section");
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderRiskBadge = (level: FloodRiskLevel, score: number) => {
    switch (level) {
      case "SEVERE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase text-white bg-[#DC2626] shadow-xs">
            <ShieldAlert className="w-3 h-3" />
            <span>{isHi ? "अति गंभीर" : "SEVERE"} ({score})</span>
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase text-white bg-[#EA580C] shadow-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>{isHi ? "उच्च" : "HIGH"} ({score})</span>
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase text-slate-900 bg-[#EAB308] shadow-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{isHi ? "मध्यम" : "MODERATE"} ({score})</span>
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase text-white bg-[#16A34A] shadow-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isHi ? "सामान्य" : "LOW"} ({score})</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-300">
      {/* 1. COMPACT COLLAPSIBLE HEADER (Always Visible & Fully Clickable) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="risk-zones-table-content"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
          isExpanded
            ? "border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0F3D66] dark:text-blue-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isHi ? "जोखिम क्षेत्र एवं स्थानीय क्षेत्र" : "Risk Zones & Local Areas"}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {totalZonesCount} {isHi ? "ज़ोन" : "Zones"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHi
              ? "स्थानिक जोखिम ग्रिड का स्थानीय बस्तियों, वार्डों एवं सत्यापित सार्वजनिक संपत्तियों से सह-संबंध।"
              : "Operational correlation of spatial risk mesh cells with local place names and verified infrastructure."}
          </p>
        </div>

        {/* Primary Expand / Collapse Action Control */}
        <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            aria-expanded={isExpanded}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs border bg-[#0F3D66] hover:bg-[#0c3152] text-white border-[#0F3D66]"
          >
            <span>
              {isExpanded
                ? (isHi ? "संक्षिप्त करें" : "Collapse Table")
                : (isHi ? "जोखिम क्षेत्र देखें" : "View Risk Zones")}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED CONTENT (Rendered only when isExpanded is true) */}
      {isExpanded && (
        <div id="risk-zones-table-content" className="animate-in fade-in-50 duration-200">
          {/* Filter and Search Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isHi
                    ? "इलाके का नाम या ज़ोन संख्या खोजें..."
                    : "Search locality name, ward, or zone #..."
                }
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F3D66]"
              />
            </div>

            {/* Level Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" />
                <span>{isHi ? "स्तर:" : "Level:"}</span>
              </span>
              {(["ALL", "SEVERE", "HIGH", "MODERATE", "LOW"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                    filterLevel === lvl
                      ? "bg-[#0F3D66] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {lvl === "ALL" ? (isHi ? "सभी" : "All") : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#0F3D66] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                {isHi ? "स्थानिक ज़ोन डेटा लोड हो रहा है..." : "Loading spatial zone dataset..."}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredRows.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isHi ? "कोई मेल खाता ज़ोन नहीं मिला" : "No Matching Risk Zones Found"}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {isHi
                  ? "दिए गए खोज या फ़िल्टर मापदंडों के अनुसार कोई जोखिम सेल नहीं मिली। फ़िल्टर रीसेट करें।"
                  : "No risk cells matched your search query or filter criteria. Try clearing search or resetting filters."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterLevel("ALL");
                }}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                {isHi ? "फ़िल्टर रीसेट करें" : "Reset Filters"}
              </button>
            </div>
          )}

          {/* Desktop / Tablet Table View */}
          {!isLoading && filteredRows.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                    <th
                      onClick={() => {
                        if (sortField === "zone") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("zone");
                          setSortOrder("asc");
                        }
                      }}
                      className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isHi ? "जोखिम ज़ोन" : "Risk Zone"}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      {isHi ? "स्थानीय क्षेत्र / इलाके" : "Local Areas"}
                    </th>
                    <th
                      onClick={() => {
                        if (sortField === "assets") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("assets");
                          setSortOrder("desc");
                        }
                      }}
                      className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isHi ? "प्रमुख अवसंरचना" : "Key Infrastructure"}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortField === "score") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("score");
                          setSortOrder("desc");
                        }
                      }}
                      className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isHi ? "जोखिम स्तर" : "Risk Level"}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                      {isHi ? "अद्यतन" : "Updated"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRows.map((row) => {
                    const isSelected = selectedCellId === row.properties.cellId;
                    const level = (row.properties.susceptibilityClass ||
                      row.properties.riskLevel) as FloodRiskLevel;
                    const score = row.properties.susceptibilityScore ?? row.properties.riskScore;

                    return (
                      <tr
                        key={row.properties.cellId}
                        onClick={() => handleRowClick(row.properties)}
                        className={`transition cursor-pointer select-none ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/40 font-medium border-l-4 border-l-[#0F3D66] dark:border-l-blue-400"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Column 1: Risk Zone */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-xs shrink-0"
                              style={{ backgroundColor: row.properties.color }}
                            />
                            <div>
                              <strong className="text-slate-900 dark:text-white block font-bold">
                                {isHi ? `ज़ोन #${row.cellNumber}` : `Zone #${row.cellNumber}`}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {row.properties.centerLat.toFixed(3)}°N, {row.properties.centerLon.toFixed(3)}°E
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Local Areas */}
                        <td className="py-3.5 px-4">
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200 block text-xs">
                              {row.primaryAreaText}
                            </strong>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {row.allAreasText}
                            </p>
                          </div>
                        </td>

                        {/* Column 3: Key Infrastructure */}
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                            {isHi ? row.infrastructureSummaryHi : row.infrastructureSummaryEn}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>
                              {row.infrastructure.totalInside} {isHi ? "अंदर" : "Inside"}
                            </span>
                            <span>•</span>
                            <span>
                              {row.infrastructure.totalNear} {isHi ? "समीप (<=1km)" : "Near (<=1km)"}
                            </span>
                          </div>
                        </td>

                        {/* Column 4: Risk Level */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRiskBadge(level, score)}
                        </td>

                        {/* Column 5: Updated */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(row.properties.calculatedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Screen Card Layout */}
          {!isLoading && filteredRows.length > 0 && (
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const isSelected = selectedCellId === row.properties.cellId;
                const level = (row.properties.susceptibilityClass ||
                  row.properties.riskLevel) as FloodRiskLevel;
                const score = row.properties.susceptibilityScore ?? row.properties.riskScore;

                return (
                  <div
                    key={row.properties.cellId}
                    onClick={() => handleRowClick(row.properties)}
                    className={`p-3.5 space-y-2 transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-l-[#0F3D66]"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: row.properties.color }}
                        />
                        <strong className="text-slate-900 dark:text-white font-bold text-xs">
                          {isHi ? `ज़ोन #${row.cellNumber}` : `Zone #${row.cellNumber}`}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {row.properties.centerLat.toFixed(3)}°N
                        </span>
                      </div>
                      <div>{renderRiskBadge(level, score)}</div>
                    </div>

                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 text-xs block">
                        {row.primaryAreaText}
                      </strong>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {row.allAreasText}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {isHi ? row.infrastructureSummaryHi : row.infrastructureSummaryEn}
                      </span>
                      <div className="flex items-center gap-1 text-[#2563EB] font-bold text-xs">
                        <span>{isHi ? "मानचित्र" : "Map"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Info */}
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span>
              {isHi
                ? "सत्यापित ओपन-मीटिओ पूर्वानुमान, डीईएम स्थलाकृति एवं ओपनस्ट्रीटमैप अवसंरचना पर आधारित।"
                : "Multi-factor spatial resolution derived from Open-Meteo NWP, SRTM DEM, and OpenStreetMap."}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              VNET-FLOOD-MAP-003
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
