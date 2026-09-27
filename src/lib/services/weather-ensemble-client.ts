/**
 * VarshaNetra - LIVE-001: Client-Side Weather Ensemble Service & LocalStorage Cache
 *
 * Implements:
 * 1. LocalStorage caching with key weather_ensemble_<lat>_<lon>
 * 2. 30-minute cache TTL
 * 3. Graceful degradation: uses stale cache with age badge if API fails
 * 4. Per-model unavailable handling if no cache is present
 */

import { MultiModelEnsembleResponse } from "@/types";

export const ENSEMBLE_CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_PREFIX = "weather_ensemble_";

export interface CachedEnsemblePayload {
  data: MultiModelEnsembleResponse;
  timestamp: number;
}

export function getEnsembleStorageKey(lat: number, lon: number): string {
  return `${STORAGE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

export function getEnsembleCache(
  lat: number,
  lon: number,
  allowExpired = false
): CachedEnsemblePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getEnsembleStorageKey(lat, lon));
    if (!raw) return null;

    const parsed: CachedEnsemblePayload = JSON.parse(raw);
    if (!parsed || !parsed.data || typeof parsed.timestamp !== "number") {
      return null;
    }

    const age = Date.now() - parsed.timestamp;
    if (allowExpired || age < ENSEMBLE_CLIENT_CACHE_TTL_MS) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setEnsembleCache(
  lat: number,
  lon: number,
  data: MultiModelEnsembleResponse
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedEnsemblePayload = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(getEnsembleStorageKey(lat, lon), JSON.stringify(payload));
  } catch (e) {
    console.warn("[VarshaNetra] Could not save weather ensemble cache to localStorage:", e);
  }
}

export interface FetchEnsembleResult {
  data: MultiModelEnsembleResponse | null;
  isStale: boolean;
  cacheAgeMinutes: number;
  fromCache: boolean;
  error?: string | null;
}

export async function fetchWeatherEnsembleClient(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<FetchEnsembleResult> {
  // 1. Check local cache first if not force refresh
  if (!forceRefresh) {
    const fresh = getEnsembleCache(lat, lon, false);
    if (fresh) {
      const ageMin = Math.floor((Date.now() - fresh.timestamp) / (60 * 1000));
      return {
        data: fresh.data,
        isStale: false,
        cacheAgeMinutes: ageMin,
        fromCache: true,
      };
    }
  }

  // 2. Fetch live endpoint
  try {
    const res = await fetch(
      `/api/weather/ensemble?lat=${lat}&lon=${lon}${forceRefresh ? "&refresh=true" : ""}`
    );
    const json: MultiModelEnsembleResponse = await res.json();

    if (res.ok && json.success) {
      setEnsembleCache(lat, lon, json);
      return {
        data: json,
        isStale: false,
        cacheAgeMinutes: 0,
        fromCache: false,
      };
    }

    throw new Error(json.error || "Weather ensemble endpoint returned error");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";

    // 3. Fallback to stale cache if available
    const stale = getEnsembleCache(lat, lon, true);
    if (stale) {
      const ageMin = Math.floor((Date.now() - stale.timestamp) / (60 * 1000));
      return {
        data: stale.data,
        isStale: true,
        cacheAgeMinutes: ageMin,
        fromCache: true,
        error: msg,
      };
    }

    // 4. Return error state without cache
    return {
      data: null,
      isStale: false,
      cacheAgeMinutes: 0,
      fromCache: false,
      error: msg,
    };
  }
}
