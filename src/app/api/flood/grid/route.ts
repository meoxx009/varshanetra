import { NextRequest, NextResponse } from "next/server";
import { generateSpatialFloodRiskGrid } from "@/lib/services/spatial-flood-grid";
import { ForecastWindow } from "@/types";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const windowParam = searchParams.get("window") as ForecastWindow | null;
  const refreshParam = searchParams.get("refresh") === "true";

  const coordCheck = validateStrictCoordinates(latParam, lonParam);
  if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
    return NextResponse.json(
      { success: false, error: coordCheck.error || "Valid coordinates required." },
      { status: 400 }
    );
  }

  let window: ForecastWindow = "24h";
  if (windowParam && ["3h", "6h", "12h", "24h"].includes(windowParam)) {
    window = windowParam;
  }

  try {
    const gridRes = await generateSpatialFloodRiskGrid({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      window,
      bypassCache: refreshParam,
    });

    if (!gridRes.success || !gridRes.data) {
      return NextResponse.json(
        { success: false, error: gridRes.error || "Failed to generate spatial flood risk grid." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gridRes.data,
      cached: gridRes.cached,
      metadata: gridRes.data.metadata,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Internal error generating spatial flood grid");
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
