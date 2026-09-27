"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { DistrictLocation } from "@/types";
import { abortPreviousDistrictRequests } from "@/lib/services/request-coordinator";

export const DEFAULT_DISTRICT_LOCATION: DistrictLocation = {
  displayName: "Pune District, Maharashtra, India",
  shortName: "Pune District",
  latitude: 18.5204,
  longitude: 73.8567,
  type: "administrative",
  district: "Pune",
  state: "Maharashtra",
};

const STORAGE_KEY = "varshanetra_operational_location";

interface DistrictLocationContextType {
  location: DistrictLocation;
  setLocation: (newLocation: DistrictLocation) => void;
  resetToDefault: () => void;
  isCustomLocation: boolean;
  isTransitioning: boolean;
}

const DistrictLocationContext = createContext<DistrictLocationContextType>({
  location: DEFAULT_DISTRICT_LOCATION,
  setLocation: () => {},
  resetToDefault: () => {},
  isCustomLocation: false,
  isTransitioning: false,
});

export function DistrictLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocationState] = useState<DistrictLocation>(DEFAULT_DISTRICT_LOCATION);
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted location from localStorage upon mounting
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DistrictLocation;
        if (parsed.latitude && parsed.longitude && parsed.displayName) {
          setLocationState(parsed);
        }
      }
    } catch {
      // ignore storage errors
    } finally {
      setMounted(true);
    }
  }, []);

  const setLocation = (newLocation: DistrictLocation) => {
    // Only update if location actually changed
    if (
      newLocation.latitude === location.latitude &&
      newLocation.longitude === location.longitude &&
      newLocation.district === location.district
    ) {
      return;
    }

    // Abort in-flight requests of previous location
    abortPreviousDistrictRequests();

    setIsTransitioning(true);
    setLocationState(newLocation);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
    } catch {
      // ignore storage errors
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  };

  const resetToDefault = () => {
    abortPreviousDistrictRequests();
    setLocationState(DEFAULT_DISTRICT_LOCATION);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <DistrictLocationContext.Provider
      value={{
        location,
        setLocation,
        resetToDefault,
        isCustomLocation:
          mounted &&
          (location.latitude !== DEFAULT_DISTRICT_LOCATION.latitude ||
            location.longitude !== DEFAULT_DISTRICT_LOCATION.longitude),
        isTransitioning,
      }}
    >
      {children}
    </DistrictLocationContext.Provider>
  );
}

export function useDistrictLocation() {
  const context = useContext(DistrictLocationContext);
  if (!context) {
    throw new Error("useDistrictLocation must be used within DistrictLocationProvider");
  }
  return context;
}
