import { NextRequest, NextResponse } from "next/server";
import {
  HISTORICAL_EVENT_PRESETS,
  loadReplaySession,
} from "@/lib/services/replay";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateStrictCoordinates, validateCalendarDateRange } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limiting (20 req/min)
  const rl = checkRateLimit(request, "replay");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const presetId = searchParams.get("presetId") || searchParams.get("preset");
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonParam = searchParams.get("lon") ?? searchParams.get("longitude");
  const startDate = searchParams.get("startDate") ?? searchParams.get("start_date");
  const endDate = searchParams.get("endDate") ?? searchParams.get("end_date");
  const districtName = searchParams.get("district") || undefined;

  // 1. If preset requested, load preset configurations
  if (presetId) {
    const preset = HISTORICAL_EVENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      return NextResponse.json(
        {
          success: false,
          error: `Preset event '${presetId}' not found. Available presets: ${HISTORICAL_EVENT_PRESETS.map(
            (p) => p.id
          ).join(", ")}`,
        },
        { status: 404 }
      );
    }

    try {
      const sessionResult = await loadReplaySession({
        latitude: preset.latitude,
        longitude: preset.longitude,
        startDate: preset.startDate,
        endDate: preset.endDate,
        districtName: preset.districtName,
        presetId: preset.id,
      });

      if (!sessionResult.success || !sessionResult.data) {
        return NextResponse.json(
          {
            success: false,
            error: sessionResult.error || "Failed to load historical replay session.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        data: sessionResult.data,
        cached: sessionResult.cached ?? false,
      });
    } catch (err: unknown) {
      const msg = sanitizeErrorMessage(err, "Error processing historical replay");
      return NextResponse.json(
        { success: false, error: `Replay processing failure: ${msg}` },
        { status: 500 }
      );
    }
  }

  // 2. Custom date range & coordinates
  if (!latParam || !lonParam || !startDate || !endDate) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing parameters. Supply either 'presetId' or all of ('lat', 'lon', 'startDate', 'endDate').",
      },
      { status: 400 }
    );
  }

  const coordCheck = validateStrictCoordinates(latParam, lonParam);
  if (!coordCheck.valid) {
    return NextResponse.json(
      { success: false, error: coordCheck.error },
      { status: 400 }
    );
  }

  const dateCheck = validateCalendarDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return NextResponse.json(
      { success: false, error: dateCheck.error },
      { status: 400 }
    );
  }

  try {
    const sessionResult = await loadReplaySession({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      startDate: dateCheck.start,
      endDate: dateCheck.end,
      districtName,
    });

    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: sessionResult.error || "Failed to process custom historical event.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sessionResult.data,
      cached: sessionResult.cached ?? false,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Error processing custom historical replay");
    return NextResponse.json(
      { success: false, error: `Custom replay processing failure: ${msg}` },
      { status: 500 }
    );
  }
}
