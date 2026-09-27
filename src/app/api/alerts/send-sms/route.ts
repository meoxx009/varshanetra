"use strict";

import { NextRequest, NextResponse } from "next/server";
import { getAlertById } from "@/lib/services/alerts";
import {
  sendAlertSms,
  getAlertRecipients,
  validateIndianPhoneNumber,
} from "@/lib/services/sms";
import { RecipientCategory } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Enforce authentication for SMS emergency broadcast
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to broadcast emergency SMS alerts.");
  }

  try {
    const body = await request.json();
    const {
      alertId,
      categories,
      message,
      language = "en",
      customNumbers = [],
    } = body;

    // Validate alertId
    if (!alertId || typeof alertId !== "string") {
      return NextResponse.json(
        { success: false, error: "Alert ID is required." },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "SMS message text cannot be empty." },
        { status: 400 }
      );
    }

    // 2. Alert Status Verification: MUST be ISSUED
    const alertData = await getAlertById(alertId);
    if (!alertData.alert) {
      return NextResponse.json(
        { success: false, error: "Alert not found with the specified ID." },
        { status: 404 }
      );
    }

    if (alertData.alert.status !== "ISSUED") {
      return NextResponse.json(
        {
          success: false,
          error: `SMS broadcast disallowed. Alert status must be 'ISSUED' (current: '${alertData.alert.status}'). Please issue the alert before broadcasting.`,
        },
        { status: 403 }
      );
    }

    // 3. Resolve recipient phone numbers
    const validCategories: RecipientCategory[] = [
      "OFFICER",
      "PRADHAN",
      "SCHOOL_PRINCIPAL",
      "HOSPITAL_ADMIN",
      "MEDIA",
      "OTHER",
    ];

    const allRecipients = await getAlertRecipients();
    const activeRecipients = allRecipients.filter((r) => r.is_active);

    const targetPhones = new Set<string>();

    const rawCategories: string[] = Array.isArray(categories) ? categories : [];
    const selectedCategories = rawCategories.filter((c) => validCategories.includes(c as RecipientCategory));
    const isAllSelected = rawCategories.includes("ALL") || selectedCategories.length === 0;

    for (const r of activeRecipients) {
      if (isAllSelected || selectedCategories.includes(r.category)) {
        targetPhones.add(r.phone);
      }
    }

    // Add any valid custom numbers
    if (Array.isArray(customNumbers)) {
      for (const num of customNumbers) {
        if (typeof num === "string") {
          const val = validateIndianPhoneNumber(num);
          if (val.valid && val.normalized) {
            targetPhones.add(val.normalized);
          }
        }
      }
    }

    const phoneList = Array.from(targetPhones);

    if (phoneList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No active recipients found matching the selected categories.",
        },
        { status: 400 }
      );
    }

    // 4. Rate Limiting Warning / Notification: Maximum 100 SMS per broadcast
    const MAX_PER_ALERT = 100;
    const cappedPhones = phoneList.slice(0, MAX_PER_ALERT);

    // 5. Execute SMS Dispatch via Service Layer
    const result = await sendAlertSms({
      alertId,
      recipients: cappedPhones,
      message: message.trim(),
      language: language === "hi" ? "hi" : "en",
      userId: auth.user.name || auth.user.id,
    });

    return NextResponse.json({
      success: result.success,
      total_sent: result.total_sent,
      failed: result.failed,
      total_requested: phoneList.length,
      capped_at_limit: phoneList.length > MAX_PER_ALERT,
      mode: result.mode,
      message_sids: result.message_sids,
      records: result.records,
    });
  } catch (err: unknown) {
    const errorMsg = sanitizeErrorMessage(err, "SMS broadcast encountered an internal error.");
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
