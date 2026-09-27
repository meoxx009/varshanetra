import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { IMD_RADAR_STATIONS } from "@/lib/radar/station-registry";
import { IMDStationCode, IMDRadarProductCode } from "@/types/radar";

export const dynamic = "force-dynamic";

interface CachedRadarImage {
  buffer: Buffer;
  contentType: string;
  lastModified: string;
  fetchedAt: number;
  productUsed: string;
}

const cache = new Map<string, CachedRadarImage>();
const CACHE_TTL_MS = 120 * 1000; // 2 minutes

// Agent to tolerate government portal TLS certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function fetchFromIMD(
  url: string
): Promise<{ buffer: Buffer; contentType: string; lastModified: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent: httpsAgent,
        timeout: 12000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://mausam.imd.gov.in/",
          Accept: "image/gif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      },
      (res) => {
        const statusCode = res.statusCode || 500;
        const contentType = res.headers["content-type"] || "image/gif";
        const lastModified =
          (res.headers["last-modified"] as string) || new Date().toUTCString();

        if (statusCode >= 400) {
          res.resume(); // consume response data to free memory
          return resolve({
            buffer: Buffer.alloc(0),
            contentType,
            lastModified,
            statusCode,
          });
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType,
            lastModified,
            statusCode,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("IMD connection timeout"));
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationParam = (searchParams.get("station") || "mum").toLowerCase().trim() as IMDStationCode;
    const productParam = (searchParams.get("product") || "caz").toLowerCase().trim() as IMDRadarProductCode;
    const mode = searchParams.get("mode") || "latest"; // "latest" | "animated"
    const metaOnly = searchParams.get("meta") === "true";

    const station = IMD_RADAR_STATIONS[stationParam];
    if (!station) {
      return NextResponse.json(
        {
          success: false,
          error: `Station '${stationParam}' not found in IMD radar registry.`,
          availableStations: Object.keys(IMD_RADAR_STATIONS),
        },
        { status: 404 }
      );
    }

    const cacheKey = `${stationParam}_${productParam}_${mode}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      if (metaOnly) {
        return NextResponse.json({
          success: true,
          station: stationParam,
          product: cached.productUsed,
          lastModified: cached.lastModified,
          cached: true,
          sizeBytes: cached.buffer.length,
        });
      }

      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "Last-Modified": cached.lastModified,
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
          "X-VarshaNetra-Radar-Source": "Official IMD DWR Network",
          "X-VarshaNetra-Radar-Station": station.name,
          "X-VarshaNetra-Product": cached.productUsed,
          "X-VarshaNetra-Cache": "HIT",
        },
      });
    }

    // Determine candidate URLs
    const candidateUrls: { url: string; productTag: string }[] = [];

    if (mode === "animated") {
      const animTag = productParam === "sri" ? "SRI" : "MAXZ";
      candidateUrls.push({
        url: `https://mausam.imd.gov.in/Radar/animation/Converted/${stationParam.toUpperCase()}_${animTag}.gif`,
        productTag: animTag,
      });
      if (["vrv", "pnv", "mhb"].includes(stationParam)) {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/animation/Converted/MUM_${animTag}.gif`,
          productTag: animTag,
        });
      }
      if (stationParam === "chn") {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/animation/Converted/SHR_${animTag}.gif`,
          productTag: animTag,
        });
      }
    } else {
      // Primary product
      candidateUrls.push({
        url: `https://mausam.imd.gov.in/Radar/${productParam}_${stationParam}.gif`,
        productTag: productParam,
      });
      if (["vrv", "pnv", "mhb"].includes(stationParam)) {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/${productParam}_mum.gif`,
          productTag: productParam,
        });
      }
      if (stationParam === "chn") {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/${productParam}_shr.gif`,
          productTag: productParam,
        });
      }

      // Allowed scientific fallbacks if specific product is missing for that station
      if (productParam === "vp2") {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/ppi_${stationParam}.gif`,
          productTag: "ppi",
        });
      } else if (productParam === "pac") {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/ppz_${stationParam}.gif`,
          productTag: "ppz",
        });
      } else if (productParam === "sri") {
        candidateUrls.push({
          url: `https://mausam.imd.gov.in/Radar/caz_${stationParam}.gif`,
          productTag: "caz",
        });
      }
    }

    let resultBuffer: Buffer | null = null;
    let resultContentType = "image/gif";
    let resultLastModified = new Date().toUTCString();
    let productUsed = productParam as string;

    for (const item of candidateUrls) {
      try {
        const res = await fetchFromIMD(item.url);
        if (res.statusCode === 200 && res.buffer.length > 200) {
          resultBuffer = res.buffer;
          resultContentType = res.contentType;
          resultLastModified = res.lastModified;
          productUsed = item.productTag;
          break;
        }
      } catch (err) {
        console.warn(`[IMD Radar Proxy] Fetch failed for ${item.url}:`, err);
      }
    }

    if (!resultBuffer) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          station: stationParam,
          product: productParam,
          reason: `IMD radar product '${productParam}' is currently unavailable from station ${station.name} (${stationParam.toUpperCase()}).`,
        },
        { status: 503 }
      );
    }

    // Cache successful image buffer
    cache.set(cacheKey, {
      buffer: resultBuffer,
      contentType: resultContentType,
      lastModified: resultLastModified,
      fetchedAt: now,
      productUsed,
    });

    if (metaOnly) {
      return NextResponse.json({
        success: true,
        station: stationParam,
        product: productUsed,
        lastModified: resultLastModified,
        cached: false,
        sizeBytes: resultBuffer.length,
      });
    }

    return new NextResponse(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        "Content-Type": resultContentType,
        "Last-Modified": resultLastModified,
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        "X-VarshaNetra-Radar-Source": "Official IMD DWR Network",
        "X-VarshaNetra-Radar-Station": station.name,
        "X-VarshaNetra-Product": productUsed,
        "X-VarshaNetra-Cache": "MISS",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error proxying IMD Doppler radar product";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
