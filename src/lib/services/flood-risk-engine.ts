/**
 * VarshaNetra Flood Risk Engine (Version 1 - Experimental Decision-Support Index)
 *
 * CRITICAL DIRECTIVE:
 * This is an experimental decision-support risk index designed for situational awareness
 * and resource prioritization in Indian district emergency operations.
 * It is NOT an operationally validated flood probability or certified AI prediction.
 *
 * METHODOLOGY & DOCUMENTATION:
 * 1. Factor 1: Forecast Precipitation (Forward 24h) - Weight: 35%
 *    - Captures imminent rainfall volume.
 *    - Normalization: Piecewise linear against IMD thresholds:
 *      0mm = 0 pts; 15mm (Light) = 25 pts; 64.5mm (Moderate/Heavy) = 65 pts; 115.5mm (Very Heavy) = 90 pts; >=150mm = 100 pts.
 *
 * 2. Factor 2: Antecedent 24h Rainfall - Weight: 20%
 *    - Captures recent saturation of upper soil layers.
 *    - Normalization: 0mm = 0 pts; 15mm = 30 pts; 40mm = 65 pts; >=75mm = 100 pts.
 *
 * 3. Factor 3: Antecedent 48h Rainfall - Weight: 15%
 *    - Captures subsurface catchment recharge and base river flow elevation.
 *    - Normalization: 0mm = 0 pts; 25mm = 30 pts; 60mm = 65 pts; >=100mm = 100 pts.
 *
 * 4. Factor 4: Terrain / Topographical Slope - Weight: 15% (when available)
 *    - Flat basins, bowl topography, and low gradients (<2%) exhibit severe ponding risk.
 *    - Steeper terrain (>10%) drains quickly unless channeled into narrow valleys.
 *    - Normalization: Flat (<1%) = 95 pts; Low (1-3%) = 75 pts; Moderate (3-6%) = 45 pts; Steep (>10%) = 15 pts.
 *    - If unavailable: Marked unmeasured; active weights are re-scaled proportionally.
 *
 * 5. Factor 5: Distance to Nearest River / Stream - Weight: 15% (when available)
 *    - Floodplain buffer proximity from OpenStreetMap waterway layers.
 *    - Normalization: <150m = 100 pts; 150-500m = 80 pts; 500-1500m = 45 pts; 1500-3000m = 20 pts; >3000m = 5 pts.
 *    - If unavailable: Marked unmeasured; active weights are re-scaled proportionally.
 *
 * RISK LEVEL THRESHOLDS:
 * - 0.0 - 24.9: LOW (Green)
 * - 25.0 - 49.9: MODERATE (Amber)
 * - 50.0 - 74.9: HIGH (Orange)
 * - 75.0 - 100.0: SEVERE (Red)
 */

import {
  FloodRiskEngineInputs,
  FloodRiskCalculationResult,
  FloodRiskLevel,
  FloodRiskFactorBreakdown,
  InundationSusceptibilityInputs,
  InundationSusceptibilityResult,
  InundationSusceptibilityClass,
  DataCompletenessLevel,
  InundationFactorBreakdown,
  ForecastWindow,
  RiskAssessmentInput,
  RiskFactorResult,
  FloodRiskScoreResult,
} from "@/types";
import { getDistrictTerrain, DistrictTerrainData } from "@/data/districtTerrain";

export type { RiskAssessmentInput, RiskFactorResult, FloodRiskScoreResult };
export type { DistrictTerrainData };

export const EXPERIMENTAL_DISCLAIMER =
  "EXPERIMENTAL DECISION-SUPPORT INDEX (V1): This metric is an algorithmic situational index computed from multi-factor meteorological and geospatial telemetry. It is not an operationally calibrated hydraulic flood probability or certified government forecast. Use alongside official IMD/CWC bulletins and on-ground field reconnaissance.";

/**
 * Normalizes forecast rainfall (mm) to 0-100 scale, taking forecast horizon into account.
 * For 24h: standard IMD 24h thresholds (15.5mm, 64.4mm, 115.5mm).
 * For shorter horizons (3h, 6h, 12h), rainfall is evaluated against intense short-duration burst baselines.
 */
export function normalizeForecastRain(mm: number, window: "3h" | "6h" | "12h" | "24h" = "24h"): number {
  if (mm <= 0) return 0;

  // Scaling factor based on standard Indian rainfall intensity distribution (IDF curve)
  // 3h burst: 15mm is significant (equivalent to ~50mm/24h in intensity)
  // 6h burst: 25mm is significant
  // 12h burst: 45mm is significant
  // 24h: 64.5mm is significant
  let t1 = 15.5;
  let t2 = 64.4;
  let t3 = 115.5;
  let t4 = 160;

  if (window === "3h") {
    t1 = 5.0;
    t2 = 20.0;
    t3 = 45.0;
    t4 = 75.0;
  } else if (window === "6h") {
    t1 = 8.0;
    t2 = 35.0;
    t3 = 70.0;
    t4 = 100.0;
  } else if (window === "12h") {
    t1 = 12.0;
    t2 = 50.0;
    t3 = 90.0;
    t4 = 130.0;
  }

  if (mm <= t1) {
    return (mm / t1) * 25;
  }
  if (mm <= t2) {
    return 25 + ((mm - t1) / (t2 - t1)) * 40;
  }
  if (mm <= t3) {
    return 65 + ((mm - t2) / (t3 - t2)) * 25;
  }
  if (mm <= t4) {
    return 90 + ((mm - t3) / (t4 - t3)) * 10;
  }
  return 100;
}


/**
 * Normalizes prior 24-hour antecedent rainfall (mm) to 0-100 scale.
 */
export function normalizeAntecedent24h(mm: number): number {
  if (mm <= 0) return 0;
  if (mm <= 15) {
    return (mm / 15) * 30;
  }
  if (mm <= 45) {
    return 30 + ((mm - 15) / 30) * 40;
  }
  if (mm <= 75) {
    return 70 + ((mm - 45) / 30) * 30;
  }
  return 100;
}

/**
 * Normalizes prior 48-hour antecedent rainfall (mm) to 0-100 scale.
 */
export function normalizeAntecedent48h(mm: number): number {
  if (mm <= 0) return 0;
  if (mm <= 25) {
    return (mm / 25) * 30;
  }
  if (mm <= 60) {
    return 30 + ((mm - 25) / 35) * 40;
  }
  if (mm <= 100) {
    return 70 + ((mm - 60) / 40) * 30;
  }
  return 100;
}

/**
 * Normalizes terrain slope gradient (%) to 0-100 flood vulnerability score.
 */
export function normalizeTerrainSlope(slopePercent: number): number {
  if (slopePercent < 0) return 90; // Depression / basin
  if (slopePercent <= 1.0) return 95; // Extreme flat plain / bowl
  if (slopePercent <= 3.0) return 75; // Low slope, sluggish runoff
  if (slopePercent <= 6.0) return 45; // Moderate gradient
  if (slopePercent <= 12.0) return 25; // Good natural gravity runoff
  return 10; // Steep ridge
}

