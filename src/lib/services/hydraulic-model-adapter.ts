/**
 * Hydraulic Inundation Modeling Adapter Layer
 * VarshaNetra Emergency Early Warning System (VARSHANETRA-12)
 *
 * CRITICAL ENGINEERING DIRECTIVE:
 * Establishes a strict boundary between:
 * 1. Empirical Multi-Factor Flood Risk Index (statistical situational decision support)
 * 2. Physically-calibrated 2D Hydrodynamic / Hydraulic Inundation Modeling (e.g. HEC-RAS 2D, LISFLOOD-FP, or validated physics surrogates).
 *
 * Under VarshaNetra Directive #14, #17, and #18, fabricated or synthetic water depth in metres
 * MUST NEVER be displayed if no calibrated hydraulic model is actively linked.
 * When unconfigured, the adapter transparently returns:
 * "Inundation depth model not yet configured"
 */

import {
  HydraulicInundationAdapter,
  HydraulicModelConfig,
  HydraulicDepthResult,
} from "@/types";

export interface CalibratedHydraulicDataset {
  extentGeometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][];
  };
  depthRasterUrl?: string | null;
  velocityRasterUrl?: string | null;
  simulationTimestamp?: string | null;
  modelName: "HEC-RAS-2D" | "LISFLOOD-FP" | "NONE";
  meshResolutionMeters?: number;
  calibratedGaugeStations?: string[];
  lastCalibrationDate?: string;
  depthUnit: "meters";
  velocityUnit: "m/s";
}

export class UnconfiguredHydraulicAdapter implements HydraulicInundationAdapter {
  private readonly config: HydraulicModelConfig = {
    modelType: "NONE",
    status: "NOT_CONFIGURED",
    statusText: "Inundation depth model not yet configured",
    validationStatus: "Awaiting ground-truth hydraulic calibration against CWC/WRD river gauge stations",
    description:
      "Physical hydrodynamic simulation (2D Saint-Venant shallow water equations / HEC-RAS / LISFLOOD-FP) is not configured for this sector. Water depths in metres are withheld to prevent misleading operational commands.",
  };

  isConfigured(): boolean {
    return false;
  }

  getModelConfig(): HydraulicModelConfig {
    return this.config;
  }

  async getInundationDepth(
    latitude: number,
    longitude: number
  ): Promise<HydraulicDepthResult> {
    // Unconfigured stub: consumes parameters for future HEC-RAS grid lookup
    void latitude;
    void longitude;
    return {

      isConfigured: false,
      depthMeters: null,
      statusText: "Inundation depth model not yet configured",
      modelType: "NONE",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Singleton instance of the active hydraulic model adapter.
 * Replace with HecRasSurrogateAdapter or LisfloodAdapter when calibrated NetCDF/GeoTIFF raster tiles become available.
 */
export const activeHydraulicAdapter: HydraulicInundationAdapter = new UnconfiguredHydraulicAdapter();

/**
 * Returns current configuration status of the district hydraulic inundation model.
 */
export function getHydraulicModelStatus(): HydraulicModelConfig {
  return activeHydraulicAdapter.getModelConfig();
}
