"use strict";

import { NextRequest, NextResponse } from "next/server";
import { getNotifications, createNotification } from "@/lib/services/notifications";
import { CreateNotificationInput, NotificationEventType } from "@/types/notifications";
import { SeverityLevel } from "@/types";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Supports query parameters:
 *  - limit: number
 *  - read: boolean ("true" | "false")
 *  - severity: RiskSeverity
 *  - event_type: NotificationEventType
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const readParam = searchParams.get("read");
    const severityParam = searchParams.get("severity");
    const eventTypeParam = searchParams.get("event_type");

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const read = readParam !== null ? readParam === "true" : undefined;
    const severity = (severityParam as SeverityLevel) || undefined;
    const event_type = (eventTypeParam as NotificationEventType) || undefined;

    const result = await getNotifications({
      limit,
      read,
      severity,
      event_type,
    });

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      totalCount: result.totalCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to retrieve notifications");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Creates a new in-app operational notification.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to dispatch operational notifications.");
  }

  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    if (!body.event_type || typeof body.event_type !== "string") {
      return NextResponse.json({ success: false, error: "Valid event_type is required" }, { status: 400 });
    }

    if (!body.deep_link || typeof body.deep_link !== "string") {
      return NextResponse.json({ success: false, error: "Deep link path is required" }, { status: 400 });
    }

    const input: CreateNotificationInput = {
      event_type: body.event_type as NotificationEventType,
      title: body.title.trim(),
      message: body.message.trim(),
      severity: body.severity || "NORMAL",
      deep_link: body.deep_link.trim(),
      related_id: body.related_id ? String(body.related_id).trim() : undefined,
    };

    const notification = await createNotification(input);

    return NextResponse.json(
      {
        success: true,
        notification,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to create notification");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
