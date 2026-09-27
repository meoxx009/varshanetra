import { NextRequest, NextResponse } from "next/server";
import { getFieldReports, createFieldReport } from "@/lib/services/field-reports";
import {
  FieldReportType,
  FIELD_REPORT_TYPES,
  VerificationStatus,
  VERIFICATION_STATUSES,
  SeverityLevel,
  ROAD_STATUSES,
  RoadStatus,
} from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || searchParams.get("verification_status");
    const typeParam = searchParams.get("type") || searchParams.get("report_type");
    const severityParam = searchParams.get("severity");
    const searchParam = searchParams.get("search");

    let status: VerificationStatus | undefined = undefined;
    if (statusParam && (VERIFICATION_STATUSES as readonly string[]).includes(statusParam)) {
      status = statusParam as VerificationStatus;
    }

    let type: FieldReportType | undefined = undefined;
    if (typeParam && (FIELD_REPORT_TYPES as readonly string[]).includes(typeParam)) {
      type = typeParam as FieldReportType;
    }

    let severity: SeverityLevel | undefined = undefined;
    if (severityParam && ["NORMAL", "ADVISORY", "ALERT", "CRITICAL"].includes(severityParam)) {
      severity = severityParam as SeverityLevel;
    }

    const reports = await getFieldReports({
      verification_status: status,
      report_type: type,
      severity,
      search: searchParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: reports,
      total: reports.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error fetching field reports");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to submit ground field reports.");
  }

  try {
    const body = await request.json();

    if (!body.report_type || !(FIELD_REPORT_TYPES as readonly string[]).includes(body.report_type)) {
      return NextResponse.json(
        { success: false, error: `Valid report type is required: ${FIELD_REPORT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.severity || !["NORMAL", "ADVISORY", "ALERT", "CRITICAL"].includes(body.severity)) {
      return NextResponse.json(
        { success: false, error: "Valid severity level is required: NORMAL, ADVISORY, ALERT, CRITICAL." },
        { status: 400 }
      );
    }

    const coordCheck = validateStrictCoordinates(body.latitude, body.longitude);
    if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
      return NextResponse.json({ success: false, error: coordCheck.error || "Valid GPS coordinates required." }, { status: 400 });
    }

    if (coordCheck.lat < 6.0 || coordCheck.lat > 38.0 || coordCheck.lon < 68.0 || coordCheck.lon > 98.0) {
      return NextResponse.json(
        { success: false, error: "Valid GPS coordinates within India bounds are required (Lat 6-38, Lon 68-98)." },
        { status: 400 }
      );
    }

    if (!body.location_name || typeof body.location_name !== "string" || !body.location_name.trim()) {
      return NextResponse.json(
        { success: false, error: "Location landmark or street name is required." },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json(
        { success: false, error: "Observation description is required." },
        { status: 400 }
      );
    }

    if (!body.observer_name || typeof body.observer_name !== "string" || !body.observer_name.trim()) {
      return NextResponse.json(
        { success: false, error: "Observer name or designation is required." },
        { status: 400 }
      );
    }

    let waterDepth: number | undefined = undefined;
    if (body.observed_water_depth_cm !== undefined && body.observed_water_depth_cm !== null && body.observed_water_depth_cm !== "") {
      const parsedDepth = parseInt(body.observed_water_depth_cm, 10);
      if (isNaN(parsedDepth) || parsedDepth < 0) {
        return NextResponse.json(
          { success: false, error: "Observed water depth must be a positive integer in centimetres." },
          { status: 400 }
        );
      }
      waterDepth = parsedDepth;
    }

    let peopleAssistance = 0;
    if (body.people_requiring_assistance !== undefined && body.people_requiring_assistance !== null && body.people_requiring_assistance !== "") {
      const parsedAssistance = parseInt(body.people_requiring_assistance, 10);
      if (isNaN(parsedAssistance) || parsedAssistance < 0) {
        return NextResponse.json(
          { success: false, error: "People requiring assistance must be a non-negative integer." },
          { status: 400 }
        );
      }
      peopleAssistance = parsedAssistance;
    }

    let roadStatus: RoadStatus = "CLEAR";
    if (body.road_status && (ROAD_STATUSES as readonly string[]).includes(body.road_status)) {
      roadStatus = body.road_status as RoadStatus;
    }

    const created = await createFieldReport({
      report_type: body.report_type,
      severity: body.severity,
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      location_name: body.location_name.trim(),
      observed_water_depth_cm: waterDepth,
      people_requiring_assistance: peopleAssistance,
      road_status: roadStatus,
      description: body.description.trim(),
      photo_url: body.photo_url || undefined,
      photo_thumbnail_url: body.photo_thumbnail_url || undefined,
      observer_name: body.observer_name.trim(),
      observer_role: body.observer_role || undefined,
      observer_contact: body.observer_contact || undefined,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to create field report");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
