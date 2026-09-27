import { NextRequest, NextResponse } from "next/server";
import { getCanonicalTelemetrySnapshot } from "@/lib/services/canonical-telemetry";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/risk
 * Public, non-sensitive disaster risk advisory endpoint.
 * Powered by canonical multi-provider telemetry snapshot for single-source-of-truth.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const cityId = searchParams.get("cityId") || searchParams.get("district") || undefined;

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (latParam && lonParam) {
      const coordCheck = validateStrictCoordinates(latParam, lonParam);
      if (coordCheck.valid) {
        latitude = coordCheck.lat;
        longitude = coordCheck.lon;
      }
    }

    const snapshotResult = await getCanonicalTelemetrySnapshot({
      cityId,
      latitude,
      longitude,
    });

    const data = snapshotResult.data;

    return NextResponse.json({
      success: true,
      snapshotId: data.snapshotId,
      district: data.location.displayName,
      cityId: data.location.cityId || data.location.id,
      name_en: data.location.name_en || data.location.displayNameEn,
      name_hi: data.location.name_hi || data.location.nameHi,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      riskLevel: data.derivedRisk.riskLevel, // "LOW" | "MODERATE" | "HIGH" | "SEVERE"
      score: data.derivedRisk.riskScore,
      rainfall24hMm: data.forecast.accumulations.next24h,
      lastUpdated: data.generatedAt,
      cached: snapshotResult.cached ?? false,
      category: data.derivedRisk.category,
      explanationEn: data.derivedRisk.plainLanguageExplanationEn,
      explanationHi: data.derivedRisk.plainLanguageExplanationHi,
      canonicalAssessment: {
        snapshotId: data.canonicalAssessment.snapshotId,
        locationId: data.canonicalAssessment.locationId,
        riskCategory: data.canonicalAssessment.riskCategory,
        riskScore: data.canonicalAssessment.riskScore,
        confidence: data.canonicalAssessment.confidence,
        dataCompleteness: data.canonicalAssessment.dataCompleteness,
        plainLanguageExplanationEn: data.canonicalAssessment.plainLanguageExplanationEn,
        plainLanguageExplanationHi: data.canonicalAssessment.plainLanguageExplanationHi,
        calculatedAt: data.canonicalAssessment.calculatedAt,
        modelVersion: data.canonicalAssessment.modelVersion,
      },
      weather: {
        temperature: data.observations.temperature,
        relativeHumidity: data.observations.relativeHumidity,
        precipitation: data.observations.precipitation,
        windSpeed: data.observations.windSpeed,
        windDirectionCompass: data.observations.windDirectionCompass,
        weatherDescription: data.observations.weatherDescription,
        observedAt: data.observations.observedAt,
        status: data.observations.status || "LIVE",
      },
      officialAlerts: {
        hasActiveWarning: data.officialAlerts.hasActiveWarning,
        colorCode: data.officialAlerts.colorCode,
        colorCodeEn: data.officialAlerts.colorCodeEn,
        colorCodeHi: data.officialAlerts.colorCodeHi,
        headlineEn: data.officialAlerts.headlineEn,
        headlineHi: data.officialAlerts.headlineHi,
        narrativeEn: data.officialAlerts.narrativeEn,
        narrativeHi: data.officialAlerts.narrativeHi,
        severity: data.officialAlerts.severity,
        issuedAt: data.officialAlerts.issuedAt,
        source: data.officialAlerts.source,
      },
      radar: {
        available: data.radar.available,
        status: data.radar.status,
        source: data.radar.source,
      },
      sourceHealth: data.sources,
      advisory: "Public early warning assessment derived from canonical VarshaNetra hydrological engine.",
    });
  } catch (err) {
    console.error("[/api/public/risk] Error:", err);
    // Truthful failure state without mock masquerading (Rule 14 & Rule 18)
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(err),
        status: "UNAVAILABLE",
        advisory: "Canonical telemetry snapshot is currently unavailable for the specified location.",
      },
      { status: 503 }
    );
  }
}
