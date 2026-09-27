"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Layers } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { MultiModelEnsembleResponse } from "@/types";
import { TomorrowApiResponse } from "@/types/tomorrow";

interface ThreeSourceEnsembleProps {
  nwpEnsemble: MultiModelEnsembleResponse | null;
  tomorrowData: TomorrowApiResponse | null;
  isLoading?: boolean;
}

export function ThreeSourceEnsemble({
  nwpEnsemble,
  tomorrowData,
  isLoading = false,
}: ThreeSourceEnsembleProps) {
  const locale = useLocale();

  // Extract model parameters
  const ecmwf = nwpEnsemble?.comparison?.ecmwf;
  const gfs = nwpEnsemble?.comparison?.gfs;
  const tomorrow = tomorrowData?.next24h;

  const ecmwfRainfall = ecmwf?.rainfall24h ?? 0;
  const ecmwfProb = ecmwf?.precipitationProbability ?? 0;
  const ecmwfWind = ecmwf?.maxWindSpeed ?? 0;

  const gfsRainfall = gfs?.rainfall24h ?? 0;
  const gfsProb = gfs?.precipitationProbability ?? 0;
  const gfsWind = gfs?.maxWindSpeed ?? 0;

  const isTomorrowLive = tomorrowData?.api_status === "LIVE" && Boolean(tomorrow);
  const tomorrowRainfall = isTomorrowLive ? (tomorrow?.precipitationTotalMm ?? 0) : 0;
  const tomorrowProb = isTomorrowLive ? (tomorrow?.precipitationProbabilityMax ?? 0) : 0;
  const tomorrowWind = isTomorrowLive ? (tomorrow?.maxWindSpeedKmH ?? 0) : 0;

  // Compile list of available models for standard deviation
  const availableRainfalls: number[] = [];
  if (ecmwf) availableRainfalls.push(ecmwfRainfall);
  if (gfs) availableRainfalls.push(gfsRainfall);
  if (isTomorrowLive) availableRainfalls.push(tomorrowRainfall);

  // Calculate ensemble mean
  const count = availableRainfalls.length || 1;
  const ensembleMeanRain = Number(
    (availableRainfalls.reduce((sum, r) => sum + r, 0) / count).toFixed(1)
  );

  const ensembleMeanProb = Math.round(
    ((ecmwf ? ecmwfProb : 0) + (gfs ? gfsProb : 0) + (isTomorrowLive ? tomorrowProb : 0)) / count
  );

  const ensembleMaxWind = Number(
    Math.max(ecmwf ? ecmwfWind : 0, gfs ? gfsWind : 0, isTomorrowLive ? tomorrowWind : 0).toFixed(1)
  );

  // Calculate sample / population standard deviation of rainfall values (SOURCES-002 PART 3)
  let standardDeviation = 0;
  if (availableRainfalls.length > 1) {
    const variance =
      availableRainfalls.reduce((sum, val) => sum + Math.pow(val - ensembleMeanRain, 2), 0) /
      availableRainfalls.length;
    standardDeviation = Number(Math.sqrt(variance).toFixed(1));
  }

  // Agreement categorization based on standard deviation
  // If std dev < 10mm: HIGH AGREEMENT in green
  // If 10 to 25mm: MODERATE in yellow
  // If above 25mm: LOW AGREEMENT in red
  let agreementLevel: "HIGH" | "MODERATE" | "LOW" = "HIGH";
  let agreementBadgeClass = "bg-emerald-600 text-white";
  let agreementTextEn = "HIGH AGREEMENT";
  let agreementTextHi = "उच्च मॉडल सहमति";
  let AgreementIcon = CheckCircle2;

  if (standardDeviation > 25) {
    agreementLevel = "LOW";
    agreementBadgeClass = "bg-red-600 text-white";
    agreementTextEn = "LOW AGREEMENT";
    agreementTextHi = "कम मॉडल सहमति";
    AgreementIcon = ShieldAlert;
  } else if (standardDeviation >= 10) {
    agreementLevel = "MODERATE";
    agreementBadgeClass = "bg-amber-500 text-black";
    agreementTextEn = "MODERATE AGREEMENT";
    agreementTextHi = "मध्यम मॉडल सहमति";
    AgreementIcon = AlertTriangle;
  }

  if (isLoading && !nwpEnsemble && !tomorrowData) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-64 animate-pulse" />
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>
                {locale === "hi"
                  ? "त्रि-स्रोत मौसम एन्सेम्बल तुलना (ECMWF • GFS • Tomorrow.io)"
                  : "Three-Source Weather Ensemble (ECMWF • GFS • Tomorrow.io)"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {locale === "hi"
                ? "यूरोपीय, अमेरिकी और निजी AI मौसम पूर्वानुमान मॉडलों का एकीकृत बहु-मॉडल विश्लेषण"
                : "Multi-agency synthesis combining ECMWF IFS, NOAA GFS, and Tomorrow.io Proprietary AI"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              σ = {standardDeviation} mm
            </span>
            <Badge className={`${agreementBadgeClass} text-xs font-bold px-2.5 py-0.5 flex items-center gap-1 shadow-2xs`}>
              <AgreementIcon className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? agreementTextHi : agreementTextEn}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                <TableHead className="font-bold text-xs">
                  {locale === "hi" ? "स्रोत नाम (Source Name)" : "Source Name"}
                </TableHead>
                <TableHead className="text-right font-bold text-xs">
                  {locale === "hi" ? "24h वर्षा पूर्वानुमान" : "24h Rainfall Forecast"}
                </TableHead>
                <TableHead className="text-right font-bold text-xs">
                  {locale === "hi" ? "वर्षा संभावना" : "Probability of Rain"}
                </TableHead>
                <TableHead className="text-right font-bold text-xs">
                  {locale === "hi" ? "अधिकतम हवा गति" : "Max Wind Speed"}
                </TableHead>
                <TableHead className="text-right font-bold text-xs">
                  {locale === "hi" ? "मॉडल प्रकार" : "Model Framework"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Row 1: Open-Meteo ECMWF */}
              <TableRow>
                <TableCell className="font-semibold text-xs flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>Open-Meteo ECMWF IFS</span>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                  {ecmwf ? `${ecmwfRainfall} mm` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {ecmwf ? `${ecmwfProb}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {ecmwf ? `${ecmwfWind} km/h` : "--"}
                </TableCell>
                <TableCell className="text-right text-[11px] text-muted-foreground">
                  ECMWF IFS 0.25° (~25km)
                </TableCell>
              </TableRow>

              {/* Row 2: Open-Meteo GFS */}
              <TableRow>
                <TableCell className="font-semibold text-xs flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>Open-Meteo GFS</span>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                  {gfs ? `${gfsRainfall} mm` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {gfs ? `${gfsProb}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {gfs ? `${gfsWind} km/h` : "--"}
                </TableCell>
                <TableCell className="text-right text-[11px] text-muted-foreground">
                  NOAA GFS Seamless (~25km)
                </TableCell>
              </TableRow>

              {/* Row 3: Tomorrow.io */}
              <TableRow>
                <TableCell className="font-semibold text-xs flex items-center gap-2 whitespace-nowrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${isTomorrowLive ? "bg-purple-600" : "bg-slate-400"} inline-block`} />
                  <span>Tomorrow.io</span>
                  {!isTomorrowLive && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-500 font-mono">
                      {tomorrowData?.api_status === "CONFIGURED_UNVERIFIED" ? "CONFIGURED" : tomorrowData?.api_status || "NOT CONFIGURED"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                  {isTomorrowLive ? `${tomorrowRainfall} mm` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {isTomorrowLive ? `${tomorrowProb}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {isTomorrowLive ? `${tomorrowWind} km/h` : "--"}
                </TableCell>
                <TableCell className="text-right text-[11px] text-muted-foreground">
                  Tomorrow.io Proprietary AI
                </TableCell>
              </TableRow>

              {/* Ensemble Mean Summary Row */}
              <TableRow className="bg-slate-100/70 dark:bg-slate-800/60 font-black border-t-2 border-slate-300 dark:border-slate-700">
                <TableCell className="font-black text-xs flex items-center gap-2 text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    {locale === "hi"
                      ? "एन्सेम्बल औसत (Ensemble Mean)"
                      : "Ensemble Mean (Average)"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                  {ensembleMeanRain} mm
                </TableCell>
                <TableCell className="text-right font-mono font-black text-xs text-slate-900 dark:text-white">
                  {ensembleMeanProb}%
                </TableCell>
                <TableCell className="text-right font-mono font-black text-xs text-slate-900 dark:text-white">
                  {ensembleMaxWind} km/h
                </TableCell>
                <TableCell className="text-right text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  3-Source Robust Mean
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Operational Recommendation Text (SOURCES-002 PART 3) */}
        <div className="p-3 m-3 sm:m-0 sm:mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start gap-2.5">
          <AgreementIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-900 dark:text-white">
              {locale === "hi"
                ? "जब सभी मॉडल सहमत हों, पूर्वानुमान अधिक विश्वसनीय होता है।"
                : "When all models agree, forecast is more reliable."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {locale === "hi"
                ? `वर्षा फैलाव (मानक विचलन): ${standardDeviation} मिमी। ${
                    agreementLevel === "HIGH"
                      ? "मॉडल उच्च सहमति में हैं, जिससे परिचालन आत्मविश्वास अधिक है।"
                      : agreementLevel === "MODERATE"
                      ? "मध्यम मॉडल फैलाव देखा गया है। संवेदनशील बेसिनों में सतर्कता आवश्यक है।"
                      : "मॉडलों में बड़ा फैलाव है; चरम परिदृश्य (Worst-case) योजना की अनुशंसा की जाती है।"
                  }`
                : `Rainfall spread (Standard Deviation): ${standardDeviation} mm. ${
                    agreementLevel === "HIGH"
                      ? "All three models are closely aligned, providing high decision confidence."
                      : agreementLevel === "MODERATE"
                      ? "Moderate variance observed across models; field vigilance recommended."
                      : "High model divergence; plan response for worst-case precipitation total."
                  }`}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 sm:p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Ensemble spread standard deviation: <strong>±{standardDeviation} mm</strong>
        </span>
        <span className="font-mono text-[10px]">
          Sources: Open-Meteo (ECMWF 0.25°, GFS) + Tomorrow.io AI
        </span>
      </CardFooter>
    </Card>
  );
}

export default ThreeSourceEnsemble;
