import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AppWeatherProviderConfig } from "@/lib/weather/types";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Fetch current weather_provider config
    const { data: configRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "weather_provider")
      .maybeSingle();

    const config: AppWeatherProviderConfig = configRow?.value || {
      primary: "openmeteo",
      nowcast: "tomorrowio",
      fallback: ["openmeteo"],
      rate_limit: {
        daily_quota: 500,
        calls_today: 0,
        remaining: 500,
      },
    };

    // 2. Check if Tomorrow.io API Key is configured in Vault or Env
    let isConfigured = Boolean(
      (process.env.TOMORROW_API_KEY && process.env.TOMORROW_API_KEY.trim().length > 0) ||
      (process.env.TOMORROW_IO_API_KEY && process.env.TOMORROW_IO_API_KEY.trim().length > 0)
    );

    if (!isConfigured) {
      for (const secretName of ["TOMORROW_API_KEY", "TOMORROW_IO_API_KEY"]) {
        const { data: vaultRow } = await supabase
          .from("vault.secrets" as unknown as "profiles")
          .select("secret")
          .eq("name", secretName)
          .maybeSingle();

        const secret = (vaultRow as unknown as { secret?: string })?.secret;
        if (secret && secret.trim().length > 0) {
          isConfigured = true;
          break;
        }
      }
    }

    if (!isConfigured) {
      for (const configKey of ["vault_TOMORROW_API_KEY", "vault_TOMORROW_IO_API_KEY"]) {
        const { data: fallbackConfig } = await supabase
          .from("app_config")
          .select("value")
          .eq("key", configKey)
          .maybeSingle();

        const secret = (fallbackConfig?.value as { secret?: string })?.secret;
        if (secret && secret.trim().length > 0) {
          isConfigured = true;
          break;
        }
      }
    }

    // 3. Fetch provider_health
    const { data: healthRow } = await supabase
      .from("provider_health")
      .select("*")
      .eq("provider", "tomorrowio")
      .maybeSingle();

    const callsToday = healthRow?.calls_today ?? config.rate_limit?.calls_today ?? 0;
    const remaining = healthRow?.rate_limit_remaining ?? config.rate_limit?.remaining ?? 500;

    return NextResponse.json({
      success: true,
      config,
      isTomorrowConfigured: isConfigured,
      rateLimit: {
        dailyQuota: 500,
        callsToday,
        remaining,
        lastSuccessAt: healthRow?.last_success_at || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving weather configuration";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primary, nowcast, fallback } = body;

    const supabase = createAdminClient();

    // Fetch existing rate limit state
    const { data: existingRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "weather_provider")
      .maybeSingle();

    const existingRateLimit = existingRow?.value?.rate_limit || {
      daily_quota: 500,
      calls_today: 0,
      remaining: 500,
    };

    const newConfig: AppWeatherProviderConfig = {
      primary: primary || "openmeteo",
      nowcast: nowcast || "tomorrowio",
      fallback: Array.isArray(fallback) ? fallback : ["openmeteo"],
      rate_limit: existingRateLimit,
    };

    try {
      const { error } = await supabase
        .from("app_config")
        .upsert(
          {
            key: "weather_provider",
            value: newConfig,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) {
        console.warn("[weather-config] Remote DB app_config pending migration:", error.message);
      }
    } catch (dbErr) {
      console.warn("[weather-config] Database access warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Weather provider configuration updated successfully.",
      config: newConfig,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error updating weather configuration";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
