import { NextRequest, NextResponse } from "next/server";
import { deployResource } from "@/lib/services/resources";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to deploy resources.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const qty = parseInt(body.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity to deploy must be a positive whole integer." },
        { status: 400 }
      );
    }

    if (!body.destination || typeof body.destination !== "string" || !body.destination.trim()) {
      return NextResponse.json(
        { success: false, error: "Deployment destination or sector is required." },
        { status: 400 }
      );
    }

    const result = await deployResource(id, {
      quantity: qty,
      destination: body.destination.trim(),
      incident_id: body.incident_id || undefined,
      transacted_by: body.transacted_by || undefined,
      notes: body.notes || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.resource,
      transaction: result.transaction,
      message: `Successfully deployed ${qty} units to ${body.destination.trim()}.`,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to deploy resource");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
