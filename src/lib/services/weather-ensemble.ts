/**
 * VarshaNetra - LIVE-001: Multi-Model NWP Weather Integration Service
 *
 * Simultaneously queries 3 independent Numerical Weather Prediction (NWP) models:
 * 1. ECMWF IFS 0.25° (European Centre for Medium-Range Weather Forecasts)
 * 2. NCEP GFS Seamless (Global Forecast System, NOAA USA)
 * 3. DWD ICON Seamless (Deutscher Wetterdienst, Germany)
 *
 * Computes:
 * - 24-hour ensemble forecast (mean, min, max, spread)
 * - Model agreement score (High <20%, Moderate 20-40%, Low >40%)
 * - 10-day multi-model daily forecast series
 * - Past 7-day actual antecedent rainfall series
 * - ECMWF CAPE (Convective Available Potential Energy) instability index
 */

import {
  MultiModelEnsembleResponse,
  ModelMetrics,
  DayForecastPoint,
  PastDayRainfallPoint,
  CapeMetrics,
  ModelAgreementLevel,
  DataSourceMeta,
} from "@/types";

const ENSEMBLE_SERVER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes on server

interface ServerCacheEntry {
  data: MultiModelEnsembleResponse;
  timestamp: number;
}

const serverCache = new Map<string, ServerCacheEntry>();

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

