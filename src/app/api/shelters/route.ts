import { NextRequest, NextResponse } from "next/server";
import { getShelters, createShelter } from "@/lib/services/resources";
import { ShelterStatus, SHELTER_STATUSES } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    let status: ShelterStatus | undefined = undefined;
    if (statusParam && (SHELTER_STATUSES as readonly string[]).includes(statusParam)) {
      status = statusParam as ShelterStatus;
    }

    const shelters = await getShelters({
      status,
      search: searchParam || undefined,
    });

    const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
    const totalOccupancy = shelters.reduce((acc, s) => acc + s.current_occupancy, 0);
    const netAvailableCapacity = Math.max(0, totalCapacity - totalOccupancy);

    return NextResponse.json({
      success: true,
      data: shelters,
      summary: {
        totalShelters: shelters.length,
        totalCapacity,
        totalOccupancy,
        netAvailableCapacity,
        overcapacityCount: shelters.filter((s) => s.overcapacity_warning).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal error fetching shelters");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to register emergency shelter.");
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Shelter name is required." }, { status: 400 });
    }

    const coordCheck = validateStrictCoordinates(body.latitude, body.longitude);
    if (!coordCheck.valid || coordCheck.lat === undefined || coordCheck.lon === undefined) {
      return NextResponse.json(
        { success: false, error: coordCheck.error || "Valid geographic coordinates within India are required." },
        { status: 400 }
      );
    }

    const capacity = parseInt(body.capacity, 10);
    if (isNaN(capacity) || capacity <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal capacity must be a positive integer greater than zero." },
        { status: 400 }
      );
    }

    const occupancy = body.current_occupancy !== undefined ? parseInt(body.current_occupancy, 10) : 0;
    if (isNaN(occupancy) || occupancy < 0) {
      return NextResponse.json(
        { success: false, error: "Current occupancy must be a non-negative integer." },
        { status: 400 }
      );
    }

    const created = await createShelter({
      name: body.name.trim(),
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      capacity,
      current_occupancy: occupancy,
      water_available: body.water_available !== undefined ? Boolean(body.water_available) : true,
      food_available: body.food_available !== undefined ? Boolean(body.food_available) : true,
      medical_support: body.medical_support !== undefined ? Boolean(body.medical_support) : false,
      electricity: body.electricity !== undefined ? Boolean(body.electricity) : true,
      contact_information: body.contact_information || undefined,
      status: body.status || undefined,
      notes: body.notes || undefined,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to create shelter");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
