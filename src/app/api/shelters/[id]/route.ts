import { NextRequest, NextResponse } from "next/server";
import { getShelterById, updateShelter, deleteShelter } from "@/lib/services/resources";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shelter = await getShelterById(id);
    if (!shelter) {
      return NextResponse.json({ success: false, error: "Shelter not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: shelter });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error retrieving shelter");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to modify emergency shelter.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    let lat: number | undefined = undefined;
    let lon: number | undefined = undefined;

    if (body.latitude !== undefined || body.longitude !== undefined) {
      const coordCheck = validateStrictCoordinates(body.latitude, body.longitude);
      if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
        return NextResponse.json(
          { success: false, error: coordCheck.error || "Valid geographic coordinates required." },
          { status: 400 }
        );
      }
      lat = coordCheck.lat;
      lon = coordCheck.lon;
    }

    const updated = await updateShelter(id, {
      name: body.name,
      latitude: lat,
      longitude: lon,
      capacity: body.capacity !== undefined ? parseInt(body.capacity, 10) : undefined,
      current_occupancy: body.current_occupancy !== undefined ? parseInt(body.current_occupancy, 10) : undefined,
      water_available: body.water_available !== undefined ? Boolean(body.water_available) : undefined,
      food_available: body.food_available !== undefined ? Boolean(body.food_available) : undefined,
      medical_support: body.medical_support !== undefined ? Boolean(body.medical_support) : undefined,
      electricity: body.electricity !== undefined ? Boolean(body.electricity) : undefined,
      contact_information: body.contact_information,
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      overcapacityWarning: updated.overcapacity_warning,
      message: updated.overcapacity_warning
        ? `Warning: Shelter occupancy (${updated.current_occupancy}) exceeds rated capacity (${updated.capacity}).`
        : "Shelter record updated successfully.",
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error updating shelter");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to remove emergency shelter.");
  }

  try {
    const { id } = await params;
    const deleted = await deleteShelter(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Shelter not found or already deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Shelter record deleted successfully." });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error deleting shelter");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
