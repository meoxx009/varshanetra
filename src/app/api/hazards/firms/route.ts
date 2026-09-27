import { NextRequest, NextResponse } from "next/server";
import {
  FirmsHazardResponse,
  FirmsFireFeature,
  FirmsConfidenceLevel,
} from "@/types/firms";

export const dynamic = "force-dynamic";

// In-memory cache with 20-minute TTL per district coordinate bucket
interface CacheEntry {
  data: FirmsHazardResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes (FIRMS NRT updates ~every 3 hours)

/**
 * Standard Haversine distance in kilometers between two geo coordinates
 */
function computeHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Formats acquisition time (e.g., '0830' -> '08:30 UTC' and ISO timestamp)
 */
function formatAcquisitionDateTime(acqDate: string, acqTime: string): string {
  try {
    const padded = acqTime.padStart(4, "0");
    const hours = padded.substring(0, 2);
    const minutes = padded.substring(2, 4);
    const isoStr = `${acqDate}T${hours}:${minutes}:00Z`;
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Normalizes VIIRS confidence code ("h" -> "high", "n" -> "nominal", "l" -> "low")
 */
function normalizeConfidence(raw: string): { level: FirmsConfidenceLevel; isHigh: boolean; isValid: boolean } {
  const clean = raw.trim().toLowerCase();
  if (clean === "h" || clean === "high") {
    return { level: "high", isHigh: true, isValid: true };
  }
  if (clean === "n" || clean === "nominal") {
    return { level: "nominal", isHigh: false, isValid: true };
  }
  if (clean === "l" || clean === "low") {
    return { level: "low", isHigh: false, isValid: false };
  }
  // Numeric confidence if present
  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    if (num >= 80) return { level: "high", isHigh: true, isValid: true };
    if (num >= 30) return { level: "nominal", isHigh: false, isValid: true };
    return { level: "low", isHigh: false, isValid: false };
  }
  return { level: "nominal", isHigh: false, isValid: true };
}

/**
 * Generates realistic fallback thermal anomaly features when NASA FIRMS is offline
 */
function generateFallbackFireData(
  districtName: string,
  centerLat: number,
  centerLon: number
): FirmsFireFeature[] {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  return [
    {
      id: "firms_demo_1",
      latitude: Math.round((centerLat + 0.12) * 10000) / 10000,
      longitude: Math.round((centerLon + 0.08) * 10000) / 10000,
      brightness_ti4: 334.5,
      brightness_ti5: 298.2,
      frp: 14.8,
      confidence: "nominal",
      acq_date: dateStr,
      acq_time: "0745",
      satellite: "NOAA-20",
      instrument: "VIIRS",
      daynight: "D",
      distanceKm: 16.4,
      detectedAtIso: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: "firms_demo_2",
      latitude: Math.round((centerLat - 0.22) * 10000) / 10000,
      longitude: Math.round((centerLon - 0.18) * 10000) / 10000,
      brightness_ti4: 352.1,
      brightness_ti5: 304.6,
      frp: 28.4,
      confidence: "high",
      acq_date: dateStr,
      acq_time: "0745",
      satellite: "NOAA-20",
      instrument: "VIIRS",
      daynight: "D",
      distanceKm: 32.8,
      detectedAtIso: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const districtName = searchParams.get("district") || "District Center";
    const radiusKm = parseFloat(searchParams.get("radius") || "80");

    const centerLat = latParam ? parseFloat(latParam) : 18.5204;
    const centerLon = lonParam ? parseFloat(lonParam) : 73.8567;

    const cacheKey = `${centerLat.toFixed(2)}_${centerLon.toFixed(2)}_${radiusKm}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Public 24h CSV feed for South Asia (NOAA-20 VIIRS C2)
    const firmsUrl =
      "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_South_Asia_24h.csv";

    let fireLocations: FirmsFireFeature[] = [];
    let isLive = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

      const res = await fetch(firmsUrl, {
        signal: controller.signal,
        headers: {
          Accept: "text/csv, application/csv, text/plain",
          "User-Agent": "VarshaNetra-Disaster-Management-System/1.0",
        },
        next: { revalidate: 1800 }, // 30 minutes
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const csvText = await res.text();
        const lines = csvText.trim().split("\n");

        if (lines.length > 1) {
          const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
          const latIdx = header.indexOf("latitude");
          const lonIdx = header.indexOf("longitude");
          const b4Idx = header.indexOf("bright_ti4");
          const b5Idx = header.indexOf("bright_ti5");
          const frpIdx = header.indexOf("frp");
          const confIdx = header.indexOf("confidence");
          const dateIdx = header.indexOf("acq_date");
          const timeIdx = header.indexOf("acq_time");
          const satIdx = header.indexOf("satellite");
          const instIdx = header.indexOf("instrument");
          const dnIdx = header.indexOf("daynight");

          // Bounding box filter: ~1.0 degree box for distance calculation
          const minLat = centerLat - 1.0;
          const maxLat = centerLat + 1.0;
          const minLon = centerLon - 1.0;
          const maxLon = centerLon + 1.0;

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(",");

            const lat = parseFloat(cols[latIdx]);
            const lon = parseFloat(cols[lonIdx]);

            if (isNaN(lat) || isNaN(lon)) continue;

            // Coarse bounding box filter
            if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
              const rawConf = confIdx !== -1 ? cols[confIdx] || "n" : "n";
              const { level, isValid } = normalizeConfidence(rawConf);

              // Filter by confidence: nominal or high
              if (!isValid) continue;

              const dist = computeHaversineDistanceKm(centerLat, centerLon, lat, lon);

              if (dist <= radiusKm) {
                const b4 = b4Idx !== -1 ? parseFloat(cols[b4Idx]) : undefined;
                const b5 = b5Idx !== -1 ? parseFloat(cols[b5Idx]) : undefined;
                const frp = frpIdx !== -1 ? parseFloat(cols[frpIdx]) : undefined;
                const acqDate = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().split("T")[0];
                const acqTime = timeIdx !== -1 ? cols[timeIdx] : "0000";
                const sat = satIdx !== -1 ? cols[satIdx] : "NOAA-20";
                const inst = instIdx !== -1 ? cols[instIdx] : "VIIRS";
                const dn = dnIdx !== -1 ? cols[dnIdx] : "D";

                fireLocations.push({
                  id: `firms_${i}_${lat.toFixed(3)}_${lon.toFixed(3)}`,
                  latitude: lat,
                  longitude: lon,
                  brightness_ti4: isNaN(b4 ?? NaN) ? undefined : b4,
                  brightness_ti5: isNaN(b5 ?? NaN) ? undefined : b5,
                  frp: isNaN(frp ?? NaN) ? undefined : frp,
                  confidence: level,
                  acq_date: acqDate,
                  acq_time: acqTime,
                  satellite: sat,
                  instrument: inst,
                  daynight: dn,
                  distanceKm: dist,
                  detectedAtIso: formatAcquisitionDateTime(acqDate, acqTime),
                });
              }
            }
          }

          // Sort nearest first
          fireLocations.sort((a, b) => a.distanceKm - b.distanceKm);
          isLive = true;
        }
      }
    } catch {
      // Fallback to deterministic demo sandbox
    }

    if (!isLive || fireLocations.length === 0) {
      if (!isLive) {
        fireLocations = generateFallbackFireData(districtName, centerLat, centerLon);
      }
    }

    const highConfidenceFires = fireLocations.filter((f) => f.confidence === "high").length;
    const firesWithin20km = fireLocations.filter((f) => f.distanceKm <= 20);
    const nearestFireKm = fireLocations.length > 0 ? fireLocations[0].distanceKm : null;

    const payload: FirmsHazardResponse = {
      success: true,
      fire_count: fireLocations.length,
      high_confidence_fires: highConfidenceFires,
      fires_within_20km_count: firesWithin20km.length,
      has_fires_near_district: firesWithin20km.length > 0,
      nearest_fire_km: nearestFireKm,
      fire_locations: fireLocations,
      district: {
        name: districtName,
        latitude: centerLat,
        longitude: centerLon,
      },
      metadata: {
        provider: "NASA FIRMS (EOSDIS) VIIRS C2",
        lastUpdated: new Date().toISOString(),
        origin: isLive ? "LIVE_API" : "DEMO_SANDBOX",
        attributionNotice:
          "NASA Fire Information for Resource Management System (FIRMS) / VIIRS 375m active fire data. Public NRT feed.",
      },
    };

    cache.set(cacheKey, { data: payload, timestamp: now });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        fire_count: 0,
        high_confidence_fires: 0,
        fires_within_20km_count: 0,
        has_fires_near_district: false,
        nearest_fire_km: null,
        fire_locations: [],
        district: { name: "Unknown", latitude: 0, longitude: 0 },
        metadata: {
          provider: "NASA FIRMS",
          lastUpdated: new Date().toISOString(),
          origin: "DEMO_SANDBOX",
          attributionNotice: "Emergency fallback.",
        },
        error: error instanceof Error ? error.message : "Internal NASA FIRMS Route Error",
      },
      { status: 500 }
    );
  }
}
