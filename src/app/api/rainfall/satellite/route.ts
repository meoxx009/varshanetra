import { NextRequest, NextResponse } from "next/server";
import { fetchNasaGpmSatelliteRainfall } from "@/lib/services/nasa-gpm";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/rainfall/satellite
 *
 * Query parameters:
 * - lat: latitude (default 18.5204 Pune)
 * - lon: longitude (default 73.8567)
 * - district: district short/display name
 * - nwp_forecast: baseline NWP forecast in mm for real-time comparison
 * - refresh: "true" to bypass in-memory cache
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const district = searchParams.get("district") || "Pune";
    const nwpForecastParam = searchParams.get("nwp_forecast");
    const forceRefresh = searchParams.get("refresh") === "true";

    const latitude = latParam ? parseFloat(latParam) : 18.5204;
    const longitude = lonParam ? parseFloat(lonParam) : 73.8567;

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: "Invalid geographic coordinates provided." },
        { status: 400 }
      );
    }

    const nwpForecastMm = nwpForecastParam ? parseFloat(nwpForecastParam) : undefined;

    const data = await fetchNasaGpmSatelliteRainfall({
      latitude,
      longitude,
      district,
      nwpForecastMm: isNaN(nwpForecastMm as number) ? undefined : nwpForecastMm,
      forceRefresh,
    });

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err, "Failed to retrieve satellite rainfall telemetry");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rainfall/satellite
 *
 * Fetches daily precipitation telemetry from NASA POWER GPM IMERG product
 * with caching in Supabase and fallback resilience.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { latitude, longitude, districtName = "Unknown" } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and Longitude are required" },
        { status: 400 }
      );
    }

    // 1. ENVIRONMENT CHECK
    const username = process.env.NASA_EARTHDATA_USERNAME;
    const token = process.env.NASA_EARTHDATA_TOKEN;

    if (!username || !token) {
      return NextResponse.json(
        {
          status: "NOT_CONFIGURED",
          message: "NASA Earthdata credentials not found in environment variables",
          demo_mode: true,
          sample_data: {
            note: "This is sample data showing what NASA GPM would provide",
            rainfall_mm: 45.2,
            max_intensity_mmhr: 8.3,
            data_quality: "DEMO",
            source: "NASA_GPM_IMERG_DEMO",
          },
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0].replace(/-/g, "");

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0].replace(/-/g, "");

    // Query 4 days back to handle 1-3 day NASA POWER QC validation delay
    const fourDaysAgo = new Date(now);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const fourDaysAgoStr = fourDaysAgo.toISOString().split("T")[0].replace(/-/g, "");

    const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 2. CHECK CACHE (Fetched within last 3 hours)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    try {
      const { data: cachedRecord } = await supabase
        .from("nasa_gpm_cache")
        .select("*")
        .eq("district", districtName)
        .eq("fetch_date", todayFormatted)
        .gte("fetched_at", threeHoursAgo)
        .maybeSingle();

      if (cachedRecord) {
        return NextResponse.json({
          status: "CACHED",
          source: cachedRecord.source || "NASA_POWER_GPM",
          nasa_product: "PRECTOTCORR_GPM_IMERG",
          today_rainfall_mm: cachedRecord.today_rainfall_mm,
          yesterday_rainfall_mm: cachedRecord.yesterday_rainfall_mm,
          two_day_total_mm: cachedRecord.two_day_total_mm,
          data_date: todayFormatted,
          coordinates: { lat: latitude, lon: longitude },
          latency_note: "NASA POWER data has approximately 1-3 day latency for quality-controlled data",
          attribution: "Data from NASA POWER Project funded through the NASA Earth Science Directorate Applied Science Program",
          free_api: true,
        });
      }
    } catch {
      // Continue to live fetch if cache table query is unavailable
    }

    // 3. ACTUAL API CALL TO NASA POWER API (Uses GPM IMERG)
    const nasaPowerUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=${longitude}&latitude=${latitude}&start=${fourDaysAgoStr}&end=${todayStr}&format=JSON`;

    const apiResponse = await fetch(nasaPowerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 10800 }, // 3 hours cache
    });

    if (!apiResponse.ok) {
      throw new Error(`NASA POWER API HTTP Error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const precData = data?.properties?.parameter?.PRECTOTCORR || {};

    const todayVal = precData[todayStr];
    const yesterdayVal = precData[yesterdayStr];

    // Handle missing data representation (-999)
    const today_val_clean: number | null =
      todayVal === undefined || todayVal === -999 ? null : Number(todayVal);
    let yesterday_val_clean: number | null =
      yesterdayVal === undefined || yesterdayVal === -999 ? null : Number(yesterdayVal);

    // If both today and yesterday are -999 due to 1-3 day NASA QC delay, pick latest valid reading
    if (today_val_clean === null && yesterday_val_clean === null) {
      const dates = Object.keys(precData).sort().reverse();
      for (const d of dates) {
        const val = precData[d];
        if (val !== undefined && val !== -999) {
          yesterday_val_clean = Number(val);
          break;
        }
      }
    }

    let twoDayTotal: number | null = null;
    if (today_val_clean !== null && yesterday_val_clean !== null) {
      twoDayTotal = Number((today_val_clean + yesterday_val_clean).toFixed(2));
    } else if (today_val_clean !== null) {
      twoDayTotal = today_val_clean;
    } else if (yesterday_val_clean !== null) {
      twoDayTotal = yesterday_val_clean;
    }

    // 4. UPSERT INTO SUPABASE CACHE
    try {
      await supabase.from("nasa_gpm_cache").upsert(
        {
          district: districtName,
          fetch_date: todayFormatted,
          today_rainfall_mm: today_val_clean,
          yesterday_rainfall_mm: yesterday_val_clean,
          two_day_total_mm: twoDayTotal,
          fetched_at: new Date().toISOString(),
          source: "NASA_POWER_GPM",
        },
        { onConflict: "district,fetch_date" }
      );
    } catch (dbErr) {
      console.warn("Supabase caching failed or table does not exist yet:", dbErr);
    }

    return NextResponse.json({
      status: "LIVE",
      source: "NASA_POWER_GPM",
      nasa_product: "PRECTOTCORR_GPM_IMERG",
      today_rainfall_mm: today_val_clean,
      yesterday_rainfall_mm: yesterday_val_clean,
      two_day_total_mm: twoDayTotal,
      data_date: todayFormatted,
      coordinates: { lat: latitude, lon: longitude },
      latency_note: "NASA POWER data has approximately 1-3 day latency for quality-controlled data",
      attribution: "Data from NASA POWER Project funded through the NASA Earth Science Directorate Applied Science Program",
      free_api: true,
    });
  } catch (error: unknown) {
    console.error("NASA GPM API Integration Error:", error);

    // Try fallback to last available cache in Supabase
    try {
      const supabase = await createClient();
      const { data: fallbackCache } = await supabase
        .from("nasa_gpm_cache")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackCache) {
        return NextResponse.json({
          status: "CACHED_FALLBACK",
          source: fallbackCache.source,
          today_rainfall_mm: fallbackCache.today_rainfall_mm,
          yesterday_rainfall_mm: fallbackCache.yesterday_rainfall_mm,
          two_day_total_mm: fallbackCache.two_day_total_mm,
          data_date: fallbackCache.fetch_date,
          latency_note: "Fallback to previous cached data due to network issue.",
          free_api: true,
        });
      }
    } catch {
      // Ignore DB error
    }

    // Return Demo Data gracefully on error
    return NextResponse.json(
      {
        status: "ERROR",
        demo_mode: true,
        message: "Failed to fetch live NASA GPM data. Returning demo mode payload.",
        sample_data: {
          note: "Fallback Demo Data",
          today_rainfall_mm: 32.4,
          yesterday_rainfall_mm: 14.2,
          two_day_total_mm: 46.6,
          source: "NASA_GPM_IMERG_DEMO",
        },
      },
      { status: 200 }
    );
  }
}
