/**
 * Spatial Flood Risk Grid Intelligence Service
 * VarshaNetra Emergency Early Warning System (VARSHANETRA-11)
 *
 * Generates and caches a bounded, deterministic spatial analysis grid
 * combining meteorological forecasts (+3h, +6h, +12h, +24h), antecedent soil saturation,
 * high-resolution DEM elevation & slope, and OSM river hydrography.
 * Converts outputs to standard GeoJSON FeatureCollection<Polygon> with strict color mapping:
 * - LOW: #16A34A
 * - MODERATE: #EAB308
 * - HIGH: #EA580C
 * - SEVERE: #DC2626
 */

import {
  ForecastWindow,
  SpatialRiskGridFeatureCollection,
  SpatialRiskGridFeature,
  SpatialRiskCellProperties,
  FloodRiskLevel,
  DataSourceMeta,
} from "@/types";
import { fetchWeatherForecast, validateCoordinates } from "./weather";
import { fetchAntecedentPrecipitation } from "./historical-weather";
import { getTerrainAttributes, isCoordinateWithinPilot, getPilotTerrainDataset } from "./terrain";
import { calculateFloodRisk, calculateInundationSusceptibility } from "./flood-risk-engine";
import { getDistrictInfrastructure } from "./infrastructure";

export const SPATIAL_GRID_COLORS: Record<FloodRiskLevel, string> = {
  LOW: "#16A34A",
  MODERATE: "#EAB308",
  HIGH: "#EA580C",
  SEVERE: "#DC2626",
};

const GRID_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes server-side cache

// In-memory cache for spatial GeoJSON grids
const gridCache = new Map<string, { data: SpatialRiskGridFeatureCollection; timestamp: number }>();

export interface SpatialGridOptions {
  latitude: number;
  longitude: number;
  window?: ForecastWindow;
  bypassCache?: boolean;
}

/**
 * Calculates distance from a point to a line segment in meters.
 */
