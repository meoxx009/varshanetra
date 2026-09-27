/**
 * Risk Zone Locality & Infrastructure Intelligence Service
 * VarshaNetra Emergency Early Warning System (VNET-FLOOD-MAP-003)
 *
 * Provides:
 * 1. Deterministic, verified geospatial place-name resolution for risk grid cells (EN & HI)
 * 2. Spatial classification of infrastructure assets: INSIDE ZONE, NEAR ZONE (<=1000m), OUTSIDE ZONE
 * 3. 10-category tactical infrastructure filtering & aggregation
 */

import {
  FacilitiesGroupedResponse,
  MapFeatureItem,
} from "@/types";

export type SpatialRelationship = "INSIDE" | "NEAR" | "OUTSIDE";

export type InfrastructureCategoryFilter =
  | "all"
  | "health"
  | "police"
  | "fire"
  | "shelter"
  | "transport"
  | "schools"
  | "drainage"
  | "government"
  | "other";

export interface InfrastructureCategoryMeta {
  id: InfrastructureCategoryFilter;
  labelEn: string;
  labelHi: string;
  iconName: string;
}

export const INFRASTRUCTURE_CATEGORIES: InfrastructureCategoryMeta[] = [
  { id: "all", labelEn: "All Infrastructure", labelHi: "सभी अवसंरचना", iconName: "Layers" },
  { id: "health", labelEn: "Health", labelHi: "स्वास्थ्य", iconName: "HeartPulse" },
  { id: "police", labelEn: "Police", labelHi: "पुलिस", iconName: "Shield" },
  { id: "fire", labelEn: "Fire & Rescue", labelHi: "अग्निशमन व बचाव", iconName: "Flame" },
  { id: "shelter", labelEn: "Relief Shelters", labelHi: "राहत आश्रय", iconName: "Home" },
  { id: "transport", labelEn: "Transport & Bridges", labelHi: "परिवहन व पुल", iconName: "Bus" },
  { id: "schools", labelEn: "Schools", labelHi: "विद्यालय / कॉलेज", iconName: "GraduationCap" },
  { id: "drainage", labelEn: "Drainage & Waterways", labelHi: "जल निकासी व नदियाँ", iconName: "Waves" },
  { id: "government", labelEn: "Government & EOC", labelHi: "प्रशासनिक केंद्र", iconName: "Building2" },
  { id: "other", labelEn: "Field Incidents & Gauges", labelHi: "घटनाएं व गेज", iconName: "AlertTriangle" },
];

export interface SectorLocality {
  nameEn: string;
  nameHi: string;
  lat: number;
  lon: number;
  talukEn: string;
  talukHi: string;
}

