export interface RadarFrame {
  time: number;
  datetime: string;
  path: string;
  is_past: boolean;
  is_forecast?: boolean;
}

export interface RainViewerApiResponse {
  success: boolean;
  status: "LIVE" | "CACHED" | "ERROR";
  generated_time: string;
  radar_frames: RadarFrame[];
  nowcast_frames: RadarFrame[];
  host: string;
  current_frame: number;
  total_frames: number;
  attribution: string;
  coverage: string;
  update_frequency: string;
  cached?: boolean;
  error?: string;
}

// ─── IMD Doppler Weather Radar Types (VNET-DWR-RADAR-002) ───────────────────

export type IMDStationCode =
  | "mum"
  | "vrv"
  | "pnv"
  | "mhb"
  | "slp"
  | "goa"
  | "chn"
  | "shr"
  | "koc"
  | "tvm"
  | "ngp"
  | "hyd"
  | "kol"
  | "vsk"
  | "mpt"
  | "bhp"
  | "jpr"
  | "lkn"
  | "ptn"
  | "bhj";

export type IMDRadarProductCode =
  | "caz" // MAX Reflectivity (Z)
  | "sri" // Surface Rainfall Intensity
  | "vp2" // Radial Velocity PPI(V)
  | "pac" // Precipitation Accumulation
  | "ppi" // Plan Position Indicator (Reflectivity)
  | "ppz"; // PPI Z Reflectivity

export type RadarPanelId = "panel_1" | "panel_2" | "panel_3" | "panel_4";

export type RadarFailureState =
  | "LOADING"
  | "READY"
  | "RADAR_DATA_UNAVAILABLE"
  | "OUTSIDE_RADAR_COVERAGE"
  | "STALE_FRAME"
  | "PROVIDER_ERROR";

export type RadarProviderType = "IMD_OFFICIAL" | "RAINVIEWER_FALLBACK";

export interface IMDStationInfo {
  code: IMDStationCode;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  band: "S-Band" | "C-Band" | "X-Band";
  availableProducts: IMDRadarProductCode[];
  hasAnimation: boolean;
}

export interface RadarCoverageContext {
  station: IMDStationInfo;
  distanceKm: number;
  coverageStatus: "DIRECT" | "PERIPHERAL" | "OUTSIDE";
  districtId: string;
  districtName: string;
  secondaryStation?: IMDStationInfo & { distanceKm: number };
}

export interface RadarPanelMetadata {
  panelId: RadarPanelId;
  productName: string;
  productCode: IMDRadarProductCode;
  radarStation: string;
  stationCode: string;
  location: string;
  source: string;
  scanTimeIst: string;
  scanTimeUtc: string;
  dataStatus: "LIVE" | "CACHED" | "FALLBACK" | "UNAVAILABLE";
  isStale: boolean;
  ageMinutes: number;
}
