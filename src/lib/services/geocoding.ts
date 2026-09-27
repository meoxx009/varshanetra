import { GeocodeLocation, DataSourceMeta } from "@/types";
import { recordSuccessfulFetch } from "@/lib/services/data-sources";

let lastRequestTimestamp = 0;
const MIN_INTERVAL_MS = 1100; // Nominatim policy: at most 1 request per second

/**
 * Throttle helper to enforce OpenStreetMap Nominatim usage policy.
 */
async function rateLimitNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTimestamp = Date.now();
}

export interface GeocodeServiceResult {
  success: boolean;
  data?: GeocodeLocation[];
  error?: string;
}

/**
 * Reusable geocoding service via OpenStreetMap Nominatim.
 * Complies with Nominatim Usage Policy: custom User-Agent, contact email, rate limiting, and attribution.
 */
export async function searchLocation(query: string): Promise<GeocodeServiceResult> {
  if (!query || query.trim().length < 2) {
    return {
      success: true,
      data: [],
    };
  }

  await rateLimitNominatim();

  const appName = process.env.NEXT_PUBLIC_NOMINATIM_APP_NAME || "VarshaNetra-DisasterWarningSystem";
  const contactEmail = process.env.NEXT_PUBLIC_NOMINATIM_CONTACT_EMAIL || "admin@varshanetra.local";

  const userAgent = `${appName}/1.0 (${contactEmail})`;
  const encodedQuery = encodeURIComponent(`${query.trim()}, India`);
  const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&countrycodes=in`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Nominatim geocoding service returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await res.json();
    recordSuccessfulFetch("osm-nominatim");

    const metadata: DataSourceMeta = {
      provider: "OpenStreetMap Nominatim",
      lastUpdated: new Date().toISOString(),
      origin: "LIVE_API",
      attributionNotice: "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
      url: "https://nominatim.openstreetmap.org/",
    };

    const parsedLocations: GeocodeLocation[] = results.map((item) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type || item.class || "location",
      importance: Number(item.importance ?? 0),
      metadata,
    }));

    return {
      success: true,
      data: parsedLocations,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      success: false,
      error: `Geocoding request failed: ${message}`,
    };
  }
}

export interface ReverseGeocodeResult {
  success: boolean;
  displayName?: string;
  name?: string;
  suburb?: string;
  neighbourhood?: string;
  cityDistrict?: string;
  city?: string;
  county?: string;
  state?: string;
  error?: string;
}

const reverseGeocodeCache = new Map<string, { data: ReverseGeocodeResult; timestamp: number }>();
const REVERSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache

/**
 * Reverse geocodes coordinates to a localized place name via OpenStreetMap Nominatim.
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < REVERSE_CACHE_TTL_MS) {
    return cached.data;
  }

  await rateLimitNominatim();

  const appName = process.env.NEXT_PUBLIC_NOMINATIM_APP_NAME || "VarshaNetra-DisasterWarningSystem";
  const contactEmail = process.env.NEXT_PUBLIC_NOMINATIM_CONTACT_EMAIL || "admin@varshanetra.local";
  const userAgent = `${appName}/1.0 (${contactEmail})`;

  const endpoint = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14&addressdetails=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Nominatim reverse geocode returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item: any = await res.json();
    recordSuccessfulFetch("osm-nominatim");

    const addr = item.address || {};
    const result: ReverseGeocodeResult = {
      success: true,
      displayName: item.display_name,
      name: item.name || addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.town || addr.village,
      suburb: addr.suburb,
      neighbourhood: addr.neighbourhood,
      cityDistrict: addr.city_district,
      city: addr.city || addr.town || addr.village,
      county: addr.county,
      state: addr.state,
    };

    reverseGeocodeCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      success: false,
      error: `Reverse geocoding failed: ${message}`,
    };
  }
}