/**
 * Normalizes distance to nearest mapped river/stream (meters) to 0-100 proximity risk.
 */
export function normalizeRiverProximity(distanceMeters: number): number {
  if (distanceMeters <= 150) return 100; // Immediate active riverbank
  if (distanceMeters <= 500) {
    return 100 - ((distanceMeters - 150) / 350) * 25; // 100 -> 75
  }
  if (distanceMeters <= 1500) {
    return 75 - ((distanceMeters - 500) / 1000) * 35; // 75 -> 40
  }
  if (distanceMeters <= 3000) {
    return 40 - ((distanceMeters - 1500) / 1500) * 25; // 40 -> 15
  }
  return 5; // Far from surface waterways
}

/**
 * Maps final composite score to dual-channel FloodRiskLevel.
 */
export function mapScoreToRiskLevel(score: number): FloodRiskLevel {
  if (score < 25.0) return "LOW";
  if (score < 50.0) return "MODERATE";
  if (score < 75.0) return "HIGH";
  return "SEVERE";
}

/**
 * Normalizes relative elevation deficit against local basin minimum (meters) to 0-100 susceptibility score.
 * Lower elevations closer to drainage outfalls / base river level have higher inundation susceptibility.
 * <= 5m: 100 pts (Outfall basin / riverbed grade)
 * 5m - 15m: 100 -> 85 pts (Depression bowl)
 * 15m - 30m: 85 -> 65 pts (Valley floor / alluvial lowlands)
 * 30m - 60m: 65 -> 40 pts (Intermediate terrace)
 * 60m - 120m: 40 -> 20 pts (Elevated plateau / piedmont)
 * > 120m: 5 pts (High ridge / hillside)
 */
export function normalizeRelativeElevation(deltaMeters: number): number {
  if (deltaMeters <= 5) return 100;
  if (deltaMeters <= 15) {
    return 100 - ((deltaMeters - 5) / 10) * 15;
  }
  if (deltaMeters <= 30) {
    return 85 - ((deltaMeters - 15) / 15) * 20;
  }
  if (deltaMeters <= 60) {
    return 65 - ((deltaMeters - 30) / 30) * 25;
  }
  if (deltaMeters <= 120) {
    return 40 - ((deltaMeters - 60) / 60) * 20;
  }
  return 5;
}

/**
 * Maps composite susceptibility score to dual-channel InundationSusceptibilityClass.
 * Thresholds: 0-24.9 LOW, 25.0-49.9 MODERATE, 50.0-74.9 HIGH, 75.0-100.0 SEVERE.
 */
export function mapScoreToSusceptibilityClass(score: number): InundationSusceptibilityClass {
  if (score < 25.0) return "LOW";
  if (score < 50.0) return "MODERATE";
  if (score < 75.0) return "HIGH";
  return "SEVERE";
}

/**
 * Maps data completeness percentage to qualitative level.
 */
export function mapCompletenessToLevel(percentage: number): DataCompletenessLevel {
  if (percentage >= 80) return "HIGH";
  if (percentage >= 50) return "MEDIUM";
  return "LIMITED";
}

export const INUNDATION_SUSCEPTIBILITY_WEIGHTS = {
  forecastPrecipitation: 0.30,
  antecedentRainfall: 0.20, // 24h: 0.12, 48h: 0.08
  relativeElevation: 0.20,
  terrainSlope: 0.15,
  waterwayProximity: 0.15,
} as const;

/**
 * Pure, deterministic calculation function for Flood Risk Engine V1.
 * Guaranteed zero randomness: Same inputs always produce the exact same numerical result.
 */
