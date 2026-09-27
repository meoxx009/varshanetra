"use strict";

import { NextRequest, NextResponse } from "next/server";
import { updateAssignmentStatus } from "@/lib/services/response-teams";
import { getCurrentUserAndProfile } from "@/lib/auth/actions";
import { AssignmentStatus } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to update tactical assignment.");
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { profile: userProfile } = await getCurrentUserAndProfile();
    const changerName = userProfile?.full_name || body.changer_name || auth.user.name || "Tactical Unit Commander";

    if (!body.assignment_status) {
      return NextResponse.json(
        { success: false, error: "Field 'assignment_status' is required." },
        { status: 400 }
      );
    }

    const result = await updateAssignmentStatus(id, {
      assignment_status: body.assignment_status as AssignmentStatus,
      notes: body.notes,
      changer_name: changerName,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.assignment,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error updating assignment status");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
