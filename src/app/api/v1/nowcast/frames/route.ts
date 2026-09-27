import { NextResponse } from "next/server";
import { RadarFramesApiResponse, RadarNowcastFrame } from "@/hooks/useRadarFrames";

export const dynamic = "force-dynamic";

interface RainViewerRawItem {
  time: number;
  path: string;
}

interface RainViewerRawResponse {
  version: string;
  generated: number;
  host: string;
  radar?: {
    past?: RainViewerRawItem[];
    nowcast?: RainViewerRawItem[];
  };
  satellite?: {
    infrared?: RainViewerRawItem[];
  };
}

let cachedPayload: RadarFramesApiResponse | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache

function formatIST(unixSec: number): string {
  try {
    const d = new Date(unixSec * 1000);
    return (
      d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        timeZone: "Asia/Kolkata",
      }) +
      ", " +
      d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    );
  } catch {
    return new Date(unixSec * 1000).toISOString();
  }
}

export async function GET() {
  const now = Date.now();
  if (cachedPayload && now - cacheTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        "X-Data-Cache": "HIT",
      },
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      headers: {
        Accept: "application/json",
        "User-Agent": "VarshaNetra-Disaster-Intelligence/1.0",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`RainViewer upstream returned HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as RainViewerRawResponse;
    const host = data.host || "https://tilecache.rainviewer.com";
    const radarPastRaw = data.radar?.past || [];
    const radarNowcastRaw = data.radar?.nowcast || [];
    const satIrRaw = data.satellite?.infrared || [];

    const radar_past: RadarNowcastFrame[] = radarPastRaw.slice(-12).map((item) => {
      const dt = new Date(item.time * 1000);
      return {
        time: item.time,
        iso: dt.toISOString(),
        ist: formatIST(item.time),
        kind: "observed",
        tile: `${host}${item.path}/512/{z}/{x}/{y}/4/1_1.png`,
      };
    });

    const radar_nowcast: RadarNowcastFrame[] = radarNowcastRaw.slice(0, 6).map((item) => {
      const dt = new Date(item.time * 1000);
      return {
        time: item.time,
        iso: dt.toISOString(),
        ist: formatIST(item.time),
        kind: "forecast",
        tile: `${host}${item.path}/512/{z}/{x}/{y}/4/1_1.png`,
      };
    });

    const satellite_ir: RadarNowcastFrame[] = satIrRaw.slice(-6).map((item) => {
      const dt = new Date(item.time * 1000);
      return {
        time: item.time,
        iso: dt.toISOString(),
        ist: formatIST(item.time),
        kind: "satellite",
        tile: `${host}${item.path}/512/{z}/{x}/{y}/0/0_0.png`,
      };
    });

    const payload: RadarFramesApiResponse = {
      generated: data.generated || Math.floor(now / 1000),
      server_time: new Date().toISOString(),
      radar_past,
      radar_nowcast,
      satellite_ir,
      current_index: Math.max(0, radar_past.length - 1),
      attribution: "RainViewer.com - Global Composite Radar Telemetry",
    };

    cachedPayload = payload;
    cacheTime = now;

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        "X-Data-Cache": "MISS",
      },
    });
  } catch (err: unknown) {
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, {
        status: 200,
        headers: { "X-Data-Cache": "STALE" },
      });
    }
    const msg = err instanceof Error ? err.message : "Failed to fetch radar frames";
    return NextResponse.json(
      {
        generated: Math.floor(now / 1000),
        server_time: new Date().toISOString(),
        radar_past: [],
        radar_nowcast: [],
        satellite_ir: [],
        current_index: 0,
        attribution: "RainViewer.com",
        error: msg,
      },
      { status: 200 }
    );
  }
}
