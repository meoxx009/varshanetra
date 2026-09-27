import L from "leaflet";
import { FacilityCategory, SeverityLevel } from "@/types";

/**
 * Creates custom vector SVG markers using L.divIcon.
 * Eliminates missing Leaflet static image assets and provides crisp command center aesthetics.
 */
export function createDistrictCenterIcon(label = "HQ"): L.DivIcon {
  return L.divIcon({
    className: "district-center-marker",
    html: `
      <div title="${label}" style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(15, 61, 102, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="width: 30px; height: 30px; border-radius: 9999px; background-color: #0F3D66; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">
          ★
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function createInspectorMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "inspector-pin-marker",
    html: `
      <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #0F172A; border: 2.5px solid #38BDF8; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #38BDF8; font-size: 13px;">
        ⌖
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function createCategoryIcon(
  category: FacilityCategory,
  severity?: SeverityLevel
): L.DivIcon {
  let bgColor = "#0F3D66";
  let symbol = "•";

  switch (category) {
    case "HOSPITAL":
      bgColor = "#15803D"; // Emerald
      symbol = "+";
      break;
    case "CLINIC":
      bgColor = "#0D9488"; // Teal
      symbol = "✚";
      break;
    case "POLICE":
      bgColor = "#2563EB"; // Tactical Blue
      symbol = "🛡";
      break;
    case "FIRE_STATION":
      bgColor = "#DC2626"; // Crimson
      symbol = "🔥";
      break;
    case "SCHOOL":
      bgColor = "#4F46E5"; // Indigo
      symbol = "🏫";
      break;
    case "RIVER":
      bgColor = "#0284C7"; // Cyan
      symbol = "〰";
      break;
    case "FIELD_REPORT":
      bgColor = "#D97706"; // Amber
      symbol = "📝";
      break;
    case "INCIDENT":
      if (severity === "CRITICAL") bgColor = "#DC2626";
      else if (severity === "ALERT") bgColor = "#EA580C";
      else bgColor = "#D97706";
      symbol = "⚠️";
      break;
    case "RESPONSE_TEAM":
      bgColor = "#0F3D66"; // Tactical Command Navy
      symbol = "🚨";
      break;
    case "SHELTER":
      bgColor = "#059669"; // Emerald Relief Tent/Shelter
      symbol = "⛺";
      break;
    case "RIVER_GAUGE":
      // Severity-sensitive: red=critical, orange=danger, yellow=warning, blue=normal
      if (severity === "CRITICAL") bgColor = "#DC2626";
      else if (severity === "ALERT") bgColor = "#EA580C";
      else if (severity === "ADVISORY") bgColor = "#D97706";
      else bgColor = "#0284C7"; // Normal = Water Blue
      symbol = "〜";
      break;
  }

  return L.divIcon({
    className: `facility-pin-${category.toLowerCase()}`,
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 9999px;
        background-color: ${bgColor};
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-size: 12px;
        font-weight: bold;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });
}

/**
 * Creates crosshair targeting marker icon for radar intensity observation over district center.
 */
export function createRadarCrosshairIcon(): L.DivIcon {
  return L.divIcon({
    className: "radar-crosshair-marker",
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; border: 2px dashed #EF4444; background-color: rgba(239, 68, 68, 0.2); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: absolute; width: 30px; height: 30px; border-radius: 9999px; border: 2px solid #DC2626; box-shadow: 0 0 10px rgba(220, 38, 38, 0.7); display: flex; align-items: center; justify-content: center; background-color: rgba(15, 23, 42, 0.5);">
          <div style="position: absolute; width: 30px; height: 1.5px; background-color: #EF4444;"></div>
          <div style="position: absolute; width: 1.5px; height: 30px; background-color: #EF4444;"></div>
          <div style="width: 8px; height: 8px; border-radius: 9999px; background-color: #EF4444; border: 1.5px solid #FFFFFF;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

/**
 * Creates custom flame marker icon for NASA FIRMS thermal anomaly / active fire detection.
 */
export function createFirmsFireIcon(confidence = "nominal"): L.DivIcon {
  const isHigh = confidence === "high";
  const bg = isHigh ? "#DC2626" : "#EA580C";
  return L.divIcon({
    className: "firms-fire-marker",
    html: `
      <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 30px; height: 30px; border-radius: 9999px; background-color: ${isHigh ? "rgba(220, 38, 38, 0.45)" : "rgba(234, 88, 12, 0.35)"}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="width: 26px; height: 26px; border-radius: 9999px; background-color: ${bg}; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1;">
          🔥
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

