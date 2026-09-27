import { NextRequest, NextResponse } from "next/server";
import { getMosdacSatelliteData } from "@/lib/services/mosdac";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/rainfall/mosdac
 *
 * Query parameters:
 * - district: target district name (default "Pune")
 * - lat: latitude (default 18.5204)
 * - lon: longitude (default 73.8567)
 * - refresh: "true" to force fresh retrieval
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const district = searchParams.get("district") || "Pune";
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const forceRefresh = searchParams.get("refresh") === "true";

    const latitude = latParam ? parseFloat(latParam) : 18.5204;
    const longitude = lonParam ? parseFloat(lonParam) : 73.8567;

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: "Invalid geographic coordinates provided." },
        { status: 400 }
      );
    }

    const data = await getMosdacSatelliteData(district, latitude, longitude, forceRefresh);

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to retrieve MOSDAC ISRO satellite telemetry");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
