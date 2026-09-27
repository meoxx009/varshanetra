"use client";

import React from "react";
import { TableProperties, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

export interface SourceEstimate {
  id: string;
  name: string;
  rainfallMm: number;
}

export interface DataAgreementMatrixProps {
  estimates?: SourceEstimate[];
}

export function DataAgreementMatrix({ estimates: customEstimates }: DataAgreementMatrixProps) {
  const locale = useLocale();

  // Default comparison models if not passed
  const estimates: SourceEstimate[] = customEstimates || [
    { id: "ecmwf", name: "ECMWF IFS", rainfallMm: 84.5 },
    { id: "gfs", name: "NOAA GFS", rainfallMm: 79.2 },
    { id: "icon", name: "DWD ICON", rainfallMm: 81.0 },
    { id: "gpm", name: "NASA GPM", rainfallMm: 68.4 },
    { id: "tomorrow", name: "Tomorrow.io", rainfallMm: 76.8 },
  ];

  // Calculate pairwise agreement percentage
  // Difference = |A - B| / max(A, B, 1) * 100
  // Agreement = 100 - Difference
  const computeAgreement = (a: number, b: number): number => {
    if (a === 0 && b === 0) return 100;
    const maxVal = Math.max(a, b, 1);
    const diffPct = (Math.abs(a - b) / maxVal) * 100;
    return Math.max(0, Math.min(100, Math.round(100 - diffPct)));
  };

  // Compute matrix
  const matrix: { [key: string]: { [key: string]: number } } = {};
  let totalPairs = 0;
  let sumAgreement = 0;

  estimates.forEach((sourceA) => {
    matrix[sourceA.id] = {};
    estimates.forEach((sourceB) => {
      if (sourceA.id === sourceB.id) {
        matrix[sourceA.id][sourceB.id] = 100;
      } else {
        const score = computeAgreement(sourceA.rainfallMm, sourceB.rainfallMm);
        matrix[sourceA.id][sourceB.id] = score;
        totalPairs += 1;
        sumAgreement += score;
      }
    });
  });

  const overallAgreement = totalPairs > 0 ? Math.round(sumAgreement / totalPairs) : 100;

  // Cell coloring rules:
  // Green: within 15% diff => Agreement >= 85%
  // Yellow/Amber: 15-30% diff => Agreement 70% to 84%
  // Red: > 30% diff => Agreement < 70%
  const getCellBadgeClass = (score: number, isSelf: boolean) => {
    if (isSelf) return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-normal";
    if (score >= 85) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
    if (score >= 70) return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800";
    return "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800";
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TableProperties className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "डेटा सहमति विश्लेषण (वर्षा पूर्वानुमान तुलना)" : "Data Agreement Analysis"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? "विभिन्न मौसम और उपग्रह स्रोतों के बीच 24 घंटे के वर्षा अनुमानों का युग्मित सहमति मैट्रिक्स"
                  : "Pairwise rainfall agreement matrix comparing independent NWP, satellite and ensemble models"}
              </CardDescription>
            </div>
          </div>

          {/* Overall agreement score */}
          <div className="flex items-center gap-2">
            <Badge
              className={`px-3 py-1 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                overallAgreement >= 85
                  ? "bg-emerald-600 text-white"
                  : overallAgreement >= 70
                  ? "bg-amber-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {overallAgreement >= 85 ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span>
                {locale === "hi" ? "समग्र सहमति" : "Overall Consensus"}: {overallAgreement}%
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-3 text-left min-w-[140px]">
                  {locale === "hi" ? "डेटा स्रोत / मॉडल" : "Source / Model"}
                </th>
                {estimates.map((col) => (
                  <th key={col.id} className="p-3 text-center min-w-[110px]">
                    <div className="font-bold">{col.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {col.rainfallMm.toFixed(1)} mm
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
              {estimates.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-900/20">
                    <div>{row.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {row.rainfallMm.toFixed(1)} mm
                    </span>
                  </td>
                  {estimates.map((col) => {
                    const isSelf = row.id === col.id;
                    const score = matrix[row.id][col.id];
                    const badgeClass = getCellBadgeClass(score, isSelf);

                    return (
                      <td key={col.id} className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${badgeClass}`}
                          title={
                            isSelf
                              ? "Baseline self-match"
                              : `${row.name} (${row.rainfallMm}mm) vs ${col.name} (${col.rainfallMm}mm): ${score}% agreement`
                          }
                        >
                          {isSelf ? "—" : `${score}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {locale === "hi" ? "सहमति पैमाना:" : "Agreement Scale:"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald-500" />
              <span>{locale === "hi" ? "≥ 85% (उच्च सहमति)" : "≥ 85% (High Agreement ≤15% diff)"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-amber-500" />
              <span>{locale === "hi" ? "70% - 84% (मध्यम)" : "70% - 84% (Moderate 15-30% diff)"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-red-500" />
              <span>{locale === "hi" ? "< 70% (विसंगति)" : "< 70% (Divergent >30% diff)"}</span>
            </div>
          </div>
        </div>

        {/* Required Interpretation Banner */}
        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <span className="font-bold">
              {locale === "hi"
                ? "सभी स्रोतों में उच्च सहमति पूर्वानुमान विश्वसनीयता बढ़ाती है।"
                : "High agreement across all sources increases forecast reliability."}
            </span>{" "}
            {locale === "hi"
              ? "जब यूरोपीय (ECMWF) और अमेरिकी (GFS) मॉडल उपग्रह अवलोकनों (GPM) के अनुरूप हों, तो बाढ़ चेतावनी की निश्चितता 85% से अधिक हो जाती है।"
              : "When European (ECMWF) and American (GFS) models converge with satellite microwave passes (GPM), emergency evacuation decision confidence reaches over 85%."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DataAgreementMatrix;
