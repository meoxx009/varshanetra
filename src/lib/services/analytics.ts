"use strict";

import { AlertItem } from "@/types/alerts";
import { IncidentItem } from "@/types/incidents";
import { Resource, Shelter } from "@/types/resources";
import { FieldReport } from "@/types/field-reports";
import { ResponseTeam } from "@/types/response-teams";
import { HourlyForecastPoint } from "@/types/weather";

export interface SeverityChartPoint {
  severity: string;
  count: number;
  color: string;
}

export interface IncidentStatusChartPoint {
  status: string;
  count: number;
  color: string;
}

export interface IncidentTypeChartPoint {
  type: string;
  count: number;
}

export interface ResourceBalanceChartPoint {
  category: string;
  available: number;
  deployed: number;
  total: number;
}

export interface TimeSeriesChartPoint {
  timeLabel: string;
  timestamp: string;
  count: number;
}

export interface TeamStatusChartPoint {
  status: string;
  count: number;
  color: string;
}

export interface RainfallTrendPoint {
  timeLabel: string;
  precipitationMm: number;
  accumulatedMm: number;
  probability: number;
}

export type DateRangeFilter = "today" | "24h" | "48h" | "7d" | "30d" | "custom" | "ALL";

/**
 * Filter records by date range relative to current time or custom window.
 */
export function filterByDateRange<T extends { created_at?: string; reported_at?: string; updated_at?: string }>(
  items: T[],
  range: DateRangeFilter,
  customStart?: string,
  customEnd?: string
): T[] {
  if (range === "ALL") return items;

  const now = new Date();

  if (range === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000 - 1;
    return items.filter((item) => {
      const rawDate = item.created_at || item.reported_at || item.updated_at;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      return !isNaN(t) && t >= startOfToday && t <= endOfToday;
    });
  }

  if (range === "custom" && (customStart || customEnd)) {
    const startMs = customStart ? new Date(`${customStart}T00:00:00`).getTime() : 0;
    const endMs = customEnd ? new Date(`${customEnd}T23:59:59.999`).getTime() : Infinity;
    return items.filter((item) => {
      const rawDate = item.created_at || item.reported_at || item.updated_at;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      return !isNaN(t) && t >= startMs && t <= endMs;
    });
  }

  let maxAgeMs = 24 * 3600 * 1000;
  if (range === "48h") maxAgeMs = 48 * 3600 * 1000;
  else if (range === "7d") maxAgeMs = 7 * 24 * 3600 * 1000;
  else if (range === "30d") maxAgeMs = 30 * 24 * 3600 * 1000;

  const nowMs = now.getTime();
  return items.filter((item) => {
    const rawDate = item.created_at || item.reported_at || item.updated_at;
    if (!rawDate) return true;
    const itemTime = new Date(rawDate).getTime();
    return !isNaN(itemTime) && nowMs - itemTime <= maxAgeMs;
  });
}

/**
 * 1. Rainfall Trend from real Open-Meteo hourly telemetry
 */
export function aggregateRainfallTrend(
  hourly?: HourlyForecastPoint[] | null,
  limitHours = 24
): RainfallTrendPoint[] {
  if (!hourly || !Array.isArray(hourly) || hourly.length === 0) return [];

  const points: RainfallTrendPoint[] = [];
  let runningAcc = 0;
  const count = Math.min(limitHours, hourly.length);

  for (let i = 0; i < count; i++) {
    const pt = hourly[i];
    const precip = pt.precipitation ?? pt.rain ?? 0;
    const prob = pt.precipitationProbability ?? 0;
    runningAcc = parseFloat((runningAcc + precip).toFixed(2));

    const date = new Date(pt.time);
    const hourLabel = isNaN(date.getTime())
      ? `H+${i}`
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

    points.push({
      timeLabel: hourLabel,
      precipitationMm: precip,
      accumulatedMm: runningAcc,
      probability: prob,
    });
  }

  return points;
}

/**
 * 2. Alerts by Severity
 */
