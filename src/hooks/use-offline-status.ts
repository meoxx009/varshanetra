"use client";

import { useState, useEffect, useCallback } from "react";

export interface OfflineStatus {
  isOffline: boolean;
  isOnline: boolean;
  lastOnlineTime: Date | null;
  cachedDataAge: string | null;
  retryConnection: () => Promise<boolean>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("varshanetra_last_online");
      return stored ? new Date(stored) : new Date();
    }
    return null;
  });

  const [cachedDataAge, setCachedDataAge] = useState<string | null>(null);

  // Compute cached data age in readable format
  const updateCachedAge = useCallback(() => {
    if (!lastOnlineTime) {
      setCachedDataAge(null);
      return;
    }
    const diffMs = Date.now() - lastOnlineTime.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) {
      setCachedDataAge("Just now");
    } else if (mins < 60) {
      setCachedDataAge(`${mins} min ago`);
    } else {
      const hours = Math.floor(mins / 60);
      setCachedDataAge(`${hours} hr ${mins % 60}m ago`);
    }
  }, [lastOnlineTime]);

  useEffect(() => {
    updateCachedAge();
    const interval = setInterval(updateCachedAge, 30000);
    return () => clearInterval(interval);
  }, [updateCachedAge]);

  // Attempt connection check to a lightweight asset
  const retryConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Ping cache-busted lightweight manifest or health endpoint
      const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        setIsOffline(false);
        const now = new Date();
        setLastOnlineTime(now);
        localStorage.setItem("varshanetra_last_online", now.toISOString());
        window.dispatchEvent(new CustomEvent("varshanetra:network-status", { detail: { isOffline: false } }));
        window.dispatchEvent(new CustomEvent("varshanetra:trigger-sync"));
        return true;
      }
    } catch {
      setIsOffline(true);
    }
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      const now = new Date();
      setLastOnlineTime(now);
      localStorage.setItem("varshanetra_last_online", now.toISOString());
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleCustomStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOffline: boolean }>;
      if (typeof customEvent.detail?.isOffline === "boolean") {
        setIsOffline(customEvent.detail.isOffline);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("varshanetra:network-status", handleCustomStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("varshanetra:network-status", handleCustomStatus);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    lastOnlineTime,
    cachedDataAge,
    retryConnection,
  };
}