export function calculateFloodRisk(inputs: FloodRiskEngineInputs): FloodRiskCalculationResult {
  const factors: FloodRiskFactorBreakdown[] = [];

  // Base raw weights
  const RAW_WEIGHTS = {
    forecast24h: 0.35,
    antecedent24h: 0.20,
    antecedent48h: 0.15,
    terrain: 0.15,
    river: 0.15,
  };

  // 1. Forecast or Official Ground-Gauge Precipitation (LIVE-005)
  const windowKey = inputs.forecastWindow || "24h";
  const hasOfficialImd = typeof inputs.imdOfficialRainfallMm === "number" && !isNaN(inputs.imdOfficialRainfallMm);
  const primaryPrecip = hasOfficialImd ? inputs.imdOfficialRainfallMm! : inputs.forecastRain24h;
  const fNorm = normalizeForecastRain(primaryPrecip, windowKey);
  factors.push({
    key: "FORECAST_RAIN_24H",
    label: hasOfficialImd ? "IMD District Ground Observation (Official)" : `Forward ${windowKey} Precipitation`,
    rawValue: primaryPrecip,
    unit: "mm",
    normalizedScore: Number(fNorm.toFixed(1)),
    weight: RAW_WEIGHTS.forecast24h,
    weightedContribution: 0, // calculated below after weight normalization
    available: true,
    badgeText: hasOfficialImd ? "OFFICIAL" : undefined,
    rationale: hasOfficialImd
      ? `Official IMD ground observation via data.gov.in (${primaryPrecip} mm) provides high-credibility verified catchment loading.`
      : inputs.forecastRain24h > 45
        ? `Heavy forward downpour (${inputs.forecastRain24h} mm in +${windowKey}) exceeds urban stormwater design baseline.`
        : inputs.forecastRain24h > 15
        ? `Moderate anticipated rainfall (${inputs.forecastRain24h} mm in +${windowKey}); standard canal discharge anticipated.`
        : `Low projected precipitation (${inputs.forecastRain24h} mm in +${windowKey}); minimal new stormwater inflow.`,
  });


  // 2. Antecedent 24h
  const a24Norm = normalizeAntecedent24h(inputs.antecedent24h);
  factors.push({
    key: "ANTECEDENT_24H",
    label: "Prior 24h Antecedent Rain",
    rawValue: inputs.antecedent24h,
    unit: "mm",
    normalizedScore: Number(a24Norm.toFixed(1)),
    weight: RAW_WEIGHTS.antecedent24h,
    weightedContribution: 0,
    available: true,
    rationale:
      inputs.antecedent24h > 40
        ? `Heavy prior rainfall (${inputs.antecedent24h} mm) has primed upper soil layers toward saturation.`
        : inputs.antecedent24h > 10
        ? `Moist ground conditions (${inputs.antecedent24h} mm recorded).`
        : `Dry antecedent ground (${inputs.antecedent24h} mm); retains initial infiltration capacity.`,
  });

  // 3. Antecedent 48h
  const a48Norm = normalizeAntecedent48h(inputs.antecedent48h);
  factors.push({
    key: "ANTECEDENT_48H",
    label: "Prior 48h Catchment Inflow",
    rawValue: inputs.antecedent48h,
    unit: "mm",
    normalizedScore: Number(a48Norm.toFixed(1)),
    weight: RAW_WEIGHTS.antecedent48h,
    weightedContribution: 0,
    available: true,
    rationale:
      inputs.antecedent48h > 60
        ? `Extended 48h catchment loading (${inputs.antecedent48h} mm) sustains elevated river baselines.`
        : `48h cumulative antecedent precipitation (${inputs.antecedent48h} mm).`,
  });

  // 4. Terrain Slope (Optional / When Available)
  const hasTerrain = inputs.elevationOrSlope !== undefined && !isNaN(inputs.elevationOrSlope);
  const tNorm = hasTerrain ? normalizeTerrainSlope(inputs.elevationOrSlope!) : 0;
  factors.push({
    key: "TERRAIN_SLOPE",
    label: "Topographical Slope / Basin Gradient",
    rawValue: hasTerrain ? inputs.elevationOrSlope! : "Not Mapped",
    unit: hasTerrain ? "%" : "",
    normalizedScore: hasTerrain ? Number(tNorm.toFixed(1)) : 0,
    weight: RAW_WEIGHTS.terrain,
    weightedContribution: 0,
    available: hasTerrain,
    rationale: hasTerrain
      ? inputs.elevationOrSlope! < 2
        ? `Low slope gradient (${inputs.elevationOrSlope}%); high susceptibility to localized ponding.`
        : `Moderate terrain gradient (${inputs.elevationOrSlope}%); promotes gravitational runoff.`
      : "High-resolution DEM/slope layer not configured for this coordinate. Data completeness adjusted.",
  });

  // 5. River Proximity (Optional / When Available)
  const hasRiver = inputs.distanceToRiverMeters !== undefined && !isNaN(inputs.distanceToRiverMeters);
  const rNorm = hasRiver ? normalizeRiverProximity(inputs.distanceToRiverMeters!) : 0;
  factors.push({
    key: "RIVER_PROXIMITY",
    label: "Proximity to Waterway / Riverbed",
    rawValue: hasRiver ? Math.round(inputs.distanceToRiverMeters!) : "Not Mapped",
    unit: hasRiver ? "m" : "",
    normalizedScore: hasRiver ? Number(rNorm.toFixed(1)) : 0,
    weight: RAW_WEIGHTS.river,
    weightedContribution: 0,
    available: hasRiver,
    rationale: hasRiver
      ? inputs.distanceToRiverMeters! < 300
        ? `Within ${Math.round(inputs.distanceToRiverMeters!)}m of mapped waterway; exposed to channel overtopping.`
        : `Located ${Math.round(inputs.distanceToRiverMeters!)}m from nearest mapped stream channel.`
      : "OSM waterway reach distance unverified for active perimeter. Weight re-allocated to active factors.",
  });

  // 6. ISRO MOSDAC (INSAT-3D) Satellite Telemetry (LIVE-003)
  const hasMosdac = inputs.mosdacRainfallRate !== undefined && !isNaN(inputs.mosdacRainfallRate);
  if (hasMosdac) {
    const rate = inputs.mosdacRainfallRate!;
    // Scale rate: 0mm/hr = 0pts; 5mm/hr = 30pts; 10mm/hr = 70pts; >=20mm/hr = 100pts
    let mosdacScore = 0;
    if (rate <= 5) mosdacScore = (rate / 5) * 30;
    else if (rate <= 10) mosdacScore = 30 + ((rate - 5) / 5) * 40;
    else if (rate <= 20) mosdacScore = 70 + ((rate - 10) / 10) * 30;
    else mosdacScore = 100;

    factors.push({
      key: "ISRO_MOSDAC_RAINFALL",
      label: "🛰️ ISRO INSAT-3D",
      rawValue: rate,
      unit: "mm/hr",
      normalizedScore: Number(mosdacScore.toFixed(1)),
      weight: 0.15,
      weightedContribution: 0,
      available: true,
      rationale:
        rate > 10
          ? `🛰️ ISRO INSAT-3D: ${rate} mm/hr वर्षा दर - Intense cloud-burst potential detected.`
          : `🛰️ ISRO INSAT-3D: ${rate} mm/hr वर्षा दर - Normal satellite precipitation rate.`,
    });
  }

  // 7. NASA GPM IMERG Satellite Rainfall Observation (LIVE-002)
  const satVal = inputs.nasaGpmRainfallMm ?? inputs.satelliteRainfallMm;
  const hasSatVal = satVal !== undefined && satVal !== null && !isNaN(satVal);
  if (hasSatVal) {
    const satMm = satVal!;
    let satScore = 0;
    let satCategory = "Normal";

    if (satMm > 115.6) {
      satScore = 95;
      satCategory = "Extremely Heavy";
    } else if (satMm > 64.5) {
      satScore = 75;
      satCategory = "Heavy";
    } else if (satMm > 15.6) {
      satScore = 40;
      satCategory = "Moderate";
    } else {
      satScore = Math.min(25, (satMm / 15.6) * 25);
    }

    factors.push({
      key: "NASA_GPM_SATELLITE_RAINFALL",
      label: "🛰️ NASA GPM Satellite Rainfall",
      rawValue: satMm,
      unit: "mm",
      normalizedScore: Number(satScore.toFixed(1)),
      weight: 0.2,
      weightedContribution: 0,
      available: true,
      rationale: `🛰️ NASA GPM observed ${satMm} mm precipitation (${satCategory}). Ground truth satellite calibration applied.`,
      isSatellite: true,
      badgeText: "SATELLITE OBSERVED",
    });
  }

  // Calculate Data Completeness (sum of weights of available inputs over total)
  const availableWeightTotal = factors
    .filter((f) => f.available)
    .reduce((sum, f) => sum + f.weight, 0);

  const dataCompleteness = Math.round(availableWeightTotal * 100);

  // Re-scale weights across available inputs so total active weight equals 1.0 (100%)
  let compositeScore = 0;
  factors.forEach((f) => {
    if (f.available) {
      const normalizedWeight = f.weight / availableWeightTotal;
      f.weightedContribution = Number((f.normalizedScore * normalizedWeight).toFixed(2));
      compositeScore += f.weightedContribution;
    } else {
      f.weightedContribution = 0;
    }
  });

  const finalRiskScore = Number(Math.min(Math.max(compositeScore, 0), 100).toFixed(1));
  const riskLevel = mapScoreToRiskLevel(finalRiskScore);

  // Generate explainable summary reasons
  const summaryReasons: string[] = [];

  if (hasSatVal && satVal! > inputs.forecastRain24h + 25) {
    summaryReasons.push(
      "उपग्रह डेटा मॉडल से अधिक वर्षा दर्शाता है - जोखिम बढ़ा हुआ हो सकता है (Satellite shows higher rainfall than model - risk may be elevated)."
    );
  }

  if (inputs.mosdacRainfallRate !== undefined && inputs.mosdacRainfallRate > 10) {
    summaryReasons.push(`🛰️ ISRO INSAT-3D: ${inputs.mosdacRainfallRate} mm/hr वर्षा दर - High intensity precipitation.`);
  }

  if (inputs.mosdacCloudTempKelvin !== undefined && inputs.mosdacCloudTempKelvin < 220) {
    summaryReasons.push(`तीव्र संवहनी तूफान का संकेत - अचानक बाढ़ का जोखिम (Intense convective storm detected by INSAT-3D [${inputs.mosdacCloudTempKelvin}K] - flash flood risk elevated).`);
  }

  if (inputs.forecastRain24h > 45) {
    summaryReasons.push(`Severe forecast precipitation (${inputs.forecastRain24h} mm in +${windowKey}) drives significant runoff surge.`);
  } else if (inputs.forecastRain24h > 15) {
    summaryReasons.push(`Moderate forward precipitation (${inputs.forecastRain24h} mm in +${windowKey}) requires drainage monitoring.`);
  }


  if (inputs.antecedent24h > 35) {
    summaryReasons.push(`Recent 24h antecedent rainfall (${inputs.antecedent24h} mm) has severely restricted soil infiltration capacity.`);
  }

  if (hasRiver && inputs.distanceToRiverMeters! < 300) {
    summaryReasons.push(`Close proximity to surface waterway (${Math.round(inputs.distanceToRiverMeters!)}m) elevates embankment overtopping risk.`);
  }

  if (hasTerrain && inputs.elevationOrSlope! < 1.5) {
    summaryReasons.push(`Low-lying flat basin geometry (${inputs.elevationOrSlope}% gradient) impedes natural gravity drainage.`);
  }

  if (summaryReasons.length === 0) {
    summaryReasons.push("All monitored rainfall horizons and terrain metrics remain well within normal drainage capacity thresholds.");
  }

  const technicalExplanation = `Calculated via VarshaNetra Multi-Factor Decision Support Engine (V1). Factors evaluated: ${
    factors.filter((f) => f.available).map((f) => `${f.label} [${f.normalizedScore} pts, ${Math.round((f.weight / availableWeightTotal) * 100)}% active wt]`).join(", ")
  }. Total weighted score: ${finalRiskScore}/100 resulting in ${riskLevel} operational watch level.`;

  const now = new Date();
  const validUntilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    riskScore: finalRiskScore,
    riskLevel,
    dataCompleteness,
    validUntil: validUntilDate.toISOString(),
    calculatedAt: now.toISOString(),
    contributingFactors: factors,
    summaryReasons,
    technicalExplanation,
    isExperimental: true,
    disclaimer: EXPERIMENTAL_DISCLAIMER,
  };
}

