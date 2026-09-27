import { DistrictLocation, CanonicalCityLocation } from "@/types";

export interface EmergencyContactEntry {
  serviceName: string;
  serviceNameHi: string;
  number: string;
  secondaryNumber?: string;
  category: "NATIONAL" | "STATE" | "DISTRICT" | "AMBULANCE" | "POLICE" | "FIRE" | "MUNICIPAL";
  isTollFree?: boolean;
  notes?: string;
  notesHi?: string;
}

export interface SupportedDistrict extends DistrictLocation, CanonicalCityLocation {
  id: string;
  name_en: string;
  name_hi: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  timezone: string;
  active: boolean;
  nameHi: string;
  stateHi: string;
  emergencyContacts: EmergencyContactEntry[];
}

/**
 * Single Source of Truth for Configured Districts in VarshaNetra (VNET-PUBLIC-001 & VNET-PERFORMANCE-LIVE-004)
 * Rules:
 * 1. Do not invent cities.
 * 2. Display exact configured active entries.
 * 3. All emergency telephone numbers are verified official Indian public services.
 * 4. Every weather/risk/GIS operation must use the canonical location record.
 */
export const SUPPORTED_DISTRICTS: SupportedDistrict[] = [
  {
    id: "pune",
    cityId: "pune",
    districtId: "pune",
    name_en: "Pune",
    name_hi: "पुणे ज़िला",
    displayName: "Pune District, Maharashtra, India",
    displayNameEn: "Pune District",
    shortName: "Pune District",
    nameHi: "पुणे ज़िला",
    displayNameHi: "पुणे ज़िला",
    state: "Maharashtra",
    stateHi: "महाराष्ट्र",
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Pune",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        secondaryNumber: "011-24363260",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Maharashtra State Disaster Management (SDMA)",
        serviceNameHi: "महाराष्ट्र राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        secondaryNumber: "022-22027990",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Pune District Emergency Control Room (DEOC)",
        serviceNameHi: "पुणे ज़िला आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "020-26123371",
        category: "DISTRICT",
        isTollFree: true,
        notes: "District Collectorate, Pune",
        notesHi: "ज़िलाधिकारी कार्यालय, पुणे",
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        secondaryNumber: "102",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        secondaryNumber: "020-26122880",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        secondaryNumber: "020-26451707",
        category: "FIRE",
        isTollFree: true,
      },
      {
        serviceName: "Pune Municipal Flood Control (PMC)",
        serviceNameHi: "पुणे महानगरपालिका बाढ़ नियंत्रण",
        number: "020-25501269",
        secondaryNumber: "020-25506800",
        category: "MUNICIPAL",
        isTollFree: false,
      },
    ],
  },
  {
    id: "mumbai-suburban",
    cityId: "mumbai-suburban",
    districtId: "mumbai-suburban",
    name_en: "Mumbai Suburban",
    name_hi: "मुंबई उपनगर ज़िला",
    displayName: "Mumbai Suburban District, Maharashtra, India",
    displayNameEn: "Mumbai Suburban District",
    shortName: "Mumbai Suburban",
    nameHi: "मुंबई उपनगर ज़िला",
    displayNameHi: "मुंबई उपनगर ज़िला",
    state: "Maharashtra",
    stateHi: "महाराष्ट्र",
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Mumbai Suburban",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Maharashtra State Disaster Management (SDMA)",
        serviceNameHi: "महाराष्ट्र राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        secondaryNumber: "022-22027990",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Mumbai Suburban District Control Room (DEOC)",
        serviceNameHi: "मुंबई उपनगर आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "022-26514742",
        category: "DISTRICT",
        isTollFree: true,
      },
      {
        serviceName: "MCGM Disaster Management Helpline (Mumbai)",
        serviceNameHi: "बृहन्मुंबई महानगरपालिका आपदा हेल्पलाइन",
        number: "1916",
        secondaryNumber: "022-22694727",
        category: "MUNICIPAL",
        isTollFree: true,
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        category: "FIRE",
        isTollFree: true,
      },
    ],
  },
  {
    id: "raigad",
    cityId: "raigad",
    districtId: "raigad",
    name_en: "Raigad",
    name_hi: "रायगढ़ ज़िला",
    displayName: "Raigad District, Maharashtra, India",
    displayNameEn: "Raigad District",
    shortName: "Raigad District",
    nameHi: "रायगढ़ ज़िला",
    displayNameHi: "रायगढ़ ज़िला",
    state: "Maharashtra",
    stateHi: "महाराष्ट्र",
    latitude: 18.5158,
    longitude: 73.1812,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Raigad",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Maharashtra State Disaster Management (SDMA)",
        serviceNameHi: "महाराष्ट्र राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Raigad District Emergency Control Room (DEOC)",
        serviceNameHi: "रायगढ़ ज़िला आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "02141-222001",
        category: "DISTRICT",
        isTollFree: true,
        notes: "Alibag Collectorate",
        notesHi: "अलीबाग कलेक्ट्रेट",
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        category: "FIRE",
        isTollFree: true,
      },
    ],
  },
  {
    id: "kolhapur",
    cityId: "kolhapur",
    districtId: "kolhapur",
    name_en: "Kolhapur",
    name_hi: "कोल्हापुर ज़िला",
    displayName: "Kolhapur District, Maharashtra, India",
    displayNameEn: "Kolhapur District",
    shortName: "Kolhapur District",
    nameHi: "कोल्हापुर ज़िला",
    displayNameHi: "कोल्हापुर ज़िला",
    state: "Maharashtra",
    stateHi: "महाराष्ट्र",
    latitude: 16.7050,
    longitude: 74.2433,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Kolhapur",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Maharashtra State Disaster Management (SDMA)",
        serviceNameHi: "महाराष्ट्र राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Kolhapur District Emergency Control Room (DEOC)",
        serviceNameHi: "कोल्हापुर ज़िला आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "0231-2659232",
        category: "DISTRICT",
        isTollFree: true,
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        category: "FIRE",
        isTollFree: true,
      },
    ],
  },
  {
    id: "wayanad",
    cityId: "wayanad",
    districtId: "wayanad",
    name_en: "Wayanad",
    name_hi: "वायनाड ज़िला",
    displayName: "Wayanad District, Kerala, India",
    displayNameEn: "Wayanad District",
    shortName: "Wayanad District",
    nameHi: "वायनाड ज़िला",
    displayNameHi: "वायनाड ज़िला",
    state: "Kerala",
    stateHi: "केरल",
    latitude: 11.6854,
    longitude: 76.1320,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Wayanad",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Kerala State Disaster Management (KSDMA)",
        serviceNameHi: "केरल राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        secondaryNumber: "0471-2364424",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Wayanad District Emergency Control Room (DEOC)",
        serviceNameHi: "वायनाड ज़िला आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "04936-204151",
        category: "DISTRICT",
        isTollFree: true,
        notes: "Collectorate, Kalpetta",
        notesHi: "कलेक्ट्रेट, कलपट्टा",
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        category: "FIRE",
        isTollFree: true,
      },
    ],
  },
  {
    id: "chennai",
    cityId: "chennai",
    districtId: "chennai",
    name_en: "Chennai",
    name_hi: "चेन्नई ज़िला",
    displayName: "Chennai District, Tamil Nadu, India",
    displayNameEn: "Chennai District",
    shortName: "Chennai District",
    nameHi: "चेन्नई ज़िला",
    displayNameHi: "चेन्नई ज़िला",
    state: "Tamil Nadu",
    stateHi: "तमिलनाडु",
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: "Asia/Kolkata",
    active: true,
    type: "administrative",
    district: "Chennai",
    emergencyContacts: [
      {
        serviceName: "National Emergency Response (ERSS)",
        serviceNameHi: "राष्ट्रीय आपातकालीन सहायता",
        number: "112",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "National Disaster Response (NDMA / NDRF)",
        serviceNameHi: "राष्ट्रीय आपदा प्रतिक्रिया बल",
        number: "1078",
        category: "NATIONAL",
        isTollFree: true,
      },
      {
        serviceName: "Tamil Nadu State Disaster Management (TNDMA)",
        serviceNameHi: "तमिलनाडु राज्य आपदा नियंत्रण कक्ष",
        number: "1070",
        secondaryNumber: "044-28593990",
        category: "STATE",
        isTollFree: true,
      },
      {
        serviceName: "Chennai District Emergency Control Room (DEOC)",
        serviceNameHi: "चेन्नई ज़िला आपदा नियंत्रण कक्ष (DEOC)",
        number: "1077",
        secondaryNumber: "044-25619206",
        category: "DISTRICT",
        isTollFree: true,
      },
      {
        serviceName: "Greater Chennai Corporation (GCC Disaster Helpline)",
        serviceNameHi: "ग्रेटर चेन्नई नगर निगम आपदा हेल्पलाइन",
        number: "1913",
        category: "MUNICIPAL",
        isTollFree: true,
      },
      {
        serviceName: "Emergency Ambulance Services",
        serviceNameHi: "आपातकालीन एम्बुलेंस सेवा",
        number: "108",
        category: "AMBULANCE",
        isTollFree: true,
      },
      {
        serviceName: "Police Control Room",
        serviceNameHi: "पुलिस नियंत्रण कक्ष",
        number: "100",
        category: "POLICE",
        isTollFree: true,
      },
      {
        serviceName: "Fire & Rescue Services",
        serviceNameHi: "अग्निशमन एवं बचाव सेवा",
        number: "101",
        category: "FIRE",
        isTollFree: true,
      },
    ],
  },
];

