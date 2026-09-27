import { NextRequest, NextResponse } from "next/server";
import { getWeatherData } from "@/lib/services/weatherProvider";
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
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const daysParam = searchParams.get("days");
  const district = searchParams.get("district") || undefined;
  const refresh = searchParams.get("refresh") === "true";

  if (!latParam || !lonParam) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required query parameters: 'lat' and 'lon' (or 'latitude' and 'longitude').",
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

  let days = 7;
  if (daysParam) {
    const parsedDays = parseInt(daysParam, 10);
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 7) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'days' must be an integer between 1 and 7." },
        { status: 400 }
      );
    }
    days = parsedDays;
  }

  try {
    const result = await getWeatherData({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      districtName: district,
      days,
      bypassCache: refresh,
    });

    if (!result.success) {
      const isTimeout = result.error?.includes("timed out");
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to retrieve forecast telemetry from Open-Meteo.",
        },
        { status: isTimeout ? 504 : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
      cached: result.cached ?? false,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal forecast server error");
    return NextResponse.json(
      { success: false, error: `Internal error processing weather forecast: ${message}` },
      { status: 500 }
    );
  }
}
