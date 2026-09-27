import { NextRequest, NextResponse } from "next/server";
import { getResourceById, updateResource, deleteResource, getResourceTransactions } from "@/lib/services/resources";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resource = await getResourceById(id);
    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }
    const transactions = await getResourceTransactions(id);
    return NextResponse.json({ success: true, data: { ...resource, transactions } });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error retrieving resource");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to update resource.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await updateResource(id, {
      name: body.name,
      type: body.type,
      total_quantity: body.total_quantity !== undefined ? parseInt(body.total_quantity, 10) : undefined,
      location: body.location,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error updating resource");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to delete resource.");
  }

  try {
    const { id } = await params;
    const deleted = await deleteResource(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Resource not found or already deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Resource successfully deleted." });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error deleting resource");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
