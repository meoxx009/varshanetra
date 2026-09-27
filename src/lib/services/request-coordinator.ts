/**
 * Global Client Request Coordinator & Deduplication Service
 * VarshaNetra Disaster Warning System (VNET-PERFORMANCE-005)
 *
 * Responsibilities:
 * 1. Deduplicates concurrent in-flight fetch requests for the same URL (request coalescing).
 * 2. Caches JSON responses with short client-side TTL (30s-120s).
 * 3. Provides location-scoped request cancellation (aborts in-flight queries when city changes).
 * 4. Tracks empirical telemetry metrics: total requests, cache hits, coalesced requests, network calls.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface RequestCoordinatorStats {
  totalRequests: number;
  cacheHits: number;
  inFlightCoalesced: number;
  networkCalls: number;
  abortedRequests: number;
  deduplicationRatio: number; // percentage of requests saved without network calls
}

const stats: RequestCoordinatorStats = {
  totalRequests: 0,
  cacheHits: 0,
  inFlightCoalesced: 0,
  networkCalls: 0,
  abortedRequests: 0,
  deduplicationRatio: 0,
};

const clientMemoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightMap = new Map<string, Promise<unknown>>();
let currentDistrictAbortController: AbortController | null = null;

export function getDistrictAbortSignal(): AbortSignal {
  if (!currentDistrictAbortController) {
    currentDistrictAbortController = new AbortController();
  }
  return currentDistrictAbortController.signal;
}

/**
 * Triggers an immediate abort of all in-flight queries associated with the previous district.
 */
export function abortPreviousDistrictRequests(): void {
  if (currentDistrictAbortController) {
    currentDistrictAbortController.abort();
    currentDistrictAbortController = new AbortController();
    stats.abortedRequests++;
  }
  // Clear any pending in-flight promises that were canceled
  inFlightMap.clear();
}

export interface CoordinatedFetchOptions {
  ttlMs?: number;
  bypassCache?: boolean;
  signal?: AbortSignal;
}

/**
 * Coordinated fetch function that deduplicates in-flight requests and provides caching.
 */
export async function coordinatedFetch<T>(
  url: string,
  options: CoordinatedFetchOptions = {}
): Promise<T> {
  const { ttlMs = 45000, bypassCache = false, signal } = options;
  const now = Date.now();
  stats.totalRequests++;

  // 1. Check in-memory client cache
  if (!bypassCache) {
    const cached = clientMemoryCache.get(url);
    if (cached && now - cached.timestamp < ttlMs) {
      stats.cacheHits++;
      return cached.data as T;
    }
  }

  // 2. Check for in-flight identical request (Request Coalescing)
  const inFlight = inFlightMap.get(url);
  if (inFlight && !bypassCache) {
    stats.inFlightCoalesced++;
    return inFlight as Promise<T>;
  }

  // 3. Initiate single network request
  stats.networkCalls++;
  const fetchPromise = (async () => {
    try {
      // Combine with location abort signal if not already provided
      const districtSignal = getDistrictAbortSignal();
      const effectiveSignal = signal || districtSignal;

      const res = await fetch(url, {
        signal: effectiveSignal,
        headers: {
          Accept: "application/json",
          "X-VarshaNetra-Coordinated": "1",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }

      const json = await res.json();
      clientMemoryCache.set(url, { data: json, timestamp: Date.now() });
      return json as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        stats.abortedRequests++;
      }
      throw err;
    } finally {
      inFlightMap.delete(url);
    }
  })();

  inFlightMap.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * Pre-warms cache for a specific key.
 */
export function setCoordinatedCache<T>(url: string, data: T): void {
  clientMemoryCache.set(url, { data, timestamp: Date.now() });
}

/**
 * Clears the coordinated client cache.
 */
export function clearCoordinatedCache(): void {
  clientMemoryCache.clear();
  inFlightMap.clear();
}

/**
 * Exposes empirical performance metrics for request deduplication and caching.
 */
export function getCoordinatorStats(): RequestCoordinatorStats {
  const saved = stats.cacheHits + stats.inFlightCoalesced;
  const ratio = stats.totalRequests > 0 ? (saved / stats.totalRequests) * 100 : 0;
  return {
    ...stats,
    deduplicationRatio: Math.round(ratio * 10) / 10,
  };
}

/**
 * Resets empirical performance metrics (useful for isolated benchmark tests).
 */
export function resetCoordinatorStats(): void {
  stats.totalRequests = 0;
  stats.cacheHits = 0;
  stats.inFlightCoalesced = 0;
  stats.networkCalls = 0;
  stats.abortedRequests = 0;
  stats.deduplicationRatio = 0;
}
