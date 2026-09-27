import { NextRequest, NextResponse } from "next/server";
import { fetchMultiModelEnsemble } from "@/lib/services/weather-ensemble";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limiting (60 req/min for weather endpoints)
  const rl = checkRateLimit(request, "weather");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const refresh = searchParams.get("refresh") === "true";

  if (!latParam || !lonParam) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required query parameters: 'lat' and 'lon'.",
      },
      { status: 400 }
    );
  }

  const coordCheck = validateStrictCoordinates(latParam, lonParam);
  if (!coordCheck.valid) {
    return NextResponse.json(
      { success: false, error: coordCheck.error },
      { status: 400 }
    );
  }

  try {
    const data = await fetchMultiModelEnsemble(
      coordCheck.lat,
      coordCheck.lon,
      refresh
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to fetch NWP multi-model ensemble");
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
