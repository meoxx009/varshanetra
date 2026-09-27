import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function cleanApiKey(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.replace(/^['"]|['"]$/g, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let apiKey: string | null = cleanApiKey(body.apiKey);

    // If key not provided in body, resolve from Vault / Env
    if (!apiKey) {
      const envKey1 = cleanApiKey(process.env.TOMORROW_API_KEY);
      const envKey2 = cleanApiKey(process.env.TOMORROW_IO_API_KEY);

      if (envKey1) {
        apiKey = envKey1;
      } else if (envKey2) {
        apiKey = envKey2;
      } else {
        const supabase = createAdminClient();
        for (const secretName of ["TOMORROW_API_KEY", "TOMORROW_IO_API_KEY"]) {
          const { data: vaultRow } = await supabase
            .from("vault.secrets" as unknown as "profiles")
            .select("secret")
            .eq("name", secretName)
            .maybeSingle();

          const candidate = cleanApiKey((vaultRow as unknown as { secret?: string })?.secret);
          if (candidate) {
            apiKey = candidate;
            break;
          }
        }

        if (!apiKey) {
          for (const configKey of ["vault_TOMORROW_API_KEY", "vault_TOMORROW_IO_API_KEY"]) {
            const { data: configRow } = await supabase
              .from("app_config")
              .select("value")
              .eq("key", configKey)
              .maybeSingle();

            const fallbackSecret = cleanApiKey((configRow?.value as { secret?: string })?.secret);
            if (fallbackSecret) {
              apiKey = fallbackSecret;
              break;
            }
          }
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "No Tomorrow.io API key provided or found in server environment.",
          status: "NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    // Determine target location (Delhi default per acceptance criteria #1, or custom coords)
    const lat = typeof body.lat === "number" ? body.lat : parseFloat(body.lat || "");
    const lon = typeof body.lon === "number" ? body.lon : parseFloat(body.lon || "");
    const hasValidCoords = !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

    const testLocation = hasValidCoords ? `${lat},${lon}` : "28.6,77.2";
    const locationLabel = hasValidCoords
      ? `${body.district || "Custom Target"} (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`
      : "Delhi, India (28.6°N, 77.2°E)";

    const encodedKey = encodeURIComponent(apiKey);
    const endpoint = `https://api.tomorrow.io/v4/weather/realtime?location=${testLocation}&units=metric&apikey=${encodedKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: apiKey,
        "User-Agent": "VarshaNetra-DisasterIntelligence/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 500;

    // HTTP 401 Unauthorized / Invalid Key
    if (res.status === 401) {
      try {
        const supabase = createAdminClient();
        await supabase.from("provider_health").upsert(
          {
            provider: "tomorrowio",
            status: "AUTH_ERROR",
            rate_limit_remaining: remaining,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" }
        );
      } catch {
        // Non-fatal
      }
      return NextResponse.json(
        {
          success: false,
          status: "AUTH_ERROR",
          error: "Authentication Failed: Tomorrow.io returned HTTP 401 (Invalid API Key). Verify TOMORROW_API_KEY in server environment.",
          statusCode: 401,
          rateLimitRemaining: remaining,
        },
        { status: 401 }
      );
    }

    // HTTP 403 Forbidden / Permission Denied
    if (res.status === 403) {
      try {
        const supabase = createAdminClient();
        await supabase.from("provider_health").upsert(
          {
            provider: "tomorrowio",
            status: "PERMISSION_ERROR",
            rate_limit_remaining: remaining,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" }
        );
      } catch {
        // Non-fatal
      }
      return NextResponse.json(
        {
          success: false,
          status: "PERMISSION_ERROR",
          error: "Permission Denied: Tomorrow.io returned HTTP 403 (Forbidden). Your API key lacks permissions for this endpoint or your subscription plan does not allow this request.",
          statusCode: 403,
          rateLimitRemaining: remaining,
        },
        { status: 403 }
      );
    }

    // HTTP 429 Rate Limited
    if (res.status === 429) {
      try {
        const supabase = createAdminClient();
        await supabase.from("provider_health").upsert(
          {
            provider: "tomorrowio",
            status: "RATE_LIMITED",
            rate_limit_remaining: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" }
        );
      } catch {
        // Non-fatal
      }
      return NextResponse.json(
        {
          success: false,
          status: "RATE_LIMITED",
          error: "Rate Limit Exceeded: Tomorrow.io returned HTTP 429 (500 calls/day quota reached).",
          statusCode: 429,
          rateLimitRemaining: 0,
        },
        { status: 429 }
      );
    }

    // Upstream Provider Error
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          status: "PROVIDER_ERROR",
          error: `Tomorrow.io returned HTTP ${res.status}: ${errText || res.statusText}`,
          statusCode: res.status,
          rateLimitRemaining: remaining,
        },
        { status: res.status }
      );
    }

    const json = await res.json();
    const vals = json?.data?.values || {};
    const temperature = Number(vals.temperature ?? 0);

    // Update provider_health on successful test to LIVE
    try {
      const supabase = createAdminClient();
      await supabase
        .from("provider_health")
        .upsert(
          {
            provider: "tomorrowio",
            status: "LIVE",
            last_success_at: new Date().toISOString(),
            rate_limit_remaining: remaining,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" }
        );
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      status: "LIVE",
      message: `Successfully connected to Tomorrow.io! Real-time temperature for ${locationLabel} is ${temperature}°C.`,
      temperature,
      location: locationLabel,
      rateLimitRemaining: remaining,
      data: json,
    });
  } catch (err: unknown) {
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      (err instanceof Error && err.message.toLowerCase().includes("timeout"));
    const msg = isTimeout
      ? "Request timed out while connecting to Tomorrow.io API (>8000ms)."
      : err instanceof Error ? err.message : "Connection test failed";
    return NextResponse.json({ success: false, status: isTimeout ? "TIMEOUT" : "PROVIDER_ERROR", error: msg }, { status: 500 });
  }
}
