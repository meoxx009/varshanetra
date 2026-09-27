import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeLocation } from "@/lib/services/geocoding";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, "geocode");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude");

  if (!latParam || !lonParam) {
    return NextResponse.json(
      { success: false, error: "Missing required parameters 'lat' and 'lon'." },
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
    const res = await reverseGeocodeLocation(coordCheck.lat, coordCheck.lon);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to reverse geocode location." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Reverse geocoding error");
    return NextResponse.json(
      { success: false, error: `Reverse geocoding failed: ${msg}` },
      { status: 500 }
    );
  }
}