// Verified local areas / municipal sectors for Pune pilot region & surroundings
export const PILOT_LOCALITIES: SectorLocality[] = [
  { nameEn: "Sinhagad Road (Ekta Nagari)", nameHi: "सिंहगड़ रोड (एकता नगरी)", lat: 18.472, lon: 73.821, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Anand Nagar", nameHi: "आनंद नगर", lat: 18.478, lon: 73.828, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Dhayari", nameHi: "धायरी", lat: 18.448, lon: 73.809, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Wadgaon Budruk", nameHi: "वडगांव बुद्रुक", lat: 18.463, lon: 73.832, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Yerawada (Shanti Nagar)", nameHi: "येरवडा (शांति नगर)", lat: 18.556, lon: 73.882, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Vishrantwadi", nameHi: "विश्रांतवाड़ी", lat: 18.571, lon: 73.876, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Khadki", nameHi: "खड़की", lat: 18.562, lon: 73.838, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Dapodi Subway Underpass", nameHi: "दापोडी रेलवे सबवे", lat: 18.581, lon: 73.829, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Phugewadi", nameHi: "फुगेवाड़ी", lat: 18.591, lon: 73.825, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Kasarwadi", nameHi: "कासारवाड़ी", lat: 18.604, lon: 73.822, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Sangamwadi (Mula-Mutha Confluence)", nameHi: "संगमवाड़ी (मूला-मुठा संगम)", lat: 18.535, lon: 73.872, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Bund Garden", nameHi: "बंड गार्डन", lat: 18.538, lon: 73.884, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Koregaon Park", nameHi: "कोरेगांव पार्क", lat: 18.536, lon: 73.896, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Kothrud (Chandani Chowk)", nameHi: "कोथरुड (चांदणी चौक)", lat: 18.507, lon: 73.805, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Karve Nagar", nameHi: "कर्वे नगर", lat: 18.489, lon: 73.817, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Warje", nameHi: "वारजे", lat: 18.481, lon: 73.799, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Shivajinagar (FC Road)", nameHi: "शिवाजीनगर (एफसी रोड)", lat: 18.531, lon: 73.844, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Deccan Gymkhana", nameHi: "डेक्कन जिमखाना", lat: 18.517, lon: 73.841, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Swargate & Saras Baug", nameHi: "स्वारगेट व सारस बाग", lat: 18.501, lon: 73.855, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Camp (Pune Cantonment)", nameHi: "कैम्प (पुणे छावनी)", lat: 18.513, lon: 73.879, talukEn: "Pune Cantonment", talukHi: "पुणे छावनी" },
  { nameEn: "Hadapsar (Magarpatta)", nameHi: "हडपसर (मगरपट्टा)", lat: 18.508, lon: 73.928, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Mundhwa", nameHi: "मुंढवा", lat: 18.532, lon: 73.919, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Kharadi (EON Free Zone)", nameHi: "खराड़ी (ईओएन)", lat: 18.552, lon: 73.945, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Viman Nagar", nameHi: "विमान नगर", lat: 18.567, lon: 73.914, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Wadgaon Sheri", nameHi: "वडगांव शेरी", lat: 18.549, lon: 73.921, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Katraj Lake Sector", nameHi: "कात्रज झील सेक्टर", lat: 18.455, lon: 73.858, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Bibwewadi", nameHi: "बिबवेवाड़ी", lat: 18.479, lon: 73.864, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Pimpri City Center", nameHi: "पिंपरी शहर केंद्र", lat: 18.627, lon: 73.801, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Chinchwad Station", nameHi: "चिंचवड़ स्टेशन", lat: 18.636, lon: 73.788, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Bhosari MIDC", nameHi: "भोसरी एमआईडीसी", lat: 18.631, lon: 73.844, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Akurdi & Pradhikaran", nameHi: "आकुर्डी व प्राधिकरण", lat: 18.649, lon: 73.774, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Nigdi Pradhikaran", nameHi: "निगडी प्राधिकरण", lat: 18.658, lon: 73.766, talukEn: "Pimpri-Chinchwad", talukHi: "पिंपरी-चिंचवड़" },
  { nameEn: "Baner Highway Corridor", nameHi: "बानेर हाईवे कॉरिडोर", lat: 18.559, lon: 73.786, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Aundh DP Road", nameHi: "औंध डीपी रोड", lat: 18.563, lon: 73.807, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Bavdhan & Chandani Hills", nameHi: "बावधन व चांदणी टेकड़ी", lat: 18.518, lon: 73.774, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Pashan Lake Environs", nameHi: "पाषाण झील परिक्षेत्र", lat: 18.539, lon: 73.791, talukEn: "Pune City", talukHi: "पुणे शहर" },
  { nameEn: "Hinjawadi IT Park Sector", nameHi: "हिंजवड़ी आईटी पार्क सेक्टर", lat: 18.591, lon: 73.738, talukEn: "Mulshi", talukHi: "मुळशी" },
  { nameEn: "Moshi & Alandi Road", nameHi: "मोशी व आळंदी रोड", lat: 18.674, lon: 73.848, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Talegaon Dabhade", nameHi: "तळेगांव दाभाडे", lat: 18.729, lon: 73.689, talukEn: "Maval", talukHi: "मावळ" },
  { nameEn: "Dehu Road Outpost", nameHi: "देहू रोड आउटपोस्ट", lat: 18.718, lon: 73.729, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Wagholi Highway Hub", nameHi: "वाघोली हाईवे हब", lat: 18.581, lon: 73.981, talukEn: "Haveli", talukHi: "हवेली" },
  { nameEn: "Khadakwasla Dam Outfall", nameHi: "खड़कवासला बांध आउटफॉल", lat: 18.432, lon: 73.764, talukEn: "Haveli", talukHi: "हवेली" },
];

/**
 * Calculates Haversine distance in meters between two lat/lon points.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface ResolvedLocalAreas {
  localAreasEn: string[];
  localAreasHi: string[];
  primaryEn: string;
  primaryHi: string;
  talukEn?: string;
  talukHi?: string;
}

/**
 * Resolves recognizable local areas associated with a spatial cell.
 * Searches predefined pilot sector centroids, facility names/addresses, and falls back to cell quadrant.
 */
export function resolveLocalAreasForCell(
  cellLat: number,
  cellLon: number,
  facilities?: FacilitiesGroupedResponse | null
): ResolvedLocalAreas {
  // Search radius of 3.2 km around cell center (~half-step plus small buffer)
  const SEARCH_RADIUS_METERS = 3200;

  const matches: { loc: SectorLocality; distance: number }[] = [];

  for (const loc of PILOT_LOCALITIES) {
    const dist = calculateDistanceMeters(cellLat, cellLon, loc.lat, loc.lon);
    if (dist <= SEARCH_RADIUS_METERS) {
      matches.push({ loc, distance: dist });
    }
  }

  // Sort by closest proximity
  matches.sort((a, b) => a.distance - b.distance);

  const localAreasEn: string[] = [];
  const localAreasHi: string[] = [];

  for (const m of matches) {
    if (!localAreasEn.includes(m.loc.nameEn)) {
      localAreasEn.push(m.loc.nameEn);
      localAreasHi.push(m.loc.nameHi);
    }
  }

  // If facilities are available in/near this cell and we have fewer than 2 localities, supplement with facility addresses
  if (localAreasEn.length < 2 && facilities) {
    const allFacilities = [
      ...facilities.hospitals,
      ...facilities.clinics,
      ...facilities.police,
      ...facilities.fire,
      ...facilities.schools,
    ];

    for (const f of allFacilities) {
      const dist = calculateDistanceMeters(cellLat, cellLon, f.latitude, f.longitude);
      if (dist <= 2500 && f.address) {
        // Extract locality name from address
        const parts = f.address.split(",").map((p) => p.trim());
        const candidate = parts[0];
        if (candidate && candidate.length > 3 && !localAreasEn.includes(candidate)) {
          localAreasEn.push(candidate);
          localAreasHi.push(candidate);
        }
      }
      if (localAreasEn.length >= 4) break;
    }
  }

  // If still empty (cell outside pilot boundary), generate deterministic geographic quadrant sector
  if (localAreasEn.length === 0) {
    const latDir = cellLat >= 18.52 ? "North" : "South";
    const lonDir = cellLon >= 73.85 ? "East" : "West";
    const latDirHi = cellLat >= 18.52 ? "उत्तर" : "दक्षिण";
    const lonDirHi = cellLon >= 73.85 ? "पूर्व" : "पश्चिम";

    const defaultSectorEn = `District Sector (${latDir}-${lonDir} Catchment)`;
    const defaultSectorHi = `जिला सेक्टर (${latDirHi}-${lonDirHi} जलग्रहण)`;
    localAreasEn.push(defaultSectorEn);
    localAreasHi.push(defaultSectorHi);
  }

  const primaryMatch = matches[0];

  return {
    localAreasEn,
    localAreasHi,
    primaryEn: localAreasEn[0],
    primaryHi: localAreasHi[0],
    talukEn: primaryMatch?.loc.talukEn,
    talukHi: primaryMatch?.loc.talukHi,
  };
}

/**
 * Determines spatial relationship of an asset point with respect to a cell bounding box / center.
 * Default cell step is ~0.04 deg (approx 4.4 km, half-diagonal ~3.1 km).
 * Configurable NEAR threshold: 1000m beyond the cell boundary.
 */
export function classifySpatialRelationship(
  itemLat: number,
  itemLon: number,
  cellCenterLat: number,
  cellCenterLon: number,
  cellHalfSpanDeg: number = 0.02, // half of 0.04
  nearThresholdMeters: number = 1000
): { relationship: SpatialRelationship; distanceToCenterMeters: number } {
  const dist = calculateDistanceMeters(cellCenterLat, cellCenterLon, itemLat, itemLon);

  const south = cellCenterLat - cellHalfSpanDeg;
  const north = cellCenterLat + cellHalfSpanDeg;
  const west = cellCenterLon - cellHalfSpanDeg;
  const east = cellCenterLon + cellHalfSpanDeg;

  // Bounding box point-in-polygon check
  if (itemLat >= south && itemLat <= north && itemLon >= west && itemLon <= east) {
    return { relationship: "INSIDE", distanceToCenterMeters: dist };
  }

  // Check distance to boundary: approximate cell radius in meters ~ 2200m
  const cellRadiusMeters = 2200;
  if (dist <= cellRadiusMeters + nearThresholdMeters) {
    return { relationship: "NEAR", distanceToCenterMeters: dist };
  }

  return { relationship: "OUTSIDE", distanceToCenterMeters: dist };
}

/**
 * Maps a MapFeatureItem to one of the 9 specific infrastructure categories.
 */
export function categorizeFacility(item: MapFeatureItem): InfrastructureCategoryFilter {
  const cat = item.category;
  const name = (item.name || "").toLowerCase();
  const details = (item.details || "").toLowerCase();

  if (cat === "HOSPITAL" || cat === "CLINIC") {
    return "health";
  }
  if (cat === "POLICE") {
    return "police";
  }
  if (cat === "FIRE_STATION") {
    return "fire";
  }
  if (
    cat === "SHELTER" ||
    name.includes("shelter") ||
    name.includes("relief") ||
    details.includes("evacuation shelter")
  ) {
    return "shelter";
  }
  if (
    details.includes("bridge") ||
    name.includes("bridge") ||
    name.includes("flyover") ||
    name.includes("subway") ||
    name.includes("station") ||
    name.includes("depot") ||
    name.includes("highway")
  ) {
    return "transport";
  }
  if (cat === "SCHOOL") {
    return "schools";
  }
  if (cat === "RIVER" || cat === "RIVER_GAUGE" || name.includes("canal") || name.includes("stream")) {
    return "drainage";
  }
  if (
    cat === "RESPONSE_TEAM" ||
    name.includes("collector") ||
    name.includes("tehsil") ||
    name.includes("municipal") ||
    name.includes("control room") ||
    name.includes("eoc")
  ) {
    return "government";
  }

  return "other";
}

export interface ClassifiedAsset {
  item: MapFeatureItem;
  category: InfrastructureCategoryFilter;
  relationship: SpatialRelationship;
  distanceToCenterMeters: number;
}

export interface CellInfrastructureBreakdown {
  totalInside: number;
  totalNear: number;
  byCategory: Record<
    InfrastructureCategoryFilter,
    {
      inside: number;
      near: number;
      assets: ClassifiedAsset[];
    }
  >;
  allAssets: ClassifiedAsset[];
}

/**
 * Computes spatial breakdown of infrastructure assets relative to a specific risk zone.
 */
export function computeCellInfrastructureBreakdown(
  cellLat: number,
  cellLon: number,
  facilities: FacilitiesGroupedResponse | null,
  cellHalfSpanDeg: number = 0.02
): CellInfrastructureBreakdown {
  const result: CellInfrastructureBreakdown = {
    totalInside: 0,
    totalNear: 0,
    byCategory: {
      all: { inside: 0, near: 0, assets: [] },
      health: { inside: 0, near: 0, assets: [] },
      police: { inside: 0, near: 0, assets: [] },
      fire: { inside: 0, near: 0, assets: [] },
      shelter: { inside: 0, near: 0, assets: [] },
      transport: { inside: 0, near: 0, assets: [] },
      schools: { inside: 0, near: 0, assets: [] },
      drainage: { inside: 0, near: 0, assets: [] },
      government: { inside: 0, near: 0, assets: [] },
      other: { inside: 0, near: 0, assets: [] },
    },
    allAssets: [],
  };

  if (!facilities) return result;

  const rawList: MapFeatureItem[] = [
    ...(facilities.hospitals || []),
    ...(facilities.clinics || []),
    ...(facilities.police || []),
    ...(facilities.fire || []),
    ...(facilities.schools || []),
    ...(facilities.rivers || []),
    ...(facilities.fieldReports || []),
    ...(facilities.incidents || []),
    ...(facilities.responseTeams || []),
    ...(facilities.shelters || []),
  ];

  for (const item of rawList) {
    const { relationship, distanceToCenterMeters } = classifySpatialRelationship(
      item.latitude,
      item.longitude,
      cellLat,
      cellLon,
      cellHalfSpanDeg
    );

    if (relationship === "OUTSIDE") continue;

    const category = categorizeFacility(item);
    const classified: ClassifiedAsset = {
      item,
      category,
      relationship,
      distanceToCenterMeters,
    };

    result.allAssets.push(classified);
    result.byCategory.all.assets.push(classified);
    result.byCategory[category].assets.push(classified);

    if (relationship === "INSIDE") {
      result.totalInside++;
      result.byCategory.all.inside++;
      result.byCategory[category].inside++;
    } else {
      result.totalNear++;
      result.byCategory.all.near++;
      result.byCategory[category].near++;
    }
  }

  // Sort assets by proximity to cell center
  result.allAssets.sort((a, b) => a.distanceToCenterMeters - b.distanceToCenterMeters);

  return result;
}
