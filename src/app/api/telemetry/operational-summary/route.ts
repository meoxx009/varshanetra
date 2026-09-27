import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/services/alerts";
import { getIncidents } from "@/lib/services/incidents";
import { getResponseTeams } from "@/lib/services/response-teams";
import { getResources, getShelters } from "@/lib/services/resources";
import { getFieldReports } from "@/lib/services/field-reports";
import { getRiverGauges } from "@/lib/services/river-gauges";
import { RiverGauge } from "@/types";

export const dynamic = "force-dynamic";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30-second cache

export async function GET() {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      data: memoryCache.data,
      cached: true,
      timestamp: new Date(memoryCache.timestamp).toISOString(),
    });
  }

  try {
    const [
      alertsRes,
      incidentsRes,
      teamsRes,
      resourcesRes,
      sheltersRes,
      reportsRes,
      gaugesRes,
    ] = await Promise.allSettled([
      getAlerts({ status: "ISSUED" }),
      getIncidents({ limit: 10 }),
      getResponseTeams(),
      getResources(),
      getShelters(),
      getFieldReports(),
      getRiverGauges(),
    ]);

    const alerts = alertsRes.status === "fulfilled" ? alertsRes.value.alerts : [];
    const incidents = incidentsRes.status === "fulfilled" ? incidentsRes.value.incidents : [];
    const responseTeams = teamsRes.status === "fulfilled" ? teamsRes.value : [];
    const resources = resourcesRes.status === "fulfilled" ? resourcesRes.value : [];
    const shelters = sheltersRes.status === "fulfilled" ? sheltersRes.value : [];
    const fieldReports = reportsRes.status === "fulfilled" ? reportsRes.value : [];
    const gauges = gaugesRes.status === "fulfilled" ? gaugesRes.value : [];
    const dangerGauges = (gauges as RiverGauge[]).filter(
      (g) => g.status === "DANGER" || g.status === "CRITICAL"
    );

    const data = {
      alerts,
      incidents,
      responseTeams,
      resources,
      shelters,
      fieldReports,
      dangerGauges,
    };

    memoryCache = { data, timestamp: now };

    return NextResponse.json({
      success: true,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[OperationalSummary API Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate operational summary bundle",
      },
      { status: 500 }
    );
  }
}
