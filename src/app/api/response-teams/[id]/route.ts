import { NextRequest, NextResponse } from "next/server";
import {
  getResponseTeamById,
  updateResponseTeam,
  deleteResponseTeam,
} from "@/lib/services/response-teams";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const result = await getResponseTeamById(id);
    if (!result.team) {
      return NextResponse.json(
        { success: false, error: result.error || "Response team not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.team,
      assignments: result.assignments,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error fetching team details");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to modify tactical response team.");
  }

  const { id } = await context.params;

  try {
    const body = await request.json();

    if (body.latitude !== undefined || body.longitude !== undefined) {
      const coordCheck = validateStrictCoordinates(body.latitude, body.longitude);
      if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
        return NextResponse.json(
          { success: false, error: coordCheck.error || "Valid coordinates required." },
          { status: 400 }
        );
      }
      body.latitude = coordCheck.lat;
      body.longitude = coordCheck.lon;
    }

    const result = await updateResponseTeam(id, body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.team,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error updating response team");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to delete tactical response team.");
  }

  const { id } = await context.params;

  try {
    const result = await deleteResponseTeam(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Response team deleted." });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error deleting response team");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
