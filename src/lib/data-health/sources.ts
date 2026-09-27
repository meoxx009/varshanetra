/**
 * VarshaNetra - Data Health Sources Registry
 * VN-TASK-8.5: Telemetry Sources Seed & Health Verification Queries
 */

export interface DataSourceSeed {
  id: string;
  name: string;
  type: "NOWCAST" | "FORECAST" | "RADAR" | "SATELLITE" | "TERRAIN" | "MAP";
  expected_freq_minutes: number;
  source_url: string;
  status_check_sql?: string;
  resolution?: string;
  isOfficial?: boolean;
}

export const data_sources: DataSourceSeed[] = [
  {
    id: "tomorrowio-nowcast",
    name: "Tomorrow.io Hyper-Local Nowcast",
    type: "NOWCAST",
    expected_freq_minutes: 2,
    source_url: "https://docs.tomorrow.io/",
    status_check_sql: "SELECT EXTRACT(EPOCH FROM (NOW() - last_success_at))/60 AS mins_old FROM provider_health WHERE provider='tomorrowio';",
    resolution: "1km / 1-min",
    isOfficial: false,
  },
  {
    id: "open-meteo",
    name: "Open-Meteo Global Weather Telemetry",
    type: "FORECAST",
    expected_freq_minutes: 60,
    source_url: "https://open-meteo.com/en/docs",
    resolution: "11km / 1-hr",
    isOfficial: false,
  },
  {
    id: "rainviewer-radar",
    name: "RainViewer Global Doppler Radar",
    type: "RADAR",
    expected_freq_minutes: 10,
    source_url: "https://www.rainviewer.com/api.html",
    resolution: "512px High-DPI",
    isOfficial: false,
  },
  {
    id: "imd-radar",
    name: "IMD Doppler Weather Radar Network",
    type: "RADAR",
    expected_freq_minutes: 15,
    source_url: "https://mausam.imd.gov.in/",
    resolution: "250km station radius",
    isOfficial: true,
  },
];
