"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  getResponseTeams,
  createResponseTeam,
} from "@/lib/services/response-teams";
import { ResponseTeamStatus } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const agencyParam = searchParams.get("agency");
  const searchParam = searchParams.get("search");
  const asFeatures = searchParams.get("as_features") === "true";

  if (asFeatures) {
    try {
      const { getActiveResponseTeamsAsMapFeatures } = await import("@/lib/services/response-teams");
      const features = await getActiveResponseTeamsAsMapFeatures();
      return NextResponse.json({
        success: true,
        data: features,
        count: features.length,
      });
    } catch (err: unknown) {
      const msg = sanitizeErrorMessage(err, "Error querying response teams map features");
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  const status = statusParam ? (statusParam as ResponseTeamStatus | "ALL") : undefined;
  const agency = agencyParam || undefined;

  try {
    const result = await getResponseTeams({
      status,
      agency,
      search: searchParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.teams,
      count: result.count,
      metadata: result.metadata,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error querying response teams");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to commission response teams.");
  }

  try {
    const body = await request.json();
    const result = await createResponseTeam(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.team,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating response team";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
