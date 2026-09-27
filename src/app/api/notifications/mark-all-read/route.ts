import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/services/notifications";
import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/mark-all-read
 * Marks all pending unread notifications as read.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated) {
    return createUnauthorizedResponse("Authentication required to dismiss notifications.");
  }

  try {
    const updatedCount = await markAllNotificationsAsRead();

    return NextResponse.json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to mark all as read");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
