import { NextRequest, NextResponse } from "next/server";
import { fetchAntecedentPrecipitation } from "@/lib/services/historical-weather";
import { getTerrainAttributes, isCoordinateWithinPilot } from "@/lib/services/terrain";
import { calculateFloodRisk } from "@/lib/services/flood-risk-engine";
import { generateSpatialFloodRiskGrid } from "@/lib/services/spatial-flood-grid";
import { fetchWeatherForecast } from "@/lib/services/weather";
import { getCanonicalTelemetrySnapshot } from "@/lib/services/canonical-telemetry";
import { ForecastWindow } from "@/types";
import { validateStrictCoordinates } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

interface FloodBundleCacheEntry {
  data: unknown;
  timestamp: number;
}

const bundleCache = new Map<string, FloodBundleCacheEntry>();
const BUNDLE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat") ?? searchParams.get("latitude") ?? "18.5204";
    const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? "73.8567";
    const windowParam = (searchParams.get("window") as ForecastWindow) || "24h";
    const refresh = searchParams.get("refresh") === "true";

    const coordCheck = validateStrictCoordinates(latParam, lonParam);
    if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
      return NextResponse.json(
        { success: false, error: coordCheck.error || "Valid geographic coordinates required." },
        { status: 400 }
      );
    }

    const lat = coordCheck.lat;
    const lon = coordCheck.lon;
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${windowParam}`;
    const now = Date.now();

    if (!refresh) {
      const cached = bundleCache.get(cacheKey);
      if (cached && now - cached.timestamp < BUNDLE_CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          timestamp: new Date(cached.timestamp).toISOString(),
        });
      }
    }

    // For the canonical 24h window: delegate entirely to the canonical telemetry snapshot
    // so that /api/flood/bundle?window=24h is guaranteed to return the identical
    // riskLevel and riskScore as /api/telemetry/snapshot and the dashboard.
    if (windowParam === "24h") {
      const [snapshotResult, gridRes] = await Promise.allSettled([
        getCanonicalTelemetrySnapshot({ latitude: lat, longitude: lon }),
        generateSpatialFloodRiskGrid({ latitude: lat, longitude: lon, window: "24h" }),
      ]);

      const terrainRes = getTerrainAttributes(lat, lon);
      const isPilot = isCoordinateWithinPilot(lat, lon);
      const terrainAttrs = terrainRes.isWithinPilot && terrainRes.data
        ? terrainRes.data
        : { elevationMeters: 560, slopePercent: 1.8, classification: "Alluvial Plain" };
      const terrainResult = {
        elevationMeters: terrainAttrs.elevationMeters,
        slopePercent: terrainAttrs.slopePercent,
        classification: terrainAttrs.classification,
        isWithinPilot: isPilot,
      };

      const gridData = gridRes.status === "fulfilled" && gridRes.value.success ? gridRes.value.data : null;

      if (snapshotResult.status === "fulfilled" && snapshotResult.value.success) {
        const snap = snapshotResult.value.data;
        const forecastRainMm = snap.forecast.accumulations.next24h;

        // Reconstruct FloodRiskCalculationResult from the canonical snapshot's derivedRisk
        // so the client-side flood page receives the same riskLevel and riskScore.
        const floodRisk = {
          riskScore: snap.canonicalAssessment.riskScore,
          riskLevel: snap.canonicalAssessment.riskCategory,
          dataCompleteness: snap.canonicalAssessment.dataCompleteness,
          validUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          calculatedAt: snap.canonicalAssessment.calculatedAt,
          contributingFactors: snap.derivedRisk.contributingFactors.map((f) => ({
            key: f.key as import("@/types").FloodRiskFactorKey,
            label: f.label,
            rawValue: f.rawValue,
            unit: f.unit,
            normalizedScore: f.normalizedScore,
            weight: f.weightedContribution > 0 ? f.weightedContribution / (f.normalizedScore || 1) : 0.2,
            weightedContribution: f.weightedContribution,
            available: true,
            rationale: f.rationale,
          })),
          summaryReasons: [snap.canonicalAssessment.plainLanguageExplanationEn],
          technicalExplanation: snap.canonicalAssessment.plainLanguageExplanationEn,
          isExperimental: true as const,
          disclaimer: "Non-statutory algorithmic inundation intelligence. V1.2-CANONICAL.",
          canonicalSnapshotId: snap.snapshotId,
          snapshotId: snap.canonicalAssessment.snapshotId,
          assessmentTimestamp: snap.canonicalAssessment.assessmentTimestamp,
          modelVersion: snap.canonicalAssessment.modelVersion,
          canonicalAssessment: snap.canonicalAssessment,
        };

        const antecedentData = {
          precip24h: snap.forecast.accumulations.next24h > 0 ? snap.forecast.accumulations.next24h : 0,
          precip48h: snap.forecast.accumulations.next48h > 0 ? snap.forecast.accumulations.next48h : 0,
          precip72h: 0,
          soilMoistureIndex: "DRY" as const,
          soilMoistureDescription: "Derived from canonical forecast snapshot",
          runoffRiskMultiplier: 1.0,
          hourlyHistory: [],
        };

        const bundle = {
          antecedent: antecedentData,
          floodRisk,
          terrain: terrainResult,
          riskGrid: gridData,
          accumulatedRainMm: forecastRainMm,
          canonicalSnapshotId: snap.snapshotId,
        };

        bundleCache.set(cacheKey, { data: bundle, timestamp: now });
        return NextResponse.json({
          success: true,
          data: bundle,
          cached: false,
          timestamp: new Date().toISOString(),
        });
      }
      // Fall through to independent calculation if canonical snapshot fails
    }

    // For sub-24h windows (3h, 6h, 12h): independent fast calculation is appropriate
    // since the canonical snapshot always targets 24h accumulations.
    const [weatherRes, antecedentRes, gridRes2] = await Promise.allSettled([
      fetchWeatherForecast({ latitude: lat, longitude: lon, days: 2 }),
      fetchAntecedentPrecipitation({ latitude: lat, longitude: lon, days: 3 }),
      generateSpatialFloodRiskGrid({ latitude: lat, longitude: lon, window: windowParam }),
    ]);

    const weatherData = weatherRes.status === "fulfilled" && weatherRes.value.success ? weatherRes.value.data : null;
    const antecedentData2 = antecedentRes.status === "fulfilled" && antecedentRes.value.success ? antecedentRes.value.data : null;
    const terrainRes2 = getTerrainAttributes(lat, lon);
    const terrainAttrs2 = terrainRes2.isWithinPilot && terrainRes2.data
      ? terrainRes2.data
      : { elevationMeters: 560, slopePercent: 1.8, classification: "Alluvial Plain" };
    const gridData2 = gridRes2.status === "fulfilled" && gridRes2.value.success ? gridRes2.value.data : null;

    let forecastRainMm2 = 0;
    if (weatherData?.accumulations) {
      switch (windowParam) {
        case "3h":
          forecastRainMm2 = weatherData.accumulations.next3h;
          break;
        case "6h":
          forecastRainMm2 = weatherData.accumulations.next6h;
          break;
        case "12h":
          forecastRainMm2 = weatherData.accumulations.next12h;
          break;
        default:
          forecastRainMm2 = weatherData.accumulations.next24h;
          break;
      }
    }

    const antecedent24hMm = antecedentData2?.precip24h ?? 0;
    const antecedent48hMm = antecedentData2?.precip48h ?? 0;
    const slopePercent = terrainAttrs2.slopePercent;
    const elevationMeters = terrainAttrs2.elevationMeters;
    const isPilot2 = isCoordinateWithinPilot(lat, lon);

    const floodRisk2 = calculateFloodRisk({
      forecastRain24h: forecastRainMm2,
      forecastWindow: windowParam,
      antecedent24h: antecedent24hMm,
      antecedent48h: antecedent48hMm,
      elevationOrSlope: slopePercent,
    });

    const terrainResult2 = {
      elevationMeters,
      slopePercent,
      classification: terrainAttrs2.classification,
      isWithinPilot: isPilot2,
    };

    const bundle2 = {
      antecedent: antecedentData2,
      floodRisk: floodRisk2,
      terrain: terrainResult2,
      riskGrid: gridData2,
      accumulatedRainMm: forecastRainMm2,
    };

    bundleCache.set(cacheKey, { data: bundle2, timestamp: now });

    return NextResponse.json({
      success: true,
      data: bundle2,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generating flood bundle";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
