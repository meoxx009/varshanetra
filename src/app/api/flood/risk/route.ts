import { NextRequest, NextResponse } from "next/server";
import {
  calculateFloodRisk,
  calculateInundationSusceptibility,
  calculateFloodRiskScore,
  type RiskAssessmentInput,
} from "@/lib/services/flood-risk-engine";
import { fetchWeatherForecast } from "@/lib/services/weather";
import { fetchAntecedentPrecipitation } from "@/lib/services/historical-weather";
import { getTerrainAttributes } from "@/lib/services/terrain";
import { getMosdacSatelliteData } from "@/lib/services/mosdac";
import { DataSourceMeta, FloodRiskEngineInputs, ForecastWindow } from "@/types";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

const FLOOD_ENGINE_META: DataSourceMeta = {
  provider: "VarshaNetra Multi-Factor Decision-Support Risk Engine (V1)",
  lastUpdated: new Date().toISOString(),
  origin: "ESTIMATED",
  attributionNotice:
    "Experimental algorithmic index (CC BY 4.0 Open-Meteo inputs, ODbL OpenStreetMap hydrography, NASA/Copernicus DEM). Not an operationally validated probability.",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const forecastParam = searchParams.get("forecast_24h");
  const antecedent24Param = searchParams.get("antecedent_24h");
  const antecedent48Param = searchParams.get("antecedent_48h");
  const slopeParam = searchParams.get("slope");
  const riverDistParam = searchParams.get("river_dist");
  const windowParam = (searchParams.get("window") as ForecastWindow) || "24h";

  const coordCheck = validateStrictCoordinates(latParam, lonParam);
  if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
    return NextResponse.json(
      { success: false, error: coordCheck.error || "Valid geographic coordinates required." },
      { status: 400 }
    );
  }

  try {
    let forecastRain24h = forecastParam ? parseFloat(forecastParam) : NaN;
    let antecedent24h = antecedent24Param ? parseFloat(antecedent24Param) : NaN;
    let antecedent48h = antecedent48Param ? parseFloat(antecedent48Param) : NaN;

    // If explicit parameter overrides are not provided, query the live weather and antecedent services
    if (isNaN(forecastRain24h) || isNaN(antecedent24h) || isNaN(antecedent48h)) {
      const [forecastRes, antecedentRes] = await Promise.all([
        fetchWeatherForecast({ latitude: coordCheck.lat, longitude: coordCheck.lon, days: 2 }),
        fetchAntecedentPrecipitation({ latitude: coordCheck.lat, longitude: coordCheck.lon, days: 3 }),
      ]);

      if (isNaN(forecastRain24h)) {
        if (forecastRes.success && forecastRes.data) {
          switch (windowParam) {
            case "3h":
              forecastRain24h = forecastRes.data.accumulations.next3h;
              break;
            case "6h":
              forecastRain24h = forecastRes.data.accumulations.next6h;
              break;
            case "12h":
              forecastRain24h = forecastRes.data.accumulations.next12h;
              break;
            default:
              forecastRain24h = forecastRes.data.accumulations.next24h;
              break;
          }
        } else {
          forecastRain24h = 0;
        }
      }
      if (isNaN(antecedent24h)) {
        antecedent24h = antecedentRes.success && antecedentRes.data ? antecedentRes.data.precip24h : 0;
      }
      if (isNaN(antecedent48h)) {
        antecedent48h = antecedentRes.success && antecedentRes.data ? antecedentRes.data.precip48h : 0;
      }
    }

    // Resolve terrain slope and elevation from prepared pilot dataset if not explicitly overridden
    let derivedSlope: number | undefined = slopeParam ? parseFloat(slopeParam) : undefined;
    let elevationMeters: number | undefined;
    const terrainRes = getTerrainAttributes(coordCheck.lat, coordCheck.lon);
    if (terrainRes.isWithinPilot && terrainRes.data) {
      if (derivedSlope === undefined || isNaN(derivedSlope)) {
        derivedSlope = terrainRes.data.slopePercent;
      }
      elevationMeters = terrainRes.data.elevationMeters;
    }

    // Check optional or live MOSDAC ISRO satellite telemetry
    const mosdacRateParam = searchParams.get("mosdac_rate");
    const mosdacTempParam = searchParams.get("mosdac_temp");
    let mosdacRainfallRate = mosdacRateParam ? parseFloat(mosdacRateParam) : undefined;
    let mosdacCloudTempKelvin = mosdacTempParam ? parseFloat(mosdacTempParam) : undefined;

    if (mosdacRainfallRate === undefined || isNaN(mosdacRainfallRate)) {
      try {
        const mosdacRes = await getMosdacSatelliteData("District", coordCheck.lat, coordCheck.lon);
        if (mosdacRes && typeof mosdacRes.rainfall_rate_mmhr === "number") {
          mosdacRainfallRate = mosdacRes.rainfall_rate_mmhr;
          mosdacCloudTempKelvin = mosdacRes.cloud_top_temperature;
        }
      } catch {
        // Gracefully ignore MOSDAC lookup in flood engine
      }
    }

    // Check optional satellite rainfall observation (NASA GPM IMERG)
    const satParam = searchParams.get("satellite_rainfall") ?? searchParams.get("nasa_gpm") ?? searchParams.get("satellite_mm");
    const satRainfall = satParam ? parseFloat(satParam) : undefined;

    // Check optional official IMD rainfall observation (data.gov.in LIVE-005)
    const imdParam = searchParams.get("imd_rainfall") ?? searchParams.get("imd_mm") ?? searchParams.get("official_rainfall");
    const imdRainfall = imdParam ? parseFloat(imdParam) : undefined;

    const inputs: FloodRiskEngineInputs = {
      forecastRain24h: Math.max(0, forecastRain24h),
      antecedent24h: Math.max(0, antecedent24h),
      antecedent48h: Math.max(0, antecedent48h),
      elevationOrSlope: derivedSlope,
      distanceToRiverMeters: riverDistParam ? parseFloat(riverDistParam) : undefined,
      forecastWindow: windowParam,
      mosdacRainfallRate: isNaN(mosdacRainfallRate as number) ? undefined : mosdacRainfallRate,
      mosdacCloudTempKelvin: isNaN(mosdacCloudTempKelvin as number) ? undefined : mosdacCloudTempKelvin,
      nasaGpmRainfallMm: !isNaN(satRainfall as number) ? satRainfall : undefined,
      satelliteRainfallMm: !isNaN(satRainfall as number) ? satRainfall : undefined,
      imdOfficialRainfallMm: !isNaN(imdRainfall as number) ? imdRainfall : undefined,
    };

    const result = calculateFloodRisk(inputs);
    result.metadata = FLOOD_ENGINE_META;

    // Compute experimental inundation susceptibility
    const susceptibility = calculateInundationSusceptibility({
      forecastRainMm: inputs.forecastRain24h,
      forecastWindow: windowParam,
      antecedent24hMm: inputs.antecedent24h,
      antecedent48hMm: inputs.antecedent48h,
      elevationMeters,
      slopePercent: derivedSlope,
      distanceToWaterwayMeters: inputs.distanceToRiverMeters,
    });
    result.susceptibility = susceptibility;

    return NextResponse.json({
      success: true,
      data: result,
      metadata: FLOOD_ENGINE_META,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal flood risk calculation error");
    return NextResponse.json(
      { success: false, error: `Failed to compute flood risk index: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flood/risk
 *
 * Supports multi-factor RiskAssessmentInput with satellite rainfall weighting
 * or direct FloodRiskEngineInputs payloads.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if body is formatted as RiskAssessmentInput
    if (
      typeof body.nwpRainfallMm === "number" ||
      typeof body.riverWaterLevelMeters === "number" ||
      typeof body.soilMoistureIndex === "number"
    ) {
      const assessmentInput: RiskAssessmentInput = {
        districtName: body.districtName || "Target Area",
        nwpRainfallMm: Number(body.nwpRainfallMm) || 0,
        riverWaterLevelMeters: Number(body.riverWaterLevelMeters) || 0,
        soilMoistureIndex: Number(body.soilMoistureIndex) || 0,
        satelliteRainfallMm:
          body.satelliteRainfallMm !== undefined && body.satelliteRainfallMm !== null
            ? Number(body.satelliteRainfallMm)
            : null,
        includeTerrain: body.includeTerrain,
        imdOfficialRainfallMm:
          body.imdOfficialRainfallMm !== undefined && body.imdOfficialRainfallMm !== null
            ? Number(body.imdOfficialRainfallMm)
            : null,
        openMeteoRainfallMm:
          body.openMeteoRainfallMm !== undefined && body.openMeteoRainfallMm !== null
            ? Number(body.openMeteoRainfallMm)
            : null,
        isOfficialGovtData: Boolean(body.isOfficialGovtData),
        radarActive: Boolean(body.radarActive),
        radarLastFrameTime: body.radarLastFrameTime ? String(body.radarLastFrameTime) : null,
        capeJkg:
          body.capeJkg !== undefined && body.capeJkg !== null
            ? Number(body.capeJkg)
            : null,
      };

      const scoreResult = calculateFloodRiskScore(assessmentInput);
      return NextResponse.json({
        success: true,
        data: scoreResult,
        metadata: FLOOD_ENGINE_META,
      });
    }

    // Otherwise, treat as full FloodRiskEngineInputs
    const result = calculateFloodRisk(body as FloodRiskEngineInputs);
    return NextResponse.json({
      success: true,
      data: result,
      metadata: FLOOD_ENGINE_META,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to compute flood risk assessment");
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

