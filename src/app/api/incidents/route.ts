"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  getIncidents,
  createIncident,
  getActiveIncidentsAsMapFeatures,
} from "@/lib/services/incidents";
import { IncidentStatus, IncidentType, SeverityLevel } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const severityParam = searchParams.get("severity");
  const typeParam = searchParams.get("type");
  const searchParam = searchParams.get("search");
  const asFeatures = searchParams.get("as_features") === "true";

  if (asFeatures) {
    try {
      const features = await getActiveIncidentsAsMapFeatures();
      return NextResponse.json({
        success: true,
        data: features,
        count: features.length,
      });
    } catch (err: unknown) {
      const msg = sanitizeErrorMessage(err, "Error querying incidents map features");
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  const status = statusParam ? (statusParam as IncidentStatus | "ALL") : undefined;
  const severity = severityParam ? (severityParam as SeverityLevel | "ALL") : undefined;
  const type = typeParam ? (typeParam as IncidentType | "ALL") : undefined;

  try {
    const result = await getIncidents({
      status,
      severity,
      type,
      search: searchParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.incidents,
      count: result.count,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error querying incidents");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Enforce authentication for dispatching emergency distress incidents
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to log and dispatch district incidents.");
  }

  try {
    const body = await request.json();
    const {
      type,
      title,
      description,
      severity,
      latitude,
      longitude,
      location_name,
      assigned_to,
      reporter_name,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Incident title is required and must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!location_name || typeof location_name !== "string" || location_name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Incident location name is required." },
        { status: 400 }
      );
    }

    const coordCheck = validateStrictCoordinates(latitude, longitude);
    if (!coordCheck.valid) {
      return NextResponse.json({ success: false, error: coordCheck.error }, { status: 400 });
    }

    const validTypes = [
      "Waterlogging",
      "Road Block",
      "Tree Fall",
      "Power Outage",
      "Bridge Submergence",
      "Landslide",
      "Structure Collapse",
      "Evacuation Needed",
      "Other",
    ];
    const incidentType = validTypes.includes(type) ? type : "Waterlogging";

    const result = await createIncident(
      {
        type: incidentType,
        title: title.trim(),
        description: typeof description === "string" ? description.trim() : "",
        severity: severity || "ALERT",
        latitude: coordCheck.lat,
        longitude: coordCheck.lon,
        location_name: location_name.trim(),
        assigned_to,
        reporter_name: reporter_name || auth.user.name,
      },
      { id: auth.user.id, name: auth.user.name }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.incident,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error creating incident");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
