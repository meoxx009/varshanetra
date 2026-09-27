import { NextRequest, NextResponse } from "next/server";
import { getDistrictInfrastructure } from "@/lib/services/infrastructure";
import { getActiveIncidentsAsMapFeatures } from "@/lib/services/incidents";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates, validateStrictRadius } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

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

  const radiusCheck = validateStrictRadius(radiusParam, 1000, 30000, 8000);
  if (!radiusCheck.valid) {
    return NextResponse.json(
      { success: false, error: radiusCheck.error },
      { status: 400 }
    );
  }
  const radius = radiusCheck.radius;

  try {
    const result = await getDistrictInfrastructure({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      radiusMeters: radius,
      bypassCache: refresh,
    });

    // Merge real active incidents & response teams into facilities layer
    let liveFacilities = result.data;
    try {
      const { getActiveResponseTeamsAsMapFeatures } = await import("@/lib/services/response-teams");
      const { getActiveSheltersAsMapFeatures } = await import("@/lib/services/resources");
      const { getActiveFieldReportsAsMapFeatures } = await import("@/lib/services/field-reports");
      const [activeIncidents, activeTeams, activeShelters, liveReports] = await Promise.all([
        getActiveIncidentsAsMapFeatures(),
        getActiveResponseTeamsAsMapFeatures(),
        getActiveSheltersAsMapFeatures(),
        getActiveFieldReportsAsMapFeatures(),
      ]);

      if (liveFacilities) {
        liveFacilities = {
          ...liveFacilities,
          incidents: activeIncidents.length > 0 ? activeIncidents : liveFacilities.incidents,
          responseTeams: activeTeams,
          shelters: activeShelters,
          fieldReports: liveReports.length > 0 ? liveReports : liveFacilities.fieldReports,
          totalCount:
            liveFacilities.hospitals.length +
            liveFacilities.clinics.length +
            liveFacilities.police.length +
            liveFacilities.fire.length +
            liveFacilities.schools.length +
            liveFacilities.rivers.length +
            (liveReports.length > 0 ? liveReports.length : liveFacilities.fieldReports.length) +
            activeIncidents.length +
            activeTeams.length +
            activeShelters.length,
        };
      }
    } catch (e) {
      console.warn("[VarshaNetra] Could not load live incidents, response teams, shelters, or field reports for map facilities layer:", e);
    }

    return NextResponse.json({
      success: true,
      data: liveFacilities,
      metadata: liveFacilities?.metadata || result.data?.metadata,
      cached: result.cached ?? false,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal facilities error");
    return NextResponse.json(
      { success: false, error: `Failed to fetch district facilities: ${message}` },
      { status: 500 }
    );
  }
}

