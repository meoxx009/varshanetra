"use strict";

import { NextRequest, NextResponse } from "next/server";
import { bulkImportRecipients, parseRecipientsCsv } from "@/lib/services/sms";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to bulk-import recipients.");
  }

  try {
    const body = await request.json();
    const { csvText, defaultDistrict = "Pune District" } = body;

    if (!csvText || typeof csvText !== "string" || csvText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "CSV text content cannot be empty." },
        { status: 400 }
      );
    }

    const parsedRecords = parseRecipientsCsv(csvText, defaultDistrict);
    if (parsedRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid recipient rows found in CSV. Please ensure the CSV contains: Name, Phone, Category, District.",
        },
        { status: 400 }
      );
    }

    const result = await bulkImportRecipients(parsedRecords, auth.user.name || auth.user.id);

    return NextResponse.json({
      success: result.imported > 0,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
      total_rows: parsedRecords.length,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Bulk import processing failed.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
