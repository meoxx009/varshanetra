import { NextRequest, NextResponse } from "next/server";
import {
  queryOsmInfrastructureByType,
  MAX_SEARCH_RADIUS_METERS,
} from "@/lib/services/infrastructure";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates, validateStrictRadius } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";
import { SupportedOsmType } from "@/types";

export const dynamic = "force-dynamic";

const VALID_OSM_TYPES: Set<SupportedOsmType> = new Set([
  "hospital",
  "clinic",
  "police",
  "fire_station",
  "school",
  "river",
  "stream",
]);

export async function GET(request: NextRequest) {
  // Rate limiting (30 req/min for Overpass queries)
  const rl = checkRateLimit(request, "overpass");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude") ?? searchParams.get("lng");
  const radiusParam = searchParams.get("radius");
  const typesParam = searchParams.get("types") ?? searchParams.get("type");
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

  // Radius validation: strictly within [100, MAX_SEARCH_RADIUS_METERS]
  const radiusCheck = validateStrictRadius(radiusParam, 100, MAX_SEARCH_RADIUS_METERS, 8000);
  if (!radiusCheck.valid) {
    return NextResponse.json(
      { success: false, error: radiusCheck.error },
      { status: 400 }
    );
  }
  const radius = radiusCheck.radius;

  // Type filter validation
  let requestedTypes: SupportedOsmType[] = [
    "hospital",
    "clinic",
    "police",
    "fire_station",
    "school",
    "river",
    "stream",
  ];

  if (typesParam && typesParam.trim() !== "" && typesParam.trim().toLowerCase() !== "all") {
    const rawTypes = typesParam
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const invalidTypes = rawTypes.filter((t) => !VALID_OSM_TYPES.has(t as SupportedOsmType));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid infrastructure type(s): '${invalidTypes.join(", ")}'. Allowed types: ${Array.from(VALID_OSM_TYPES).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (rawTypes.length > 0) {
      requestedTypes = rawTypes as SupportedOsmType[];
    }
  }

  try {
    const result = await queryOsmInfrastructureByType({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      radiusMeters: radius,
      types: requestedTypes,
      bypassCache: refresh,
    });

    return NextResponse.json({
      success: true,
      data: result.data || [],
      byCategory: result.byCategory || {},
      queryMeta: result.queryMeta,
      metadata: result.metadata,
      cached: result.cached ?? false,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal infrastructure query error");
    return NextResponse.json(
      { success: false, error: `Failed to query OpenStreetMap infrastructure: ${message}` },
      { status: 500 }
    );
  }
}
