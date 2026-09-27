import { NextRequest, NextResponse } from "next/server";
import { getResources, createResource } from "@/lib/services/resources";
import { ResourceType, RESOURCE_TYPES } from "@/types";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const searchParam = searchParams.get("search");

    let type: ResourceType | undefined = undefined;
    if (typeParam && (RESOURCE_TYPES as readonly string[]).includes(typeParam)) {
      type = typeParam as ResourceType;
    }

    const resources = await getResources({
      type,
      search: searchParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: resources,
      total: resources.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Internal error fetching resources");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to manage district resources.");
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Resource name is required." }, { status: 400 });
    }

    if (!body.type || !(RESOURCE_TYPES as readonly string[]).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Valid resource type is required: ${RESOURCE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const totalQty = parseInt(body.total_quantity, 10);
    if (isNaN(totalQty) || totalQty < 0) {
      return NextResponse.json(
        { success: false, error: "Total quantity must be a non-negative integer." },
        { status: 400 }
      );
    }

    let deployedQty = 0;
    if (body.deployed_quantity !== undefined) {
      const parsedDeployed = parseInt(body.deployed_quantity, 10);
      if (isNaN(parsedDeployed) || parsedDeployed < 0 || parsedDeployed > totalQty) {
        return NextResponse.json(
          { success: false, error: "Deployed quantity must be between 0 and total quantity." },
          { status: 400 }
        );
      }
      deployedQty = parsedDeployed;
    }

    const availableQty = totalQty - deployedQty;

    if (!body.location || typeof body.location !== "string" || !body.location.trim()) {
      return NextResponse.json({ success: false, error: "Depot/storage location is required." }, { status: 400 });
    }

    const created = await createResource({
      name: body.name.trim(),
      type: body.type,
      total_quantity: totalQty,
      available_quantity: availableQty,
      deployed_quantity: deployedQty,
      location: body.location.trim(),
      notes: body.notes || undefined,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create resource";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
