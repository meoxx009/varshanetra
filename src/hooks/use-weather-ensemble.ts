"use client";

import { useState, useEffect, useCallback } from "react";
import { MultiModelEnsembleResponse } from "@/types";
import {
  fetchWeatherEnsembleClient,
  getEnsembleCache,
} from "@/lib/services/weather-ensemble-client";

interface UseWeatherEnsembleOptions {
  latitude: number;
  longitude: number;
  autoFetch?: boolean;
}

export function useWeatherEnsemble({
  latitude,
  longitude,
  autoFetch = true,
}: UseWeatherEnsembleOptions) {
  const [ensemble, setEnsemble] = useState<MultiModelEnsembleResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadEnsemble = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Instant local cache hit check for zero latency initial render
      if (!forceRefresh) {
        const cached = getEnsembleCache(latitude, longitude, false);
        if (cached) {
          const age = Math.floor((Date.now() - cached.timestamp) / (60 * 1000));
          setEnsemble(cached.data);
          setIsStale(false);
          setCacheAgeMinutes(age);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      try {
        const result = await fetchWeatherEnsembleClient(latitude, longitude, forceRefresh);
        if (result.data) {
          setEnsemble(result.data);
          setIsStale(result.isStale);
          setCacheAgeMinutes(result.cacheAgeMinutes);
        } else {
          setError(result.error || "Failed to load multi-model NWP forecast.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [latitude, longitude]
  );

  useEffect(() => {
    if (autoFetch && latitude && longitude) {
      loadEnsemble(false);
    }
  }, [autoFetch, latitude, longitude, loadEnsemble]);

  return {
    ensemble,
    isLoading,
    isRefreshing,
    isStale,
    cacheAgeMinutes,
    error,
    refetch: loadEnsemble,
  };
}
