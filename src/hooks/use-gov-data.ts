"use client";

import { useState, useEffect, useCallback } from "react";
import { GovDataResponse } from "@/lib/services/govdata";

interface UseGovDataReturn {
  data: GovDataResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGovData(districtName: string, stateName?: string): UseGovDataReturn {
  const [data, setData] = useState<GovDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!districtName) return;

      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const url = new URL("/api/govdata", window.location.origin);
        url.searchParams.set("district", districtName);
        if (stateName) url.searchParams.set("state", stateName);

        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Failed to load government data (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          throw new Error(json.error || "No government data returned");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error connecting to government data API";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [districtName, stateName]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: () => fetchData(true),
  };
}

export default useGovData;