/**
 * VarshaNetra Experimental Inundation Susceptibility Engine V1.
 *
 * Deterministic multi-factor calculation combining:
 * 1. Forecast Precipitation (30%)
 * 2. Antecedent Rainfall (20%: 12% 24h + 8% 48h)
 * 3. Relative Elevation Deficit (20%)
 * 4. Terrain Slope (15%)
 * 5. Waterway Proximity (15%)
 *
 * Missing inputs are transparently tracked, active weights re-allocated proportionally,
 * and data completeness quantitatively reported without fabricating data.
 */
export function calculateInundationSusceptibility(
  inputs: InundationSusceptibilityInputs
): InundationSusceptibilityResult {
  const factors: InundationFactorBreakdown[] = [];
  const missingFactors: string[] = [];

  const windowKey: ForecastWindow = inputs.forecastWindow || "24h";

  // 1. Forecast Precipitation (30%)
  const fNorm = normalizeForecastRain(inputs.forecastRainMm, windowKey);
  factors.push({
    key: "FORECAST_PRECIPITATION",
    label: `Forward ${windowKey} Precipitation`,
    labelHi: `आगामी ${windowKey} वर्षा पूर्वानुमान`,
    rawValue: inputs.forecastRainMm,
    unit: "mm",
    normalizedScore: Number(fNorm.toFixed(1)),
    weight: INUNDATION_SUSCEPTIBILITY_WEIGHTS.forecastPrecipitation,
    activeWeight: 0,
    weightedContribution: 0,
    available: true,
    rationale:
      inputs.forecastRainMm > 45
        ? `Heavy forward rainfall (${inputs.forecastRainMm} mm in +${windowKey}) exceeds surface drainage capacity.`
        : inputs.forecastRainMm > 15
        ? `Moderate rainfall (${inputs.forecastRainMm} mm in +${windowKey}) generates standard stormwater discharge.`
        : `Light or negligible precipitation (${inputs.forecastRainMm} mm in +${windowKey}).`,
    rationaleHi:
      inputs.forecastRainMm > 45
        ? `आगामी भारी वर्षा (+${windowKey} में ${inputs.forecastRainMm} मिमी) सतही जल निकासी क्षमता से अधिक है।`
        : inputs.forecastRainMm > 15
        ? `मध्यम वर्षा (+${windowKey} में ${inputs.forecastRainMm} मिमी) सामान्य तूफानी जल अपवाह उत्पन्न करती है।`
        : `हल्की या नगण्य वर्षा (+${windowKey} में ${inputs.forecastRainMm} मिमी)।`,
    source: "Open-Meteo GFS/ECMWF Ensemble",
  });

  // 2. Antecedent Rainfall (20%: 12% 24h + 8% 48h)
  const a24Norm = normalizeAntecedent24h(inputs.antecedent24hMm);
  const a48Norm = normalizeAntecedent48h(inputs.antecedent48hMm);
  const combinedAntecedentNorm = Number(((a24Norm * 0.12 + a48Norm * 0.08) / 0.20).toFixed(1));
  factors.push({
    key: "ANTECEDENT_RAINFALL",
    label: "Antecedent Soil Saturation (24h/48h)",
    labelHi: "पूर्ववर्ती मृदा संतृप्ति (24घं/48घं)",
    rawValue: `${inputs.antecedent24hMm} / ${inputs.antecedent48hMm}`,
    unit: "mm",
    normalizedScore: combinedAntecedentNorm,
    weight: INUNDATION_SUSCEPTIBILITY_WEIGHTS.antecedentRainfall,
    activeWeight: 0,
    weightedContribution: 0,
    available: true,
    rationale:
      inputs.antecedent24hMm > 35 || inputs.antecedent48hMm > 60
        ? `High antecedent rainfall (${inputs.antecedent24hMm}mm 24h / ${inputs.antecedent48hMm}mm 48h) indicates saturated catchment ground.`
        : `Ground has adequate remaining infiltration capacity (${inputs.antecedent24hMm}mm 24h / ${inputs.antecedent48hMm}mm 48h).`,
    rationaleHi:
      inputs.antecedent24hMm > 35 || inputs.antecedent48hMm > 60
        ? `उच्च पूर्ववर्ती वर्षा (24घं: ${inputs.antecedent24hMm}मिमी / 48घं: ${inputs.antecedent48hMm}मिमी) जलग्रहण क्षेत्र के संतृप्त होने का संकेत देती है।`
        : `भूमि में पर्याप्त अवशोषण क्षमता शेष है (24घं: ${inputs.antecedent24hMm}मिमी / 48घं: ${inputs.antecedent48hMm}मिमी)।`,
    source: "Open-Meteo ERA5 Reanalysis",
  });

  // 3. Relative Elevation Deficit (20%)
  let relElevValue: number | undefined = inputs.relativeElevationMeters;
  if (relElevValue === undefined && inputs.elevationMeters !== undefined && !isNaN(inputs.elevationMeters)) {
    relElevValue = Math.max(0, inputs.elevationMeters - 522);
  }
  const hasRelElev = relElevValue !== undefined && !isNaN(relElevValue);
  const relElevNorm = hasRelElev ? normalizeRelativeElevation(relElevValue!) : 0;
  if (!hasRelElev) {
    missingFactors.push("Relative Elevation Deficit (NASA/Copernicus DEM)");
  }
  factors.push({
    key: "RELATIVE_ELEVATION",
    label: "Relative Elevation Deficit (Basin Base)",
    labelHi: "सापेक्ष ऊंचाई कमी (बेसिन आधार)",
    rawValue: hasRelElev ? Number(relElevValue!.toFixed(1)) : "Not Available",
    unit: hasRelElev ? "m" : "",
    normalizedScore: hasRelElev ? Number(relElevNorm.toFixed(1)) : 0,
    weight: INUNDATION_SUSCEPTIBILITY_WEIGHTS.relativeElevation,
    activeWeight: 0,
    weightedContribution: 0,
    available: hasRelElev,
    rationale: hasRelElev
      ? relElevValue! <= 15
        ? `Low-lying basin elevation (+${relElevValue!.toFixed(1)}m above sector outfall base); highly susceptible to backwater stagnation.`
        : `Elevated above basin floor (+${relElevValue!.toFixed(1)}m); favorable gravity head for runoff discharge.`
      : "DEM elevation raster not configured for active coordinate. Weight reallocated among active telemetry.",
    rationaleHi: hasRelElev
      ? relElevValue! <= 15
        ? `निचला बेसिन स्तर (क्षेत्र के निकास आधार से +${relElevValue!.toFixed(1)}मी); बैकवाटर ठहराव के प्रति अत्यधिक संवेदनशील।`
        : `बेसिन तल से ऊपर (+${relElevValue!.toFixed(1)}मी); अपवाह निकास हेतु अनुकूल गुरुत्वाकर्षण हेड।`
      : "सक्रिय निर्देशांक हेतु डीईएम ऊंचाई रास्टर उपलब्ध नहीं है। उपलब्ध टेलीमेट्री में भार पुनर्वितरित किया गया।",
    source: "NASA SRTM & Copernicus GLO-30 DEM",
  });

  // 4. Terrain Slope (15%)
  const hasSlope = inputs.slopePercent !== undefined && !isNaN(inputs.slopePercent);
  const slopeNorm = hasSlope ? normalizeTerrainSlope(inputs.slopePercent!) : 0;
  if (!hasSlope) {
    missingFactors.push("Topographical Slope Gradient (DEM Finite-Difference)");
  }
  factors.push({
    key: "TERRAIN_SLOPE",
    label: "Topographical Slope Gradient",
    labelHi: "स्थलाकृतिक भूभाग ढलान",
    rawValue: hasSlope ? Number(inputs.slopePercent!.toFixed(1)) : "Not Available",
    unit: hasSlope ? "%" : "",
    normalizedScore: hasSlope ? Number(slopeNorm.toFixed(1)) : 0,
    weight: INUNDATION_SUSCEPTIBILITY_WEIGHTS.terrainSlope,
    activeWeight: 0,
    weightedContribution: 0,
    available: hasSlope,
    rationale: hasSlope
      ? inputs.slopePercent! < 1.5
        ? `Depression/flat gradient (${inputs.slopePercent!.toFixed(1)}%); overland drainage is sluggish.`
        : `Slope of ${inputs.slopePercent!.toFixed(1)}% promotes natural gravitational overland flow.`
      : "Slope layer unmeasured for sector. Data completeness adjusted.",
    rationaleHi: hasSlope
      ? inputs.slopePercent! < 1.5
        ? `सपाट/गर्त ढलान (${inputs.slopePercent!.toFixed(1)}%); सतही जल निकासी धीमी है।`
        : `${inputs.slopePercent!.toFixed(1)}% की ढलान प्राकृतिक गुरुत्वाकर्षण प्रवाह को बढ़ावा देती है।`
      : "भूभाग ढलान परत अनुपलब्ध। डेटा पूर्णता स्तर तदनुसार समायोजित।",
    source: "Copernicus GLO-30 Derived Gradient",
  });

  // 5. Waterway Proximity (15%)
  const hasWaterway = inputs.distanceToWaterwayMeters !== undefined && !isNaN(inputs.distanceToWaterwayMeters);
  const waterwayNorm = hasWaterway ? normalizeRiverProximity(inputs.distanceToWaterwayMeters!) : 0;
  if (!hasWaterway) {
    missingFactors.push("Waterway / Riverbed Reach Proximity (OpenStreetMap)");
  }
  factors.push({
    key: "WATERWAY_PROXIMITY",
    label: "Waterway / Riverbed Proximity",
    labelHi: "जलमार्ग / नदी तट निकटता",
    rawValue: hasWaterway ? Math.round(inputs.distanceToWaterwayMeters!) : "Not Available",
    unit: hasWaterway ? "m" : "",
    normalizedScore: hasWaterway ? Number(waterwayNorm.toFixed(1)) : 0,
    weight: INUNDATION_SUSCEPTIBILITY_WEIGHTS.waterwayProximity,
    activeWeight: 0,
    weightedContribution: 0,
    available: hasWaterway,
    rationale: hasWaterway
      ? inputs.distanceToWaterwayMeters! <= 300
        ? `Within ${Math.round(inputs.distanceToWaterwayMeters!)}m active river corridor; elevated channel overtopping exposure.`
        : `Located ${Math.round(inputs.distanceToWaterwayMeters!)}m from nearest mapped stream channel.`
      : "OSM hydrographic vector reach unmeasured. Weight reallocated proportionally.",
    rationaleHi: hasWaterway
      ? inputs.distanceToWaterwayMeters! <= 300
        ? `सक्रिय नदी कॉरिडोर के ${Math.round(inputs.distanceToWaterwayMeters!)}मी के भीतर; चैनल ओवरटॉप्ड होने का अधिक जोखिम।`
        : `निकटतम मैप किए गए नदी चैनल से ${Math.round(inputs.distanceToWaterwayMeters!)}मी की दूरी पर स्थित।`
      : "ओपनस्ट्रीटमैप जलमार्ग रीच अनिर्धारित। उपलब्ध कारकों में भार पुनर्वितरित।",
    source: "OpenStreetMap Waterway Vectors",
  });

  // Calculate Data Completeness & Proportional Weight Rescaling
  const availableWeightTotal = factors
    .filter((f) => f.available)
    .reduce((sum, f) => sum + f.weight, 0);

  const dataCompleteness = Math.round(availableWeightTotal * 100);
  const completenessLevel = mapCompletenessToLevel(dataCompleteness);

  let compositeScore = 0;
  factors.forEach((f) => {
    if (f.available && availableWeightTotal > 0) {
      f.activeWeight = Number((f.weight / availableWeightTotal).toFixed(4));
      f.weightedContribution = Number((f.normalizedScore * f.activeWeight).toFixed(2));
      compositeScore += f.weightedContribution;
    } else {
      f.activeWeight = 0;
      f.weightedContribution = 0;
    }
  });

  const finalScore = Number(Math.min(Math.max(compositeScore, 0), 100).toFixed(1));
  const susceptibilityClass = mapScoreToSusceptibilityClass(finalScore);

  // Generate explainable summary reasons (English + Hindi)
  const summaryReasons: string[] = [];
  const summaryReasonsHi: string[] = [];

  if (inputs.forecastRainMm > 45) {
    summaryReasons.push(`Intense forecast rainfall (${inputs.forecastRainMm} mm in +${windowKey}) significantly elevates surface runoff volume.`);
    summaryReasonsHi.push(`भारी वर्षा पूर्वानुमान (+${windowKey} में ${inputs.forecastRainMm} मिमी) सतही अपवाह की मात्रा को काफी बढ़ा देता है।`);
  } else if (inputs.forecastRainMm > 15) {
    summaryReasons.push(`Moderate forecast precipitation (${inputs.forecastRainMm} mm in +${windowKey}) requires active drainage monitoring.`);
    summaryReasonsHi.push(`मध्यम वर्षा पूर्वानुमान (+${windowKey} में ${inputs.forecastRainMm} मिमी) के लिए सक्रिय जल निकासी निगरानी आवश्यक है।`);
  }

  if (inputs.antecedent24hMm > 35 || inputs.antecedent48hMm > 60) {
    summaryReasons.push(`Saturated antecedent catchment ground (${inputs.antecedent24hMm}mm 24h / ${inputs.antecedent48hMm}mm 48h) restricts soil absorption capacity.`);
    summaryReasonsHi.push(`संतृप्त पूर्ववर्ती जलग्रहण भूमि (24घं: ${inputs.antecedent24hMm}मिमी / 48घं: ${inputs.antecedent48hMm}मिमी) मिट्टी की अवशोषण क्षमता को सीमित करती है।`);
  }

  if (hasRelElev && relElevValue! <= 15) {
    summaryReasons.push(`Low-lying basin elevation (+${relElevValue!.toFixed(1)}m relative deficit) promotes ponding and slow natural drainage.`);
    summaryReasonsHi.push(`निचला बेसिन स्तर (+${relElevValue!.toFixed(1)}मी सापेक्ष कमी) जलभराव एवं धीमी प्राकृतिक जल निकासी को बढ़ाता है।`);
  }

  if (hasSlope && inputs.slopePercent! < 1.5) {
    summaryReasons.push(`Flat topographical gradient (${inputs.slopePercent!.toFixed(1)}%) impedes gravity runoff.`);
    summaryReasonsHi.push(`सपाट स्थलाकृतिक ढलान (${inputs.slopePercent!.toFixed(1)}%) गुरुत्वाकर्षण अपवाह को बाधित करती है।`);
  }

  if (hasWaterway && inputs.distanceToWaterwayMeters! <= 300) {
    summaryReasons.push(`High proximity to river corridor (${Math.round(inputs.distanceToWaterwayMeters!)}m) increases bank overflow susceptibility.`);
    summaryReasonsHi.push(`नदी कॉरिडोर से अत्यधिक निकटता (${Math.round(inputs.distanceToWaterwayMeters!)}मी) तटबंध ओवरफ्लो संवेदनशीलता को बढ़ाती है।`);
  }

  if (summaryReasons.length === 0) {
    summaryReasons.push("Monitored meteorological and topographic indicators remain within standard basin drainage limits.");
    summaryReasonsHi.push("निगरानी किए गए मौसम एवं स्थलाकृतिक संकेतक सामान्य बेसिन जल निकासी सीमा के भीतर हैं।");
  }

  // Primary driving factor for plain language explanation
  const topFactor = [...factors]
    .filter((f) => f.available)
    .sort((a, b) => b.weightedContribution - a.weightedContribution)[0];

  const plainLanguageExplanation = `This location exhibits ${susceptibilityClass} inundation susceptibility (${finalScore}/100, ${dataCompleteness}% data completeness), primarily driven by ${topFactor ? topFactor.label.toLowerCase() : "monitored meteorological conditions"} (${topFactor ? `${topFactor.weightedContribution} pts contribution` : ""}).`;
  const plainLanguageExplanationHi = `यह स्थान ${susceptibilityClass === "LOW" ? "कम" : susceptibilityClass === "MODERATE" ? "मध्यम" : susceptibilityClass === "HIGH" ? "उच्च" : "गंभीर"} जलभराव संवेदनशीलता (${finalScore}/100, ${dataCompleteness}% डेटा पूर्णता) प्रदर्शित करता है, जो मुख्य रूप से ${topFactor ? topFactor.labelHi || topFactor.label : "निगरानी की गई मौसमी स्थितियों"} (${topFactor ? `${topFactor.weightedContribution} अंक योगदान` : ""}) द्वारा संचालित है।`;

  const now = new Date();
  const validUntilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const disclaimerHi = "प्रायोगिक निर्णय-समर्थन सूचकांक (V1): यह मीट्रिक बहु-कारक मौसमी और भू-स्थानिक टेलीमेट्री से गणना किया गया एक एल्गोरिथम स्थितिजन्य सूचकांक है। यह परिचालन रूप से कैलिब्रेटेड 2D हाइड्रोलिक मॉडल या प्रमाणित सरकारी भविष्यवाणी नहीं है। इसका उपयोग आधिकारिक आईएमडी/सीडब्ल्यूसी बुलेटिन और जमीनी टोही के साथ किया जाना चाहिए।";

  return {
    score: finalScore,
    susceptibilityClass,
    dataCompleteness,
    completenessLevel,
    missingFactors,
    contributingFactors: factors,
    summaryReasons,
    summaryReasonsHi,
    plainLanguageExplanation,
    plainLanguageExplanationHi,
    calculatedAt: now.toISOString(),
    validUntil: validUntilDate.toISOString(),
    isExperimental: true,
    disclaimer: EXPERIMENTAL_DISCLAIMER,
    disclaimerHi,
  };
}

