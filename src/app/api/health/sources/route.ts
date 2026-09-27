import { NextRequest, NextResponse } from "next/server";
import {
  checkAllDataSourcesHealth,
  checkOpenMeteoHealth,
  checkOsmBaseMapHealth,
  checkNominatimHealth,
  checkOverpassHealth,
  checkSupabaseHealth,
  checkTerrainDatasetHealth,
  checkRiskEngineHealth,
  checkNasaGpmHealth,
  checkTomorrowIoHealth,
} from "@/lib/services/data-sources";
import { DataSourceId } from "@/types/data-sources";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/sources
 * Performs concurrent live health audits across all 7 data sources.
 * Supports ?simulate_fail=open-meteo for automated acceptance testing of degradation handling.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulateFail = searchParams.get("simulate_fail") || undefined;

    const result = await checkAllDataSourcesHealth(simulateFail);

    return NextResponse.json({
      success: true,
      summary: result.summary,
      sources: result.sources,
      timestamp: result.timestamp,
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Internal health evaluation error");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/sources
 * On-demand manual re-check of a specific data source or all sources.
 */
export async function POST(request: NextRequest) {
  try {
    let sourceId: DataSourceId | undefined;
    try {
      const body = await request.json();
      sourceId = body?.sourceId;
    } catch {
      // Empty body is valid: triggers full re-audit
    }

    if (sourceId) {
      let singleSource;
      switch (sourceId) {
        case "open-meteo":
          singleSource = await checkOpenMeteoHealth();
          break;
        case "osm-base-map":
          singleSource = await checkOsmBaseMapHealth();
          break;
        case "osm-nominatim":
          singleSource = await checkNominatimHealth();
          break;
        case "osm-overpass":
          singleSource = await checkOverpassHealth();
          break;
        case "supabase":
          singleSource = await checkSupabaseHealth(true);
          break;
        case "terrain-dataset":
          singleSource = await checkTerrainDatasetHealth();
          break;
        case "risk-engine":
          singleSource = await checkRiskEngineHealth();
          break;
        case "nasa-gpm":
          singleSource = await checkNasaGpmHealth();
          break;
        case "tomorrowio-nowcast":
          singleSource = await checkTomorrowIoHealth();
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Unknown data source id: ${sourceId}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        source: singleSource,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await checkAllDataSourcesHealth();
    return NextResponse.json({
      success: true,
      summary: result.summary,
      sources: result.sources,
      timestamp: result.timestamp,
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Manual health audit error");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
