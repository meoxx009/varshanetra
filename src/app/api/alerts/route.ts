"use strict";

import { NextRequest, NextResponse } from "next/server";
import { getAlerts, createAlert } from "@/lib/services/alerts";
import { AlertStatus, SeverityLevel } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const severityParam = searchParams.get("severity");
  const areaParam = searchParams.get("area") || searchParams.get("area_name");
  const searchParam = searchParams.get("search");

  const status = statusParam ? (statusParam as AlertStatus | "ALL") : undefined;
  const severity = severityParam ? (severityParam as SeverityLevel | "ALL") : undefined;

  try {
    const result = await getAlerts({
      status,
      severity,
      area_name: areaParam || undefined,
      search: searchParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.alerts,
      count: result.count,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error querying alerts");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Enforce authentication for issuing district alerts
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to issue district emergency alerts.");
  }

  try {
    const body = await request.json();
    const { title, severity, area_name, description, recommended_action } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Alert title is required and must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!area_name || typeof area_name !== "string" || area_name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Alert target area name is required." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Alert description must be at least 5 characters." },
        { status: 400 }
      );
    }

    const validSeverities = ["NORMAL", "ADVISORY", "ALERT", "CRITICAL"];
    const alertSeverity = validSeverities.includes(severity) ? severity : "ADVISORY";

    const result = await createAlert(
      {
        title: title.trim(),
        severity: alertSeverity,
        area_name: area_name.trim(),
        description: description.trim(),
        recommended_action: typeof recommended_action === "string" ? recommended_action.trim() : "",
      },
      { id: auth.user.id, name: auth.user.name }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.alert,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error creating alert");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
