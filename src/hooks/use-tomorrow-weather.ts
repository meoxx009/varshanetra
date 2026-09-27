"use client";

import { useState, useEffect, useCallback } from "react";
import { TomorrowApiResponse } from "@/types/tomorrow";
import { coordinatedFetch } from "@/lib/services/request-coordinator";

interface UseTomorrowWeatherOptions {
  latitude: number;
  longitude: number;
  district?: string;
  autoFetch?: boolean;
}

export function useTomorrowWeather({
  latitude,
  longitude,
  district,
  autoFetch = true,
}: UseTomorrowWeatherOptions) {
  const [data, setData] = useState<TomorrowApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTomorrow = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const districtParam = district ? `&district=${encodeURIComponent(district)}` : "";
        const refreshParam = forceRefresh ? "&refresh=true" : "";
        const json = await coordinatedFetch<TomorrowApiResponse>(
          `/api/weather/tomorrow?lat=${latitude}&lon=${longitude}${districtParam}${refreshParam}`,
          { bypassCache: forceRefresh, ttlMs: 60000 }
        );
        setData(json);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load Tomorrow.io data";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [latitude, longitude, district]
  );

  useEffect(() => {
    if (autoFetch && !isNaN(latitude) && !isNaN(longitude)) {
      fetchTomorrow(false);
    }
  }, [fetchTomorrow, autoFetch, latitude, longitude]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchTomorrow,
  };
}
