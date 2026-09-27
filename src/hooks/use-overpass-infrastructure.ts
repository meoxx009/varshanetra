"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FacilitiesGroupedResponse } from "@/types";
import {
  fetchDistrictInfrastructureClient,
  getOverpassCooldownSeconds,
  getOverpassCache,
  getOverpassDistrictKey,
} from "@/lib/services/overpass-client";

interface UseOverpassInfrastructureOptions {
  latitude: number;
  longitude: number;
  district?: string;
  radius?: number;
  autoFetch?: boolean;
}

export function useOverpassInfrastructure({
  latitude,
  longitude,
  district,
  radius = 8000,
  autoFetch = true,
}: UseOverpassInfrastructureOptions) {
  const [facilities, setFacilities] = useState<FacilitiesGroupedResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isEmptyPlaceholder, setIsEmptyPlaceholder] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize live cooldown countdown
  const updateCooldown = useCallback(() => {
    const remaining = getOverpassCooldownSeconds();
    setCooldownSeconds(remaining);
    return remaining;
  }, []);

  useEffect(() => {
    updateCooldown();
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          const fresh = getOverpassCooldownSeconds();
          return fresh > 0 ? fresh : 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateCooldown]);

  const loadInfrastructure = useCallback(
    async (bypassCache = false) => {
      if (bypassCache) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Check immediate localStorage hit for zero-latency initial paint
      if (!bypassCache) {
        const districtKey = getOverpassDistrictKey(district, latitude, longitude);
        const instantHit = getOverpassCache(districtKey, false);
        if (instantHit) {
          setFacilities(instantHit.data);
          setIsFromCache(true);
          setCacheTimestamp(instantHit.timestamp);
          setIsLoading(false);
          setIsRefreshing(false);
          setIsEmptyPlaceholder(false);
          updateCooldown();
          return;
        }
      }

      try {
        const result = await fetchDistrictInfrastructureClient({
          latitude,
          longitude,
          district,
          radius,
          forceRefresh: bypassCache,
        });

        setFacilities(result.data);
        setIsFromCache(result.isFromCache);
        setCacheTimestamp(result.cacheTimestamp);
        setIsEmptyPlaceholder(result.isEmptyPlaceholder);
        setCooldownSeconds(getOverpassCooldownSeconds());
      } catch (err) {
        console.warn("[VarshaNetra] Error in useOverpassInfrastructure:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [latitude, longitude, district, radius, updateCooldown]
  );

  useEffect(() => {
    if (autoFetch && latitude && longitude) {
      loadInfrastructure(false);
    }
  }, [autoFetch, latitude, longitude, loadInfrastructure]);

  return {
    facilities,
    isLoading,
    isRefreshing,
    isFromCache,
    cacheTimestamp,
    cooldownSeconds,
    isEmptyPlaceholder,
    refetch: loadInfrastructure,
  };
}
