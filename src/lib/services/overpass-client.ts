/**
 * VarshaNetra - Overpass Client Service with Aggressive Caching & Rate Limiting Queue
 *
 * Implements:
 * 1. Aggressive localStorage caching with key overpass_cache_<districtKey> and 24h TTL.
 * 2. Request queue with minimum 60s delay between calls.
 * 3. Exponential backoff retry on 429/rate-limit error (60s, 120s, 180s) up to 3 retries.
 * 4. Graceful fallback to cached data or empty placeholder structure.
 */

import { FacilitiesGroupedResponse, DataSourceMeta } from "@/types";

export const OVERPASS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MIN_OVERPASS_INTERVAL_MS = 60 * 1000; // 60 seconds
const STORAGE_PREFIX = "overpass_cache_";
const LAST_CALL_STORAGE_KEY = "overpass_last_call_time";
const RATE_LIMIT_EXPIRY_STORAGE_KEY = "overpass_rate_limit_expiry";

let inMemoryLastCallTime = 0;
let inMemoryRateLimitExpiry = 0;

/**
 * Derives a standardized district or location identifier key for caching.
 * Format: overpass_cache_<districtKey> (e.g. overpass_cache_solan, overpass_cache_pune, overpass_cache_18.52_73.86)
 */
export function getOverpassDistrictKey(district?: string, lat?: number, lon?: number): string {
  if (district && district.trim().length > 0) {
    return district
      .trim()
      .toLowerCase()
      .replace(/district/gi, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/^_+|_+$/g, "") || "default";
  }
  if (lat !== undefined && lon !== undefined) {
    return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  }
  return "default";
}

export interface CachedOverpassPayload {
  data: FacilitiesGroupedResponse;
  timestamp: number;
  districtKey: string;
}

/**
 * Checks localStorage for cached infrastructure data.
 * Returns cached payload if valid and younger than 24 hours.
 */
export function getOverpassCache(
  districtKey: string,
  allowExpired = false
): CachedOverpassPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${districtKey}`);
    if (!raw) return null;

    const parsed: CachedOverpassPayload = JSON.parse(raw);
    if (!parsed || !parsed.data || typeof parsed.timestamp !== "number") {
      return null;
    }

    const age = Date.now() - parsed.timestamp;
    if (allowExpired || age < OVERPASS_CACHE_TTL_MS) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves successful response to localStorage with timestamp.
 */
export function setOverpassCache(
  districtKey: string,
  data: FacilitiesGroupedResponse
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedOverpassPayload = {
      data,
      timestamp: Date.now(),
      districtKey,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${districtKey}`, JSON.stringify(payload));
  } catch (e) {
    console.warn("[VarshaNetra] Could not save Overpass cache to localStorage:", e);
  }
}

/**
 * Gets the timestamp of the last Overpass API call.
 */
export function getLastOverpassCallTime(): number {
  if (typeof window === "undefined") return inMemoryLastCallTime;

  try {
    const stored = localStorage.getItem(LAST_CALL_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > inMemoryLastCallTime) {
        inMemoryLastCallTime = parsed;
      }
    }
  } catch {
    // ignore
  }

  return inMemoryLastCallTime;
}

/**
 * Records the timestamp of the last Overpass API call.
 */
export function setLastOverpassCallTime(timestamp: number): void {
  inMemoryLastCallTime = timestamp;
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LAST_CALL_STORAGE_KEY, String(timestamp));
  } catch {
    // ignore
  }
}

/**
 * Gets remaining rate-limit cooldown seconds (if any).
 */
export function getOverpassCooldownSeconds(): number {
  const now = Date.now();
  let expiry = inMemoryRateLimitExpiry;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_EXPIRY_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > expiry) {
          expiry = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  if (expiry > now) {
    return Math.ceil((expiry - now) / 1000);
  }

  // Also check 60s minimum interval since last call
  const lastCall = getLastOverpassCallTime();
  const elapsedSinceCall = now - lastCall;
  if (lastCall > 0 && elapsedSinceCall < MIN_OVERPASS_INTERVAL_MS) {
    return Math.ceil((MIN_OVERPASS_INTERVAL_MS - elapsedSinceCall) / 1000);
  }

  return 0;
}

