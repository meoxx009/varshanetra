import { NextRequest, NextResponse } from "next/server";
import {
  UsgsEarthquakeFeature,
  EarthquakeHazardResponse,
} from "@/types/earthquake";

export const dynamic = "force-dynamic";

// In-memory cache with 15-minute TTL per query key
interface CacheEntry {
  data: EarthquakeHazardResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Standard Haversine distance in kilometers between two geo coordinates
 */
function computeHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates realistic fallback seismic features when USGS upstream is unreachable
 */
function generateFallbackEarthquakes(
  districtName: string,
  centerLat: number,
  centerLon: number
): UsgsEarthquakeFeature[] {
  const isHimalayan =
    districtName.toLowerCase().includes("chamoli") ||
    districtName.toLowerCase().includes("mandi") ||
    districtName.toLowerCase().includes("kullu") ||
    districtName.toLowerCase().includes("uttarakhand") ||
    districtName.toLowerCase().includes("himachal");

  const isWesternGhats =
    districtName.toLowerCase().includes("wayanad") ||
    districtName.toLowerCase().includes("idukki") ||
    districtName.toLowerCase().includes("kerala");

  const now = Date.now();

  if (isHimalayan) {
    return [
      {
        id: "usgs_demo_him_1",
        magnitude: 4.2,
        place: `42 km NNE of ${districtName}, India (Main Central Thrust)`,
        time: new Date(now - 14 * 3600 * 1000).toISOString(),
        timestamp: now - 14 * 3600 * 1000,
        coordinates: [centerLon + 0.15, centerLat + 0.32, 10.4],
        latitude: Math.round((centerLat + 0.32) * 10000) / 10000,
        longitude: Math.round((centerLon + 0.15) * 10000) / 10000,
        depthKm: 10.4,
        distanceKm: 38.5,
        url: "https://earthquake.usgs.gov/earthquakes/map/",
        shakemapUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/demo/shakemap",
      },
      {
        id: "usgs_demo_him_2",
        magnitude: 3.5,
        place: `78 km W of ${districtName}, India`,
        time: new Date(now - 52 * 3600 * 1000).toISOString(),
        timestamp: now - 52 * 3600 * 1000,
        coordinates: [centerLon - 0.72, centerLat - 0.1, 14.2],
        latitude: Math.round((centerLat - 0.1) * 10000) / 10000,
        longitude: Math.round((centerLon - 0.72) * 10000) / 10000,
        depthKm: 14.2,
        distanceKm: 76.8,
        url: "https://earthquake.usgs.gov/earthquakes/map/",
        shakemapUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/demo/shakemap",
      },
    ];
  }

  if (isWesternGhats) {
    return [
      {
        id: "usgs_demo_wg_1",
        magnitude: 3.2,
        place: `65 km SE of ${districtName}, Western Ghats Escarpment`,
        time: new Date(now - 36 * 3600 * 1000).toISOString(),
        timestamp: now - 36 * 3600 * 1000,
        coordinates: [centerLon + 0.38, centerLat - 0.42, 8.5],
        latitude: Math.round((centerLat - 0.42) * 10000) / 10000,
        longitude: Math.round((centerLon + 0.38) * 10000) / 10000,
        depthKm: 8.5,
        distanceKm: 63.2,
        url: "https://earthquake.usgs.gov/earthquakes/map/",
        shakemapUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/demo/shakemap",
      },
    ];
  }

  // Peninsular India baseline
  return [
    {
      id: "usgs_demo_pen_1",
      magnitude: 3.1,
      place: `112 km S of ${districtName}, Deccan Volcanic Province`,
      time: new Date(now - 88 * 3600 * 1000).toISOString(),
      timestamp: now - 88 * 3600 * 1000,
      coordinates: [centerLon - 0.2, centerLat - 1.0, 10.0],
      latitude: Math.round((centerLat - 1.0) * 10000) / 10000,
      longitude: Math.round((centerLon - 0.2) * 10000) / 10000,
      depthKm: 10.0,
      distanceKm: 112.4,
      url: "https://earthquake.usgs.gov/earthquakes/map/",
      shakemapUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/demo/shakemap",
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const districtName = searchParams.get("district") || "District EOC";
    const radiusKm = parseFloat(searchParams.get("radius") || "200");

    const centerLat = latParam ? parseFloat(latParam) : 18.5204; // Pune default
    const centerLon = lonParam ? parseFloat(lonParam) : 73.8567;

    const cacheKey = `${centerLat.toFixed(2)}_${centerLon.toFixed(2)}_${radiusKm}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // 7-day query window
    const startTimeIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTimeIso = new Date(now).toISOString();

    const minLat = (centerLat - 2.0).toFixed(4);
    const maxLat = (centerLat + 2.0).toFixed(4);
    const minLon = (centerLon - 2.0).toFixed(4);
    const maxLon = (centerLon + 2.0).toFixed(4);

    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${encodeURIComponent(
      startTimeIso
    )}&endtime=${encodeURIComponent(
      endTimeIso
    )}&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}&minmagnitude=3.0&orderby=time`;

    let earthquakes: UsgsEarthquakeFeature[] = [];
    let isLive = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

      const res = await fetch(usgsUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "VarshaNetra-Disaster-Management-System/1.0",
        },
        next: { revalidate: 900 }, // 15 minutes
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const rawJson = await res.json();
        const features = rawJson.features || [];

        // Parse features & compute distance
        earthquakes = features
          .map((f: {
            id: string;
            properties?: {
              mag?: number;
              place?: string;
              time?: number;
              url?: string;
            };
            geometry?: {
              coordinates?: [number, number, number];
            };
          }) => {
            const coords = f.geometry?.coordinates || [0, 0, 0];
            const lon = coords[0];
            const lat = coords[1];
            const depth = coords[2] ?? 10;
            const dist = computeHaversineDistanceKm(centerLat, centerLon, lat, lon);

            const featureId = f.id;
            const shakemapUrl = featureId
              ? `https://earthquake.usgs.gov/earthquakes/eventpage/${featureId}/shakemap`
              : f.properties?.url || "";

            return {
              id: featureId,
              magnitude: f.properties?.mag ?? 0,
              place: f.properties?.place || "Unknown Seismic Source",
              time: f.properties?.time ? new Date(f.properties.time).toISOString() : new Date().toISOString(),
              timestamp: f.properties?.time || now,
              coordinates: [lon, lat, depth] as [number, number, number],
              latitude: lat,
              longitude: lon,
              depthKm: depth,
              distanceKm: dist,
              url: f.properties?.url || "https://earthquake.usgs.gov",
              shakemapUrl,
            };
          })
          // Filter within requested radius (default 200km)
          .filter((eq: UsgsEarthquakeFeature) => eq.distanceKm <= radiusKm)
          .sort((a: UsgsEarthquakeFeature, b: UsgsEarthquakeFeature) => b.timestamp - a.timestamp);

        isLive = true;
      }
    } catch {
      // Upstream failed or timed out; will fallback to deterministic sandbox
    }

    if (!isLive || earthquakes.length === 0) {
      if (!isLive) {
        earthquakes = generateFallbackEarthquakes(districtName, centerLat, centerLon);
      }
    }

    const recentSignificant = earthquakes.filter((e) => e.magnitude >= 4.5);
    const sortedByDistance = [...earthquakes].sort((a, b) => a.distanceKm - b.distanceKm);
    const nearestEarthquake = sortedByDistance.length > 0 ? sortedByDistance[0] : null;

    // Landslide risk elevated: any quake >= 4.0 in last 48 hours within 100km
    const landslideRiskElevated = earthquakes.some(
      (e) => e.magnitude >= 4.0 && now - e.timestamp <= 48 * 3600 * 1000 && e.distanceKm <= 100
    );

    const payload: EarthquakeHazardResponse = {
      success: true,
      total_count: earthquakes.length,
      earthquakes,
      recent_significant: recentSignificant,
      nearest_earthquake: nearestEarthquake,
      landslide_risk_elevated: landslideRiskElevated,
      district: {
        name: districtName,
        latitude: centerLat,
        longitude: centerLon,
      },
      metadata: {
        provider: "USGS Earthquake Hazards Program (FDSN Event API)",
        lastUpdated: new Date().toISOString(),
        origin: isLive ? "LIVE_API" : "DEMO_SANDBOX",
        attributionNotice:
          "USGS National Earthquake Information Center (NEIC) / ANSS Global Seismic Network. Free public scientific API.",
      },
    };

    cache.set(cacheKey, { data: payload, timestamp: now });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        total_count: 0,
        earthquakes: [],
        recent_significant: [],
        nearest_earthquake: null,
        landslide_risk_elevated: false,
        district: { name: "Unknown", latitude: 0, longitude: 0 },
        metadata: {
          provider: "USGS Earthquake Hazards Program",
          lastUpdated: new Date().toISOString(),
          origin: "DEMO_SANDBOX",
          attributionNotice: "Emergency fallback.",
        },
        error: error instanceof Error ? error.message : "Internal USGS Hazards Route Error",
      },
      { status: 500 }
    );
  }
}
