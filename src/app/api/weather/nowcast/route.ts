import { NextRequest, NextResponse } from "next/server";
import { getWeatherProvider, computeFusionWeights } from "@/lib/weather/WeatherFactory";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat") || "28.6139";
    const lonStr = searchParams.get("lon") || "77.2090";

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { success: false, error: "Valid numeric latitude and longitude required." },
        { status: 400 }
      );
    }

    // Resolve provider via WeatherFactory (Adapter Pattern)
    const provider = await getWeatherProvider("nowcast");

    // Fetch real-time telemetry and 0-6h nowcast
    const [realtimeRes, nowcastRes] = await Promise.all([
      provider.getRealtimeWeather(lat, lon),
      provider.getNowcast(lat, lon),
    ]);

    // Compute Multi-Model Fusion Weights (Prompt F1 & Acceptance Criteria #3)
    // Check if Tomorrow.io genuinely succeeded without error or fallback
    const isTomorrowLive =
      provider.id === "tomorrowio" &&
      !realtimeRes.errorCode &&
      !provider.isRateLimited();

    const fusion = computeFusionWeights(1, isTomorrowLive);

    const sourceLabel = isTomorrowLive
      ? "Source: Tomorrow.io 1km"
      : "Source: Open-Meteo";

    return NextResponse.json({
      success: true,
      provider: isTomorrowLive ? provider.meta : { ...provider.meta, id: "openmeteo", name: "Open-Meteo Global NWP" },
      source_name: isTomorrowLive ? provider.meta.name : "Open-Meteo Global NWP",
      source_label: sourceLabel,
      resolution: isTomorrowLive ? "1km / 1-min" : "11km / 1-hr",
      is_degraded: !isTomorrowLive || provider.isRateLimited(),
      rate_limit_remaining: provider.getRateLimitRemaining(),
      current: realtimeRes.data,
      nowcast: nowcastRes.forecast,
      fusion,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching nowcast";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
