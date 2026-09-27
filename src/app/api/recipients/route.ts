"use strict";

import { NextRequest, NextResponse } from "next/server";
import {
  getAlertRecipients,
  getRecipientsCountByCategory,
  createAlertRecipient,
  validateIndianPhoneNumber,
} from "@/lib/services/sms";
import { RecipientCategory } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") || undefined;
    const category = searchParams.get("category") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const [recipients, counts] = await Promise.all([
      getAlertRecipients(district),
      getRecipientsCountByCategory(district),
    ]);

    let filtered = recipients;
    if (category && category !== "ALL") {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (activeOnly) {
      filtered = filtered.filter((r) => r.is_active);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      counts,
      total: filtered.length,
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to fetch alert recipients.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to manage alert recipients.");
  }

  try {
    const body = await request.json();
    const { name, phone, category, district = "Pune District", is_active = true } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Recipient name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Recipient phone number is required." },
        { status: 400 }
      );
    }

    const phoneVal = validateIndianPhoneNumber(phone);
    if (!phoneVal.valid || !phoneVal.normalized) {
      return NextResponse.json(
        { success: false, error: phoneVal.error || "Invalid Indian mobile number (+91)." },
        { status: 400 }
      );
    }

    const validCategories: RecipientCategory[] = [
      "OFFICER",
      "PRADHAN",
      "SCHOOL_PRINCIPAL",
      "HOSPITAL_ADMIN",
      "MEDIA",
      "OTHER",
    ];

    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const newRecipient = await createAlertRecipient(
      {
        name: name.trim(),
        phone: phoneVal.normalized,
        category,
        district: district.trim(),
        is_active: Boolean(is_active),
      },
      auth.user.name || auth.user.id
    );

    return NextResponse.json({
      success: true,
      data: newRecipient,
      message: "Alert recipient successfully registered.",
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to create alert recipient.");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
