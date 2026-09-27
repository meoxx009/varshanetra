"use strict";

import {
  FacilitiesGroupedResponse,
  FacilityCategory,
  MapFeatureItem,
  SpatialRiskCellProperties,
  SpatialRiskGridFeatureCollection,
  DataSourceMeta,
} from "@/types";

export type ImpactDepartment = "HEALTH" | "EMERGENCY" | "EDUCATION" | "TRANSPORT";

export type ExposureLevel =
  | "DIRECT_SEVERE"
  | "DIRECT_HIGH"
  | "PROXIMITY_BUFFER"
  | "MODERATE_ZONE"
  | "LOW_RISK";

export interface ExposedFacilityItem {
  id: string;
  name: string;
  category: FacilityCategory;
  categoryLabel: string;
  department: ImpactDepartment;
  departmentLabel: string;
  latitude: number;
  longitude: number;
  address?: string;
  contactNumber?: string;
  operator?: string;
  osmId?: number;
  osmType?: string;
  osmUrl?: string;
  exposureLevel: ExposureLevel;
  exposureStatusLabel: string;
  severityColor: string;
  intersectedCellId?: string;
  cellRiskLevel?: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  cellRiskScore?: number;
  distanceToHighRiskMeters: number;
  forecastRainMm?: number;
  actionRecommendation: string;
}

export interface SpatialImpactAnalysisSummary {
  totalMappedFacilities: number;
  totalHighOrSevereExposed: number;
  directSevereCount: number;
  directHighCount: number;
  bufferProximityCount: number;
  byDepartment: {
    health: { total: number; highRiskCount: number };
    emergency: { total: number; highRiskCount: number };
    education: { total: number; highRiskCount: number };
    transport: { total: number; highRiskCount: number };
  };
  analysisTimestamp: string;
  forecastWindow: string;
  pilotDistrict: string;
  metadata: DataSourceMeta;
}

export interface SpatialImpactResult {
  summary: SpatialImpactAnalysisSummary;
  facilities: ExposedFacilityItem[];
}

/**
 * Calculates Haversine distance in meters between two lat/lon points.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Maps a facility category to its civic/disaster management department.
 */
export function mapCategoryToDepartment(category: FacilityCategory): {
  department: ImpactDepartment;
  departmentLabel: string;
  categoryLabel: string;
} {
  switch (category) {
    case "HOSPITAL":
      return {
        department: "HEALTH",
        departmentLabel: "Health & Medical",
        categoryLabel: "Hospital",
      };
    case "CLINIC":
      return {
        department: "HEALTH",
        departmentLabel: "Health & Medical",
        categoryLabel: "Clinic / Primary Health Centre",
      };
    case "POLICE":
      return {
        department: "EMERGENCY",
        departmentLabel: "Emergency Services",
        categoryLabel: "Police Station",
      };
    case "FIRE_STATION":
      return {
        department: "EMERGENCY",
        departmentLabel: "Emergency Services",
        categoryLabel: "Fire & Rescue Station",
      };
    case "SCHOOL":
      return {
        department: "EDUCATION",
        departmentLabel: "Education & Shelters",
        categoryLabel: "School / Designated Shelter",
      };
    case "RIVER":
      return {
        department: "TRANSPORT",
        departmentLabel: "Waterways & Drainage",
        categoryLabel: "River Channel / Waterway",
      };
    default:
      return {
        department: "TRANSPORT",
        departmentLabel: "Civic Infrastructure",
        categoryLabel: "Mapped Infrastructure",
      };
  }
}

/**
 * Generates actionable operational guidance based on department and exposure level.
 */
function getRecommendation(
  dept: ImpactDepartment,
  exposure: ExposureLevel,
  rainMm?: number
): string {
  const rainNote = typeof rainMm === "number" && rainMm > 0 ? ` (${rainMm}mm forecast)` : "";

  if (dept === "HEALTH") {
    if (exposure === "DIRECT_SEVERE" || exposure === "DIRECT_HIGH") {
      return `Critical: Verify basement drainage & generator elevation${rainNote}. Alert EMS for elevated ambulance ingress routes.`;
    }
    if (exposure === "PROXIMITY_BUFFER") {
      return "Advisory: Deploy sandbag barriers at driveway gates; inspect emergency power backup & potable water reserves.";
    }
    return "Normal: Maintain standard operational standby and hospital contingency roster.";
  }

  if (dept === "EMERGENCY") {
    if (exposure === "DIRECT_SEVERE" || exposure === "DIRECT_HIGH") {
      return `Immediate: Pre-rig rescue boats (IRBs)${rainNote}. Relocate low-lying tactical vehicles to elevated terrain.`;
    }
    if (exposure === "PROXIMITY_BUFFER") {
      return "Advisory: Ready water-rescue gear and maintain VHF/satellite dispatch standby.";
    }
    return "Normal: Monitor wireless channel and execute routine disaster beat patrols.";
  }

  if (dept === "EDUCATION") {
    if (exposure === "DIRECT_SEVERE" || exposure === "DIRECT_HIGH") {
      return `Hazard: Do NOT designate as flood relief camp${rainNote}. If occupied, initiate orderly transfer to upland facilities.`;
    }
    if (exposure === "PROXIMITY_BUFFER") {
      return "Precaution: Inspect perimeter walls and ground drainage before certifying as temporary shelter.";
    }
    return "Ready: Facility eligible for relief shelter activation; verify sanitation facilities.";
  }

  // TRANSPORT / WATERWAYS
  if (exposure === "DIRECT_SEVERE" || exposure === "DIRECT_HIGH") {
    return `Critical: Monitor causeway freeboard${rainNote}; barricade low-level bridges and deploy traffic wardens.`;
  }
  if (exposure === "PROXIMITY_BUFFER") {
    return "Advisory: Station municipal pump crew near culverts to prevent localized surcharging.";
  }
  return "Normal: Keep natural drainage channels clear of debris and silting.";
}