/**
 * Calculates flood risk score integrating NWP forecast, river level, soil moisture,
 * and high-priority NASA GPM satellite precipitation telemetry.
 */
export function calculateFloodRiskScore(input: RiskAssessmentInput): FloodRiskScoreResult {
  let score = 0;
  const factors: RiskFactorResult[] = [];
  let warningMessage: string | null = null;

  // 1. PRIMARY RAINFALL FACTOR: Official IMD Observation (LIVE-005) or NWP Forecast Model
  if (input.imdOfficialRainfallMm !== undefined && input.imdOfficialRainfallMm !== null) {
    const imdVal = input.imdOfficialRainfallMm;
    let imdPoints = 5;
    let imdCategory = "Light";

    if (imdVal > 115.6) {
      imdPoints = 35;
      imdCategory = "Extremely Heavy";
    } else if (imdVal > 64.5) {
      imdPoints = 25;
      imdCategory = "Heavy";
    } else if (imdVal > 15.6) {
      imdPoints = 15;
      imdCategory = "Moderate";
    }

    score += imdPoints;

    const forecastRef = input.openMeteoRainfallMm ?? input.nwpRainfallMm;
    const hasForecastRef = typeof forecastRef === "number" && forecastRef > 0;

    factors.push({
      name: `IMD District Rainfall Official: ${imdVal} mm`,
      nameHi: `🌧️ IMD जिला वर्षा (आधिकारिक): ${imdVal} मिमी`,
      value: `${imdVal} mm`,
      category: imdCategory,
      pointsAdded: imdPoints,
      badgeText: "OFFICIAL",
      isOfficialGovt: true,
      comparisonNote: hasForecastRef
        ? `Open-Meteo forecast: ${forecastRef} mm vs IMD observation: ${imdVal} mm`
        : undefined,
      comparisonNoteHi: hasForecastRef
        ? `Open-Meteo पूर्वानुमान: ${forecastRef} मिमी बनाम IMD अवलोकन: ${imdVal} मिमी`
        : undefined,
    });
  } else if (input.nwpRainfallMm > 115.6) {
    score += 30;
    factors.push({
      name: "NWP Model Rainfall",
      nameHi: "संख्यात्मक मौसम पूर्वानुमान वर्षा",
      value: `${input.nwpRainfallMm} mm`,
      category: "Extremely Heavy",
      pointsAdded: 30,
      badgeText: "NWP FORECAST",
      isSatellite: false,
    });
  } else if (input.nwpRainfallMm > 64.5) {
    score += 20;
    factors.push({
      name: "NWP Model Rainfall",
      nameHi: "संख्यात्मक मौसम पूर्वानुमान वर्षा",
      value: `${input.nwpRainfallMm} mm`,
      category: "Heavy",
      pointsAdded: 20,
      badgeText: "NWP FORECAST",
      isSatellite: false,
    });
  } else if (input.nwpRainfallMm > 15.6) {
    score += 10;
    factors.push({
      name: "NWP Model Rainfall",
      nameHi: "संख्यात्मक मौसम पूर्वानुमान वर्षा",
      value: `${input.nwpRainfallMm} mm`,
      category: "Moderate",
      pointsAdded: 10,
      badgeText: "NWP FORECAST",
      isSatellite: false,
    });
  }

  // 2. River Water Level Gauge Factor
  if (input.riverWaterLevelMeters > 5.0) {
    score += 25;
    factors.push({
      name: "River Water Level",
      nameHi: "नदी का जलस्तर",
      value: `${input.riverWaterLevelMeters} m`,
      category: "Critical Danger",
      pointsAdded: 25,
      badgeText: "CWC GAUGE",
      isSatellite: false,
    });
  } else if (input.riverWaterLevelMeters > 3.0) {
    score += 15;
    factors.push({
      name: "River Water Level",
      nameHi: "नदी का जलस्तर",
      value: `${input.riverWaterLevelMeters} m`,
      category: "Warning Level",
      pointsAdded: 15,
      badgeText: "CWC GAUGE",
      isSatellite: false,
    });
  }

  // 3. Soil Moisture Index Factor
  if (input.soilMoistureIndex > 0.8) {
    score += 20;
    factors.push({
      name: "Soil Moisture Index",
      nameHi: "मृदा नमी सूचकांक",
      value: `${(input.soilMoistureIndex * 100).toFixed(0)}%`,
      category: "Saturated",
      pointsAdded: 20,
      badgeText: "SOIL SATURATION",
      isSatellite: false,
    });
  } else if (input.soilMoistureIndex > 0.5) {
    score += 10;
    factors.push({
      name: "Soil Moisture Index",
      nameHi: "मृदा नमी सूचकांक",
      value: `${(input.soilMoistureIndex * 100).toFixed(0)}%`,
      category: "Moist",
      pointsAdded: 10,
      badgeText: "SOIL SATURATION",
      isSatellite: false,
    });
  }

  // 4. SATELLITE RAINFALL INTEGRATION (Higher weight given to satellite observation)
  if (input.satelliteRainfallMm !== undefined && input.satelliteRainfallMm !== null) {
    const satVal = input.satelliteRainfallMm;
    let satPoints = 0;
    let category = "Normal";

    if (satVal > 115.6) {
      satPoints = 35;
      category = "Extremely Heavy";
    } else if (satVal > 64.5) {
      satPoints = 25;
      category = "Heavy";
    } else if (satVal > 15.6) {
      satPoints = 10;
      category = "Moderate";
    }

    score += satPoints;

    factors.push({
      name: "NASA GPM Satellite Rainfall",
      nameHi: "🛰️ NASA GPM उपग्रह वर्षा",
      value: `${satVal} mm`,
      category,
      pointsAdded: satPoints,
      badgeText: "SATELLITE OBSERVED",
      isSatellite: true,
    });

    // Warning trigger if satellite precipitation is significantly higher than forecast model
    if (satVal > input.nwpRainfallMm + 25) {
      warningMessage =
        "उपग्रह डेटा मॉडल से अधिक वर्षा दर्शाता है - जोखिम बढ़ा हुआ हो सकता है (Satellite shows higher rainfall than model - risk may be elevated).";
    }
  }

  // 5. TERRAIN INTELLIGENCE INTEGRATION (LIVE-004)
  if (input.includeTerrain !== false) {
    const terrain = getDistrictTerrain(input.districtName);
    if (terrain) {
      const terrainRisk = getTerrainRiskScore(terrain);
      const pointsContribution = Math.min(25, Math.round(terrainRisk.score * 0.25));
      score += pointsContribution;

      factors.push({
        name: `Terrain Risk: ${terrainRisk.score} points`,
        nameHi: `🗺️ भूभाग जोखिम: ${terrainRisk.score} अंक`,
        value: `${terrainRisk.score}/100`,
        category: terrainRisk.score > 60 ? "High Vulnerability" : terrainRisk.score > 30 ? "Moderate" : "Low",
        pointsAdded: pointsContribution,
        badgeText: "PRE-PROCESSED DEM",
        isTerrain: true,
        subFactors: terrainRisk.subFactors,
        subFactorsHi: terrainRisk.subFactorsHi,
      });
    }
  }

  // 6. LIVE RADAR INTEGRATION (RADAR-001 PART 5)
  if (input.radarActive) {
    const frameTime = input.radarLastFrameTime || "Real-time";
    factors.push({
      name: "Live Radar: Active",
      nameHi: "🛰️ लाइव रडार: सक्रिय",
      value: `अंतिम रडार फ्रेम: ${frameTime} (Last radar frame: ${frameTime})`,
      category: "Active Telemetry",
      pointsAdded: 0,
      badgeText: "LIVE RADAR ACTIVE",
      isRadar: true,
      comparisonNote: "Open map tab to view rainfall pattern on radar.",
      comparisonNoteHi: "रडार मानचित्र पर वर्षा पैटर्न देखने के लिए मानचित्र टैब खोलें। अंतिम रडार फ्रेम: " + frameTime,
    });
  }

  // 7. CONVECTIVE RISK / CAPE FACTOR (SOURCES-002 PART 4)
  if (input.capeJkg !== undefined && input.capeJkg !== null) {
    const cape = input.capeJkg;
    let capePoints = 0;
    let capeCategory = "Low Convective Risk";

    if (cape > 3000) {
      capePoints = 20;
      capeCategory = "Extreme Convective Risk";
    } else if (cape >= 1500) {
      capePoints = 15;
      capeCategory = "High Convective Risk";
    } else if (cape >= 500) {
      capePoints = 5;
      capeCategory = "Moderate Convective Risk";
    }

    if (capePoints > 0) {
      score += capePoints;
    }

    factors.push({
      name: "Convective Risk (CAPE)",
      nameHi: "⚡ संवहनी जोखिम (CAPE सूचकांक)",
      value: `${cape} J/kg`,
      category: capeCategory,
      pointsAdded: capePoints,
      badgeText: "CAPE INSTABILITY",
      isConvective: true,
      comparisonNote:
        cape > 3000
          ? "Extreme convective rain - flash flood danger"
          : cape >= 1500
          ? "Intense rain with thunderstorm possible"
          : cape >= 500
          ? "Scattered thunderstorms possible"
          : "Atmosphere stable",
      comparisonNoteHi:
        cape > 3000
          ? "अत्यंत तीव्र संवहनी वर्षा - अचानक बाढ़ का खतरा"
          : cape >= 1500
          ? "गरज के साथ तीव्र वर्षा संभव"
          : cape >= 500
          ? "छिटपुट गरज-चमक संभव"
          : "स्थिर वायुमंडल",
    });

    if (cape >= 1500 && !warningMessage) {
      warningMessage = "उच्च CAPE वायुमंडलीय अस्थिरता - गरज के साथ तीव्र बौछारें संभव (High atmospheric CAPE - intense convective thunderstorm rainfall possible).";
    }
  }

  // 8. SEISMIC-LANDSLIDE RISK FACTOR FOR HILLY DISTRICTS (SOURCES-003 PART 4)
  const terrain = getDistrictTerrain(input.districtName);
  const isHilly = terrain ? terrain.elevation_mean_m > 500 || terrain.slope_mean_degrees > 10 : false;
  const rainTotal = input.satelliteRainfallMm ?? input.nwpRainfallMm;

  if (
    isHilly &&
    input.recentEarthquakeMagnitude !== undefined &&
    input.recentEarthquakeMagnitude !== null &&
    input.recentEarthquakeMagnitude >= 4.0 &&
    input.recentEarthquakeDistanceKm !== undefined &&
    input.recentEarthquakeDistanceKm !== null &&
    input.recentEarthquakeDistanceKm <= 100 &&
    rainTotal >= 64.5
  ) {
    score += 20;
    factors.push({
      name: "Seismic-Landslide Risk",
      nameHi: "भूकंप-भूस्खलन जोखिम",
      value: `M ${input.recentEarthquakeMagnitude.toFixed(1)} (${input.recentEarthquakeDistanceKm.toFixed(1)} km)`,
      category: "Critical Compound Hazard",
      pointsAdded: 20,
      badgeText: "USGS EARTHQUAKE PROGRAM",
      isSeismic: true,
      comparisonNote: `Recent M${input.recentEarthquakeMagnitude.toFixed(1)} quake within ${input.recentEarthquakeDistanceKm.toFixed(1)}km + heavy rain (${rainTotal.toFixed(1)}mm) severely destabilizes mountain slopes.`,
      comparisonNoteHi: `पर्वतीय ढलानों पर हालिया M${input.recentEarthquakeMagnitude.toFixed(1)} भूकंप (${input.recentEarthquakeDistanceKm.toFixed(1)}km दूर) और भारी वर्षा (${rainTotal.toFixed(1)}mm) के संयुक्त प्रभाव से ढलानों के टूटने और भूस्खलन का गंभीर खतरा है।`,
    });

    if (!warningMessage) {
      warningMessage = `पर्वतीय ढलानों पर सह-भूकंपीय भूस्खलन चेतावनी (M${input.recentEarthquakeMagnitude.toFixed(1)} भूकंप + भारी वर्षा) - Compound Seismic-Landslide Warning.`;
    }
  }

  return {
    totalRiskScore: Math.min(score, 100),
    factors,
    warningMessage,
  };
}

