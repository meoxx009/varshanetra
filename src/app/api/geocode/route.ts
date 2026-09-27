import { NextRequest, NextResponse } from "next/server";
import { searchLocation } from "@/lib/services/geocoding";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";
import { GeocodeLocation } from "@/types";

// Server-side in-memory cache for recent queries (5 minute TTL)
const cache = new Map<string, { data: GeocodeLocation[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Nominatim rate limiting (15 req/min per IP to strictly follow OSM 1 req/sec policy)
  const rl = checkRateLimit(request, "geocode");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: "Search query must be at least 2 characters." },
      { status: 400 }
    );
  }

  if (q.trim().length > 100) {
    return NextResponse.json(
      { success: false, error: "Search query cannot exceed 100 characters." },
      { status: 400 }
    );
  }

  const queryKey = q.trim().toLowerCase();

  // Check in-memory cache
  const cached = cache.get(queryKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      data: cached.data,
      cached: true,
    });
  }

  try {
    const result = await searchLocation(queryKey);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Geocoding service unavailable." },
        { status: 502 }
      );
    }

    // Cache successful results
    if (result.data) {
      cache.set(queryKey, { data: result.data, timestamp: Date.now() });
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
      cached: false,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Geocoding query failure");
    return NextResponse.json(
      { success: false, error: `Nominatim API error: ${message}` },
      { status: 500 }
    );
  }
}