/**
 * Sets rate-limit expiry timestamp in memory and localStorage.
 */
export function setOverpassRateLimitExpiry(secondsFromNow: number): void {
  const expiry = Date.now() + Math.max(1, secondsFromNow) * 1000;
  inMemoryRateLimitExpiry = expiry;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(RATE_LIMIT_EXPIRY_STORAGE_KEY, String(expiry));
    } catch {
      // ignore
    }
  }
}

/**
 * Creates static placeholder infrastructure response when Overpass and cache are empty.
 */
export function createPlaceholderFacilities(
  latitude?: number,
  longitude?: number
): FacilitiesGroupedResponse {
  const coordText =
    latitude !== undefined && longitude !== undefined
      ? ` [${latitude.toFixed(2)}, ${longitude.toFixed(2)}]`
      : "";
  const meta: DataSourceMeta = {
    provider: "OpenStreetMap Foundation & Overpass API",
    lastUpdated: new Date().toISOString(),
    origin: "LIVE_API",
    attributionNotice: `ओपनस्ट्रीटमैप पर मैप किया गया डेटा उपलब्ध नहीं। स्थानीय रिकॉर्ड से सत्यापित करें। • No mapped data available on OpenStreetMap. Verify with local records.${coordText}`,
    url: "https://www.openstreetmap.org/copyright",
  };

  return {
    hospitals: [],
    clinics: [],
    police: [],
    fire: [],
    schools: [],
    rivers: [],
    fieldReports: [],
    incidents: [],
    responseTeams: [],
    shelters: [],
    totalCount: 0,
    cached: false,
    metadata: meta,
  };
}

/**
 * Formats relative time in Hindi and English.
 * Examples: "2 घंटे पहले" / "2 hours ago", "5 मिनट पहले" / "5 minutes ago", "अभी-अभी" / "just now"
 */
export function formatRelativeTime(
  timestamp: number,
  locale: "hi" | "en"
): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (locale === "hi") {
    if (diffDays > 0) return `${diffDays} दिन पहले`;
    if (diffHr > 0) return `${diffHr} घंटे पहले`;
    if (diffMin > 0) return `${diffMin} मिनट पहले`;
    if (diffSec > 10) return `${diffSec} सेकंड पहले`;
    return "अभी-अभी";
  } else {
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
    if (diffSec > 10) return `${diffSec}s ago`;
    return "just now";
  }
}

export interface FetchInfrastructureOptions {
  latitude: number;
  longitude: number;
  district?: string;
  radius?: number;
  forceRefresh?: boolean;
}

export interface FetchInfrastructureResult {
  data: FacilitiesGroupedResponse;
  isFromCache: boolean;
  cacheTimestamp: number | null;
  cooldownRemainingSeconds: number;
  isEmptyPlaceholder: boolean;
  rateLimitExceeded: boolean;
}

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<FetchInfrastructureResult>>();

/**
 * Main fetcher function coordinating:
 * - STEP 1: Aggressive 24h localStorage cache check
 * - STEP 2: Request queue with 60s minimum delay
 * - STEP 3: Exponential backoff retry (60s, 120s, 180s up to 3 times)
 * - STEP 4/5: Graceful return of cached or placeholder data
 */
