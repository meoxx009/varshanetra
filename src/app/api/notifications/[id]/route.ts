"use strict";

import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead, deleteNotification } from "@/lib/services/notifications";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id]
 * Updates read status of a notification: { read: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to update notifications.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const read = typeof body.read === "boolean" ? body.read : true;
    const updated = await markNotificationAsRead(id, read);

    if (!updated) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to update notification");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/[id]
 * Removes a notification from the center.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to delete notifications.");
  }

  try {
    const { id } = await params;
    const deleted = await deleteNotification(id);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to delete notification");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
