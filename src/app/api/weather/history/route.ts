import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalArchive } from "@/lib/services/historical-weather";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates, validateCalendarDateRange } from "@/lib/security/validation";
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
  const startDate = searchParams.get("start_date") ?? searchParams.get("startDate");
  const endDate = searchParams.get("end_date") ?? searchParams.get("endDate");
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

  if (!startDate || !endDate) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required date range parameters: 'start_date' and 'end_date' (ISO format YYYY-MM-DD).",
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

  const dateCheck = validateCalendarDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return NextResponse.json(
      { success: false, error: dateCheck.error },
      { status: 400 }
    );
  }

  try {
    const result = await fetchHistoricalArchive({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      districtName: district,
      startDate: dateCheck.start,
      endDate: dateCheck.end,
      bypassCache: refresh,
    });

    if (!result.success) {
      const isTimeout = result.error?.includes("timed out");
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to retrieve historical archive telemetry from Open-Meteo.",
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
    const message = sanitizeErrorMessage(err, "Internal historical archive server error");
    return NextResponse.json(
      { success: false, error: `Internal error processing historical telemetry: ${message}` },
      { status: 500 }
    );
  }
}
