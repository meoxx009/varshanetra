"use client";

import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DayForecastPoint } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface Nwp10DayForecastChartProps {
  data: DayForecastPoint[];
}

export function Nwp10DayForecastChart({ data }: Nwp10DayForecastChartProps) {
  const locale = useLocale();

  // Find max value across all days to set appropriate Y axis domain
  const maxForecastVal = Math.max(
    ...data.flatMap((d) => [d.ecmwf ?? 0, d.gfs ?? 0, d.icon ?? 0, d.ensembleAverage ?? 0]),
    70 // Minimum domain to always show the 64.5mm Heavy threshold line comfortably
  );

  const yDomainMax = Math.ceil(Math.max(maxForecastVal * 1.15, 125));

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2563EB]" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi"
                  ? "10-दिवसीय वर्षा पूर्वानुमान (मल्टी-मॉडल तुलना)"
                  : "10-Day Rainfall Forecast (Multi-Model Comparison)"}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "ECMWF (नीला), GFS (हरा), ICON (नारंगी) एवं मॉडल औसत (गहरा नीला लाइन)"
                : "ECMWF (Blue), GFS (Green), ICON (Orange), and Ensemble Mean (Navy Line)"}
            </p>
          </div>

          {/* IMD Threshold Legend Badges */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
              {locale === "hi" ? "भारी वर्षा: 64.5 mm" : "Heavy: 64.5 mm"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-800 inline-block" />
              {locale === "hi" ? "अति भारी: 115.6 mm" : "Very Heavy: 115.6 mm"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="w-full h-[340px] sm:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />

              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 11, fill: "#64748b" }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={45}
              />

              <YAxis
                unit=" mm"
                domain={[0, yDomainMax]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={50}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as DayForecastPoint;
                  return (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-2 min-w-[200px]">
                      <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between">
                        <span>{label}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{item.date}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                          <span>🇪🇺 ECMWF IFS:</span>
                          <span className="font-mono font-bold">{item.ecmwf ?? "--"} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                          <span>🇺🇸 GFS:</span>
                          <span className="font-mono font-bold">{item.gfs ?? "--"} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                          <span>🇩🇪 ICON:</span>
                          <span className="font-mono font-bold">{item.icon ?? "--"} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-[#0F3D66] dark:text-blue-300 font-black pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>{locale === "hi" ? "मॉडल औसत:" : "Ensemble Mean:"}</span>
                          <span className="font-mono font-black">{item.ensembleAverage} mm</span>
                        </div>
                        {item.maxProb > 0 && (
                          <div className="flex justify-between items-center text-slate-500 text-[10px] pt-0.5">
                            <span>{locale === "hi" ? "अधिकतम वर्षा संभावना:" : "Peak Probability:"}</span>
                            <span className="font-mono font-semibold">{item.maxProb}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
              />

              {/* IMD Threshold Reference Lines */}
              <ReferenceLine
                y={64.5}
                stroke="#DC2626"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "IMD Heavy Rain (64.5 mm)",
                  position: "top",
                  fill: "#DC2626",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              <ReferenceLine
                y={115.6}
                stroke="#991B1B"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "IMD Very Heavy Rain (115.6 mm)",
                  position: "top",
                  fill: "#991B1B",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              {/* Grouped Model Bars */}
              <Bar
                dataKey="ecmwf"
                name="ECMWF (Europe)"
                fill="#2563EB"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey="gfs"
                name="GFS (USA)"
                fill="#16A34A"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey="icon"
                name="ICON (Germany)"
                fill="#EA580C"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              />

              {/* Ensemble Mean Line */}
              <Line
                type="monotone"
                dataKey="ensembleAverage"
                name={locale === "hi" ? "मॉडल औसत" : "Ensemble Mean"}
                stroke="#0F3D66"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#0F3D66" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
