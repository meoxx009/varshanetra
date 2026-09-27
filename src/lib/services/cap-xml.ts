/**
 * VarshaNetra ROAD-004: OASIS Common Alerting Protocol (CAP) v1.2 XML Generator
 *
 * Conforms to standard OASIS CAP-V1.2 specification:
 * http://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html
 * Designed for interoperability with National Disaster Management Authority (NDMA),
 * State Disaster Management Authority (SDMA), and public emergency broadcasting gateways.
 */

import { AlertItem } from "@/types";

export interface CapXmlOptions {
  alert: AlertItem;
  districtName?: string;
  senderId?: string;
  language?: "hi-IN" | "en-IN";
}

/**
 * Escapes XML reserved characters.
 */
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Maps VarshaNetra severity level to CAP v1.2 urgency.
 */
function mapUrgency(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
    case "SEVERE":
      return "Immediate";
    case "ALERT":
    case "HIGH":
      return "Expected";
    case "ADVISORY":
    case "MODERATE":
      return "Future";
    default:
      return "Past";
  }
}

/**
 * Maps VarshaNetra severity level to CAP v1.2 severity.
 */
function mapSeverity(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
    case "SEVERE":
      return "Extreme";
    case "ALERT":
    case "HIGH":
      return "Severe";
    case "ADVISORY":
    case "MODERATE":
      return "Moderate";
    default:
      return "Minor";
  }
}

/**
 * Generates an OASIS standard CAP v1.2 XML string from an AlertItem.
 */
export function generateCapXml(options: CapXmlOptions): string {
  const { alert, districtName = "District Emergency Operations Center", language = "hi-IN" } = options;

  const identifier = escapeXml(alert.id || `varshanetra-alert-${Date.now()}`);
  const sender = escapeXml(`${districtName.replace(/\s+/g, "_")}@varshanetra.gov.in`);
  const sent = new Date(alert.created_at || Date.now()).toISOString();
  const effective = sent;
  // Default expiry 24 hours after effective if not specified
  const expires = new Date(new Date(sent).getTime() + 24 * 3600 * 1000).toISOString();

  const urgency = mapUrgency(alert.severity);
  const severity = mapSeverity(alert.severity);
  const certainty = alert.status === "ISSUED" ? "Observed" : "Likely";

  const headline = escapeXml(alert.title);
  const event = escapeXml(alert.title);
  const description = escapeXml(alert.description);
  const instruction = escapeXml(alert.recommended_action || "Stay tuned to official DDMA bulletins.");
  const areaDesc = escapeXml(alert.area_name || districtName);

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${identifier}</identifier>
  <sender>${sender}</sender>
  <sent>${sent}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>${language}</language>
    <category>Met</category>
    <event>${event}</event>
    <urgency>${urgency}</urgency>
    <severity>${severity}</severity>
    <certainty>${certainty}</certainty>
    <effective>${effective}</effective>
    <expires>${expires}</expires>
    <senderName>${escapeXml(districtName)}</senderName>
    <headline>${headline}</headline>
    <description>${description}</description>
    <instruction>${instruction}</instruction>
    <web>https://varshanetra.gov.in/alerts/${identifier}</web>
    <contact>District EOC Control Room (112 / 1077)</contact>
    <parameter>
      <valueName>DisasterType</valueName>
      <value>Flood / Heavy Rainfall</value>
    </parameter>
    <parameter>
      <valueName>VarshaNetraSeverity</valueName>
      <value>${escapeXml(alert.severity)}</value>
    </parameter>
    <area>
      <areaDesc>${areaDesc}</areaDesc>
    </area>
  </info>
</alert>`;
}

/**
 * Triggers a direct client download of the CAP XML file.
 */
export function downloadCapXmlFile(alert: AlertItem, districtName?: string, language: "hi-IN" | "en-IN" = "hi-IN") {
  const xmlContent = generateCapXml({ alert, districtName, language });
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CAP_v1.2_Alert_${alert.id.slice(0, 8)}_${language}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const CAP_XML_NOTICE = {
  hi: "यह CAP v1.2 मानक XML प्रारूप है जो भविष्य में सरकारी चेतावनी गेटवे के साथ एकीकृत किया जा सकता है।",
  en: "This is CAP v1.2 standard XML format which can be integrated with government alert gateways in future.",
};
