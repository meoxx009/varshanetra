"use client";

/**
 * VarshaNetra Doppler Radar & Satellite Nowcast Hook (VN-NOWCAST-001)
 *
 * Requirements:
 * - 3-minute (180,000 ms) refresh interval, cleared on unmount (C7)
 * - Preserve user's playhead across refreshes by matching closest unix timestamp, not raw index
 * - Exponential backoff on error: 5s -> 15s -> 45s -> 60s
 * - isStale = true when lastUpdated > 15 minutes old (900,000 ms)
 * - Idempotent under React Strict Mode double-mount
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface RadarNowcastFrame {
  time: number;
  iso: string;
  ist: string;
  kind: "observed" | "forecast" | "satellite";
  tile: string;
}

export interface RadarFramesApiResponse {
  generated: number;
  server_time: string;
  radar_past: RadarNowcastFrame[];
  radar_nowcast: RadarNowcastFrame[];
  satellite_ir: RadarNowcastFrame[];
  current_index: number;
  attribution: string;
}

export interface UseRadarFramesReturn {
  allFrames: RadarNowcastFrame[];
  radarPast: RadarNowcastFrame[];
  radarNowcast: RadarNowcastFrame[];
  satelliteFrames: RadarNowcastFrame[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
  refresh: () => Promise<void>;
}

const REFRESH_INTERVAL_MS = 180_000; // 3 minutes (Constraint C8)
const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const BACKOFF_DELAYS_MS = [5_000, 15_000, 45_000, 60_000]; // 5s -> 15s -> 45s -> 60s

// Endpoint resolution: try relative first, with localhost:8000 fallback
const PRIMARY_ENDPOINT = "/api/v1/nowcast/frames";
const FALLBACK_ENDPOINT = "http://localhost:8000/api/v1/nowcast/frames";

export function useRadarFrames(): UseRadarFramesReturn {
  const [radarPast, setRadarPast] = useState<RadarNowcastFrame[]>([]);
  const [radarNowcast, setRadarNowcast] = useState<RadarNowcastFrame[]>([]);
  const [satelliteFrames, setSatelliteFrames] = useState<RadarNowcastFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Refs for StrictMode idempotency and lifecycle tracking
  const isMountedRef = useRef<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const staleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const hasInitializedIndexRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(currentIndex);
  const allFramesRef = useRef<RadarNowcastFrame[]>([]);

  // Keep refs synchronized with state
  currentIndexRef.current = currentIndex;

  // Composite chronological radar timeline: [...radar_past, ...radar_nowcast]
  const allFrames = useMemo(() => {
    return [...radarPast, ...radarNowcast];
  }, [radarPast, radarNowcast]);

  allFramesRef.current = allFrames;

  // Periodic tick every 30s to re-evaluate isStale in real-time
  useEffect(() => {
    staleTimerRef.current = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, []);

  const isStale = useMemo(() => {
    if (!lastUpdated) return false;
    return nowMs - lastUpdated > STALE_THRESHOLD_MS;
  }, [lastUpdated, nowMs]);

  // Fetch logic with playhead preservation and fallback resolution
  const fetchFrames = useCallback(async () => {
    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear any pending refresh timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      let response: Response | null = null;

      // Try primary endpoint first
      try {
        response = await fetch(PRIMARY_ENDPOINT, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok && response.status === 404) {
          // Fallback to FastAPI direct URL if Next.js proxy route is not yet mounted
          response = null;
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        response = null;
      }

      // If primary failed or was 404, try direct FastAPI endpoint
      if (!response || !response.ok) {
        response = await fetch(FALLBACK_ENDPOINT, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
      }

      if (!response.ok) {
        throw new Error(`Nowcast upstream error (HTTP ${response.status})`);
      }

      const data: RadarFramesApiResponse = await response.json();
      if (!isMountedRef.current) return;

      const past = Array.isArray(data.radar_past) ? data.radar_past : [];
      const nowcast = Array.isArray(data.radar_nowcast) ? data.radar_nowcast : [];
      const satellite = Array.isArray(data.satellite_ir) ? data.satellite_ir : [];
      const newAllFrames = [...past, ...nowcast];

      // Playhead preservation logic:
      // If the user already had a selected frame, find the closest unix timestamp in new frames
      if (hasInitializedIndexRef.current && allFramesRef.current.length > 0 && newAllFrames.length > 0) {
        const currentSelectedFrame = allFramesRef.current[currentIndexRef.current];
        const targetTime = currentSelectedFrame ? currentSelectedFrame.time : null;

        if (targetTime !== null) {
          let closestIdx = 0;
          let minDiff = Infinity;
          for (let i = 0; i < newAllFrames.length; i++) {
            const diff = Math.abs(newAllFrames[i].time - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          setCurrentIndex(closestIdx);
        }
      } else if (newAllFrames.length > 0) {
        // First load default: API's current_index (latest observed frame)
        const defaultIdx = typeof data.current_index === "number"
          ? Math.min(Math.max(0, data.current_index), newAllFrames.length - 1)
          : (past.length > 0 ? past.length - 1 : 0);
        setCurrentIndex(defaultIdx);
        hasInitializedIndexRef.current = true;
      }

      setRadarPast(past);
      setRadarNowcast(nowcast);
      setSatelliteFrames(satellite);
      setLastUpdated(Date.now());
      setError(null);
      retryCountRef.current = 0; // Reset exponential backoff on success

      // Expose to window for browser console verification
      if (typeof window !== "undefined") {
        (window as unknown as { __radarFramesDebug?: unknown }).__radarFramesDebug = {
          allFramesCount: newAllFrames.length,
          radarPastCount: past.length,
          radarNowcastCount: nowcast.length,
          satelliteCount: satellite.length,
          lastUpdated: new Date().toISOString(),
          isStale: false,
        };
      }

      // Schedule next normal refresh in 3 minutes (Constraint C7 / C8)
      if (isMountedRef.current) {
        timerRef.current = setTimeout(() => {
          fetchFrames();
        }, REFRESH_INTERVAL_MS);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Normal cleanup cancellation, do not retry or set error
      }

      if (!isMountedRef.current) return;

      const errorMsg = err instanceof Error ? err.message : "Failed to load Doppler radar frames";
      setError(errorMsg);

      // Exponential backoff: 5s -> 15s -> 45s -> 60s
      const delayIndex = Math.min(retryCountRef.current, BACKOFF_DELAYS_MS.length - 1);
      const retryDelay = BACKOFF_DELAYS_MS[delayIndex];
      retryCountRef.current += 1;

      console.warn(`[useRadarFrames] Error fetching frames: ${errorMsg}. Retrying in ${retryDelay / 1000}s...`);

      timerRef.current = setTimeout(() => {
        fetchFrames();
      }, retryDelay);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Mount effect: Strict Mode idempotent double-mount handling
  useEffect(() => {
    isMountedRef.current = true;
    fetchFrames();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fetchFrames]);

  return {
    allFrames,
    radarPast,
    radarNowcast,
    satelliteFrames,
    currentIndex,
    setCurrentIndex,
    isLoading,
    error,
    lastUpdated,
    isStale,
    refresh: fetchFrames,
  };
}