export function aggregateAlertsBySeverity(alerts: AlertItem[]): SeverityChartPoint[] {
  const counts: Record<string, number> = {
    CRITICAL: 0,
    ALERT: 0,
    ADVISORY: 0,
    NORMAL: 0,
  };

  for (const a of alerts) {
    const sev = (a.severity || "").toUpperCase();
    if (sev === "CRITICAL" || sev === "EMERGENCY" || sev === "SEVERE") {
      counts.CRITICAL++;
    } else if (sev === "ALERT" || sev === "WARNING" || sev === "HIGH") {
      counts.ALERT++;
    } else if (sev === "ADVISORY" || sev === "MODERATE") {
      counts.ADVISORY++;
    } else if (sev === "NORMAL" || sev === "WATCH" || sev === "LOW") {
      counts.NORMAL++;
    }
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0) return [];

  return [
    { severity: "Critical", count: counts.CRITICAL, color: "#DC2626" },
    { severity: "Alert", count: counts.ALERT, color: "#EA580C" },
    { severity: "Advisory", count: counts.ADVISORY, color: "#D97706" },
    { severity: "Normal", count: counts.NORMAL, color: "#15803D" },
  ];
}

/**
 * 3. Incidents by Status
 */
export function aggregateIncidentsByStatus(incidents: IncidentItem[]): IncidentStatusChartPoint[] {
  if (incidents.length === 0) return [];

  const counts: Record<string, number> = {
    OPEN: 0,
    ACKNOWLEDGED: 0,
    RESPONDING: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };

  for (const inc of incidents) {
    const s = (inc.status || "").toUpperCase();
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  }

  return [
    { status: "Open", count: counts.OPEN, color: "#DC2626" },
    { status: "Acknowledged", count: counts.ACKNOWLEDGED, color: "#EA580C" },
    { status: "Responding", count: counts.RESPONDING, color: "#2563EB" },
    { status: "Resolved", count: counts.RESOLVED, color: "#16A34A" },
    { status: "Closed", count: counts.CLOSED, color: "#64748B" },
  ];
}

/**
 * 4. Incidents by Type
 */
