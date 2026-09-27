import { NextRequest, NextResponse } from "next/server";
import { getCanonicalDistrict } from "@/data/supportedDistricts";
import { getCanonicalTelemetrySnapshot } from "@/lib/services/canonical-telemetry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtQuery =
      searchParams.get("district") ||
      searchParams.get("districtId") ||
      searchParams.get("cityId") ||
      "pune";

    const district = getCanonicalDistrict(districtQuery);
    const snapshotRes = await getCanonicalTelemetrySnapshot({
      cityId: district.id,
      districtId: district.id,
      latitude: district.latitude,
      longitude: district.longitude,
    });

    const snapshot = snapshotRes.data;

    return NextResponse.json({
      success: true,
      data: {
        district: {
          id: district.id,
          name: district.displayNameEn || district.shortName,
          nameHi: district.nameHi,
          state: district.state,
          latitude: district.latitude,
          longitude: district.longitude,
        },
        risk: {
          level: snapshot.derivedRisk.riskLevel,
          score: snapshot.derivedRisk.riskScore,
          susceptibilityClass: snapshot.derivedRisk.floodSusceptibilityClass,
          explanationEn: snapshot.derivedRisk.plainLanguageExplanationEn,
          explanationHi: snapshot.derivedRisk.plainLanguageExplanationHi,
          contributingFactors: snapshot.derivedRisk.contributingFactors,
        },
        officialWarning: snapshot.officialAlerts,
        weather: {
          currentRainfall: snapshot.observations.precipitation,
          accumulations: snapshot.forecast.accumulations,
          observedAt: snapshot.observations.observedAt,
        },
        generatedAt: snapshot.generatedAt,
      },
      cached: snapshotRes.cached ?? false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generating flood summary";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