interface CellWithBounds {
  properties: SpatialRiskCellProperties;
  bounds: { south: number; north: number; west: number; east: number };
}

/**
 * Computes spatial intersection between risk grid cells and mapped facilities.
 */
export function computeSpatialImpactAnalysis(
  riskGrid: SpatialRiskGridFeatureCollection | null,
  facilities: FacilitiesGroupedResponse | null,
  districtName = "Pune District"
): SpatialImpactResult {
  // Collect all raw features across all categories
  const allFeatures: MapFeatureItem[] = [];
  if (facilities) {
    if (Array.isArray(facilities.hospitals)) allFeatures.push(...facilities.hospitals);
    if (Array.isArray(facilities.clinics)) allFeatures.push(...facilities.clinics);
    if (Array.isArray(facilities.police)) allFeatures.push(...facilities.police);
    if (Array.isArray(facilities.fire)) allFeatures.push(...facilities.fire);
    if (Array.isArray(facilities.schools)) allFeatures.push(...facilities.schools);
    if (Array.isArray(facilities.rivers)) allFeatures.push(...facilities.rivers);
  }

  // Extract cell geometries and bounding boxes
  const allCells: CellWithBounds[] = [];
  if (riskGrid && Array.isArray(riskGrid.features)) {
    for (const feat of riskGrid.features) {
      if (feat.properties && feat.geometry && Array.isArray(feat.geometry.coordinates?.[0])) {
        const coords = feat.geometry.coordinates[0];
        const west = Math.min(...coords.map((c) => c[0]));
        const east = Math.max(...coords.map((c) => c[0]));
        const south = Math.min(...coords.map((c) => c[1]));
        const north = Math.max(...coords.map((c) => c[1]));
        allCells.push({
          properties: feat.properties,
          bounds: { south, north, west, east },
        });
      }
    }
  }

  const highAndSevereCells = allCells.filter(
    (c) => c.properties.riskLevel === "HIGH" || c.properties.riskLevel === "SEVERE"
  );

  const exposedItems: ExposedFacilityItem[] = [];

  for (const item of allFeatures) {
    const { department, departmentLabel, categoryLabel } = mapCategoryToDepartment(item.category);

    let matchedCell: SpatialRiskCellProperties | null = null;
    let minDistanceToHighRisk = Infinity;

    // 1. Direct bounding box test against high/severe cells first
    for (const cell of highAndSevereCells) {
      const b = cell.bounds;
      if (
        item.latitude >= b.south &&
        item.latitude <= b.north &&
        item.longitude >= b.west &&
        item.longitude <= b.east
      ) {
        matchedCell = cell.properties;
        minDistanceToHighRisk = 0;
        break; // matched directly
      }
    }

    // 2. If not matched to high/severe, check all cells to find cell containing it
    if (!matchedCell) {
      for (const cell of allCells) {
        const b = cell.bounds;
        if (
          item.latitude >= b.south &&
          item.latitude <= b.north &&
          item.longitude >= b.west &&
          item.longitude <= b.east
        ) {
          matchedCell = cell.properties;
          break;
        }
      }
    }

    // 3. Compute distance to nearest high or severe cell center for proximity testing
    for (const cell of highAndSevereCells) {
      const dist = calculateDistanceMeters(
        item.latitude,
        item.longitude,
        cell.properties.centerLat,
        cell.properties.centerLon
      );
      if (dist < minDistanceToHighRisk) {
        minDistanceToHighRisk = dist;
      }
    }

    // Determine exposure level
    let exposureLevel: ExposureLevel = "LOW_RISK";
    let exposureStatusLabel = "Low Risk Zone";
    let severityColor = "#16A34A";

    if (matchedCell && matchedCell.riskLevel === "SEVERE") {
      exposureLevel = "DIRECT_SEVERE";
      exposureStatusLabel = "Direct Exposure (Severe Risk)";
      severityColor = "#DC2626";
    } else if (matchedCell && matchedCell.riskLevel === "HIGH") {
      exposureLevel = "DIRECT_HIGH";
      exposureStatusLabel = "Direct Exposure (High Risk)";
      severityColor = "#EA580C";
    } else if (minDistanceToHighRisk <= 500) {
      exposureLevel = "PROXIMITY_BUFFER";
      exposureStatusLabel = `Buffer Proximity (${minDistanceToHighRisk}m)`;
      severityColor = "#D97706";
    } else if (matchedCell && matchedCell.riskLevel === "MODERATE") {
      exposureLevel = "MODERATE_ZONE";
      exposureStatusLabel = "Moderate Alert Zone";
      severityColor = "#EAB308";
    }

    exposedItems.push({
      id: item.id,
      name: item.name || `Unnamed ${categoryLabel}`,
      category: item.category,
      categoryLabel,
      department,
      departmentLabel,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
      contactNumber: item.contactNumber,
      operator: item.operator,
      osmId: item.osmId,
      osmType: item.osmType,
      osmUrl: item.osmUrl,
      exposureLevel,
      exposureStatusLabel,
      severityColor,
      intersectedCellId: matchedCell?.cellId,
      cellRiskLevel: matchedCell?.riskLevel,
      cellRiskScore: matchedCell?.riskScore,
      distanceToHighRiskMeters: minDistanceToHighRisk === Infinity ? 9999 : minDistanceToHighRisk,
      forecastRainMm: matchedCell?.forecastRainMm,
      actionRecommendation: getRecommendation(
        department,
        exposureLevel,
        matchedCell?.forecastRainMm
      ),
    });
  }

  // Summary aggregation
  const directSevereCount = exposedItems.filter((i) => i.exposureLevel === "DIRECT_SEVERE").length;
  const directHighCount = exposedItems.filter((i) => i.exposureLevel === "DIRECT_HIGH").length;
  const bufferProximityCount = exposedItems.filter((i) => i.exposureLevel === "PROXIMITY_BUFFER").length;
  const totalHighOrSevereExposed = directSevereCount + directHighCount + bufferProximityCount;

  const isExposed = (i: ExposedFacilityItem) =>
    i.exposureLevel === "DIRECT_SEVERE" ||
    i.exposureLevel === "DIRECT_HIGH" ||
    i.exposureLevel === "PROXIMITY_BUFFER";

  const healthItems = exposedItems.filter((i) => i.department === "HEALTH");
  const emergencyItems = exposedItems.filter((i) => i.department === "EMERGENCY");
  const educationItems = exposedItems.filter((i) => i.department === "EDUCATION");
  const transportItems = exposedItems.filter((i) => i.department === "TRANSPORT");

  const summary: SpatialImpactAnalysisSummary = {
    totalMappedFacilities: exposedItems.length,
    totalHighOrSevereExposed,
    directSevereCount,
    directHighCount,
    bufferProximityCount,
    byDepartment: {
      health: {
        total: healthItems.length,
        highRiskCount: healthItems.filter(isExposed).length,
      },
      emergency: {
        total: emergencyItems.length,
        highRiskCount: emergencyItems.filter(isExposed).length,
      },
      education: {
        total: educationItems.length,
        highRiskCount: educationItems.filter(isExposed).length,
      },
      transport: {
        total: transportItems.length,
        highRiskCount: transportItems.filter(isExposed).length,
      },
    },
    analysisTimestamp: new Date().toISOString(),
    forecastWindow: riskGrid?.summary?.forecastWindow || "24h",
    pilotDistrict: districtName,
    metadata: {
      provider: "VarshaNetra Spatial Intersect & OpenStreetMap Overpass",
      lastUpdated: new Date().toISOString(),
      origin: "LIVE_API",
      attributionNotice:
        "Infrastructure geometries © OpenStreetMap contributors. Exposure calculated via deterministic spatial bounding test against VarshaNetra risk grid.",
      url: "https://www.openstreetmap.org/copyright",
    },
  };

  return {
    summary,
    facilities: exposedItems,
  };
}

