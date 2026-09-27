"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NormalizedTelemetrySnapshot } from "@/lib/services/canonical-telemetry";

export interface UseCanonicalTelemetryOptions {
  cityId?: string;
  districtId?: string;
  latitude?: number;
  longitude?: number;
  pollingIntervalMs?: number; // 0 or undefined disables polling
  enabled?: boolean;
}

export interface UseCanonicalTelemetryResult {
  snapshot: NormalizedTelemetrySnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: string | null;
}

// Client-side cache to enable instant transitions between supported cities
const clientCache = new Map<string, { snapshot: NormalizedTelemetrySnapshot; timestamp: number }>();
// In-flight request deduplication map to avoid firing multiple parallel fetches for the same city
const inFlightRequests = new Map<string, Promise<NormalizedTelemetrySnapshot>>();

const CLIENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function buildCacheKey(options: UseCanonicalTelemetryOptions): string {
  if (options.cityId) return `city:${options.cityId.toLowerCase()}`;
  if (options.districtId) return `district:${options.districtId.toLowerCase()}`;
  if (typeof options.latitude === "number" && typeof options.longitude === "number") {
    return `coords:${options.latitude.toFixed(3)},${options.longitude.toFixed(3)}`;
  }
  return "city:pune";
}

export function useCanonicalTelemetry(
  options: UseCanonicalTelemetryOptions = {}
): UseCanonicalTelemetryResult {
  const {
    cityId,
    districtId,
    latitude,
    longitude,
    pollingIntervalMs = 0,
    enabled = true,
  } = options;

  const cacheKey = buildCacheKey({ cityId, districtId, latitude, longitude });

  // Initialize with cached data if available
  const [snapshot, setSnapshot] = useState<NormalizedTelemetrySnapshot | null>(() => {
    const cached = clientCache.get(cacheKey);
    return cached ? cached.snapshot : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !snapshot && enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => snapshot?.generatedAt || null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSnapshot = useCallback(
    async (bypassCache = false) => {
      if (!enabled) return;

      // Abort any previously running request for a different location
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Check client cache if not bypassing
      const cached = clientCache.get(cacheKey);
      const isFresh = cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

      if (!bypassCache && isFresh) {
        setSnapshot(cached.snapshot);
        setLastUpdated(cached.snapshot.generatedAt);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        return;
      }

      // If we already have a cached or current snapshot, mark as refreshing instead of full loading
      if (snapshot || cached) {
        setIsRefreshing(true);
        if (cached && !snapshot) {
          setSnapshot(cached.snapshot);
        }
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        // Query params construction
        const params = new URLSearchParams();
        if (cityId) params.set("cityId", cityId);
        else if (districtId) params.set("districtId", districtId);
        else if (typeof latitude === "number" && typeof longitude === "number") {
          params.set("lat", latitude.toString());
          params.set("lon", longitude.toString());
        } else {
          params.set("cityId", "pune");
        }

        if (bypassCache) {
          params.set("refresh", "true");
        }

        const url = `/api/telemetry/snapshot?${params.toString()}`;

        // Deduplicate in-flight requests for the exact same URL
        let requestPromise = inFlightRequests.get(url);
        if (!requestPromise) {
          requestPromise = (async () => {
            const res = await fetch(url, { credentials: "same-origin", signal: controller.signal });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.error || `HTTP ${res.status}: Failed to fetch canonical telemetry`);
            }
            const json = await res.json();
            if (!json.success || !json.data) {
              throw new Error(json.error || "Malformed telemetry snapshot response");
            }
            return json.data as NormalizedTelemetrySnapshot;
          })();

          inFlightRequests.set(url, requestPromise);
        }

        const data = await requestPromise;

        // Save to cache
        clientCache.set(cacheKey, { snapshot: data, timestamp: Date.now() });

        setSnapshot(data);
        setLastUpdated(data.generatedAt);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was aborted due to quick location change; ignore
          return;
        }
        console.error("[useCanonicalTelemetry] Error:", err);
        const msg = err instanceof Error ? err.message : "Failed to load telemetry";
        setError(msg);
      } finally {
        // Remove from in-flight cache
        const params = new URLSearchParams();
        if (cityId) params.set("cityId", cityId);
        else if (districtId) params.set("districtId", districtId);
        else if (typeof latitude === "number" && typeof longitude === "number") {
          params.set("lat", latitude.toString());
          params.set("lon", longitude.toString());
        } else {
          params.set("cityId", "pune");
        }
        if (bypassCache) params.set("refresh", "true");
        inFlightRequests.delete(`/api/telemetry/snapshot?${params.toString()}`);

        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheKey, cityId, districtId, latitude, longitude, enabled, snapshot]
  );

  // Trigger fetch when cacheKey changes (with instant cache load & debounced network fetch)
  useEffect(() => {
    // If cached data is available and fresh, load immediately (0ms)
    const cached = clientCache.get(cacheKey);
    const isFresh = cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

    if (isFresh) {
      setSnapshot(cached.snapshot);
      setLastUpdated(cached.snapshot.generatedAt);
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    // Debounce uncached network fetch by 150ms to prevent request storms on rapid city switches
    const timer = setTimeout(() => {
      fetchSnapshot();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cacheKey, enabled, fetchSnapshot]);

  // Periodic polling if configured
  useEffect(() => {
    if (!pollingIntervalMs || pollingIntervalMs <= 0 || !enabled) return;

    const intervalId = setInterval(() => {
      fetchSnapshot(false);
    }, pollingIntervalMs);

    return () => clearInterval(intervalId);
  }, [fetchSnapshot, pollingIntervalMs, enabled]);

  const refetch = useCallback(
    async (bypassCache = true) => {
      await fetchSnapshot(bypassCache);
    },
    [fetchSnapshot]
  );

  return {
    snapshot,
    isLoading,
    isRefreshing,
    error,
    refetch,
    lastUpdated,
  };
}
