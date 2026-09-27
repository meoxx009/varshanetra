"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  getIncidentById,
  updateIncident,
  transitionIncidentStatus,
  deleteIncident,
} from "@/lib/services/incidents";
import { IncidentStatus } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const [result, assignments] = await Promise.all([
      getIncidentById(id),
      (async () => {
        try {
          const { getAssignmentsForIncident } = await import("@/lib/services/response-teams");
          return await getAssignmentsForIncident(id);
        } catch {
          return [];
        }
      })(),
    ]);

    if (!result.incident) {
      return NextResponse.json(
        { success: false, error: "Incident record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.incident,
      auditLogs: result.auditLogs,
      assignments,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching incident details";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to update incidents.");
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const user = { id: auth.user.id, name: auth.user.name };

    // Case 1: Status Transition
    if (body.status) {
      const result = await transitionIncidentStatus(
        id,
        body.status as IncidentStatus,
        user,
        body.notes
      );

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.incident });
    }

    // Case 2: Field Edits
    const result = await updateIncident(id, {
      type: body.type,
      title: body.title,
      description: body.description,
      severity: body.severity,
      latitude: body.latitude,
      longitude: body.longitude,
      location_name: body.location_name,
      assigned_to: body.assigned_to,
      reporter_name: body.reporter_name,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.incident });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error updating incident";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to delete incident records.");
  }

  const { id } = await context.params;

  try {
    const result = await deleteIncident(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Incident record removed successfully.",
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error deleting incident");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
