"use client";

import { useState, useEffect, useCallback } from "react";
import { SatelliteRainfallResponse } from "@/types/nasa-gpm";
import { coordinatedFetch } from "@/lib/services/request-coordinator";

const SATELLITE_CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 mins

interface UseSatelliteRainfallOptions {
  latitude: number;
  longitude: number;
  district?: string;
  nwpForecastMm?: number;
  autoFetch?: boolean;
}

interface UseSatelliteRainfallResult {
  data: SatelliteRainfallResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  isConfigured: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function useSatelliteRainfall({
  latitude,
  longitude,
  district = "Pune",
  nwpForecastMm,
  autoFetch = true,
}: UseSatelliteRainfallOptions): UseSatelliteRainfallResult {
  const [data, setData] = useState<SatelliteRainfallResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `satellite_gpm_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

  const fetchData = useCallback(
    async (force = false) => {
      if (!force) {
        // Try reading from localStorage first
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const age = Date.now() - (parsed.cachedAt || 0);
            if (age < SATELLITE_CLIENT_CACHE_TTL_MS && parsed.data) {
              setData(parsed.data);
              setIsLoading(false);
              setIsStale(false);
              return;
            } else if (parsed.data) {
              // Stale cache available: render immediately, then revalidate in background
              setData(parsed.data);
              setIsStale(true);
            }
          }
        } catch {
          // localStorage access failed or blocked
        }
      }

      if (data) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const query = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          district,
          ...(nwpForecastMm !== undefined ? { nwp_forecast: nwpForecastMm.toString() } : {}),
          ...(force ? { refresh: "true" } : {}),
        });

        const json = await coordinatedFetch<{ success: boolean; data: SatelliteRainfallResponse; error?: string }>(
          `/api/rainfall/satellite?${query.toString()}`,
          { bypassCache: force, ttlMs: 120000 }
        );

        if (!json.success || !json.data) {
          throw new Error(json.error || "Failed to parse satellite rainfall response");
        }

        setData(json.data);
        setIsStale(false);

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: json.data,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // storage quota exceeded or disabled
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load satellite rainfall";
        setError(msg);
        // If we have stale data already, keep displaying it with stale warning
        if (!data) {
          setIsStale(false);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheKey, latitude, longitude, district, nwpForecastMm, data]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchData(false);
    }
  }, [latitude, longitude, district, nwpForecastMm, autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

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