export async function fetchDistrictInfrastructureClient({
  latitude,
  longitude,
  district,
  radius = 8000,
  forceRefresh = false,
}: FetchInfrastructureOptions): Promise<FetchInfrastructureResult> {
  const districtKey = getOverpassDistrictKey(district, latitude, longitude);

  // STEP 1: Check localStorage first
  if (!forceRefresh) {
    const cached = getOverpassCache(districtKey, false);
    if (cached) {
      return {
        data: cached.data,
        isFromCache: true,
        cacheTimestamp: cached.timestamp,
        cooldownRemainingSeconds: getOverpassCooldownSeconds(),
        isEmptyPlaceholder: false,
        rateLimitExceeded: false,
      };
    }
  }

  // Deduplicate concurrent calls for the same district/coordinate
  const requestKey = `${districtKey}:${radius}:${forceRefresh}`;
  const existingPromise = inFlightRequests.get(requestKey);
  if (existingPromise) {
    return existingPromise;
  }

  const executeFetch = async (): Promise<FetchInfrastructureResult> => {
    // STEP 2: Request queue with delay
    // Ensure at least 60 seconds have elapsed since last call
    const lastCall = getLastOverpassCallTime();
    const elapsed = Date.now() - lastCall;
    if (lastCall > 0 && elapsed < MIN_OVERPASS_INTERVAL_MS) {
      const waitMs = MIN_OVERPASS_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const backoffScheduleSeconds = [60, 120, 180];
    let attempt = 0;
    let rateLimitHit = false;

    while (attempt <= 3) {
      try {
        setLastOverpassCallTime(Date.now());

        const url = `/api/facilities?lat=${latitude}&lon=${longitude}&radius=${radius}${
          forceRefresh ? "&refresh=true" : ""
        }`;

        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));

        if (res.status === 429 || (json.error && /rate limit|wait/i.test(json.error))) {
          rateLimitHit = true;
          const retrySeconds =
            json.retryAfter ||
            (json.error && json.error.match(/(\d+)s/)?.[1]
              ? parseInt(json.error.match(/(\d+)s/)[1], 10)
              : backoffScheduleSeconds[Math.min(attempt, backoffScheduleSeconds.length - 1)]);

          setOverpassRateLimitExpiry(retrySeconds);

          if (attempt < 3) {
            const backoffMs = (backoffScheduleSeconds[attempt] || 60) * 1000;
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }
          break; // Max 3 retries reached
        }

        if (res.ok && json.success && json.data) {
          // Success: save to localStorage with current timestamp
          setOverpassCache(districtKey, json.data);
          return {
            data: json.data,
            isFromCache: false,
            cacheTimestamp: Date.now(),
            cooldownRemainingSeconds: 0,
            isEmptyPlaceholder: false,
            rateLimitExceeded: false,
          };
        }

        // If other non-429 error, don't crash
        break;
      } catch (err) {
        console.warn("[VarshaNetra] Overpass fetch error on attempt " + attempt + ":", err);
        if (attempt < 3) {
          const backoffMs = (backoffScheduleSeconds[attempt] || 60) * 1000;
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        break;
      }
    }

    // After 3 failed retries or rate limit: use cached data if available (even expired)
    const fallbackCache = getOverpassCache(districtKey, true);
    if (fallbackCache) {
      return {
        data: fallbackCache.data,
        isFromCache: true,
        cacheTimestamp: fallbackCache.timestamp,
        cooldownRemainingSeconds: getOverpassCooldownSeconds(),
        isEmptyPlaceholder: false,
        rateLimitExceeded: rateLimitHit,
      };
    }

    // STEP 5: If no cache exists at all, return empty placeholder structure
    const placeholder = createPlaceholderFacilities(latitude, longitude);
    return {
      data: placeholder,
      isFromCache: false,
      cacheTimestamp: null,
      cooldownRemainingSeconds: getOverpassCooldownSeconds(),
      isEmptyPlaceholder: true,
      rateLimitExceeded: rateLimitHit,
    };
  };

  const fetchPromise = executeFetch().finally(() => {
    inFlightRequests.delete(requestKey);
  });

  inFlightRequests.set(requestKey, fetchPromise);
  return fetchPromise;
}
