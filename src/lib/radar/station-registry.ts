import {
  IMDStationCode,
  IMDStationInfo,
  RadarCoverageContext,
} from "@/types/radar";

/**
 * Verified Official India Meteorological Department (IMD) Doppler Weather Radar Network
 * Each station operates with a standard 250 km Doppler observation radius.
 */
export const IMD_RADAR_STATIONS: Record<IMDStationCode, IMDStationInfo> = {
  mum: {
    code: "mum",
    name: "Mumbai",
    state: "Maharashtra",
    latitude: 19.076,
    longitude: 72.877,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  vrv: {
    code: "vrv",
    name: "Mumbai-Veravali",
    state: "Maharashtra",
    latitude: 19.133,
    longitude: 72.862,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  pnv: {
    code: "pnv",
    name: "Panvel",
    state: "Maharashtra",
    latitude: 18.9894,
    longitude: 73.1175,
    radiusKm: 250,
    band: "C-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  mhb: {
    code: "mhb",
    name: "Mahabaleshwar",
    state: "Maharashtra",
    latitude: 17.9237,
    longitude: 73.6586,
    radiusKm: 250,
    band: "X-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  slp: {
    code: "slp",
    name: "Solapur",
    state: "Maharashtra",
    latitude: 17.6599,
    longitude: 75.9064,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  chn: {
    code: "chn",
    name: "Chennai (Port)",
    state: "Tamil Nadu",
    latitude: 13.0827,
    longitude: 80.2707,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  goa: {
    code: "goa",
    name: "Goa",
    state: "Goa",
    latitude: 15.38,
    longitude: 73.831,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  shr: {
    code: "shr",
    name: "Sriharikota (SDSC-SHAR)",
    state: "Andhra Pradesh / Chennai Region",
    latitude: 13.72,
    longitude: 80.23,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  koc: {
    code: "koc",
    name: "Kochi",
    state: "Kerala",
    latitude: 9.932,
    longitude: 76.267,
    radiusKm: 250,
    band: "C-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  tvm: {
    code: "tvm",
    name: "Thiruvananthapuram",
    state: "Kerala",
    latitude: 8.507,
    longitude: 76.953,
    radiusKm: 250,
    band: "C-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: true,
  },
  ngp: {
    code: "ngp",
    name: "Nagpur",
    state: "Maharashtra",
    latitude: 21.146,
    longitude: 79.088,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  hyd: {
    code: "hyd",
    name: "Hyderabad",
    state: "Telangana",
    latitude: 17.385,
    longitude: 78.487,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  kol: {
    code: "kol",
    name: "Kolkata",
    state: "West Bengal",
    latitude: 22.573,
    longitude: 88.364,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  vsk: {
    code: "vsk",
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    latitude: 17.687,
    longitude: 83.219,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  mpt: {
    code: "mpt",
    name: "Machilipatnam",
    state: "Andhra Pradesh",
    latitude: 16.187,
    longitude: 81.139,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  bhp: {
    code: "bhp",
    name: "Bhopal",
    state: "Madhya Pradesh",
    latitude: 23.26,
    longitude: 77.413,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  jpr: {
    code: "jpr",
    name: "Jaipur",
    state: "Rajasthan",
    latitude: 26.912,
    longitude: 75.787,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  lkn: {
    code: "lkn",
    name: "Lucknow",
    state: "Uttar Pradesh",
    latitude: 26.847,
    longitude: 80.947,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  ptn: {
    code: "ptn",
    name: "Patna",
    state: "Bihar",
    latitude: 25.594,
    longitude: 85.138,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
  bhj: {
    code: "bhj",
    name: "Bhuj",
    state: "Gujarat",
    latitude: 23.242,
    longitude: 69.667,
    radiusKm: 250,
    band: "S-Band",
    availableProducts: ["caz", "sri", "vp2", "pac", "ppi", "ppz"],
    hasAnimation: false,
  },
};

/**
 * Canonical Mapping for VarshaNetra Supported Districts (Rule: Do not guess station mappings from city names)
 */
export const CANONICAL_DISTRICT_TO_RADAR: Record<string, { primary: IMDStationCode; secondary?: IMDStationCode }> = {
  pune: { primary: "mum", secondary: "mhb" },
  "mumbai-suburban": { primary: "mum", secondary: "vrv" },
  raigad: { primary: "mum", secondary: "pnv" },
  kolhapur: { primary: "goa", secondary: "slp" },
  wayanad: { primary: "koc", secondary: "tvm" },
  chennai: { primary: "chn", secondary: "shr" },
  bhopal: { primary: "bhp" },
  patna: { primary: "ptn" },
};

/**
 * Great-circle distance using Haversine formula (km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
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

/**
 * Resolves the applicable IMD radar station context for any given district or coordinate.
 */
export function resolveRadarStationContext(
  districtId: string,
  latitude: number,
  longitude: number,
  districtDisplayName: string
): RadarCoverageContext {
  const normId = districtId.toLowerCase().trim();
  const canonical = CANONICAL_DISTRICT_TO_RADAR[normId];

  let primaryStation: IMDStationInfo;
  let secondaryStation: (IMDStationInfo & { distanceKm: number }) | undefined;

  if (canonical) {
    primaryStation = IMD_RADAR_STATIONS[canonical.primary];
    if (canonical.secondary) {
      const sec = IMD_RADAR_STATIONS[canonical.secondary];
      secondaryStation = {
        ...sec,
        distanceKm: calculateHaversineDistanceKm(latitude, longitude, sec.latitude, sec.longitude),
      };
    }
  } else {
    // Spatial search for nearest active station
    let closestStation: IMDStationInfo = IMD_RADAR_STATIONS.mum;
    let minDistance = Infinity;

    for (const station of Object.values(IMD_RADAR_STATIONS)) {
      const dist = calculateHaversineDistanceKm(latitude, longitude, station.latitude, station.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = station;
      }
    }
    primaryStation = closestStation;
  }

  const distanceKm = calculateHaversineDistanceKm(
    latitude,
    longitude,
    primaryStation.latitude,
    primaryStation.longitude
  );

  let coverageStatus: "DIRECT" | "PERIPHERAL" | "OUTSIDE";
  if (distanceKm <= primaryStation.radiusKm) {
    coverageStatus = "DIRECT"; // Within 250 km
  } else if (distanceKm <= 400) {
    coverageStatus = "PERIPHERAL"; // Near edge of Doppler envelope
  } else {
    coverageStatus = "OUTSIDE"; // Outside coverage
  }

  return {
    station: primaryStation,
    distanceKm,
    coverageStatus,
    districtId: normId,
    districtName: districtDisplayName,
    secondaryStation,
  };
}
