"use strict";

import {
  SituationIntelligenceReport,
  SituationStatement,
  OperationalConsideration,
  EvidenceRecord,
  SituationQueryOptions,
} from "@/types/situation-intelligence";
import { SeverityLevel, DataSourceMeta } from "@/types";
import { fetchWeatherForecast } from "@/lib/services/weather";
import { fetchAntecedentPrecipitation } from "@/lib/services/historical-weather";
import { calculateFloodRisk } from "@/lib/services/flood-risk-engine";
import { getCanonicalTelemetrySnapshot } from "@/lib/services/canonical-telemetry";
import { getAlerts } from "@/lib/services/alerts";
import { getIncidents } from "@/lib/services/incidents";
import { getResponseTeams } from "@/lib/services/response-teams";
import { getResources, getShelters } from "@/lib/services/resources";
import { getFieldReports } from "@/lib/services/field-reports";
import { getDistrictInfrastructure } from "@/lib/services/infrastructure";
import { computeSpatialImpactAnalysis } from "@/lib/services/spatial-impact";

const SITUATION_DATA_SOURCE_META: DataSourceMeta = {
  provider: "VarshaNetra Deterministic Situation Synthesis Engine",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Algorithmic decision-support synthesis of live meteorological telemetry, PostgREST database logs, and OpenStreetMap spatial data. Zero generative LLM hallucination; 100% deterministic rule-based provenance. Directive #18: Advisory only; never replaces official statutory executive orders.",
};

/**
 * Deterministically generates an auditable, strictly factual Situation Intelligence Report
 * from real application database and telemetry state without calling any external LLM API.
 */
