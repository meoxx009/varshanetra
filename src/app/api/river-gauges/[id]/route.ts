import { NextRequest, NextResponse } from "next/server";
import { updateRiverGaugeReading } from "@/lib/services/river-gauges";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";
import { GaugeTrend } from "@/types";

export const dynamic = "force-dynamic";

const VALID_TRENDS: GaugeTrend[] = ["RISING", "FALLING", "STEADY"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to update river gauge reading.");
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const waterLevel = Number(body.water_level_m);
    if (isNaN(waterLevel) || waterLevel < 0 || waterLevel > 999) {
      return NextResponse.json(
        { success: false, error: "Water level must be a valid number between 0 and 999 meters." },
        { status: 400 }
      );
    }

    const trend = body.level_trend as GaugeTrend;
    if (!VALID_TRENDS.includes(trend)) {
      return NextResponse.json(
        { success: false, error: "Trend must be RISING, FALLING, or STEADY." },
        { status: 400 }
      );
    }

    const updated = await updateRiverGaugeReading(
      id,
      {
        water_level_m: waterLevel,
        level_trend: trend,
        discharge_cumecs: body.discharge_cumecs ? Number(body.discharge_cumecs) : undefined,
        notes: body.notes?.trim() || undefined,
      },
      auth.user?.id
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Failed to update river gauge reading");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
