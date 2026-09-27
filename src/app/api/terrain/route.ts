import { NextRequest, NextResponse } from "next/server";
import { getTerrainAttributes, getPilotTerrainDataset } from "@/lib/services/terrain";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const gridParam = searchParams.get("grid") === "true";

  // Optional: Return full pilot grid points for map visualization layer
  if (gridParam) {
    const dataset = getPilotTerrainDataset();
    return NextResponse.json({
      success: true,
      data: {
        region: dataset.region,
        bbox: dataset.bbox,
        elevationStats: dataset.elevationStats,
        points: dataset.points,
      },
      metadata: {
        provider: "NASA SRTM & Copernicus GLO-30 DEM",
        lastUpdated: dataset.generatedAt,
        origin: "LIVE_API",
        attributionNotice: "DEM via NASA SRTM / Copernicus Open Access under CC BY 4.0",
      },
    });
  }

  const coordCheck = validateStrictCoordinates(latParam, lonParam);
  if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
    return NextResponse.json(
      { success: false, error: coordCheck.error || "Valid coordinates required." },
      { status: 400 }
    );
  }

  try {
    const result = getTerrainAttributes(coordCheck.lat, coordCheck.lon);

    return NextResponse.json({
      success: true,
      data: result.data,
      isWithinPilot: result.isWithinPilot,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal error resolving terrain intelligence");
    return NextResponse.json(
      { success: false, error: `Internal terrain service error: ${message}` },
      { status: 500 }
    );
  }
}
