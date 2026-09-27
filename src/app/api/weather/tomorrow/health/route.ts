import { NextResponse } from "next/server";
import { TomorrowIoProvider } from "@/lib/weather/providers/TomorrowIoProvider";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const tomorrowProvider = new TomorrowIoProvider();

export async function GET() {
  const startTime = Date.now();
  const rawKey = process.env.TOMORROW_API_KEY;
  const apiKey = rawKey ? rawKey.trim() : (await tomorrowProvider.getApiKey());

  if (!apiKey || apiKey.length === 0) {
    return NextResponse.json({
      provider: "Tomorrow.io",
      configured: false,
      status: "NOT_CONFIGURED",
      last_successful_fetch: null,
      latency_ms: 0,
      freshness: "NOT_CONFIGURED",
    });
  }

  // Retrieve last successful fetch from provider in-memory state or database
  let lastSuccessfulFetch = tomorrowProvider.getLastSuccessfulFetch();
  try {
    const supabase = createAdminClient();
    const { data: healthRec } = await supabase
      .from("provider_health")
      .select("last_success_at")
      .eq("provider", "tomorrowio")
      .maybeSingle();
    if (healthRec?.last_success_at) {
      lastSuccessfulFetch = healthRec.last_success_at;
    }
  } catch {
    // Non-fatal
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Test connection with realtime endpoint
    const realtimeEndpoint = `https://api.tomorrow.io/v4/weather/realtime?location=28.6,77.2&units=metric`;
    let res = await fetch(realtimeEndpoint, {
      headers: {
        Accept: "application/json",
        apikey: apiKey,
        "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
      },
      signal: controller.signal,
    });

    // Query parameter fallback if header alone is rejected
    if (res.status === 401) {
      const queryEndpoint = `https://api.tomorrow.io/v4/weather/realtime?location=28.6,77.2&units=metric&apikey=${encodeURIComponent(apiKey)}`;
      const retryRes = await fetch(queryEndpoint, {
        headers: {
          Accept: "application/json",
          apikey: apiKey,
          "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
        },
        signal: controller.signal,
      });
      if (retryRes.status !== 401) {
        res = retryRes;
      }
    }

    clearTimeout(timeoutId);
    const latency_ms = Date.now() - startTime;

    if (res.status === 200) {
      const nowIso = new Date().toISOString();
      return NextResponse.json({
        provider: "Tomorrow.io",
        configured: true,
        status: "LIVE",
        last_successful_fetch: nowIso,
        latency_ms,
        freshness: "REALTIME",
      });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        provider: "Tomorrow.io",
        configured: true,
        status: "AUTH_ERROR",
        last_successful_fetch: lastSuccessfulFetch,
        latency_ms,
        freshness: lastSuccessfulFetch ? "STALE" : "NONE",
      });
    }

    if (res.status === 429) {
      return NextResponse.json({
        provider: "Tomorrow.io",
        configured: true,
        status: "RATE_LIMITED",
        last_successful_fetch: lastSuccessfulFetch,
        latency_ms,
        freshness: lastSuccessfulFetch ? "STALE" : "NONE",
      });
    }

    return NextResponse.json({
      provider: "Tomorrow.io",
      configured: true,
      status: "PROVIDER_ERROR",
      last_successful_fetch: lastSuccessfulFetch,
      latency_ms,
      freshness: lastSuccessfulFetch ? "STALE" : "NONE",
    });
  } catch (err: unknown) {
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      (err instanceof Error && err.message.toLowerCase().includes("timeout"));

    return NextResponse.json({
      provider: "Tomorrow.io",
      configured: true,
      status: isTimeout ? "TIMEOUT" : "PROVIDER_ERROR",
      last_successful_fetch: lastSuccessfulFetch,
      latency_ms: Date.now() - startTime,
      freshness: lastSuccessfulFetch ? "STALE" : "NONE",
    });
  }
}
