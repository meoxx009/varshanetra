"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { History, AlertTriangle, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PastDayRainfallPoint } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface NwpPast7DaysChartProps {
  days: PastDayRainfallPoint[];
  totalRainfallMm: number;
}

export function NwpPast7DaysChart({ days, totalRainfallMm }: NwpPast7DaysChartProps) {
  const locale = useLocale();

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi" ? "विगत 7 दिन की वर्षा" : "Past 7 Days Rainfall"}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "ओपन-मेटियो हिस्टोरिकल री-एनालिसिस (ECMWF ERA5 / IFS आर्काइव)"
                : "Open-Meteo historical re-analysis (ECMWF ERA5 / IFS archive)"}
            </p>
          </div>

          {/* Cumulative Total Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="text-indigo-950 dark:text-indigo-200 font-bold">
                {locale === "hi"
                  ? `पिछले 7 दिनों में कुल: ${totalRainfallMm} mm`
                  : `Total past 7 days: ${totalRainfallMm} mm`}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Antecedent Flood Risk Advisory Banner */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] sm:text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              {locale === "hi"
                ? "यह बाढ़ जोखिम के लिए पूर्ववर्ती वर्षा (Antecedent Rainfall) है।"
                : "This represents antecedent rainfall for catchment saturation & flood risk modeling."}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "उच्च संचित वर्षा मिट्टी की जल सोखने की क्षमता कम करती है और बाढ़ जोखिम बढ़ाती है।"
                : "High accumulated rainfall increases flood risk by saturating topsoil and accelerating surface runoff."}
            </p>
          </div>
        </div>

        {/* 7-Day Bar Chart */}
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={days}
              margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />

              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 11, fill: "#64748b" }}
                angle={-20}
                textAnchor="end"
                height={35}
              />

              <YAxis
                unit=" mm"
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={45}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PastDayRainfallPoint;
                  return (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">{label}</div>
                      <div className="font-mono text-slate-500 text-[10px]">{item.date}</div>
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.rainfall} mm
                      </div>
                    </div>
                  );
                }}
              />

              <Bar
                dataKey="rainfall"
                name={locale === "hi" ? "दैनिक वर्षा" : "Daily Rainfall"}
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
