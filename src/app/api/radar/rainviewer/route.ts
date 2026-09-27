import { NextResponse } from "next/server";
import { RadarFrame, RainViewerApiResponse } from "@/types/radar";

export const dynamic = "force-dynamic";

interface RainViewerRawPastItem {
  time: number;
  path: string;
}

interface RainViewerRawResponse {
  version: string;
  generated: number;
  host: string;
  radar?: {
    past?: RainViewerRawPastItem[];
    nowcast?: RainViewerRawPastItem[];
  };
}

// In-memory cache with 2-minute TTL (radar updates every 10 minutes)
interface MemoryCache {
  data: RainViewerApiResponse | null;
  fetchedAt: number;
}

const cache: MemoryCache = {
  data: null,
  fetchedAt: 0,
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function formatHumanDateTime(unixSec: number): string {
  try {
    const d = new Date(unixSec * 1000);
    return (
      d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST"
    );
  } catch {
    return new Date(unixSec * 1000).toISOString();
  }
}

export async function GET() {
  const now = Date.now();

  // Return in-memory cached response if fresh
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(
      {
        ...cache.data,
        cached: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
          "X-Data-Cache": "HIT",
        },
      }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      headers: {
        Accept: "application/json",
        "User-Agent": "VarshaNetra-Disaster-Intelligence/1.0",
      },
      signal: controller.signal,
      next: { revalidate: 120 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RainViewer upstream HTTP ${response.status} ${response.statusText}`);
    }

    const rawData = (await response.json()) as RainViewerRawResponse;

    const host = rawData.host || "https://tilecache.rainviewer.com";
    const generatedTime = rawData.generated
      ? new Date(rawData.generated * 1000).toISOString()
      : new Date().toISOString();

    const rawPast = Array.isArray(rawData.radar?.past) ? rawData.radar.past : [];
    const rawNowcast = Array.isArray(rawData.radar?.nowcast) ? rawData.radar.nowcast : [];

    // Last 12 past radar frames
    const selectedPast = rawPast.slice(-12);
    const radarFrames: RadarFrame[] = selectedPast.map((item) => ({
      time: item.time,
      datetime: formatHumanDateTime(item.time),
      path: item.path,
      is_past: true,
      is_forecast: false,
    }));

    // Up to 3 future nowcast frames
    const selectedNowcast = rawNowcast.slice(0, 3);
    const nowcastFrames: RadarFrame[] = selectedNowcast.map((item) => ({
      time: item.time,
      datetime: formatHumanDateTime(item.time),
      path: item.path,
      is_past: false,
      is_forecast: true,
    }));

    const currentFrameIndex = radarFrames.length > 0 ? radarFrames.length - 1 : 0;
    const totalFrames = radarFrames.length + nowcastFrames.length;

    const parsedResponse: RainViewerApiResponse = {
      success: true,
      status: "LIVE",
      generated_time: generatedTime,
      radar_frames: radarFrames,
      nowcast_frames: nowcastFrames,
      host,
      current_frame: currentFrameIndex,
      total_frames: totalFrames,
      attribution: "RainViewer.com - Global Weather Radar Composite",
      coverage: "Global Radar Composite (including India & South Asia)",
      update_frequency: "Every 10 minutes",
      cached: false,
    };

    // Store in cache
    cache.data = parsedResponse;
    cache.fetchedAt = now;

    return NextResponse.json(parsedResponse, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        "X-Data-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch RainViewer radar telemetry";

    // If cache has stale data, serve as CACHED fallback
    if (cache.data) {
      return NextResponse.json(
        {
          ...cache.data,
          status: "CACHED",
          cached: true,
          error: `Upstream error: ${errorMsg}. Serving cached telemetry.`,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-cache",
            "X-Data-Cache": "STALE",
          },
        }
      );
    }

    // Otherwise return error response with empty frames structure
    const fallbackResponse: RainViewerApiResponse = {
      success: false,
      status: "ERROR",
      generated_time: new Date().toISOString(),
      radar_frames: [],
      nowcast_frames: [],
      host: "https://tilecache.rainviewer.com",
      current_frame: 0,
      total_frames: 0,
      attribution: "RainViewer.com - Global Weather Radar Composite",
      coverage: "Global Radar Composite (including India)",
      update_frequency: "Every 10 minutes",
      cached: false,
      error: errorMsg,
    };

    return NextResponse.json(fallbackResponse, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  }
}