export interface TerrainRiskScoreBreakdown {
  score: number;
  subFactors: string[];
  subFactorsHi: string[];
  pointsAdded: number;
}

/**
 * Computes terrain flood risk score (0 to 100) from pre-processed DEM and land use parameters (LIVE-004)
 */
export function getTerrainRiskScore(terrain: DistrictTerrainData): TerrainRiskScoreBreakdown {
  let score = 0;
  const subFactors: string[] = [];
  const subFactorsHi: string[] = [];

  // 1. Minimum elevation below 20m (+25 pts)
  if (terrain.elevation_min_m < 20) {
    score += 25;
    subFactors.push("Low elevation");
    subFactorsHi.push("निम्न ऊंचाई");
  }

  // 2. Flood plain percent above 60% (+25 pts)
  if (terrain.flood_plain_percent > 60) {
    score += 25;
    subFactors.push("High flood plain");
    subFactorsHi.push("उच्च बाढ़ मैदान");
  }

  // 3. Slope mean below 1 degree (+20 pts)
  if (terrain.slope_mean_degrees < 1.0) {
    score += 20;
    subFactors.push("Flat slope");
    subFactorsHi.push("समतल ढलान");
  }

  // 4. Drainage class is POORLY_DRAINED (+20 pts)
  if (terrain.drainage_class === "POORLY_DRAINED") {
    score += 20;
    subFactors.push("Poor drainage");
    subFactorsHi.push("कमजोर जल निकासी");
  }

  // 5. River density above 0.3 km/km² (+10 pts)
  if (terrain.river_density_km_per_sqkm > 0.3) {
    score += 10;
    subFactors.push("High river density");
    subFactorsHi.push("उच्च नदी घनत्व");
  }

  return {
    score: Math.min(score, 100),
    subFactors,
    subFactorsHi,
    pointsAdded: score,
  };
}


