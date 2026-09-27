import { NextRequest, NextResponse } from "next/server";
import { getFieldReportById, deleteFieldReport } from "@/lib/services/field-reports";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getFieldReportById(id);
    if (!report) {
      return NextResponse.json({ success: false, error: "Field report not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving field report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteFieldReport(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Field report not found, already deleted, or cannot be deleted (certified reports)." },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: "Field report deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting field report";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
