"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CloudRain,
  AlertTriangle,
  Flame,
  Truck,
  Users,
  Radio,
  Download,
  RefreshCw,
  Calendar,
  Layers,
  Activity,
  Info,
  Clock,
  Target,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip as TooltipUI } from "@/components/ui/tooltip";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { DataSourceMeta } from "@/types";
import { AlertItem } from "@/types/alerts";
import { IncidentItem } from "@/types/incidents";
import { Resource, Shelter } from "@/types/resources";
import { FieldReport } from "@/types/field-reports";
import { ResponseTeam } from "@/types/response-teams";
import { HourlyForecastPoint } from "@/types/weather";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import {
  DateRangeFilter,
  filterByDateRange,
  aggregateRainfallTrend,
  aggregateAlertsBySeverity,
  aggregateIncidentsByStatus,
  aggregateResponseTeamsByStatus,
  aggregate14DayIncidentTrend,
  aggregateTopIncidentTypes,
  calculateAlertEffectiveness,
  aggregateResourceUtilizationByType,
  aggregateFieldReportHotspots,
  calculateAvgResponseTime,
  calculateMonthOverMonthIncidents,
  generateOperationalAnalyticsCsv,
} from "@/lib/services/analytics";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function AnalyticsPage() {
  const locale = useLocale();
  const tAnalytics = useTranslations("analytics");
  const tCommon = useTranslations("common");

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string>(new Date().toISOString());

  // Date Range filter state
  const [dateRange, setDateRange] = useState<DateRangeFilter>("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Raw fetched operational records
  const [rawAlerts, setRawAlerts] = useState<AlertItem[]>([]);
  const [rawIncidents, setRawIncidents] = useState<IncidentItem[]>([]);
  const [rawResources, setRawResources] = useState<Resource[]>([]);
  const [rawShelters, setRawShelters] = useState<Shelter[]>([]);
  const [rawFieldReports, setRawFieldReports] = useState<FieldReport[]>([]);
  const [rawResponseTeams, setRawResponseTeams] = useState<ResponseTeam[]>([]);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastPoint[]>([]);

  // Source metadata
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta>({
    provider: "VarshaNetra Integrated Operations Database & Open-Meteo Telemetry",
    lastUpdated: new Date().toISOString(),
    origin: "LIVE_API",
    attributionNotice: "Weather data via Open-Meteo. Operational logs queried from District EOC Database.",
  });

  // Fetch all operational feeds
  const loadAnalyticsData = useCallback(async () => {
    setViewState("loading");
    setErrorMessage(null);

    try {
      const [
        alertsRes,
        incidentsRes,
        resourcesRes,
        sheltersRes,
        fieldReportsRes,
        teamsRes,
        weatherRes,
      ] = await Promise.allSettled([
        fetch("/api/alerts?status=ALL"),
        fetch("/api/incidents"),
        fetch("/api/resources"),
        fetch("/api/shelters"),
        fetch("/api/field-reports"),
        fetch("/api/response-teams"),
        // Pune District Center coordinates: 18.5204, 73.8567
        fetch("/api/weather/forecast?lat=18.5204&lon=73.8567"),
      ]);

      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        const json = await alertsRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.alerts) ? json.alerts : [];
        setRawAlerts(list);
      }
      if (incidentsRes.status === "fulfilled" && incidentsRes.value.ok) {
        const json = await incidentsRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.incidents) ? json.incidents : [];
        setRawIncidents(list);
      }
      if (resourcesRes.status === "fulfilled" && resourcesRes.value.ok) {
        const json = await resourcesRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.resources) ? json.resources : [];
        setRawResources(list);
      }
      if (sheltersRes.status === "fulfilled" && sheltersRes.value.ok) {
        const json = await sheltersRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.shelters) ? json.shelters : [];
        setRawShelters(list);
      }
      if (fieldReportsRes.status === "fulfilled" && fieldReportsRes.value.ok) {
        const json = await fieldReportsRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.reports) ? json.reports : [];
        setRawFieldReports(list);
      }
      if (teamsRes.status === "fulfilled" && teamsRes.value.ok) {
        const json = await teamsRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.teams) ? json.teams : [];
        setRawResponseTeams(list);
      }
      if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
        const json = await weatherRes.value.json();
        const forecastObj = json.data || json;
        if (Array.isArray(forecastObj.hourly)) {
          setHourlyForecast(forecastObj.hourly);
        }
      }

      const now = new Date().toISOString();
      setLastCalculatedAt(now);
      setSourceMeta((prev) => ({ ...prev, lastUpdated: now }));
      setViewState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load operational analytics telemetry."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Date-filtered records based on current range selection
  const filteredAlerts = useMemo(
    () => filterByDateRange(rawAlerts, dateRange, customStartDate, customEndDate),
    [rawAlerts, dateRange, customStartDate, customEndDate]
  );
  const filteredIncidents = useMemo(
    () => filterByDateRange(rawIncidents, dateRange, customStartDate, customEndDate),
    [rawIncidents, dateRange, customStartDate, customEndDate]
  );
  const filteredFieldReports = useMemo(
    () => filterByDateRange(rawFieldReports, dateRange, customStartDate, customEndDate),
    [rawFieldReports, dateRange, customStartDate, customEndDate]
  );

  // Is database entirely empty?
  const isDatabaseEmpty = useMemo(() => {
    return (
      rawIncidents.length === 0 &&
      rawAlerts.length === 0 &&
      rawFieldReports.length === 0 &&
      rawResources.length === 0
    );
  }, [rawIncidents, rawAlerts, rawFieldReports, rawResources]);

  // ==========================================
  // SECTION 1: 5 Core Operational KPI Metrics
  // ==========================================
  // Card 1: Total Incidents with Month-over-Month comparison
  const totalIncidentsCount = filteredIncidents.length;
  const momIncidents = useMemo(
    () => calculateMonthOverMonthIncidents(rawIncidents),
    [rawIncidents]
  );

  // Card 2: Average Response Time (created_at to resolved updated_at)
  const avgResponseTime = useMemo(
    () => calculateAvgResponseTime(filteredIncidents, locale),
    [filteredIncidents, locale]
  );

  // Card 3: Issued Alerts Count (status === ISSUED)
  const issuedAlertsCount = useMemo(
    () => filteredAlerts.filter((a) => (a.status || "").toUpperCase() === "ISSUED").length,
    [filteredAlerts]
  );

  // Card 4: Field Reports (total count + verified count)
  const totalFieldReportsCount = filteredFieldReports.length;
  const verifiedFieldReportsCount = useMemo(
    () => filteredFieldReports.filter((r) => r.verification_status === "VERIFIED").length,
    [filteredFieldReports]
  );

  // Card 5: Overall Resource Utilization (% of total deployed)
  const totalResourceUnits = useMemo(
    () => rawResources.reduce((sum, r) => sum + (r.total_quantity || 0), 0),
    [rawResources]
  );
  const deployedResourceUnits = useMemo(
    () => rawResources.reduce((sum, r) => sum + (r.deployed_quantity || 0), 0),
    [rawResources]
  );
  const overallResourceUtilization = useMemo(
    () => (totalResourceUnits > 0 ? Math.round((deployedResourceUnits / totalResourceUnits) * 100) : 0),
    [totalResourceUnits, deployedResourceUnits]
  );

  // ==========================================
  // SECTION 2: 14-Day Incident Daily Trend
  // ==========================================
  const incident14DayTrend = useMemo(
    () => aggregate14DayIncidentTrend(rawIncidents, locale),
    [rawIncidents, locale]
  );

  // ==========================================
  // SECTION 3: Incident Type Breakdown (Top 6)
  // ==========================================
  const topIncidentTypes = useMemo(
    () => aggregateTopIncidentTypes(filteredIncidents, 6),
    [filteredIncidents]
  );

  // ==========================================
  // SECTION 4: Alert Effectiveness
  // ==========================================
  const alertEffectiveness = useMemo(
    () => calculateAlertEffectiveness(filteredAlerts, filteredIncidents),
    [filteredAlerts, filteredIncidents]
  );

  // ==========================================
  // SECTION 5: Resource Utilization by Type
  // ==========================================
  const resourceUtilizationByType = useMemo(
    () => aggregateResourceUtilizationByType(rawResources),
    [rawResources]
  );

  // ==========================================
  // SECTION 6: Field Report Hotspots
  // ==========================================
  const fieldReportHotspots = useMemo(
    () => aggregateFieldReportHotspots(filteredFieldReports, 8),
    [filteredFieldReports]
  );

  // ==========================================
  // Existing Preserved Operational Feeds
  // ==========================================
  const rainfallTrendData = useMemo(() => {
    const limit = dateRange === "today" ? 24 : dateRange === "24h" ? 24 : dateRange === "48h" ? 48 : 72;
    return aggregateRainfallTrend(hourlyForecast, limit);
  }, [hourlyForecast, dateRange]);

  const alertsBySeverityData = useMemo(
    () => aggregateAlertsBySeverity(filteredAlerts),
    [filteredAlerts]
  );

  const incidentsByStatusData = useMemo(
    () => aggregateIncidentsByStatus(filteredIncidents),
    [filteredIncidents]
  );

  const responseTeamsData = useMemo(
    () => aggregateResponseTeamsByStatus(rawResponseTeams),
    [rawResponseTeams]
  );

  // CSV Export Handler with NDMA compliant structure
  const handleExportCsv = () => {
    const csvContent = generateOperationalAnalyticsCsv({
      alerts: filteredAlerts,
      incidents: filteredIncidents,
      resources: rawResources,
      shelters: rawShelters,
      fieldReports: filteredFieldReports,
      responseTeams: rawResponseTeams,
      dateRange: dateRange === "custom" ? `custom (${customStartDate || "start"} to ${customEndDate || "now"})` : dateRange,
      locationName: "Pune District Operations Area",
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `varshanetra_operational_analytics_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={tAnalytics("title", locale === "hi" ? "परिचालन विश्लेषण एवं टेलीमेट्री" : "Operational Analytics & Telemetry")}
        description={tAnalytics("subtitle", locale === "hi"
          ? "मौसम टेलीमेट्री, घटना प्रतिक्रिया समय, चेतावनी प्रभावशीलता और रसद उपयोग का एकीकृत जिला स्तरीय निर्णय विश्लेषण।"
          : "District-level operational decision support metrics derived from real-time telemetry, response times, alert validation, and resource mobilization.")}
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "विश्लेषण" : "Analytics" },
        ]}
        sourceMeta={sourceMeta}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge metadata={sourceMeta} />
            {/* Filter at top: Today, Last 7 Days, Last 30 Days, Custom Range */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <span className="text-slate-600 dark:text-slate-400 mr-2 font-medium">
                {locale === "hi" ? "समयावधि:" : "Filter:"}
              </span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                aria-label="Filter analytics by date range"
              >
                <option value="today">{locale === "hi" ? "आज" : "Today"}</option>
                <option value="7d">{locale === "hi" ? "पिछले 7 दिन" : "Last 7 Days"}</option>
                <option value="30d">{locale === "hi" ? "पिछले 30 दिन" : "Last 30 Days"}</option>
                <option value="custom">{locale === "hi" ? "कस्टम अवधि" : "Custom Range"}</option>
                <option value="ALL">{locale === "hi" ? "संपूर्ण समय" : "All Time"}</option>
              </select>
            </div>

            {/* Custom Range Date Pickers */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-0.5 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-[11px]"
                  aria-label="Custom Start Date"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-[11px]"
                  aria-label="Custom End Date"
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalyticsData}
              disabled={viewState === "loading"}
              className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${viewState === "loading" ? "animate-spin" : ""}`} />
              <span>{tCommon("refresh", "Refresh")}</span>
            </Button>

            {/* Export CSV Button with required NDMA Tooltip */}
            <TooltipUI
              content={
                locale === "hi"
                  ? "यह डेटा NDMA रिपोर्टिंग के लिए उपयोग किया जा सकता है"
                  : "This data can be used for NDMA reporting"
              }
            >
              <Button
                variant="default"
                size="sm"
                onClick={handleExportCsv}
                className="text-xs font-semibold gap-1.5 bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{locale === "hi" ? "सीएसवी निर्यात" : "Export CSV"}</span>
              </Button>
            </TooltipUI>
          </div>
        }
      />

      {/* Database Empty State Banner */}
      {viewState === "success" && isDatabaseEmpty && (
        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 p-8 text-center bg-amber-50/50 dark:bg-amber-950/20">
          <Activity className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            {locale === "hi"
              ? "अभी कोई डेटा नहीं है।"
              : "No data yet."}
          </h3>
          <p className="text-xs sm:text-sm text-amber-800/80 dark:text-amber-300/80 mt-1 max-w-lg mx-auto">
            {locale === "hi"
              ? "घटनाएं, चेतावनियां और रिपोर्ट दर्ज होने के बाद यहां विश्लेषण दिखेगा।"
              : "Analytics will appear after incidents, alerts, and reports are recorded."}
          </p>
        </div>
      )}

      {/* SECTION 1: 5 Metric Cards in a Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Incidents with MoM comparison */}
        <MetricCard
          title={locale === "hi" ? "कुल घटनाएं" : "Total Incidents"}
          value={totalIncidentsCount.toString()}
          subtext={
            momIncidents.previousMonthCount > 0
              ? locale === "hi"
                ? `${momIncidents.currentMonthCount} इस माह (${momIncidents.diff >= 0 ? "+" : ""}${momIncidents.diff} बनाम पिछला माह)`
                : `${momIncidents.currentMonthCount} this mo (${momIncidents.diff >= 0 ? "+" : ""}${momIncidents.diff} vs last mo)`
              : locale === "hi"
              ? `${momIncidents.currentMonthCount} इस महीने दर्ज`
              : `${momIncidents.currentMonthCount} logged this month`
          }
          icon={Flame}
          severity={totalIncidentsCount > 10 ? "ALERT" : "NORMAL"}
          sourceLabel={locale === "hi" ? "घटना रजिस्टर" : "Incidents Registry"}
          isLoading={viewState === "loading"}
        />

        {/* Card 2: Average Response Time */}
        <MetricCard
          title={locale === "hi" ? "औसत प्रतिक्रिया समय" : "Avg Response Time"}
          value={avgResponseTime.formattedTime}
          subtext={
            avgResponseTime.resolvedCount > 0
              ? locale === "hi"
                ? `${avgResponseTime.resolvedCount} हल की गई घटनाओं पर`
                : `Across ${avgResponseTime.resolvedCount} resolved cases`
              : locale === "hi"
              ? "कोई हल की गई घटना नहीं"
              : "No resolved incidents yet"
          }
          icon={Clock}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "समाधान समय-सारिणी" : "Resolution Timing"}
          isLoading={viewState === "loading"}
        />

        {/* Card 3: Alerts Issued (status === ISSUED) */}
        <MetricCard
          title={locale === "hi" ? "जारी चेतावनियां" : "Alerts Issued"}
          value={issuedAlertsCount.toString()}
          subtext={
            locale === "hi"
              ? `कुल ${filteredAlerts.length} बुलेटिनों में सक्रिय`
              : `Active in ${filteredAlerts.length} total bulletins`
          }
          icon={AlertTriangle}
          severity={issuedAlertsCount > 2 ? "ALERT" : issuedAlertsCount > 0 ? "ADVISORY" : "NORMAL"}
          sourceLabel={locale === "hi" ? "सक्रिय बुलेटिन" : "Active Bulletins"}
          isLoading={viewState === "loading"}
        />

        {/* Card 4: Field Reports (Total & Verified) */}
        <MetricCard
          title={locale === "hi" ? "क्षेत्र रिपोर्ट" : "Field Reports"}
          value={totalFieldReportsCount.toString()}
          subtext={
            locale === "hi"
              ? `${verifiedFieldReportsCount} सत्यापित रिपोर्टें`
              : `${verifiedFieldReportsCount} verified field reports`
          }
          icon={Radio}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "जमीनी अवलोकन" : "Ground Observations"}
          isLoading={viewState === "loading"}
        />

        {/* Card 5: Resource Utilization Percentage */}
        <MetricCard
          title={locale === "hi" ? "संसाधन उपयोग" : "Resource Utilization"}
          value={`${overallResourceUtilization}%`}
          subtext={
            locale === "hi"
              ? `${deployedResourceUnits} / ${totalResourceUnits} इकाइयां तैनात`
              : `${deployedResourceUnits} / ${totalResourceUnits} units deployed`
          }
          icon={Truck}
          severity={overallResourceUtilization > 80 ? "ALERT" : overallResourceUtilization > 50 ? "ADVISORY" : "NORMAL"}
          sourceLabel={locale === "hi" ? "रसद रजिस्टर" : "Logistics Registry"}
          isLoading={viewState === "loading"}
        />
      </div>

      <StateContainer
        state={viewState}
        onRetry={loadAnalyticsData}
        errorMessage={errorMessage || "Failed to query disaster analytics partition."}
      >
        <div className="space-y-6">
          {/* Main Analytics Grid: SECTION 2 (Incident Trend) & SECTION 3 (Incident Type Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 2: 14-day Incident Daily Trend */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "घटना रुझान (पिछले 14 दिन)"
                        : "Incident Trend (Last 14 Days)"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {incident14DayTrend.daysWithDataCount} / 14 {locale === "hi" ? "सक्रिय दिन" : "active days"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "पिछले 14 दिनों में दर्ज आपातकालीन घटनाओं की दैनिक संख्या।"
                    : "Daily volume of emergency incident records logged across the last 14 days."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {incident14DayTrend.totalUniqueDaysCount < 7 ? (
                  /* Required polite message when fewer than 7 days of records */
                  <div className="h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/60 dark:bg-slate-900/30">
                    <Calendar className="w-9 h-9 text-slate-400 dark:text-slate-600 mb-2.5" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi"
                        ? "पर्याप्त डेटा नहीं - कम से कम 7 दिन के डेटा के बाद ग्राफ दिखेगा"
                        : "Insufficient data - chart will appear after 7 days of data"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      {locale === "hi"
                        ? `वर्तमान में सिस्टम में केवल ${incident14DayTrend.totalUniqueDaysCount} दिन के घटना रिकॉर्ड उपलब्ध हैं।`
                        : `Currently only ${incident14DayTrend.totalUniqueDaysCount} day(s) of historical incident records are logged in the database.`}
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={incident14DayTrend.points}
                        margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "8px",
                            border: "none",
                            color: "#F8FAFC",
                            fontSize: "12px",
                          }}
                          formatter={(val: unknown) => [
                            `${Number(val)} ${locale === "hi" ? "घटनाएं" : "incidents"}`,
                            locale === "hi" ? "दैनिक संख्या" : "Daily Count",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: "#2563EB", strokeWidth: 1.5, stroke: "#ffffff" }}
                          activeDot={{ r: 6 }}
                          name={locale === "hi" ? "घटनाएं" : "Incidents"}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 3: Incident Type Breakdown (Horizontal Bar Chart) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? `घटना प्रकार वर्गीकरण (शीर्ष 6 प्रकार)`
                        : `Incident Type Breakdown (Top 6)`}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {topIncidentTypes.length} {locale === "hi" ? "प्रकार" : "types"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "प्रत्येक प्रकार की घटना संख्या और कुल में प्रतिशत हिस्सेदारी।"
                    : "Count and relative percentage breakdown across leading emergency categories."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {topIncidentTypes.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई वर्गीकरण डेटा नहीं" : "No Classification Data"}
                    description={
                      locale === "hi"
                        ? "चयनित समयावधि में प्रकार वर्गीकरण हेतु कोई घटना रिकॉर्ड उपलब्ध नहीं है।"
                        : "No incident records found in the active filter range to aggregate by type."
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="w-full h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topIncidentTypes}
                          layout="vertical"
                          margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#88888820" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="type"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            width={110}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0F172A",
                              borderRadius: "8px",
                              border: "none",
                              color: "#F8FAFC",
                              fontSize: "12px",
                            }}
                            formatter={(val: unknown, _name, entry) => [
                              `${Number(val)} (${(entry?.payload as { percentage?: number })?.percentage ?? 0}%)`,
                              locale === "hi" ? "संख्या एवं प्रतिशत" : "Count & Share",
                            ]}
                          />
                          <Bar
                            dataKey="count"
                            fill="#8B5CF6"
                            radius={[0, 4, 4, 0]}
                            name={locale === "hi" ? "गणना" : "Count"}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Compact Labels Row showing Count & Percentage */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {topIncidentTypes.map((item, idx) => (
                        <div
                          key={`type-item-${idx}`}
                          className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px]"
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
                            {item.type}
                          </span>
                          <span className="font-semibold text-purple-700 dark:text-purple-400 shrink-0">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 4 (Alert Effectiveness) & SECTION 5 (Resource Utilization) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 4: Alert Effectiveness */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "चेतावनी प्रभावशीलता मूल्यांकन"
                        : "Alert Effectiveness"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {alertEffectiveness.percentageMatch}% {locale === "hi" ? "सटीकता दर" : "match rate"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "जारी चेतावनी बुलेटिनों और संबद्ध भौगोलिक क्षेत्रों में उत्पन्न वास्तविक घटनाओं का सत्यापन।"
                    : "Correlation of issued early warning bulletins with verified ground incidents in alerted zones."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
                    <span className="text-[11px] text-slate-500 block mb-1">
                      {locale === "hi" ? "जारी चेतावनियां" : "Alerts Issued"}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {alertEffectiveness.issuedAlertsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
                    <span className="text-[11px] text-slate-500 block mb-1">
                      {locale === "hi" ? "चेतावनी क्षेत्रों में घटनाएं" : "Incidents in Zones"}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#0F3D66] dark:text-sky-400 font-mono">
                      {alertEffectiveness.incidentsInAlertedAreasCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mb-1">
                      {locale === "hi" ? "प्रभावशीलता मिलान" : "Match Rate"}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                      {alertEffectiveness.percentageMatch}%
                    </span>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{locale === "hi" ? "चेतावनी सत्यापन अनुपात" : "Warning Verification Ratio"}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {alertEffectiveness.matchedAlertsCount} / {alertEffectiveness.issuedAlertsCount}{" "}
                      {locale === "hi" ? "पुष्ट चेतावनी क्षेत्र" : "confirmed alert zones"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, alertEffectiveness.percentageMatch)}%` }}
                    />
                  </div>
                </div>

                {/* Required Evaluation Note */}
                <div className="p-2.5 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                    {locale === "hi"
                      ? "यह प्रभावशीलता मूल्यांकन के लिए है"
                      : "This is for effectiveness evaluation"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 5: Resource Utilization Breakdown by Type */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#0F3D66] dark:text-sky-400" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "संसाधन उपयोग (प्रकार अनुसार)"
                        : "Resource Utilization"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {resourceUtilizationByType.length} {locale === "hi" ? "श्रेणियां" : "categories"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "प्रकारवार कुल इन्वेंटरी, तैनात इकाइयां और उपयोग प्रतिशत।"
                    : "Category-wise total stock, field deployment count, and active utilization rate."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {resourceUtilizationByType.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई संसाधन उपलब्ध नहीं" : "No Resources Registered"}
                    description={
                      locale === "hi"
                        ? "संसाधन तालिका वर्तमान में रिक्त है।"
                        : "No inventory rows are currently recorded in the resources registry."
                    }
                  />
                ) : (
                  <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                    {resourceUtilizationByType.map((res, index) => {
                      const pct = res.utilizationPercent;
                      const barColor =
                        pct <= 50
                          ? "bg-emerald-500"
                          : pct <= 80
                          ? "bg-amber-500"
                          : pct <= 95
                          ? "bg-orange-500"
                          : "bg-red-600";

                      return (
                        <div key={`res-type-${index}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {res.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">
                                {res.deployed} / {res.total} {locale === "hi" ? "तैनात" : "deployed"}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`${barColor} h-full rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 6: Field Report Hotspots Table & Open-Meteo Precipitation Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 6: Field Report Hotspots Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "क्षेत्र रिपोर्ट हॉटस्पॉट (सर्वाधिक रिपोर्ट किए गए क्षेत्र)"
                        : "Field Report Hotspots"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {fieldReportHotspots.length} {locale === "hi" ? "स्थान" : "locations"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "जमीनी इकाइयों द्वारा सबसे अधिक रिपोर्ट किए गए क्षेत्र एवं मुख्य रिपोर्ट प्रकार।"
                    : "Clusters of high-frequency field observations with prevailing hazard type."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {fieldReportHotspots.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई मैदानी हॉटस्पॉट नहीं" : "No Field Hotspots"}
                    description={
                      locale === "hi"
                        ? "चयनित समयावधि में कोई मैदानी रिपोर्ट उपलब्ध नहीं है।"
                        : "No field reports recorded in the database to aggregate geographic clusters."
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <th className="pb-2 font-semibold">
                            {locale === "hi" ? "स्थान / क्षेत्र" : "Location / Area"}
                          </th>
                          <th className="pb-2 font-semibold text-center">
                            {locale === "hi" ? "रिपोर्ट संख्या" : "Reports"}
                          </th>
                          <th className="pb-2 font-semibold">
                            {locale === "hi" ? "मुख्य प्रकार" : "Common Type"}
                          </th>
                          <th className="pb-2 font-semibold text-right">
                            {locale === "hi" ? "सत्यापित" : "Verified"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {fieldReportHotspots.map((item, idx) => (
                          <tr key={`hotspot-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                              {item.locationName}
                            </td>
                            <td className="py-2.5 text-center font-bold font-mono text-[#0F3D66] dark:text-sky-400">
                              {item.reportCount}
                            </td>
                            <td className="py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {item.mostCommonType}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {item.verifiedCount} / {item.reportCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preserved Weather Telemetry & Trend (Open-Meteo) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-[#2563EB]" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "वर्षा टेलीमेट्री एवं पूर्वानुमान (मिमी/घंटा)"
                        : "Precipitation Telemetry & Forecast"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    Open-Meteo
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "जिला नियंत्रण केंद्र हेतु प्रमाणित ओपन-मेटियो घंटेवार वर्षा तीव्रता।"
                    : "Temporal rainfall intensity for District Operations Area (Open-Meteo Hourly Feed)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {rainfallTrendData.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई मौसम रिकॉर्ड उपलब्ध नहीं" : "No Weather Records Available"}
                    description={
                      locale === "hi"
                        ? "स्थान हेतु टेलीमेट्री फीड ने वर्षा समय-श्रृंखला डेटा वापस नहीं किया है।"
                        : "Telemetry feed has not returned precipitation time-series."
                    }
                  />
                ) : (
                  <div className="w-full h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={rainfallTrendData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          unit="mm"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "8px",
                            border: "none",
                            color: "#F8FAFC",
                            fontSize: "12px",
                          }}
                          formatter={(val: unknown) => [
                            `${Number(val).toFixed(1)} mm`,
                            locale === "hi" ? "वर्षा" : "Precipitation",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="precipitationMm"
                          stroke="#2563EB"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#rainGradient)"
                          name={locale === "hi" ? "वर्षा (मिमी)" : "Precipitation (mm)"}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Preserved Operational Feeds: Alerts Severity, Status Pipeline & Teams Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart: Alerts by Severity */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? `गंभीरता अनुसार चेतावनियाँ`
                        : `Alerts by Severity`}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredAlerts.length} {locale === "hi" ? "कुल" : "total"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "गंभीरता स्तरों में जारी आधिकारिक चेतावनी बुलेटिन।"
                    : "Distribution of official warning bulletins by severity."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {alertsBySeverityData.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई चेतावनी नहीं" : "No Alerts Found"}
                    description={
                      locale === "hi"
                        ? "चयनित समयावधि में कोई चेतावनी दर्ज नहीं है।"
                        : "No warning alerts recorded in the database for this date range."
                    }
                  />
                ) : (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={alertsBySeverityData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                          dataKey="severity"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "8px",
                            border: "none",
                            color: "#F8FAFC",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {alertsBySeverityData.map((entry, index) => (
                            <Cell key={`cell-alert-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Incidents by Status */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0F3D66] dark:text-sky-400" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? `स्थिति अनुसार घटनाएँ (${dateRange})`
                        : `Incidents by Status (${dateRange})`}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredIncidents.length} {locale === "hi" ? "अभिलेख" : "records"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "खुली से समाधान व बंद तक समाधान पाइपलाइन की स्थिति।"
                    : "Resolution pipeline from OPEN to RESOLVED and CLOSED."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {incidentsByStatusData.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "चयनित अवधि में कोई घटना नहीं" : "No Incidents in Period"}
                    description={
                      locale === "hi"
                        ? "सक्रिय फ़िल्टर अवधि में कोई घटना दर्ज नहीं की गई है।"
                        : "There are zero incidents recorded in the active filter range."
                    }
                  />
                ) : (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={incidentsByStatusData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                          dataKey="status"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "8px",
                            border: "none",
                            color: "#F8FAFC",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {incidentsByStatusData.map((entry, index) => (
                            <Cell key={`incident-status-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Response Teams Distribution */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {locale === "hi"
                        ? "प्रतिक्रिया दल स्थिति वितरण"
                        : "Response Team Status Distribution"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {rawResponseTeams.length} {locale === "hi" ? "पंजीकृत" : "registered"}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "एनडीआरएफ, एसडीआरएफ, अग्निशमन व त्वरित प्रतिक्रिया दलों की तत्परता स्थिति।"
                    : "Readiness and deployment states of NDRF, SDRF, and Quick Response teams."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                {responseTeamsData.length === 0 ? (
                  <EmptyChartPlaceholder
                    title={locale === "hi" ? "कोई प्रतिक्रिया दल पंजीकृत नहीं" : "No Response Teams Registered"}
                    description={
                      locale === "hi"
                        ? "प्रतिक्रिया निर्देशिका में कोई सक्रिय दल उपलब्ध नहीं है।"
                        : "No tactical teams are present in the response directory."
                    }
                  />
                ) : (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={responseTeamsData}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={42}
                          paddingAngle={3}
                        >
                          {responseTeamsData.map((entry, index) => (
                            <Cell key={`team-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "8px",
                            border: "none",
                            color: "#F8FAFC",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Provenance & NDMA Methodology Footer Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {locale === "hi" ? "डेटा सत्यता एवं NDMA अनुपालन नीति" : "Data Integrity & NDMA Compliance Policy"}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {locale === "hi"
                        ? "सभी परिचालन टेलीमेट्री वास्तविक डेटाबेस तालिकाओं (घटनाएं, चेतावनियां, संसाधन, प्रतिक्रिया दल, मैदानी अवलोकन) और प्रमाणित ओपन-मेटियो वर्षा फीड से प्राप्त होती है। शून्य निर्मित नमूना डेटा प्रस्तुत किया जाता है।"
                        : "All operational analytics reflect synchronized database partitions (Incidents, Alerts, Resources, Teams, Field Reports) and authenticated Open-Meteo telemetry. Empty states strictly indicate zero records in the current partition."}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block">
                    {locale === "hi" ? "गणना समय-मुहर" : "Calculation Timestamp"}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {new Date(lastCalculatedAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StateContainer>
    </div>
  );
}

function EmptyChartPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
      <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">{description}</p>
    </div>
  );
}