/**
 * Resolves canonical district from ID, cityId, district name, or query string.
 * Falls back deterministically to DEFAULT_DISTRICT (Pune).
 */
export function getCanonicalDistrict(idOrQuery?: string | null): SupportedDistrict {
  if (!idOrQuery) return SUPPORTED_DISTRICTS[0];
  const q = idOrQuery.trim().toLowerCase();
  const found = SUPPORTED_DISTRICTS.find(
    (d) =>
      d.id.toLowerCase() === q ||
      (d.cityId && d.cityId.toLowerCase() === q) ||
      (d.districtId && d.districtId.toLowerCase() === q) ||
      (d.name_en && d.name_en.toLowerCase() === q) ||
      (d.name_hi && d.name_hi.toLowerCase() === q) ||
      d.shortName.toLowerCase() === q ||
      (d.district && d.district.toLowerCase() === q)
  );
  return found || SUPPORTED_DISTRICTS[0];
}

/**
 * Resolves canonical district by closest spatial coordinates.
 */
export function findCanonicalDistrictByCoords(lat: number, lon: number): SupportedDistrict | undefined {
  let closest: SupportedDistrict | undefined;
  let minDistance = Infinity;

  for (const d of SUPPORTED_DISTRICTS) {
    const dLat = d.latitude - lat;
    const dLon = d.longitude - lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = d;
    }
  }

  // Threshold ~ 50km (~0.25 deg sq)
  return minDistance < 0.25 ? closest : undefined;
}

