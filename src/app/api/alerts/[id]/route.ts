"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  getAlertById,
  updateAlert,
  transitionAlertStatus,
  deleteAlert,
} from "@/lib/services/alerts";
import { AlertStatus } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const result = await getAlertById(id);
    if (!result.alert) {
      return NextResponse.json(
        { success: false, error: "Alert record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.alert,
      auditLogs: result.auditLogs,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error fetching alert details");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to modify alert records.");
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const user = { id: auth.user.id, name: auth.user.name };

    // Case 1: State Machine Transition (status field provided)
    if (body.status) {
      const validStatuses = ["DRAFT", "PENDING", "APPROVED", "ISSUED", "CANCELLED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Invalid alert status: '${body.status}'.` },
          { status: 400 }
        );
      }

      const result = await transitionAlertStatus(
        id,
        body.status as AlertStatus,
        user,
        typeof body.notes === "string" ? body.notes.trim() : undefined
      );

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.alert });
    }

    // Case 2: Edit Draft Alert Fields
    const result = await updateAlert(
      id,
      {
        title: body.title,
        severity: body.severity,
        area_name: body.area_name,
        description: body.description,
        recommended_action: body.recommended_action,
      }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.alert });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error updating alert");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to delete alerts.");
  }

  const { id } = await context.params;

  try {
    const result = await deleteAlert(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Draft alert deleted successfully." });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error deleting alert");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
