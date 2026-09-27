"use strict";

import { NextRequest, NextResponse } from "next/server";
import { getSmsDeliveryLogs } from "@/lib/services/sms";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Alert ID required" }, { status: 400 });
    }

    const logs = await getSmsDeliveryLogs(id);

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to retrieve SMS delivery logs.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