interface RawOpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    rain_sum?: (number | null)[];
    precipitation_hours?: (number | null)[];
  };
  hourly?: {
    time?: string[];
    precipitation?: (number | null)[];
    rain?: (number | null)[];
    precipitation_probability?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    cape?: (number | null)[];
  };
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export async function fetchMultiModelEnsemble(
  latitude: number,
  longitude: number,
  bypassCache = false
): Promise<MultiModelEnsembleResponse> {
  const cacheKey = getCacheKey(latitude, longitude);

  if (!bypassCache) {
    const cached = serverCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ENSEMBLE_SERVER_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const baseEndpoint = "https://api.open-meteo.com/v1/forecast";
  const commonParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: "precipitation,rain,precipitation_probability,wind_speed_10m,wind_gusts_10m,cape",
    daily: "precipitation_sum,precipitation_probability_max,rain_sum,precipitation_hours",
    past_days: "7",
    forecast_days: "10",
    timezone: "Asia/Kolkata",
  });

  const ecmwfUrl = `${baseEndpoint}?${commonParams.toString()}&models=ecmwf_ifs025`;
  const gfsUrl = `${baseEndpoint}?${commonParams.toString()}&models=gfs_seamless`;
  const iconUrl = `${baseEndpoint}?${commonParams.toString()}&models=icon_seamless`;

  // Fetch all 3 NWP models simultaneously
  const [ecmwfRes, gfsRes, iconRes] = await Promise.allSettled([
    fetch(ecmwfUrl, { headers: { "User-Agent": "VarshaNetra-EOC/1.0" }, signal: AbortSignal.timeout(12000) }),
    fetch(gfsUrl, { headers: { "User-Agent": "VarshaNetra-EOC/1.0" }, signal: AbortSignal.timeout(12000) }),
    fetch(iconUrl, { headers: { "User-Agent": "VarshaNetra-EOC/1.0" }, signal: AbortSignal.timeout(12000) }),
  ]);

  let ecmwfRaw: RawOpenMeteoResponse | null = null;
  let gfsRaw: RawOpenMeteoResponse | null = null;
  let iconRaw: RawOpenMeteoResponse | null = null;

  let ecmwfErr: string | undefined;
  let gfsErr: string | undefined;
  let iconErr: string | undefined;

  if (ecmwfRes.status === "fulfilled" && ecmwfRes.value.ok) {
    try {
      ecmwfRaw = await ecmwfRes.value.json();
    } catch {
      ecmwfErr = "Failed to parse ECMWF response";
    }
  } else {
    ecmwfErr = ecmwfRes.status === "rejected" ? String(ecmwfRes.reason) : `HTTP ${ecmwfRes.value?.status}`;
  }

  if (gfsRes.status === "fulfilled" && gfsRes.value.ok) {
    try {
      gfsRaw = await gfsRes.value.json();
    } catch {
      gfsErr = "Failed to parse GFS response";
    }
  } else {
    gfsErr = gfsRes.status === "rejected" ? String(gfsRes.reason) : `HTTP ${gfsRes.value?.status}`;
  }

  if (iconRes.status === "fulfilled" && iconRes.value.ok) {
    try {
      iconRaw = await iconRes.value.json();
    } catch {
      iconErr = "Failed to parse ICON response";
    }
  } else {
    iconErr = iconRes.status === "rejected" ? String(iconRes.reason) : `HTTP ${iconRes.value?.status}`;
  }

  // Model Metrics Extractor Helper
  const extractModelMetrics = (
    raw: RawOpenMeteoResponse | null,
    err: string | undefined,
    modelId: "ecmwf_ifs025" | "gfs_seamless" | "icon_seamless",
    name: string,
    shortName: string,
    agency: string
  ): ModelMetrics => {
    if (!raw || !raw.daily || !raw.daily.precipitation_sum) {
      return {
        name,
        shortName,
        agency,
        modelId,
        available: false,
        unavailableReason: err || "No data returned",
        rainfall24h: 0,
        precipitationProbability: 0,
        maxWindSpeed: 0,
      };
    }

    // Index 7 is today (next 24 hours) since past_days=7
    const rain24h = Number(raw.daily.precipitation_sum[7] ?? 0);
    const prob24h = Number(raw.daily.precipitation_probability_max?.[7] ?? 0);

    // Max wind speed across the next 24 hours (hours 168 to 191)
    let maxWind = 0;
    if (raw.hourly?.wind_speed_10m) {
      const hourlySlice = raw.hourly.wind_speed_10m.slice(168, 192);
      for (const w of hourlySlice) {
        if (typeof w === "number" && w > maxWind) maxWind = w;
      }
    }

    return {
      name,
      shortName,
      agency,
      modelId,
      available: true,
      rainfall24h: parseFloat(rain24h.toFixed(1)),
      precipitationProbability: Math.round(prob24h),
      maxWindSpeed: parseFloat(maxWind.toFixed(1)),
    };
  };

  const ecmwfMetrics = extractModelMetrics(
    ecmwfRaw,
    ecmwfErr,
    "ecmwf_ifs025",
    "ECMWF IFS (European)",
    "ECMWF",
    "European Centre for Medium-Range Weather Forecasts"
  );

  const gfsMetrics = extractModelMetrics(
    gfsRaw,
    gfsErr,
    "gfs_seamless",
    "GFS (American)",
    "GFS",
    "National Centers for Environmental Prediction (NOAA)"
  );

  const iconMetrics = extractModelMetrics(
    iconRaw,
    iconErr,
    "icon_seamless",
    "ICON (German)",
    "ICON",
    "Deutscher Wetterdienst (DWD)"
  );

  // Available models for ensemble calculation
  const availableModels = [ecmwfMetrics, gfsMetrics, iconMetrics].filter((m) => m.available);

  let ensembleRainfall24h = 0;
  let ensembleProb24h = 0;
  let ensembleMaxWind = 0;
  let minRainfall24h = 0;
  let maxRainfall24h = 0;
  let spread = 0;
  let agreement: ModelAgreementLevel = "HIGH";

  if (availableModels.length > 0) {
    const rainValues = availableModels.map((m) => m.rainfall24h);
    const probValues = availableModels.map((m) => m.precipitationProbability);
    const windValues = availableModels.map((m) => m.maxWindSpeed);

    ensembleRainfall24h = parseFloat(
      (rainValues.reduce((a, b) => a + b, 0) / availableModels.length).toFixed(1)
    );
    ensembleProb24h = Math.round(
      probValues.reduce((a, b) => a + b, 0) / availableModels.length
    );
    ensembleMaxWind = parseFloat(
      (windValues.reduce((a, b) => a + b, 0) / availableModels.length).toFixed(1)
    );

    minRainfall24h = Math.min(...rainValues);
    maxRainfall24h = Math.max(...rainValues);
    spread = parseFloat((maxRainfall24h - minRainfall24h).toFixed(1));

    // Agreement threshold logic
    if (availableModels.length === 1) {
      agreement = "MODERATE";
    } else if (ensembleRainfall24h < 3.0) {
      // For very low rain, absolute spread <= 2.0 mm indicates high agreement
      if (spread <= 1.5) agreement = "HIGH";
      else if (spread <= 3.5) agreement = "MODERATE";
      else agreement = "LOW";
    } else {
      const percentageSpread = (spread / ensembleRainfall24h) * 100;
      if (percentageSpread < 20) {
        agreement = "HIGH";
      } else if (percentageSpread < 40) {
        agreement = "MODERATE";
      } else {
        agreement = "LOW";
      }
    }
  }

  // 10-Day Multi-Model Daily Series (Days 7 to 16)
  const timeDates =
    ecmwfRaw?.daily?.time || gfsRaw?.daily?.time || iconRaw?.daily?.time || [];

  const forecast10Days: DayForecastPoint[] = [];

  for (let i = 7; i < Math.min(timeDates.length, 17); i++) {
    const dateStr = timeDates[i];
    const ecVal =
      ecmwfMetrics.available && ecmwfRaw?.daily?.precipitation_sum?.[i] != null
        ? Number(ecmwfRaw.daily.precipitation_sum[i])
        : null;
    const gfVal =
      gfsMetrics.available && gfsRaw?.daily?.precipitation_sum?.[i] != null
        ? Number(gfsRaw.daily.precipitation_sum[i])
        : null;
    const icVal =
      iconMetrics.available && iconRaw?.daily?.precipitation_sum?.[i] != null
        ? Number(iconRaw.daily.precipitation_sum[i])
        : null;

    const validVals = [ecVal, gfVal, icVal].filter((v): v is number => v !== null);
    const avg =
      validVals.length > 0
        ? parseFloat((validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(1))
        : 0;

    const ecProb = Number(ecmwfRaw?.daily?.precipitation_probability_max?.[i] ?? 0);
    const gfProb = Number(gfsRaw?.daily?.precipitation_probability_max?.[i] ?? 0);
    const icProb = Number(iconRaw?.daily?.precipitation_probability_max?.[i] ?? 0);
    const maxProb = Math.max(ecProb, gfProb, icProb);

    forecast10Days.push({
      date: dateStr,
      dayLabel: formatDayLabel(dateStr),
      isoDate: dateStr,
      ecmwf: ecVal !== null ? parseFloat(ecVal.toFixed(1)) : null,
      gfs: gfVal !== null ? parseFloat(gfVal.toFixed(1)) : null,
      icon: icVal !== null ? parseFloat(icVal.toFixed(1)) : null,
      ensembleAverage: avg,
      maxProb,
    });
  }

  // Past 7 Days Actual Rainfall (Days 0 to 6)
  const past7DaysPoints: PastDayRainfallPoint[] = [];
  let totalPast7Days = 0;

  for (let i = 0; i < Math.min(timeDates.length, 7); i++) {
    const dateStr = timeDates[i];
    // Prioritize ECMWF actuals, fall back to GFS or ICON
    const ecVal = ecmwfRaw?.daily?.precipitation_sum?.[i];
    const gfVal = gfsRaw?.daily?.precipitation_sum?.[i];
    const icVal = iconRaw?.daily?.precipitation_sum?.[i];

    const rain = Number(ecVal ?? gfVal ?? icVal ?? 0);
    const cleanRain = parseFloat(rain.toFixed(1));
    totalPast7Days += cleanRain;

    past7DaysPoints.push({
      date: dateStr,
      dayLabel: formatDayLabel(dateStr),
      isoDate: dateStr,
      rainfall: cleanRain,
    });
  }

  // ECMWF CAPE Index Analysis (Hours 168 to 191)
  const ecmwfCapeSlice = ecmwfRaw?.hourly?.cape?.slice(168, 192) || [];
  let currentCape = 0;
  let peakCape24h = 0;

  if (ecmwfCapeSlice.length > 0) {
    currentCape = Math.round(Number(ecmwfCapeSlice[0] ?? 0));
    peakCape24h = Math.round(
      Math.max(...ecmwfCapeSlice.map((v) => Number(v ?? 0)))
    );
  }

  let capeRiskLevel: "LOW" | "MODERATE" | "HIGH" | "EXTREME" = "LOW";
  let capeDescEn = "Low convective risk — stable atmospheric boundary layer";
  let capeDescHi = "कम संवहनी जोखिम — स्थिर वायुमंडलीय सीमा परत";

  if (peakCape24h > 3000) {
    capeRiskLevel = "EXTREME";
    capeDescEn = "Extreme convective risk — Extreme convective rain - flash flood danger";
    capeDescHi = "अत्यंत तीव्र संवहनी जोखिम — अत्यंत तीव्र संवहनी वर्षा - अचानक बाढ़ का खतरा";
  } else if (peakCape24h >= 1500) {
    capeRiskLevel = "HIGH";
    capeDescEn = "High convective risk — Intense rain with thunderstorm possible";
    capeDescHi = "उच्च संवहनी जोखिम — गरज के साथ तीव्र वर्षा संभव";
  } else if (peakCape24h >= 500) {
    capeRiskLevel = "MODERATE";
    capeDescEn = "Moderate convective risk — scattered thunderstorms possible";
    capeDescHi = "मध्यम संवहनी जोखिम — छिटपुट गरज के साथ बौछारें संभव";
  }

  const capeMetrics: CapeMetrics = {
    currentCape,
    peakCape24h,
    riskLevel: capeRiskLevel,
    descriptionEn: capeDescEn,
    descriptionHi: capeDescHi,
  };

  const metadata: DataSourceMeta = {
    provider: "Open-Meteo Multi-Model NWP (ECMWF, GFS, ICON)",
    lastUpdated: new Date().toISOString(),
    origin: "LIVE_API",
    attributionNotice:
      "Global NWP forecasts courtesy of Open-Meteo under CC BY 4.0; ECMWF IFS (Copernicus), NCEP GFS (NOAA), DWD ICON.",
    url: "https://open-meteo.com/",
  };

  const response: MultiModelEnsembleResponse = {
    success: true,
    location: {
      latitude,
      longitude,
      timezone: "Asia/Kolkata",
    },
    comparison: {
      ecmwf: ecmwfMetrics,
      gfs: gfsMetrics,
      icon: iconMetrics,
      ensemble: {
        rainfall24h: ensembleRainfall24h,
        precipitationProbability: ensembleProb24h,
        maxWindSpeed: ensembleMaxWind,
        minRainfall24h,
        maxRainfall24h,
        spread,
        agreement,
      },
    },
    forecast10Days,
    past7Days: {
      days: past7DaysPoints,
      totalRainfallMm: parseFloat(totalPast7Days.toFixed(1)),
    },
    cape: capeMetrics,
    metadata,
    cachedAt: Date.now(),
  };

  serverCache.set(cacheKey, { data: response, timestamp: Date.now() });

  return response;
}
