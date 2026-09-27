"use strict";

import { NextRequest, NextResponse } from "next/server";
import { generateSituationIntelligence } from "@/lib/services/situation-intelligence";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/situation-intelligence
 * Query parameters:
 *  - lat, lon (or latitude, longitude)
 *  - district / locationName (optional)
 */
export async function GET(request: NextRequest) {
  // Rate limiting (20 req/min)
  const rl = checkRateLimit(request, "ai");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get("lat") || searchParams.get("latitude") || "18.5204";
    const lonParam = searchParams.get("lon") || searchParams.get("longitude") || "73.8567";
    const locationName =
      searchParams.get("district") ||
      searchParams.get("locationName") ||
      "Pune District";

    const coordCheck = validateStrictCoordinates(latParam, lonParam);
    if (!coordCheck.valid) {
      return NextResponse.json(
        { success: false, error: coordCheck.error },
        { status: 400 }
      );
    }

    const report = await generateSituationIntelligence({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      locationName,
    });

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to synthesize situation intelligence");
    console.error("[VarshaNetra:SituationIntelligence] Error generating report:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