function distancePointToSegmentMeters(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const R = 6371000; // Earth radius in meters
  // Convert lat/lon degrees to approximate local metric coordinates
  const meanLatRad = (((py + ay) / 2) * Math.PI) / 180;
  const kx = (Math.PI / 180) * R * Math.cos(meanLatRad);
  const ky = (Math.PI / 180) * R;

  const Px = px * kx;
  const Py = py * ky;
  const Ax = ax * kx;
  const Ay = ay * ky;
  const Bx = bx * kx;
  const By = by * ky;

  const dx = Bx - Ax;
  const dy = By - Ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dPx = Px - Ax;
    const dPy = Py - Ay;
    return Math.sqrt(dPx * dPx + dPy * dPy);
  }

  let t = ((Px - Ax) * dx + (Py - Ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = Ax + t * dx;
  const projY = Ay + t * dy;
  const distX = Px - projX;
  const distY = Py - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Computes minimum distance from a grid center to any mapped river line geometry.
 */
function computeMinRiverDistance(
  lat: number,
  lon: number,
  riverGeometries: [number, number][][]
): number {
  if (!riverGeometries.length) return 3500; // Default distant baseline if no rivers loaded

  let minDistance = Infinity;

  for (let i = 0; i < riverGeometries.length; i++) {
    const coords = riverGeometries[i];
    for (let j = 0; j < coords.length - 1; j++) {
      const [lat1, lon1] = coords[j];
      const [lat2, lon2] = coords[j + 1];
      const dist = distancePointToSegmentMeters(lon, lat, lon1, lat1, lon2, lat2);
      if (dist < minDistance) {
        minDistance = dist;
        if (minDistance < 50) return minDistance; // Fast early exit for near-bank
      }
    }
  }

  return minDistance === Infinity ? 3500 : Math.round(minDistance);
}

/**
 * Generates a bounded analysis grid covering the pilot sector or a local perimeter.
 */
export async function generateSpatialFloodRiskGrid(
  options: SpatialGridOptions
): Promise<{
  success: boolean;
  data?: SpatialRiskGridFeatureCollection;
  error?: string;
  cached?: boolean;
}> {
  const coordCheck = validateCoordinates(options.latitude, options.longitude);
  if (!coordCheck.valid) {
    return { success: false, error: coordCheck.error };
  }

  const { lat, lon } = coordCheck;
  const window: ForecastWindow = options.window || "24h";
  const inPilot = isCoordinateWithinPilot(lat, lon);

  const cacheKey = `grid_${lat.toFixed(2)}_${lon.toFixed(2)}_${window}_${inPilot ? "pilot" : "local"}`;

  if (!options.bypassCache) {
    const cached = gridCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GRID_CACHE_TTL_MS) {
      return { success: true, data: cached.data, cached: true };
    }
  }

  try {
    // 1. Fetch meteorological & antecedent baseline once for the region
    const [forecastRes, antecedentRes, infraRes] = await Promise.all([
      fetchWeatherForecast({ latitude: lat, longitude: lon, days: 2 }),
      fetchAntecedentPrecipitation({ latitude: lat, longitude: lon, days: 3 }),
      getDistrictInfrastructure({ latitude: lat, longitude: lon, radiusMeters: 12000 }),
    ]);

    // Extract forecast precipitation for the requested window
    let forecastMm = 0;
    if (forecastRes.success && forecastRes.data) {
      const acc = forecastRes.data.accumulations;
      switch (window) {
        case "3h":
          forecastMm = acc.next3h;
          break;
        case "6h":
          forecastMm = acc.next6h;
          break;
        case "12h":
          forecastMm = acc.next12h;
          break;
        case "24h":
        default:
          forecastMm = acc.next24h;
          break;
      }
    }

    const antecedent24h = antecedentRes.success && antecedentRes.data ? antecedentRes.data.precip24h : 0;
    const antecedent48h = antecedentRes.success && antecedentRes.data ? antecedentRes.data.precip48h : 0;

    // Collect river line geometries
    const riverGeometries: [number, number][][] = [];
    if (infraRes.success && infraRes.data && infraRes.data.rivers) {
      for (const r of infraRes.data.rivers) {
        if (r.geometry && r.geometry.length > 1) {
          riverGeometries.push(r.geometry);
        }
      }
    }

    // 2. Determine Bounding Box & Cell Mesh Resolution
    let minLat: number;
    let maxLat: number;
    let minLon: number;
    let maxLon: number;
    let stepDeg: number;

    if (inPilot) {
      // Use pilot sector DEM bounding box: 18.30 to 18.74, 73.66 to 74.06
      // Step by 0.04 deg (~4.4 km) -> 11 lat steps x 10 lon steps = ~110 cells
      const pilotDataset = getPilotTerrainDataset();
      minLat = pilotDataset.bbox.minLat;
      maxLat = pilotDataset.bbox.maxLat;
      minLon = pilotDataset.bbox.minLon;
      maxLon = pilotDataset.bbox.maxLon;
      stepDeg = 0.04;
    } else {
      // Center a local bounded grid (~16 km x 16 km box)
      const halfSpan = 0.08;
      minLat = Number((lat - halfSpan).toFixed(3));
      maxLat = Number((lat + halfSpan).toFixed(3));
      minLon = Number((lon - halfSpan).toFixed(3));
      maxLon = Number((lon + halfSpan).toFixed(3));
      stepDeg = 0.02; // 8x8 = 64 cells
    }

    const features: SpatialRiskGridFeature[] = [];
    let scoreSum = 0;
    const distribution: Record<FloodRiskLevel, number> = {
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      SEVERE: 0,
    };

    const halfStep = stepDeg / 2;
    let cellIndex = 1;

    for (let cLat = minLat + halfStep; cLat < maxLat; cLat += stepDeg) {
      for (let cLon = minLon + halfStep; cLon < maxLon; cLon += stepDeg) {
        const cellLat = Number(cLat.toFixed(4));
        const cellLon = Number(cLon.toFixed(4));
        const cellId = `grid_cell_${cellIndex++}`;

        // Retrieve terrain slope & elevation for this cell center
        const terrainRes = getTerrainAttributes(cellLat, cellLon);
        const elevation = terrainRes.isWithinPilot && terrainRes.data ? terrainRes.data.elevationMeters : 580;
        const slope = terrainRes.isWithinPilot && terrainRes.data ? terrainRes.data.slopePercent : 2.5;
        const classification = terrainRes.isWithinPilot && terrainRes.data ? terrainRes.data.classification : "FLAT_PLAIN";

        // Calculate river proximity
        const riverDist = computeMinRiverDistance(cellLat, cellLon, riverGeometries);
        const relativeElevation = terrainRes.isWithinPilot && terrainRes.data
          ? Math.max(0, terrainRes.data.elevationMeters - 522)
          : undefined;

        // Compute deterministic flood risk index for this cell
        const riskResult = calculateFloodRisk({
          forecastRain24h: forecastMm,
          antecedent24h,
          antecedent48h,
          elevationOrSlope: slope,
          distanceToRiverMeters: riverDist,
          forecastWindow: window,
        });

        // Compute experimental inundation susceptibility
        const susceptibilityResult = calculateInundationSusceptibility({
          forecastRainMm: forecastMm,
          forecastWindow: window,
          antecedent24hMm: antecedent24h,
          antecedent48hMm: antecedent48h,
          elevationMeters: terrainRes.isWithinPilot ? elevation : undefined,
          relativeElevationMeters: relativeElevation,
          slopePercent: terrainRes.isWithinPilot ? slope : undefined,
          distanceToWaterwayMeters: riverDist !== 3500 ? riverDist : undefined,
        });

        const riskLevel = riskResult.riskLevel;
        const riskScore = riskResult.riskScore;
        const color = SPATIAL_GRID_COLORS[riskLevel];

        scoreSum += riskScore;
        distribution[riskLevel]++;

        // GeoJSON Polygon coordinates: SouthWest -> SouthEast -> NorthEast -> NorthWest -> SouthWest
        const west = Number((cLon - halfStep).toFixed(4));
        const east = Number((cLon + halfStep).toFixed(4));
        const south = Number((cLat - halfStep).toFixed(4));
        const north = Number((cLat + halfStep).toFixed(4));

        const coordinates: number[][][] = [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ];

        const properties: SpatialRiskCellProperties = {
          cellId,
          centerLat: cellLat,
          centerLon: cellLon,
          riskScore,
          riskLevel,
          color,
          forecastRainMm: forecastMm,
          forecastWindow: window,
          antecedent24hMm: antecedent24h,
          antecedent48hMm: antecedent48h,
          elevationMeters: elevation,
          slopePercent: slope,
          terrainClassification: classification,
          distanceToRiverMeters: riverDist,
          dataCompleteness: susceptibilityResult.dataCompleteness,
          dataCompletenessLevel: susceptibilityResult.completenessLevel,
          susceptibilityScore: susceptibilityResult.score,
          susceptibilityClass: susceptibilityResult.susceptibilityClass,
          relativeElevationMeters: relativeElevation,
          contributingFactors: susceptibilityResult.contributingFactors,
          calculatedAt: riskResult.calculatedAt,
          isWithinPilot: terrainRes.isWithinPilot,
          summaryReasons: susceptibilityResult.summaryReasons,
          summaryReasonsHi: susceptibilityResult.summaryReasonsHi,
          plainLanguageExplanation: susceptibilityResult.plainLanguageExplanation,
          plainLanguageExplanationHi: susceptibilityResult.plainLanguageExplanationHi,
        };

        features.push({
          type: "Feature",
          id: cellId,
          geometry: {
            type: "Polygon",
            coordinates,
          },
          properties,
        });
      }
    }

    const totalCells = features.length;
    const meanScore = totalCells > 0 ? Number((scoreSum / totalCells).toFixed(1)) : 0;

    const metadata: DataSourceMeta = {
      provider: "VarshaNetra Spatial Risk Grid Engine",
      lastUpdated: new Date().toISOString(),
      origin: "ESTIMATED",
      attributionNotice:
        "Multi-factor spatial mesh derived from Open-Meteo forecasts, NASA SRTM / Copernicus DEM, and OSM waterway vectors.",
      url: "https://open-meteo.com/",
    };

    const collection: SpatialRiskGridFeatureCollection = {
      type: "FeatureCollection",
      features,
      summary: {
        totalCells,
        forecastWindow: window,
        calculatedAt: new Date().toISOString(),
        meanRiskScore: meanScore,
        riskDistribution: distribution,
        colorMap: SPATIAL_GRID_COLORS,
      },
      metadata,
    };

    gridCache.set(cacheKey, { data: collection, timestamp: Date.now() });

    return { success: true, data: collection, cached: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Spatial risk mesh computation failed";
    return { success: false, error: msg };
  }
}
