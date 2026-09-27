"use strict";

import { NextRequest, NextResponse } from "next/server";
import { updateAlertRecipient, deleteAlertRecipient } from "@/lib/services/sms";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to update alert recipients.");
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Recipient ID required" }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateAlertRecipient(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Recipient updated successfully.",
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to update recipient.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to delete alert recipients.");
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Recipient ID required" }, { status: 400 });
    }

    const deleted = await deleteAlertRecipient(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Recipient deleted successfully." : "Recipient could not be deleted.",
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to delete recipient.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
