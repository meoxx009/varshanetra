/**
 * VarshaNetra ROAD-002: CWC River Gauge Domain Models
 * Strict TypeScript types for the river gauge monitoring module.
 */

export type GaugeStatus = "NORMAL" | "WARNING" | "DANGER" | "CRITICAL";
export type GaugeTrend = "RISING" | "FALLING" | "STEADY";

export interface RiverGauge {
  id: string;
  station_name: string;
  station_code: string | null;
  river_name: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  danger_level_m: number | null;
  warning_level_m: number | null;
  normal_level_m: number | null;
  current_level_m: number | null;
  level_trend: GaugeTrend | null;
  last_updated: string | null;
  data_source: string;
  entered_by: string | null;
  cwc_station_url: string | null;
  created_at?: string;
  updated_at?: string;
  // Derived field — computed by computeGaugeStatus(), never stored in DB
  status?: GaugeStatus;
}

export interface RiverGaugeReading {
  id: string;
  gauge_id: string;
  reading_datetime: string;
  water_level_m: number;
  discharge_cumecs: number | null;
  trend: GaugeTrend | null;
  entered_by: string | null;
  notes: string | null;
  created_at?: string;
}

export interface CreateRiverGaugePayload {
  station_name: string;
  station_code?: string;
  river_name: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  danger_level_m?: number;
  warning_level_m?: number;
  normal_level_m?: number;
  cwc_station_url?: string;
}

export interface UpdateGaugeReadingPayload {
  water_level_m: number;
  level_trend: GaugeTrend;
  discharge_cumecs?: number;
  notes?: string;
}

/**
 * Pre-loaded CWC station templates — static data for setup wizard.
 * Source: CWC Flood Forecasting & Warning Portal (ffis.cwc.gov.in)
 * These are official CWC benchmark levels for major Indian river stations.
 */
export interface PreloadedStationTemplate {
  station_name: string;
  river_name: string;
  state: string;
  district: string;
  danger_level_m: number;
  warning_level_m: number | null;
  normal_level_m: number | null;
  latitude: number | null;
  longitude: number | null;
  cwc_station_url: string;
}

export const CWC_PRELOADED_STATIONS: PreloadedStationTemplate[] = [
  {
    station_name: "Patna",
    river_name: "Ganga",
    state: "Bihar",
    district: "Patna",
    danger_level_m: 50.45,
    warning_level_m: 49.45,
    normal_level_m: 46.0,
    latitude: 25.5941,
    longitude: 85.1376,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Varanasi",
    river_name: "Ganga",
    state: "Uttar Pradesh",
    district: "Varanasi",
    danger_level_m: 71.26,
    warning_level_m: 70.26,
    normal_level_m: null,
    latitude: 25.3176,
    longitude: 82.9739,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Muzaffarpur",
    river_name: "Gandak",
    state: "Bihar",
    district: "Muzaffarpur",
    danger_level_m: 55.44,
    warning_level_m: 54.44,
    normal_level_m: null,
    latitude: 26.1209,
    longitude: 85.3647,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Guwahati",
    river_name: "Brahmaputra",
    state: "Assam",
    district: "Kamrup Metropolitan",
    danger_level_m: 51.82,
    warning_level_m: 50.82,
    normal_level_m: null,
    latitude: 26.1445,
    longitude: 91.7362,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Delhi (Old Railway Bridge)",
    river_name: "Yamuna",
    state: "Delhi",
    district: "Delhi",
    danger_level_m: 205.33,
    warning_level_m: 204.83,
    normal_level_m: null,
    latitude: 28.6517,
    longitude: 77.2219,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Cuttack (Naraj Barrage)",
    river_name: "Mahanadi",
    state: "Odisha",
    district: "Cuttack",
    danger_level_m: 27.0,
    warning_level_m: 26.0,
    normal_level_m: null,
    latitude: 20.4625,
    longitude: 85.8830,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Rajahmundry (Dowleswaram)",
    river_name: "Godavari",
    state: "Andhra Pradesh",
    district: "East Godavari",
    danger_level_m: 13.4,
    warning_level_m: 12.5,
    normal_level_m: null,
    latitude: 17.0005,
    longitude: 81.8040,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
  {
    station_name: "Vijayawada (Prakasam Barrage)",
    river_name: "Krishna",
    state: "Andhra Pradesh",
    district: "Krishna",
    danger_level_m: 21.0,
    warning_level_m: 19.5,
    normal_level_m: null,
    latitude: 16.5193,
    longitude: 80.6305,
    cwc_station_url: "https://ffis.cwc.gov.in",
  },
];
