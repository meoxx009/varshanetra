import { NextRequest, NextResponse } from "next/server";
import { getCanonicalTelemetrySnapshot } from "@/lib/services/canonical-telemetry";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limiting (60 req/min)
  const rl = checkRateLimit(request, "weather");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const districtParam = searchParams.get("district") || undefined;
  const cityId = searchParams.get("cityId") || districtParam;
  const districtId = searchParams.get("districtId") || districtParam;
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const refresh = searchParams.get("refresh") === "true";

  let latitude: number | undefined;
  let longitude: number | undefined;

  if (latParam && lonParam) {
    const coordCheck = validateStrictCoordinates(latParam, lonParam);
    if (!coordCheck.valid) {
      return NextResponse.json(
        { success: false, error: coordCheck.error },
        { status: 400 }
      );
    }
    latitude = coordCheck.lat;
    longitude = coordCheck.lon;
  }

  try {
    const result = await getCanonicalTelemetrySnapshot({
      cityId,
      districtId,
      latitude,
      longitude,
      bypassCache: refresh,
    });

    const response = NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": refresh
          ? "no-cache, no-store, must-revalidate"
          : "public, s-maxage=60, stale-while-revalidate=120",
        "X-VarshaNetra-City": result.data.location.districtId || result.data.location.id || "pune",
        "X-VarshaNetra-Cached": result.cached ? "HIT" : "MISS",
      },
    });

    return response;
  } catch (error: unknown) {
    console.error("[Canonical Telemetry API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error, "Failed to load canonical telemetry snapshot"),
      },
      { status: 500 }
    );
  }
}
