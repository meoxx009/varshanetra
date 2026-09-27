import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, recordAuditLog, exportAuditLogsToCSV } from "@/lib/services/audit-logs";
import { AuditEntityType, AuditAction, CreateAuditLogInput } from "@/types/audit-logs";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to inspect district audit logs.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const entity_type = (searchParams.get("entity_type") as AuditEntityType) || undefined;
    const action = (searchParams.get("action") as AuditAction) || undefined;
    const actor_id = searchParams.get("actor_id") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;
    const format = searchParams.get("format");

    const logs = await getAuditLogs({
      entity_type,
      action,
      actor_id,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    if (format === "csv") {
      const csv = exportAuditLogsToCSV(logs);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="varshanetra-audit-logs-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to fetch audit logs");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to append audit logs.");
  }

  try {
    const body = (await req.json()) as CreateAuditLogInput;

    if (!body.action || !body.entity_type || !body.entity_id || !body.description) {
      return NextResponse.json(
        { success: false, error: "Missing required audit fields: action, entity_type, entity_id, description." },
        { status: 400 }
      );
    }

    const log = await recordAuditLog({
      ...body,
      actor_id: body.actor_id || auth.user.id,
      actor_name: body.actor_name || auth.user.name,
    });
    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (err: unknown) {
    const msg = sanitizeErrorMessage(err, "Failed to record audit log");
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