export function aggregateIncidentsByType(incidents: IncidentItem[]): IncidentTypeChartPoint[] {
  if (incidents.length === 0) return [];

  const typeMap: Record<string, number> = {};

  for (const inc of incidents) {
    const t = inc.type || "Other";
    typeMap[t] = (typeMap[t] || 0) + 1;
  }

  return Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 5. Resources: Available vs Deployed
 */
export function aggregateResourcesDeployedVsAvailable(resources: Resource[]): ResourceBalanceChartPoint[] {
  if (resources.length === 0) return [];

  const catMap: Record<string, { available: number; deployed: number; total: number }> = {};

  for (const r of resources) {
    const key = r.type || "Other";
    if (!catMap[key]) {
      catMap[key] = { available: 0, deployed: 0, total: 0 };
    }
    catMap[key].available += r.available_quantity;
    catMap[key].deployed += r.deployed_quantity;
    catMap[key].total += r.total_quantity;
  }

  return Object.entries(catMap).map(([category, vals]) => ({
    category,
    available: vals.available,
    deployed: vals.deployed,
    total: vals.total,
  }));
}

/**
 * 6. Field Reports Over Time
 */
export function aggregateFieldReportsOverTime(reports: FieldReport[]): TimeSeriesChartPoint[] {
  if (reports.length === 0) return [];

  // Sort ascending by time
  const sorted = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const buckets: Record<string, number> = {};

  for (const rep of sorted) {
    const d = new Date(rep.created_at);
    if (isNaN(d.getTime())) continue;
    // Format: "DD MMM HH:00"
    const bucketKey = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${String(
      Math.floor(d.getHours() / 4) * 4
    ).padStart(2, "0")}:00`;
    buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
  }

  return Object.entries(buckets).map(([timeLabel, count]) => ({
    timeLabel,
    timestamp: timeLabel,
    count,
  }));
}

/**
 * 7. Response Teams Status Distribution
 */
export function aggregateResponseTeamsByStatus(teams: ResponseTeam[]): TeamStatusChartPoint[] {
  if (teams.length === 0) return [];

  const counts: Record<string, number> = {
    AVAILABLE: 0,
    ASSIGNED: 0,
    EN_ROUTE: 0,
    ON_SITE: 0,
    UNAVAILABLE: 0,
  };

  for (const t of teams) {
    const s = (t.status || "").toUpperCase();
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  }

  return [
    { status: "Available", count: counts.AVAILABLE, color: "#16A34A" },
    { status: "Assigned", count: counts.ASSIGNED, color: "#3B82F6" },
    { status: "En Route", count: counts.EN_ROUTE, color: "#D97706" },
    { status: "On Site", count: counts.ON_SITE, color: "#DC2626" },
    { status: "Unavailable", count: counts.UNAVAILABLE, color: "#64748B" },
  ];
}

export interface IncidentTrendPoint {
  dateKey: string;
  displayDate: string;
  count: number;
}

export interface IncidentTypeRankItem {
  type: string;
  count: number;
  percentage: number;
}

export interface AlertEffectivenessResult {
  issuedAlertsCount: number;
  incidentsInAlertedAreasCount: number;
  matchedAlertsCount: number;
  percentageMatch: number;
}

export interface ResourceUtilizationTypeSummary {
  type: string;
  total: number;
  deployed: number;
  available: number;
  utilizationPercent: number;
}

export interface FieldReportHotspot {
  locationName: string;
  reportCount: number;
  mostCommonType: string;
  verifiedCount: number;
}

/**
 * 8. 14-day Incident Daily Trend
 * Returns 14 days sequence (from 13 days ago to today) with counts.
 */
export function aggregate14DayIncidentTrend(
  incidents: IncidentItem[],
  locale: string = "en"
): { points: IncidentTrendPoint[]; daysWithDataCount: number; totalUniqueDaysCount: number } {
  const points: IncidentTrendPoint[] = [];
  const dateCounts: Record<string, number> = {};

  // Track all unique days across the entire dataset to assess operational depth
  const allRecordedDaysSet = new Set<string>();
  for (const inc of incidents) {
    if (inc.created_at) {
      const d = inc.created_at.split("T")[0];
      allRecordedDaysSet.add(d);
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  }

  // Generate continuous 14-day window ending today
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateKey = d.toISOString().split("T")[0];
    const count = dateCounts[dateKey] || 0;
    const displayDate = d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
    });

    points.push({
      dateKey,
      displayDate,
      count,
    });
  }

  const daysWithDataCount = points.filter((p) => p.count > 0).length;

  return {
    points,
    daysWithDataCount,
    totalUniqueDaysCount: allRecordedDaysSet.size,
  };
}

/**
 * 9. Top N Incident Types with Percentage
 */
export function aggregateTopIncidentTypes(
  incidents: IncidentItem[],
  topN: number = 6
): IncidentTypeRankItem[] {
  if (incidents.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    const t = inc.type || "Other";
    counts[t] = (counts[t] || 0) + 1;
  }

  const total = incidents.length;
  const sorted = Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return sorted.slice(0, topN);
}

/**
 * 10. Alert Effectiveness Evaluation
 * Compares issued alerts with incidents reported in the alerted geographical areas.
 */
export function calculateAlertEffectiveness(
  alerts: AlertItem[],
  incidents: IncidentItem[]
): AlertEffectivenessResult {
  const issuedAlerts = alerts.filter(
    (a) => (a.status || "").toUpperCase() === "ISSUED"
  );
  const issuedAlertsCount = issuedAlerts.length;

  if (issuedAlertsCount === 0) {
    return {
      issuedAlertsCount: 0,
      incidentsInAlertedAreasCount: 0,
      matchedAlertsCount: 0,
      percentageMatch: 0,
    };
  }

  // Find incidents that occurred in any alerted area
  const matchedIncidents = incidents.filter((inc) => {
    if (!inc.location_name) return false;
    const loc = inc.location_name.toLowerCase().trim();
    return issuedAlerts.some((a) => {
      if (!a.area_name) return false;
      const area = a.area_name.toLowerCase().trim();
      return loc.includes(area) || area.includes(loc);
    });
  });

  // Count how many issued alerts had at least one actual incident occur
  const matchedAlerts = issuedAlerts.filter((a) => {
    if (!a.area_name) return false;
    const area = a.area_name.toLowerCase().trim();
    return incidents.some((inc) => {
      if (!inc.location_name) return false;
      const loc = inc.location_name.toLowerCase().trim();
      return loc.includes(area) || area.includes(loc);
    });
  });

  const percentageMatch = Math.round(
    (matchedAlerts.length / issuedAlertsCount) * 100
  );

  return {
    issuedAlertsCount,
    incidentsInAlertedAreasCount: matchedIncidents.length,
    matchedAlertsCount: matchedAlerts.length,
    percentageMatch,
  };
}

/**
 * 11. Resource Utilization Breakdown by Type
 */
export function aggregateResourceUtilizationByType(
  resources: Resource[]
): ResourceUtilizationTypeSummary[] {
  if (resources.length === 0) return [];

  const map: Record<string, { total: number; deployed: number; available: number }> = {};

  for (const r of resources) {
    const key = r.type || "General Logistics";
    if (!map[key]) {
      map[key] = { total: 0, deployed: 0, available: 0 };
    }
    map[key].total += r.total_quantity || 0;
    map[key].deployed += r.deployed_quantity || 0;
    map[key].available += r.available_quantity || 0;
  }

  return Object.entries(map)
    .map(([type, vals]) => ({
      type,
      total: vals.total,
      deployed: vals.deployed,
      available: vals.available,
      utilizationPercent: vals.total > 0 ? Math.round((vals.deployed / vals.total) * 100) : 0,
    }))
    .sort((a, b) => b.deployed - a.deployed || b.total - a.total);
}

/**
 * 12. Field Report Hotspots Table (Most Reported Areas)
 */
export function aggregateFieldReportHotspots(
  reports: FieldReport[],
  limit: number = 8
): FieldReportHotspot[] {
  if (reports.length === 0) return [];

  const locationMap: Record<
    string,
    { count: number; verifiedCount: number; typeCounts: Record<string, number> }
  > = {};

  for (const rep of reports) {
    const loc = rep.location_name?.trim() || "Unspecified Location";
    if (!locationMap[loc]) {
      locationMap[loc] = { count: 0, verifiedCount: 0, typeCounts: {} };
    }
    locationMap[loc].count++;
    if (rep.verification_status === "VERIFIED") {
      locationMap[loc].verifiedCount++;
    }
    const t = rep.report_type || "General";
    locationMap[loc].typeCounts[t] = (locationMap[loc].typeCounts[t] || 0) + 1;
  }

  return Object.entries(locationMap)
    .map(([locationName, data]) => {
      // Find most common report type
      let mostCommonType = "General";
      let maxCount = 0;
      for (const [t, c] of Object.entries(data.typeCounts)) {
        if (c > maxCount) {
          maxCount = c;
          mostCommonType = t;
        }
      }

      return {
        locationName,
        reportCount: data.count,
        mostCommonType,
        verifiedCount: data.verifiedCount,
      };
    })
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, limit);
}

/**
 * 13. Average Incident Response Time
 * Evaluates duration between created_at and resolved updated_at.
 */
export function calculateAvgResponseTime(
  incidents: IncidentItem[],
  locale: string = "en"
): { avgMinutes: number | null; formattedTime: string; resolvedCount: number } {
  const resolved = incidents.filter((i) => {
    const s = (i.status || "").toUpperCase();
    return s === "RESOLVED" || s === "CLOSED";
  });

  if (resolved.length === 0) {
    return {
      avgMinutes: null,
      formattedTime: locale === "hi" ? "अनुपलब्ध" : "Unavailable",
      resolvedCount: 0,
    };
  }

  let totalDiffMs = 0;
  let validCalculatedCount = 0;

  for (const inc of resolved) {
    const createdTime = new Date(inc.created_at).getTime();
    const updatedTime = inc.updated_at ? new Date(inc.updated_at).getTime() : createdTime;
    const diff = updatedTime - createdTime;

    if (!isNaN(diff) && diff >= 0) {
      totalDiffMs += diff;
      validCalculatedCount++;
    }
  }

  if (validCalculatedCount === 0) {
    return {
      avgMinutes: null,
      formattedTime: locale === "hi" ? "अनुपलब्ध" : "Unavailable",
      resolvedCount: 0,
    };
  }

  const avgMinutes = Math.round(totalDiffMs / validCalculatedCount / 60000);

  let formattedTime = "";
  if (avgMinutes < 60) {
    formattedTime = `${avgMinutes} ${locale === "hi" ? "मिनट" : "mins"}`;
  } else {
    const hours = (avgMinutes / 60).toFixed(1);
    formattedTime = `${hours} ${locale === "hi" ? "घंटे" : "hrs"}`;
  }

  return {
    avgMinutes,
    formattedTime,
    resolvedCount: validCalculatedCount,
  };
}

/**
 * 14. Month-over-Month Incident Comparison
 */
export function calculateMonthOverMonthIncidents(incidents: IncidentItem[]): {
  currentMonthCount: number;
  previousMonthCount: number;
  diff: number;
  percentChange: number | null;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  let currentMonthCount = 0;
  let previousMonthCount = 0;

  for (const inc of incidents) {
    if (!inc.created_at) continue;
    const d = new Date(inc.created_at);
    if (isNaN(d.getTime())) continue;

    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      currentMonthCount++;
    } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
      previousMonthCount++;
    }
  }

  const diff = currentMonthCount - previousMonthCount;
  const percentChange =
    previousMonthCount > 0 ? Math.round((diff / previousMonthCount) * 100) : null;

  return {
    currentMonthCount,
    previousMonthCount,
    diff,
    percentChange,
  };
}

/**
 * Generate RFC-4180 compliant CSV Export dossier
 */
export function generateOperationalAnalyticsCsv(params: {
  alerts: AlertItem[];
  incidents: IncidentItem[];
  resources: Resource[];
  shelters: Shelter[];
  fieldReports: FieldReport[];
  responseTeams: ResponseTeam[];
  dateRange: string;
  locationName: string;
}): string {
  const { alerts, incidents, resources, shelters, fieldReports, responseTeams, dateRange, locationName } = params;
  const timestamp = new Date().toISOString();

  let csv = `# VARSHANETRA DISTRICT DISASTER OPERATIONAL ANALYTICS DOSSIER\r\n`;
  csv += `# District Operations Center: "${locationName}"\r\n`;
  csv += `# Filter Horizon: "${dateRange}"\r\n`;
  csv += `# Generation Timestamp: "${timestamp}"\r\n`;
  csv += `# Application Compliance: NDMA Standard Disaster Reporting Format\r\n\r\n`;

  // EXECUTIVE KPI SUMMARY
  const resolvedIncidents = incidents.filter(
    (i) => (i.status || "").toUpperCase() === "RESOLVED" || (i.status || "").toUpperCase() === "CLOSED"
  );
  let totalDiffMs = 0;
  let validCalculated = 0;
  for (const inc of resolvedIncidents) {
    const cTime = new Date(inc.created_at).getTime();
    const uTime = inc.updated_at ? new Date(inc.updated_at).getTime() : cTime;
    const diff = uTime - cTime;
    if (!isNaN(diff) && diff >= 0) {
      totalDiffMs += diff;
      validCalculated++;
    }
  }
  const avgResponseTimeStr =
    validCalculated > 0
      ? `${Math.round(totalDiffMs / validCalculated / 60000)} mins`
      : "Unavailable";

  const totalRes = resources.reduce((s, r) => s + (r.total_quantity || 0), 0);
  const deployedRes = resources.reduce((s, r) => s + (r.deployed_quantity || 0), 0);
  const utilPercent = totalRes > 0 ? `${Math.round((deployedRes / totalRes) * 100)}%` : "0%";
  const verifiedReports = fieldReports.filter((f) => f.verification_status === "VERIFIED").length;
  const issuedAlerts = alerts.filter((a) => (a.status || "").toUpperCase() === "ISSUED").length;

  csv += `"--- EXECUTIVE NDMA METRICS SUMMARY ---"\r\n`;
  csv += `"Metric","Value","Context"\r\n`;
  csv += `"Total Incidents","${incidents.length}","Incidents logged in selected timeframe"\r\n`;
  csv += `"Average Response Time","${avgResponseTimeStr}","Resolution time for verified incidents"\r\n`;
  csv += `"Alerts Issued","${issuedAlerts}","Official warning bulletins with ISSUED status"\r\n`;
  csv += `"Field Reports Logged","${fieldReports.length}","${verifiedReports} verified ground observations"\r\n`;
  csv += `"Resource Utilization","${utilPercent}","${deployedRes} of ${totalRes} units actively deployed"\r\n\r\n`;

  // 1. INCIDENTS SECTION
  csv += `"--- EMERGENCY INCIDENTS & TICKETS ---"\r\n`;
  csv += `"Incident Number","Type","Severity","Status","Location","Reported At","Description"\r\n`;
  for (const inc of incidents) {
    csv += `"${inc.incident_number}","${inc.type}","${inc.severity}","${inc.status}","${(inc.location_name || "").replace(/"/g, '""')}","${inc.created_at}","${(inc.description || "").replace(/"/g, '""')}"\r\n`;
  }
  csv += `\r\n`;

  // 2. STATUTORY ALERTS SECTION
  csv += `"--- STATUTORY EARLY WARNING ALERTS ---"\r\n`;
  csv += `"Title","Severity","Status","Area Name","Recommended Action","Created At"\r\n`;
  for (const a of alerts) {
    csv += `"${(a.title || "").replace(/"/g, '""')}","${a.severity}","${a.status}","${(a.area_name || "").replace(/"/g, '""')}","${(a.recommended_action || "").replace(/"/g, '""')}","${a.created_at}"\r\n`;
  }
  csv += `\r\n`;

  // 3. RESOURCES & EQUIPMENT SECTION
  csv += `"--- LOGISTICS & EQUIPMENT RESERVES ---"\r\n`;
  csv += `"Resource Name","Category","Total Stock","Available","Deployed","Depot Location"\r\n`;
  for (const r of resources) {
    csv += `"${(r.name || "").replace(/"/g, '""')}","${r.type}","${r.total_quantity}","${r.available_quantity}","${r.deployed_quantity}","${(r.location || "").replace(/"/g, '""')}"\r\n`;
  }
  csv += `\r\n`;

  // 4. RELIEF SHELTERS SECTION
  csv += `"--- RELIEF SHELTERS & OCCUPANCY ---"\r\n`;
  csv += `"Shelter Name","Status","Capacity","Current Occupancy","Available Vacancies","Water Available","Food Available","Medical Support","Electricity"\r\n`;
  for (const s of shelters) {
    const free = Math.max(0, s.capacity - s.current_occupancy);
    csv += `"${(s.name || "").replace(/"/g, '""')}","${s.status}","${s.capacity}","${s.current_occupancy}","${free}","${s.water_available ? "YES" : "NO"}","${s.food_available ? "YES" : "NO"}","${s.medical_support ? "YES" : "NO"}","${s.electricity ? "YES" : "NO"}"\r\n`;
  }
  csv += `\r\n`;

  // 5. FIELD GROUND REPORTS SECTION
  csv += `"--- GROUND TRUTH OBSERVATIONS ---"\r\n`;
  csv += `"Report Number","Type","Severity","Verification Status","Water Depth (cm)","Road Status","People Needing Rescue","Location","Observer","Reported At"\r\n`;
  for (const fr of fieldReports) {
    csv += `"${fr.report_number}","${fr.report_type}","${fr.severity}","${fr.verification_status}","${fr.observed_water_depth_cm ?? "N/A"}","${fr.road_status}","${fr.people_requiring_assistance ?? 0}","${(fr.location_name || "").replace(/"/g, '""')}","${(fr.observer_name || "").replace(/"/g, '""')}","${fr.created_at}"\r\n`;
  }
  csv += `\r\n`;

  // 6. RESPONSE TEAMS SECTION
  csv += `"--- TACTICAL RESPONSE SQUADS ---"\r\n`;
  csv += `"Squad Name","Agency","Personnel Count","Status","Base Location","Contact"\r\n`;
  for (const t of responseTeams) {
    csv += `"${(t.name || "").replace(/"/g, '""')}","${t.agency}","${t.personnel_count}","${t.status}","${(t.location_name || "").replace(/"/g, '""')}","${(t.contact_number || "").replace(/"/g, '""')}"\r\n`;
  }

  return csv;
}
