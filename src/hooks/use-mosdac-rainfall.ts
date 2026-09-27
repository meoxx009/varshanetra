"use client";

import { useState, useEffect, useCallback } from "react";
import { MosdacRainfallResponse } from "@/types/mosdac";

const MOSDAC_CLIENT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 mins

interface UseMosdacRainfallOptions {
  latitude: number;
  longitude: number;
  district?: string;
  autoFetch?: boolean;
}

interface UseMosdacRainfallResult {
  data: MosdacRainfallResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  isConfigured: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function useMosdacRainfall({
  latitude,
  longitude,
  district = "Pune",
  autoFetch = true,
}: UseMosdacRainfallOptions): UseMosdacRainfallResult {
  const [data, setData] = useState<MosdacRainfallResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `mosdac_insat3d_${district.toLowerCase()}_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

  const fetchData = useCallback(
    async (force = false) => {
      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const age = Date.now() - (parsed.cachedAt || 0);
            if (age < MOSDAC_CLIENT_CACHE_TTL_MS && parsed.data) {
              setData(parsed.data);
              setIsLoading(false);
              setIsStale(false);
              return;
            } else if (parsed.data) {
              setData(parsed.data);
              setIsStale(true);
            }
          }
        } catch {
          // ignore localStorage errors
        }
      }

      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const queryParams = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          district,
          refresh: force ? "true" : "false",
        });

        const res = await fetch(`/api/rainfall/mosdac?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch MOSDAC data`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setIsStale(json.data.status === "stale");

          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: json.data,
                cachedAt: Date.now(),
              })
            );
          } catch {
            // ignore localStorage quota errors
          }
        } else {
          throw new Error(json.error || "Invalid response format from MOSDAC endpoint");
        }
      } catch (err) {
        console.error("[useMosdacRainfall] Fetch failed:", err);
        setError(err instanceof Error ? err.message : "Failed to load MOSDAC telemetry");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheKey, latitude, longitude, district]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchData(false);
    }
  }, [autoFetch, fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    isConfigured: data?.isConfigured ?? false,
    error,
    refetch: fetchData,
  };
}