/**
 * Formats exposed facilities as an RFC 4180 compliant CSV string for download.
 */
export function generateExposedFacilitiesCsv(facilities: ExposedFacilityItem[]): string {
  const headers = [
    "Facility ID",
    "Facility Name",
    "Department",
    "Category",
    "Exposure Status",
    "Risk Level",
    "Risk Score",
    "Distance to High Risk (m)",
    "Forecast Rain (mm)",
    "Latitude",
    "Longitude",
    "Contact Number",
    "Operator",
    "OSM ID",
    "Action Recommendation",
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = facilities.map((f) => [
    escapeCsv(f.id),
    escapeCsv(f.name),
    escapeCsv(f.departmentLabel),
    escapeCsv(f.categoryLabel),
    escapeCsv(f.exposureStatusLabel),
    escapeCsv(f.cellRiskLevel || "N/A"),
    escapeCsv(f.cellRiskScore ?? "N/A"),
    escapeCsv(f.distanceToHighRiskMeters),
    escapeCsv(f.forecastRainMm ?? "N/A"),
    escapeCsv(f.latitude.toFixed(5)),
    escapeCsv(f.longitude.toFixed(5)),
    escapeCsv(f.contactNumber || "N/A"),
    escapeCsv(f.operator || "N/A"),
    escapeCsv(f.osmId ? `${f.osmType || "node"}/${f.osmId}` : "N/A"),
    escapeCsv(f.actionRecommendation),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}
