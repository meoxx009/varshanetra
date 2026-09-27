import { NextRequest, NextResponse } from "next/server";
import { fetchGovDataForDistrict } from "@/lib/services/govdata";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") || searchParams.get("districtName") || "Patna";
    const state = searchParams.get("state") || undefined;

    const data = await fetchGovDataForDistrict(district, state);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: unknown) {
    const message = sanitizeErrorMessage(error, "Failed to retrieve official data from data.gov.in");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const district = body.district || body.districtName || "Patna";
    const state = body.state || undefined;

    const data = await fetchGovDataForDistrict(district, state);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = sanitizeErrorMessage(error, "Failed to retrieve official data from data.gov.in");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