export async function generateSituationIntelligence(
  options: SituationQueryOptions
): Promise<SituationIntelligenceReport> {
  const { latitude, longitude } = options;
  const locationName = options.locationName?.trim() || "Selected District Location";
  const nowIso = new Date().toISOString();

  const dataSourcesQueried: SituationIntelligenceReport["dataSourcesQueried"] = [];

  // Concurrent collection of real application data
  const [
    weatherRes,
    antecedentRes,
    alertsRes,
    incidentsRes,
    teamsRes,
    resourcesRes,
    sheltersRes,
    fieldReportsRes,
    infraRes,
    canonicalSnapshotRes,
  ] = await Promise.allSettled([
    fetchWeatherForecast({ latitude, longitude, days: 2, districtName: locationName }),
    fetchAntecedentPrecipitation({ latitude, longitude, days: 3, districtName: locationName }),
    getAlerts({ status: "ISSUED" }),
    getIncidents(),
    getResponseTeams(),
    getResources(),
    getShelters(),
    getFieldReports(),
    getDistrictInfrastructure({ latitude, longitude, radiusMeters: 8000 }),
    getCanonicalTelemetrySnapshot({ latitude, longitude }),
  ]);

  // 1. Weather / Rainfall Telemetry
  let forecastRain6hMm = 0;
  let forecastRain24hMm = 0;
  let maxHourlyRainMmH = 0;
  let peakRainTime: string | null = null;
  const weatherEvidence: EvidenceRecord[] = [];

  if (weatherRes.status === "fulfilled" && weatherRes.value?.success && weatherRes.value?.data) {
    const data = weatherRes.value.data;
    forecastRain6hMm = Number(data.accumulations?.next6h ?? 0);
    forecastRain24hMm = Number(data.accumulations?.next24h ?? 0);

    const next6Hourly = data.hourly?.slice(0, 6) || [];
    for (const h of next6Hourly) {
      if ((h.precipitation || 0) > maxHourlyRainMmH) {
        maxHourlyRainMmH = h.precipitation || 0;
        peakRainTime = h.time;
      }
    }

    dataSourcesQueried.push({
      source: "Open-Meteo Hourly Forecast Telemetry",
      status: "LIVE",
      recordCount: data.hourly?.length || 0,
    });

    weatherEvidence.push({
      label: "Forecast Precipitation (6 Hours)",
      sourceTableOrProvider: "Open-Meteo Global Telemetry",
      value: `${forecastRain6hMm} mm`,
      deepLink: "/weather",
      details: `Cumulative 6h rainfall at lat ${latitude.toFixed(2)}°, lon ${longitude.toFixed(2)}°`,
    });
    weatherEvidence.push({
      label: "Forecast Precipitation (24 Hours)",
      sourceTableOrProvider: "Open-Meteo Global Telemetry",
      value: `${forecastRain24hMm} mm`,
      deepLink: "/weather",
    });
    if (maxHourlyRainMmH > 0) {
      weatherEvidence.push({
        label: "Peak Hourly Rain Intensity",
        sourceTableOrProvider: "Open-Meteo Global Telemetry",
        value: `${maxHourlyRainMmH.toFixed(1)} mm/h`,
        details: peakRainTime ? `Expected around ${peakRainTime}` : undefined,
      });
    }
  } else {
    dataSourcesQueried.push({
      source: "Open-Meteo Hourly Forecast Telemetry",
      status: "ERROR",
      recordCount: 0,
    });
  }

  // 2. Antecedent Rainfall & Flood Risk Index
  // Primary: Use the canonical telemetry snapshot so riskLevel is identical to the dashboard.
  // Fallback: Independent calculation if canonical snapshot is unavailable.
  let antecedent24h = 0;
  let antecedent48h = 0;
  if (antecedentRes.status === "fulfilled" && antecedentRes.value?.success && antecedentRes.value?.data) {
    antecedent24h = antecedentRes.value.data.precip24h || 0;
    antecedent48h = antecedentRes.value.data.precip48h || 0;
    dataSourcesQueried.push({
      source: "Open-Meteo Historical Archive (Antecedent)",
      status: "LIVE",
      recordCount: antecedentRes.value.data.hourlyHistory?.length || 0,
    });
  }

  let canonicalSnapshotId: string | undefined;
  let canonicalAssessment: import("@/types").CanonicalAssessment | undefined;
  let officialAlerts: import("@/lib/services/canonical-telemetry").NormalizedOfficialAlerts | undefined;

  let floodRiskCalc: ReturnType<typeof calculateFloodRisk>;
  if (canonicalSnapshotRes.status === "fulfilled" && canonicalSnapshotRes.value?.success) {
    const snap = canonicalSnapshotRes.value.data;
    canonicalSnapshotId = snap.snapshotId;
    canonicalAssessment = snap.canonicalAssessment;
    officialAlerts = snap.officialAlerts;
    // Reconstruct a FloodRiskCalculationResult shape from the canonical assessment
    floodRiskCalc = {
      riskScore: snap.canonicalAssessment.riskScore,
      riskLevel: snap.canonicalAssessment.riskCategory,
      dataCompleteness: snap.canonicalAssessment.dataCompleteness,
      validUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      calculatedAt: snap.canonicalAssessment.calculatedAt,
      contributingFactors: snap.derivedRisk.contributingFactors.map((f) => ({
        key: f.key as import("@/types").FloodRiskFactorKey,
        label: f.label,
        rawValue: f.rawValue,
        unit: f.unit,
        normalizedScore: f.normalizedScore,
        weight: 0.2,
        weightedContribution: f.weightedContribution,
        available: true,
        rationale: f.rationale,
      })),
      summaryReasons: [snap.canonicalAssessment.plainLanguageExplanationEn],
      technicalExplanation: snap.canonicalAssessment.plainLanguageExplanationEn,
      isExperimental: true as const,
      disclaimer: "Non-statutory algorithmic inundation intelligence. V1.2-CANONICAL.",
    };
    dataSourcesQueried.push({
      source: "VarshaNetra Canonical Telemetry Snapshot (V1.2)",
      status: "LIVE",
      recordCount: snap.canonicalAssessment.keyDrivers.length,
    });
  } else {
    // Fallback: independent calculation (no hardcoded terrain values)
    floodRiskCalc = calculateFloodRisk({
      forecastRain24h: forecastRain24hMm,
      antecedent24h,
      antecedent48h,
    });
  }

  const floodRiskEvidence: EvidenceRecord[] = [
    {
      label: "Multi-Factor Flood Risk Score",
      sourceTableOrProvider: "VarshaNetra Hydrological Algorithm",
      value: `${floodRiskCalc.riskScore.toFixed(1)} / 100 (${floodRiskCalc.riskLevel})`,
      deepLink: "/flood",
      details: floodRiskCalc.technicalExplanation,
    },
    {
      label: "Antecedent 24h Soil Saturation",
      sourceTableOrProvider: "Open-Meteo Archive Telemetry",
      value: `${antecedent24h} mm`,
      deepLink: "/weather",
    },
  ];

  // 3. Statutory Alerts
  let issuedAlertsCount = 0;
  const issuedAlertsList: Array<{ id: string; title: string; severity: SeverityLevel }> = [];
  const alertsEvidence: EvidenceRecord[] = [];

  if (alertsRes.status === "fulfilled" && alertsRes.value?.alerts) {
    const list = alertsRes.value.alerts.filter((a) => a.status === "ISSUED");
    issuedAlertsCount = list.length;
    dataSourcesQueried.push({
      source: "Supabase Statutory Alerts Table",
      status: "LIVE",
      recordCount: list.length,
    });

    for (const a of list) {
      issuedAlertsList.push({ id: a.id, title: a.title, severity: a.severity });
      alertsEvidence.push({
        label: `Issued Alert: ${a.title}`,
        sourceTableOrProvider: "public.alerts (Postgres)",
        value: a.severity,
        deepLink: `/alerts`,
        recordId: a.id,
        details: `Target: ${a.area_name} • Action: ${a.recommended_action}`,
      });
    }
  }

  // 4. Incidents
  let activeIncidentsCount = 0;
  let criticalIncidentsCount = 0;
  let unassignedIncidentsCount = 0;
  const incidentTypeMap: Record<string, number> = {};
  const incidentsEvidence: EvidenceRecord[] = [];

  if (incidentsRes.status === "fulfilled" && incidentsRes.value?.incidents) {
    const activeList = incidentsRes.value.incidents.filter(
      (i) => i.status === "OPEN" || i.status === "ACKNOWLEDGED" || i.status === "RESPONDING"
    );
    activeIncidentsCount = activeList.length;
    dataSourcesQueried.push({
      source: "Supabase Incidents Table",
      status: "LIVE",
      recordCount: incidentsRes.value.incidents.length,
    });

    for (const inc of activeList) {
      if (inc.severity === "CRITICAL" || inc.severity === "ALERT") {
        criticalIncidentsCount++;
      }
      if (!inc.assigned_to) {
        unassignedIncidentsCount++;
      }
      incidentTypeMap[inc.type] = (incidentTypeMap[inc.type] || 0) + 1;

      incidentsEvidence.push({
        label: `[${inc.incident_number}] ${inc.title}`,
        sourceTableOrProvider: "public.incidents (Postgres)",
        value: `${inc.status} (${inc.severity})`,
        deepLink: `/incidents?id=${inc.id}`,
        recordId: inc.id,
        details: `Location: ${inc.location_name} • Type: ${inc.type} • Assigned: ${inc.assigned_to || "None"}`,
      });
    }
  }

  // 5. Response Teams
  let availableTeamsCount = 0;
  let totalTeamsCount = 0;
  const teamsEvidence: EvidenceRecord[] = [];

  if (teamsRes.status === "fulfilled" && teamsRes.value?.teams) {
    totalTeamsCount = teamsRes.value.teams.length;
    availableTeamsCount = teamsRes.value.teams.filter((t) => t.status === "AVAILABLE").length;
    dataSourcesQueried.push({
      source: "Supabase Response Teams Table",
      status: "LIVE",
      recordCount: totalTeamsCount,
    });

    teamsEvidence.push({
      label: "Available Response Teams",
      sourceTableOrProvider: "public.response_teams (Postgres)",
      value: `${availableTeamsCount} of ${totalTeamsCount} teams ready`,
      deepLink: "/response",
      details: "SDRF, NDRF, Fire Brigade, and Municipal Quick Response squads.",
    });
  }

  // 6. Resources & Shelters
  let totalShelterCapacity = 0;
  let currentShelterOccupancy = 0;
  let activeSheltersCount = 0;
  let availableBoatsCount = 0;
  let availablePumpsCount = 0;
  const shelterEvidence: EvidenceRecord[] = [];

  if (resourcesRes.status === "fulfilled" && Array.isArray(resourcesRes.value)) {
    dataSourcesQueried.push({
      source: "Supabase Resources Inventory Table",
      status: "LIVE",
      recordCount: resourcesRes.value.length,
    });

    for (const r of resourcesRes.value) {
      if (r.type === "Boat") availableBoatsCount += r.available_quantity;
      if (r.name.toLowerCase().includes("pump") || r.type === "Generator") {
        availablePumpsCount += r.available_quantity;
      }
    }

    if (availableBoatsCount > 0 || availablePumpsCount > 0) {
      shelterEvidence.push({
        label: "Tactical Equipment Inventory",
        sourceTableOrProvider: "public.resources (Postgres)",
        value: `${availableBoatsCount} rescue boats & ${availablePumpsCount} power/drainage units ready`,
        deepLink: "/resources",
      });
    }
  }

  if (sheltersRes.status === "fulfilled" && Array.isArray(sheltersRes.value)) {
    const activeShelters = sheltersRes.value.filter((s) => s.status === "ACTIVE");
    activeSheltersCount = activeShelters.length;
    for (const s of activeShelters) {
      totalShelterCapacity += s.capacity;
      currentShelterOccupancy += s.current_occupancy;
    }
    dataSourcesQueried.push({
      source: "Supabase Shelters Table",
      status: "LIVE",
      recordCount: sheltersRes.value.length,
    });

    const remCapacity = Math.max(0, totalShelterCapacity - currentShelterOccupancy);
    shelterEvidence.push({
      label: "Relief Shelters Occupancy",
      sourceTableOrProvider: "public.shelters (Postgres)",
      value: `${currentShelterOccupancy} / ${totalShelterCapacity} beds occupied (${remCapacity} available)`,
      deepLink: "/resources",
      details: `Across ${activeSheltersCount} active shelters.`,
    });
  }

  const shelterOccupancyPercent =
    totalShelterCapacity > 0
      ? Math.round((currentShelterOccupancy / totalShelterCapacity) * 100)
      : 0;

  // 7. Verified Field Reports
  let verifiedReportsCount = 0;
  let maxObservedWaterDepthCm = 0;
  let maxWaterDepthLocation = "";
  const fieldReportsEvidence: EvidenceRecord[] = [];

  if (fieldReportsRes.status === "fulfilled" && Array.isArray(fieldReportsRes.value)) {
    const verified = fieldReportsRes.value.filter((r) => r.verification_status === "VERIFIED");
    verifiedReportsCount = verified.length;
    dataSourcesQueried.push({
      source: "Supabase Field Reports Table",
      status: "LIVE",
      recordCount: fieldReportsRes.value.length,
    });

    for (const r of verified) {
      if (
        typeof r.observed_water_depth_cm === "number" &&
        r.observed_water_depth_cm > maxObservedWaterDepthCm
      ) {
        maxObservedWaterDepthCm = r.observed_water_depth_cm;
        maxWaterDepthLocation = r.location_name;
      }

      fieldReportsEvidence.push({
        label: `Verified Field Report ${r.report_number}`,
        sourceTableOrProvider: "public.field_reports (Postgres)",
        value: `${r.severity} - ${r.report_type}`,
        deepLink: "/field-reports",
        recordId: r.id,
        details: `Location: ${r.location_name} • Depth: ${r.observed_water_depth_cm || 0}cm • Observer: ${r.observer_name}`,
      });
    }
  }

  // 8. Exposed Mapped Infrastructure
  let exposedInfrastructureCount = 0;
  let exposedHealthCount = 0;
  let exposedEmergencyCount = 0;
  let exposedSchoolCount = 0;
  const infrastructureEvidence: EvidenceRecord[] = [];

  if (infraRes.status === "fulfilled" && infraRes.value?.data) {
    const facilities = infraRes.value.data;
    const impactResult = computeSpatialImpactAnalysis(null, facilities, locationName);

    exposedInfrastructureCount = impactResult.summary.totalHighOrSevereExposed;
    exposedHealthCount = impactResult.summary.byDepartment.health.highRiskCount;
    exposedEmergencyCount = impactResult.summary.byDepartment.emergency.highRiskCount;
    exposedSchoolCount = impactResult.summary.byDepartment.education.highRiskCount;

    dataSourcesQueried.push({
      source: "OpenStreetMap Overpass Infrastructure Query",
      status: "LIVE",
      recordCount: impactResult.summary.totalMappedFacilities,
    });

    infrastructureEvidence.push({
      label: "Mapped Facilities in High-Risk Sectors",
      sourceTableOrProvider: "OpenStreetMap Overpass API",
      value: `${exposedInfrastructureCount} mapped facilities`,
      deepLink: "/impact",
      details: `Health: ${exposedHealthCount}, Emergency: ${exposedEmergencyCount}, Education: ${exposedSchoolCount}. Note: Mapped features from OSM; absence does not prove absence.`,
    });
  }

  // -------------------------------------------------------------
  // DETERMINISTIC STATEMENT GENERATION & PROVENANCE
  // -------------------------------------------------------------
  const statements: SituationStatement[] = [];

  // Statement 1: Rainfall Forecast
  let rainSentence = "";
  let rainSentenceHi = "";
  let rainSeverity: SeverityLevel = "NORMAL";

  if (forecastRain6hMm >= 64.5) {
    rainSentence = `Heavy rainfall (${forecastRain6hMm} mm) is forecast during the next 6 hours for ${locationName}${
      maxHourlyRainMmH > 0 ? `, with peak intensity reaching ${maxHourlyRainMmH.toFixed(1)} mm/h` : ""
    }.`;
    rainSentenceHi = `${locationName} के लिए अगले 6 घंटों के दौरान भारी वर्षा (${forecastRain6hMm} मिमी) का पूर्वानुमान है${
      maxHourlyRainMmH > 0 ? `, जिसमें अधिकतम तीव्रता ${maxHourlyRainMmH.toFixed(1)} मिमी/घंटा तक पहुँचने का अनुमान है` : ""
    }।`;
    rainSeverity = "CRITICAL";
  } else if (forecastRain6hMm >= 35.5) {
    rainSentence = `Moderate-to-heavy rainfall (${forecastRain6hMm} mm) is forecast during the next 6 hours for ${locationName}.`;
    rainSentenceHi = `${locationName} के लिए अगले 6 घंटों के दौरान मध्यम से भारी वर्षा (${forecastRain6hMm} मिमी) का पूर्वानुमान है।`;
    rainSeverity = "ALERT";
  } else if (forecastRain6hMm >= 10.0) {
    rainSentence = `Light-to-moderate showers (${forecastRain6hMm} mm) are forecast during the next 6 hours for ${locationName}.`;
    rainSentenceHi = `${locationName} के लिए अगले 6 घंटों के दौरान हल्की से मध्यम वर्षा (${forecastRain6hMm} मिमी) का पूर्वानुमान है।`;
    rainSeverity = "ADVISORY";
  } else if (forecastRain24hMm >= 15.0) {
    rainSentence = `Scattered precipitation (${forecastRain24hMm} mm in 24 hours) is forecast for ${locationName}; no intense rainfall band in the next 6 hours.`;
    rainSentenceHi = `${locationName} के लिए 24 घंटों में छिटपुट वर्षा (${forecastRain24hMm} मिमी) का पूर्वानुमान है; अगले 6 घंटों में कोई तीव्र वर्षा नहीं है।`;
    rainSeverity = "NORMAL";
  } else {
    rainSentence = `No significant rainfall (${forecastRain6hMm} mm in 6 hours) is forecast for ${locationName}.`;
    rainSentenceHi = `${locationName} के लिए कोई उल्लेखनीय वर्षा नहीं (${forecastRain6hMm} मिमी/6 घंटे) का पूर्वानुमान है।`;
    rainSeverity = "NORMAL";
  }

  statements.push({
    id: "stmt-rain",
    topic: "RAINFALL",
    text: rainSentence,
    textHi: rainSentenceHi,
    severity: rainSeverity,
    traceableMetrics: {
      forecastRain6hMm,
      forecastRain24hMm,
      maxHourlyRainMmH,
    },
    evidence: weatherEvidence,
  });

  // Statement 2: Flood Risk Engine Assessment
  let riskSeverity: SeverityLevel = "NORMAL";
  let riskSeverityHi = "सामान्य";
  if (floodRiskCalc.riskLevel === "SEVERE") {
    riskSeverity = "CRITICAL";
    riskSeverityHi = "अति गंभीर";
  } else if (floodRiskCalc.riskLevel === "HIGH") {
    riskSeverity = "ALERT";
    riskSeverityHi = "उच्च";
  } else if (floodRiskCalc.riskLevel === "MODERATE") {
    riskSeverity = "ADVISORY";
    riskSeverityHi = "मध्यम";
  }

  const rawKeyDriver = floodRiskCalc.summaryReasons[0] || "normal hydro-meteorological indicators";
  const keyDriver = rawKeyDriver.replace(/\.+$/, "");
  const riskSentence = `The experimental flood risk index evaluates a ${floodRiskCalc.riskLevel} watch level (score ${floodRiskCalc.riskScore.toFixed(1)}/100), influenced by ${keyDriver.toLowerCase()}.`;
  const riskSentenceHi = `प्रायोगिक बाढ़ जोखिम सूचकांक ${floodRiskCalc.riskScore.toFixed(1)}/100 स्कोर के साथ ${riskSeverityHi} निगरानी स्तर का मूल्यांकन करता है।`;

  statements.push({
    id: "stmt-risk",
    topic: "FLOOD_RISK",
    text: riskSentence,
    textHi: riskSentenceHi,
    severity: riskSeverity,
    traceableMetrics: {
      floodRiskScore: floodRiskCalc.riskScore,
      floodRiskLevel: floodRiskCalc.riskLevel,
    },
    evidence: floodRiskEvidence,
  });

  // Statement 3: Operational Load (Incidents & Alerts)
  let loadSeverity: SeverityLevel = "NORMAL";
  let incidentAlertSentence = "";
  let incidentAlertSentenceHi = "";

  const incCountStr =
    activeIncidentsCount === 0
      ? "Zero active incidents"
      : activeIncidentsCount === 1
      ? "One active incident"
      : `${activeIncidentsCount} active incidents`;

  const alertCountStr =
    issuedAlertsCount === 0
      ? "zero issued statutory alerts"
      : issuedAlertsCount === 1
      ? "one issued statutory alert"
      : `${issuedAlertsCount} issued statutory alerts`;

  if (activeIncidentsCount > 0 || issuedAlertsCount > 0) {
    incidentAlertSentence = `${incCountStr} and ${alertCountStr} are currently recorded in the district.`;
    incidentAlertSentenceHi = `जिले में वर्तमान में ${activeIncidentsCount} सक्रिय घटनाएँ और ${issuedAlertsCount} जारी वैधानिक चेतावनी दर्ज हैं।`;
    const hasCritical = criticalIncidentsCount > 0 || issuedAlertsList.some((a) => a.severity === "CRITICAL");
    loadSeverity = hasCritical ? "CRITICAL" : issuedAlertsCount > 0 ? "ALERT" : "ADVISORY";
  } else {
    incidentAlertSentence = "Zero active emergency incidents and zero statutory alerts are currently recorded.";
    incidentAlertSentenceHi = "वर्तमान में कोई सक्रिय आपातकालीन घटना या वैधानिक अलर्ट दर्ज नहीं है।";
    loadSeverity = "NORMAL";
  }

  statements.push({
    id: "stmt-incidents-alerts",
    topic: "INCIDENTS",
    text: incidentAlertSentence,
    textHi: incidentAlertSentenceHi,
    severity: loadSeverity,
    traceableMetrics: {
      activeIncidentsCount,
      criticalIncidentsCount,
      unassignedIncidentsCount,
      issuedAlertsCount,
    },
    evidence: [...incidentsEvidence, ...alertsEvidence],
  });

  // Statement 4: Exposed Mapped Infrastructure
  let infraSentence = "";
  let infraSentenceHi = "";
  let infraSeverity: SeverityLevel = "NORMAL";

  if (exposedInfrastructureCount > 0) {
    const parts: string[] = [];
    if (exposedHealthCount > 0) parts.push(`${exposedHealthCount} health ${exposedHealthCount === 1 ? "facility" : "facilities"}`);
    if (exposedEmergencyCount > 0) parts.push(`${exposedEmergencyCount} emergency ${exposedEmergencyCount === 1 ? "station" : "stations"}`);
    if (exposedSchoolCount > 0) parts.push(`${exposedSchoolCount} ${exposedSchoolCount === 1 ? "school" : "schools"}`);

    const breakdownText = parts.length > 0 ? ` (including ${parts.join(", ")})` : "";
    infraSentence = `${exposedInfrastructureCount} mapped ${exposedInfrastructureCount === 1 ? "facility overlaps" : "facilities overlap"} the current high-risk analysis area${breakdownText}.`;
    infraSentenceHi = `${exposedInfrastructureCount} मैप की गई सुविधाएँ वर्तमान उच्च-जोखिम विश्लेषण क्षेत्र में आती हैं।`;
    infraSeverity = exposedHealthCount > 0 ? "ALERT" : "ADVISORY";
  } else {
    infraSentence = "Zero mapped healthcare or emergency facilities directly overlap designated high-risk analysis zones.";
    infraSentenceHi = "निर्दिष्ट उच्च-जोखिम विश्लेषण क्षेत्रों में कोई मैप की गई स्वास्थ्य या आपातकालीन सुविधा प्रभावित नहीं है।";
    infraSeverity = "NORMAL";
  }

  statements.push({
    id: "stmt-infrastructure",
    topic: "INFRASTRUCTURE",
    text: infraSentence,
    textHi: infraSentenceHi,
    severity: infraSeverity,
    traceableMetrics: {
      exposedInfrastructureCount,
      exposedHealthCount,
      exposedEmergencyCount,
      exposedSchoolCount,
    },
    evidence: infrastructureEvidence,
  });

  // Statement 5: Resources & Ground Truth
  let resSentence = "";
  let resSentenceHi = "";
  if (verifiedReportsCount > 0) {
    resSentence = `${availableTeamsCount} response ${availableTeamsCount === 1 ? "team is" : "teams are"} ready, with ${verifiedReportsCount} verified ground-truth field ${verifiedReportsCount === 1 ? "report" : "reports"} on file${
      maxObservedWaterDepthCm > 0 ? ` (max water depth: ${maxObservedWaterDepthCm} cm at ${maxWaterDepthLocation})` : ""
    }.`;
    resSentenceHi = `${availableTeamsCount} प्रतिक्रिया दल तैयार हैं, साथ ही ${verifiedReportsCount} सत्यापित जमीनी रिपोर्ट दर्ज हैं।`;
  } else {
    resSentence = `${availableTeamsCount} response ${availableTeamsCount === 1 ? "team is" : "teams are"} available. Relief shelters report ${shelterOccupancyPercent}% occupancy.`;
    resSentenceHi = `${availableTeamsCount} प्रतिक्रिया दल उपलब्ध हैं। राहत आश्रयों में ${shelterOccupancyPercent}% अधिभोग दर्ज है।`;
  }

  statements.push({
    id: "stmt-resources-ground",
    topic: "RESOURCES",
    text: resSentence,
    textHi: resSentenceHi,
    severity: availableTeamsCount === 0 && activeIncidentsCount > 0 ? "ALERT" : "NORMAL",
    traceableMetrics: {
      availableResponseTeamsCount: availableTeamsCount,
      totalTeamsCount,
      shelterOccupancyPercent,
      verifiedReportsCount,
      maxObservedWaterDepthCm,
    },
    evidence: [...teamsEvidence, ...shelterEvidence, ...fieldReportsEvidence],
  });

  // -------------------------------------------------------------
  // OPERATIONAL CONSIDERATIONS (DECISION-SUPPORT ONLY)
  // Strict Directive: NO automatic evacuation orders.
  // -------------------------------------------------------------
  const considerations: OperationalConsideration[] = [];

  if (forecastRain6hMm >= 35.5 || floodRiskCalc.riskScore >= 50.0) {
    considerations.push({
      id: "rec-teams",
      topic: "RECOMMENDATION",
      suggestion: "Consider reviewing response-team availability and pre-alerting water-rescue boats in low-lying sectors.",
      suggestionHi: "निचले इलाकों में बचाव नौकाओं को सतर्क रखने और प्रतिक्रिया दलों की उपलब्धता की समीक्षा करें।",
      rationale: `${forecastRain6hMm} mm rain forecast in next 6 hours with ${floodRiskCalc.riskLevel} flood risk.`,
      rationaleHi: `अगले 6 घंटों में ${forecastRain6hMm} मिमी वर्षा एवं बाढ़ जोखिम का पूर्वानुमान।`,
      priority: "HIGH",
      deepLink: "/response",
    });
  }

  if (unassignedIncidentsCount > 0) {
    considerations.push({
      id: "rec-unassigned-incidents",
      topic: "INCIDENTS",
      suggestion: `Consider tasking available response units to the ${unassignedIncidentsCount} unassigned active incident ${unassignedIncidentsCount === 1 ? "log" : "logs"}.`,
      suggestionHi: `${unassignedIncidentsCount} अनिर्दिष्ट सक्रिय घटनाओं के लिए उपलब्ध प्रतिक्रिया दलों को तैनात करने पर विचार करें।`,
      rationale: "Unassigned incidents risk dispatch bottlenecks during escalating rainfall.",
      rationaleHi: "बढ़ती बारिश के दौरान अनिर्दिष्ट घटनाओं से प्रतिक्रिया में बाधा उत्पन्न हो सकती है।",
      priority: "HIGH",
      deepLink: "/incidents",
    });
  }

  if (exposedHealthCount > 0) {
    considerations.push({
      id: "rec-health-facilities",
      topic: "INFRASTRUCTURE",
      suggestion: `Consider verifying backup electrical generators and dry ingress routes for ${exposedHealthCount} mapped health facilities.`,
      suggestionHi: `${exposedHealthCount} स्वास्थ्य सुविधाओं के लिए बैकअप जनरेटर और सुरक्षित पहुंच मार्गों की पुष्टि करें।`,
      rationale: "Mapped medical centers located within high-risk flood drainage buffers.",
      rationaleHi: "उच्च-जोखिम वाले जलभराव बफर क्षेत्र में स्थित अस्पताल।",
      priority: "MEDIUM",
      deepLink: "/impact",
    });
  }

  if (shelterOccupancyPercent >= 75) {
    considerations.push({
      id: "rec-shelters",
      topic: "RESOURCES",
      suggestion: `Consider pre-activating secondary relief centers as current shelter occupancy has reached ${shelterOccupancyPercent}%.`,
      suggestionHi: `वर्तमान आश्रय अधिभोग ${shelterOccupancyPercent}% तक पहुँचने के कारण द्वितीयक राहत केंद्र सक्रिय करने पर विचार करें।`,
      rationale: "Available municipal shelter capacity is narrowing.",
      rationaleHi: "नगरपालिका आश्रय क्षमता सीमित हो रही है।",
      priority: "MEDIUM",
      deepLink: "/resources",
    });
  }

  if (considerations.length === 0) {
    considerations.push({
      id: "rec-baseline",
      topic: "RECOMMENDATION",
      suggestion: "Maintain standard automated hydro-meteorological telemetry polling and regular wireless monitoring.",
      suggestionHi: "मानक स्वचालित मौसम टेलीमेट्री और नियमित वायरलेस निगरानी जारी रखें।",
      rationale: "All current parameters remain within baseline operational margins.",
      rationaleHi: "सभी वर्तमान पैरामीटर सामान्य परिचालन सीमा के भीतर हैं।",
      priority: "LOW",
      deepLink: "/dashboard",
    });
  }

  // -------------------------------------------------------------
  // UNIFIED SUMMARY PARAGRAPH (Strictly Matching Example Style)
  // -------------------------------------------------------------
  const summaryParts: string[] = [rainSentence, incidentAlertSentence];
  const summaryPartsHi: string[] = [rainSentenceHi, incidentAlertSentenceHi];

  if (exposedInfrastructureCount > 0) {
    summaryParts.push(infraSentence);
    summaryPartsHi.push(infraSentenceHi);
  }

  // Append highest priority recommendation
  const primaryRecommendation = considerations[0].suggestion;
  const primaryRecommendationHi = considerations[0].suggestionHi || considerations[0].suggestion;
  summaryParts.push(primaryRecommendation);
  summaryPartsHi.push(primaryRecommendationHi);

  const summaryParagraph = summaryParts.join(" ");
  const summaryParagraphHi = summaryPartsHi.join(" ");

  // Overall Severity
  let overallSeverity: SeverityLevel = "NORMAL";
  if (
    rainSeverity === "CRITICAL" ||
    riskSeverity === "CRITICAL" ||
    loadSeverity === "CRITICAL" ||
    criticalIncidentsCount > 0
  ) {
    overallSeverity = "CRITICAL";
  } else if (
    rainSeverity === "ALERT" ||
    riskSeverity === "ALERT" ||
    loadSeverity === "ALERT" ||
    exposedHealthCount > 0
  ) {
    overallSeverity = "ALERT";
  } else if (
    rainSeverity === "ADVISORY" ||
    riskSeverity === "ADVISORY" ||
    loadSeverity === "ADVISORY"
  ) {
    overallSeverity = "ADVISORY";
  }

  return {
    summaryParagraph,
    summaryParagraphHi,
    overallSeverity,
    generatedAt: nowIso,
    locationName,
    canonicalSnapshotId,
    canonicalAssessment,
    officialAlerts,
    coordinates: { latitude, longitude },
    keyStatistics: {
      forecastRain6hMm,
      forecastRain24hMm,
      floodRiskScore: floodRiskCalc.riskScore,
      floodRiskLevel: floodRiskCalc.riskLevel,
      activeIncidentsCount,
      issuedAlertsCount,
      exposedInfrastructureCount,
      availableResponseTeamsCount: availableTeamsCount,
      shelterOccupancyPercent,
      verifiedFieldReportsCount: verifiedReportsCount,
    },
    statements,
    considerations,
    dataSourcesQueried,
    metadata: {
      ...SITUATION_DATA_SOURCE_META,
      lastUpdated: nowIso,
    },
  };
}
