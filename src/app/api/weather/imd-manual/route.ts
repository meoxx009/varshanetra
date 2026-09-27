import { NextRequest, NextResponse } from "next/server";
import { getLatestImdManualEntries, saveImdManualEntry } from "@/lib/services/imd-bulletin";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getLatestImdManualEntries(10);
    return NextResponse.json({
      success: true,
      data: entries,
      latest: entries.length > 0 ? entries[0] : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to retrieve IMD manual bulletin entries.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      entry_datetime,
      district_rainfall_today,
      district_rainfall_yesterday,
      district_rainfall_week,
      normal_rainfall,
      imd_color_code,
      forecast_narrative,
      data_source,
      entered_by,
    } = body;

    const validColors = ["Green", "Yellow", "Orange", "Red"];
    if (!validColors.includes(imd_color_code)) {
      return NextResponse.json(
        { success: false, error: "IMD Warning Color Code must be Green, Yellow, Orange, or Red." },
        { status: 400 }
      );
    }

    const result = await saveImdManualEntry({
      entry_datetime: entry_datetime || new Date().toISOString(),
      district_rainfall_today: Number(district_rainfall_today || 0),
      district_rainfall_yesterday: Number(district_rainfall_yesterday || 0),
      district_rainfall_week: Number(district_rainfall_week || 0),
      normal_rainfall: Number(normal_rainfall || 0),
      imd_color_code: imd_color_code as "Green" | "Yellow" | "Orange" | "Red",
      forecast_narrative: String(forecast_narrative || "").trim(),
      data_source: String(data_source || "IMD District Bulletin").trim(),
      entered_by: String(entered_by || "District Duty Officer").trim(),
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "IMD manual bulletin logged successfully.",
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to persist IMD manual bulletin.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
