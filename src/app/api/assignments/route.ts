"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  createIncidentAssignment,
  getAssignments,
} from "@/lib/services/response-teams";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get("incident_id") || undefined;
  const teamId = searchParams.get("team_id") || undefined;

  try {
    const assignments = await getAssignments({
      incident_id: incidentId,
      team_id: teamId,
    });

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error querying assignments");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to dispatch team assignments.");
  }

  try {
    const body = await request.json();
    const assignedBy = auth.user.name || "EOC Tactical Dispatcher";

    const result = await createIncidentAssignment({
      incident_id: body.incident_id,
      team_id: body.team_id,
      assignment_status: body.assignment_status,
      notes: body.notes,
      assigned_by: assignedBy,
      allow_conflict_override: body.allow_conflict_override === true,
    });

    if (!result.success) {
      // Return 409 Conflict if team is already actively deployed elsewhere and override not provided
      if (result.conflict) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            conflict: result.conflict,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.assignment,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating incident assignment";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
