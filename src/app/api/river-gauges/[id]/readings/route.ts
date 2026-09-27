import { NextRequest, NextResponse } from "next/server";
import { getRiverGaugeReadings } from "@/lib/services/river-gauges";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 24;

    const readings = await getRiverGaugeReadings(id, limit);

    return NextResponse.json({
      success: true,
      data: readings,
      gaugeId: id,
      count: readings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to fetch gauge readings");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
