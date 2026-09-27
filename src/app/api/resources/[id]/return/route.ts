import { NextRequest, NextResponse } from "next/server";
import { returnResource } from "@/lib/services/resources";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to return resources to depot inventory.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const qty = parseInt(body.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity to return must be a positive whole integer." },
        { status: 400 }
      );
    }

    const result = await returnResource(id, {
      quantity: qty,
      transacted_by: body.transacted_by || undefined,
      notes: body.notes || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.resource,
      transaction: result.transaction,
      message: `Successfully returned ${qty} units to depot inventory.`,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to return resource");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
