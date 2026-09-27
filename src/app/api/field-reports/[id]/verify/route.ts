import { NextRequest, NextResponse } from "next/server";
import { verifyFieldReport } from "@/lib/services/field-reports";
import { VERIFICATION_STATUSES, VerificationStatus } from "@/types";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to verify district field reports.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.verification_status || !(VERIFICATION_STATUSES as readonly string[]).includes(body.verification_status)) {
      return NextResponse.json(
        { success: false, error: `Valid verification status is required: ${VERIFICATION_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.verified_by || typeof body.verified_by !== "string" || !body.verified_by.trim()) {
      return NextResponse.json(
        { success: false, error: "Verifying officer name or EOC console ID is required." },
        { status: 400 }
      );
    }

    const updated = await verifyFieldReport(id, {
      verification_status: body.verification_status as VerificationStatus,
      verified_by: body.verified_by.trim(),
      verification_notes: body.verification_notes || undefined,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Field report ${updated.report_number} marked as ${updated.verification_status}.`,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error verifying field report");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx);
}
