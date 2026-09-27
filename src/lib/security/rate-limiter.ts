/**
 * VarshaNetra - Security Core: In-Memory Sliding Window Rate Limiter
 *
 * Protects external upstream proxies (Open-Meteo, OpenStreetMap Overpass, Nominatim)
 * and intensive internal computing endpoints (Situation Intelligence, Replay) from DoS,
 * excessive polling, and upstream API policy violations.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// Global in-memory storage for client request timestamps
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    const freshTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (freshTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = freshTimestamps;
    }
  }
}

export type RateLimitCategory =
  | "geocode"       // Nominatim (15 req/min, complying with 1 req/sec policy)
  | "overpass"      // Overpass facilities/infra (30 req/min)
  | "upload"        // Image evidence uploads (10 req/min)
  | "weather"       // Open-Meteo weather proxies (60 req/min)
  | "ai"            // Situation Intelligence (20 req/min)
  | "replay"        // Historical Replay (20 req/min)
  | "general";      // Standard operational endpoints (120 req/min)

export const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, { maxRequests: number; windowSeconds: number }> = {
  geocode: { maxRequests: 15, windowSeconds: 60 },
  overpass: { maxRequests: 30, windowSeconds: 60 },
  upload: { maxRequests: 10, windowSeconds: 60 },
  weather: { maxRequests: 60, windowSeconds: 60 },
  ai: { maxRequests: 20, windowSeconds: 60 },
  replay: { maxRequests: 20, windowSeconds: 60 },
  general: { maxRequests: 120, windowSeconds: 60 },
};

/**
 * Extracts a client identifier from incoming request (IP or auth cookie).
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";
  const demoCookie = request.cookies.get("varshanetra_demo_session")?.value;
  if (demoCookie) {
    try {
      const parsed = JSON.parse(demoCookie);
      if (parsed.id) return `${ip}:${parsed.id}`;
    } catch {}
  }
  return ip;
}

/**
 * Enforces rate limiting on a category. Returns null if allowed, or a 429 NextResponse if exceeded.
 */
export function checkRateLimit(
  request: NextRequest,
  category: RateLimitCategory
): { allowed: boolean; remaining: number; resetSeconds: number; response?: NextResponse } {
  const config = RATE_LIMIT_CONFIGS[category];
  const windowMs = config.windowSeconds * 1000;
  const now = Date.now();

  cleanupStaleRecords(windowMs);

  const clientId = getClientIdentifier(request);
  const key = `${category}:${clientId}`;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Retain timestamps within the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const currentCount = record.timestamps.length;
  const remaining = Math.max(0, config.maxRequests - currentCount - 1);
  const oldestTimestamp = record.timestamps[0] || now;
  const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

  if (currentCount >= config.maxRequests) {
    const response = NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded for ${category} service. Please wait ${resetSeconds}s before retrying.`,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, resetSeconds)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetSeconds),
        },
      }
    );

    return { allowed: false, remaining: 0, resetSeconds, response };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining, resetSeconds };
}

/**
 * Adds rate limit headers to an existing response.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  category: RateLimitCategory,
  remaining: number,
  resetSeconds: number
): NextResponse {
  const config = RATE_LIMIT_CONFIGS[category];
  response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetSeconds));
  return response;
}
