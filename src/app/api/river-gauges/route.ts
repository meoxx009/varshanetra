import { NextRequest, NextResponse } from "next/server";
import {
  getRiverGauges,
  createRiverGauge,
} from "@/lib/services/river-gauges";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gauges = await getRiverGauges();
    const dangerCount = gauges.filter(
      (g) => g.status === "DANGER" || g.status === "CRITICAL"
    ).length;
    const warningCount = gauges.filter((g) => g.status === "WARNING").length;

    return NextResponse.json({
      success: true,
      data: gauges,
      summary: {
        totalStations: gauges.length,
        dangerCount,
        warningCount,
        normalCount: gauges.length - dangerCount - warningCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to fetch river gauges");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to register a river gauge station.");
  }

  try {
    const body = await request.json();

    if (!body.station_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Station name is required." },
        { status: 400 }
      );
    }
    if (!body.river_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "River name is required." },
        { status: 400 }
      );
    }
    if (!body.district?.trim()) {
      return NextResponse.json(
        { success: false, error: "District is required." },
        { status: 400 }
      );
    }
    if (!body.state?.trim()) {
      return NextResponse.json(
        { success: false, error: "State is required." },
        { status: 400 }
      );
    }

    const created = await createRiverGauge(
      {
        station_name: body.station_name.trim(),
        station_code: body.station_code?.trim() || undefined,
        river_name: body.river_name.trim(),
        district: body.district.trim(),
        state: body.state.trim(),
        latitude: body.latitude ? Number(body.latitude) : undefined,
        longitude: body.longitude ? Number(body.longitude) : undefined,
        danger_level_m: body.danger_level_m ? Number(body.danger_level_m) : undefined,
        warning_level_m: body.warning_level_m ? Number(body.warning_level_m) : undefined,
        normal_level_m: body.normal_level_m ? Number(body.normal_level_m) : undefined,
        cwc_station_url: body.cwc_station_url?.trim() || undefined,
      },
      auth.user?.id
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to create river gauge station");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
