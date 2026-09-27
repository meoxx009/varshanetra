"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { HistoricalPrecipitationPoint } from "@/types";
import { History } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface HistoricalRainfallChartProps {
  hourly: HistoricalPrecipitationPoint[];
  daily?: { date: string; totalMm: number }[];
  lookbackDays?: number;
}

export const HistoricalRainfallChart: React.FC<HistoricalRainfallChartProps> = ({
  hourly,
  lookbackDays = 3,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeChart, setActiveChart] = useState<"hourly" | "cumulative">("hourly");
  const locale = useLocale();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format hourly time for XAxis
  const formattedHourly = useMemo(() => {
    let runningTotal = 0;
    return hourly.map((pt) => {
      runningTotal += pt.precipitation || 0;
      const d = new Date(pt.time);
      const dateStr = d.toLocaleDateString(locale === "hi" ? "hi-IN" : [], { month: "short", day: "numeric" });
      const timeStr = d.toLocaleTimeString(locale === "hi" ? "hi-IN" : [], { hour: "2-digit", minute: "2-digit", hour12: false });
      return {
        time: pt.time,
        displayTime: `${dateStr} ${timeStr}`,
        precipitation: pt.precipitation,
        rain: pt.rain,
        temperature: pt.temperature,
        humidity: pt.relativeHumidity,
        cumulative: Number(runningTotal.toFixed(2)),
      };
    });
  }, [hourly, locale]);

  if (!isMounted) {
    return (
      <div className="h-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400">
        {locale === "hi" ? "ऐतिहासिक मौसम विज्ञान टेलीमेट्री चार्ट प्रारंभ हो रहे हैं..." : "Initializing historical meteorological telemetry charts..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {locale === "hi"
                  ? `ऐतिहासिक प्रति घंटा वर्षा टेलीमेट्री (विगत ${lookbackDays} दिन)`
                  : `Historical Hourly Precipitation Telemetry (Past ${lookbackDays} Days)`}
              </CardTitle>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "ओपन-मेटियो पुनर्विश्लेषण ग्रिड से पुनर्निर्मित प्रति घंटा अवलोकित वर्षा मात्रा।"
                  : "Observed rainfall volume per hour reconstructed from Open-Meteo reanalysis grids."}
              </CardDescription>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveChart("hourly")}
                className={`px-3 py-1 rounded font-semibold transition ${
                  activeChart === "hourly"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {locale === "hi" ? "प्रति घंटा मात्रा" : "Hourly Volume"}
              </button>
              <button
                onClick={() => setActiveChart("cumulative")}
                className={`px-3 py-1 rounded font-semibold transition ${
                  activeChart === "cumulative"
                    ? "bg-[#0F3D66] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {locale === "hi" ? "संचयी संचय" : "Cumulative Growth"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === "hourly" ? (
                <BarChart data={formattedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={Math.max(1, Math.floor(formattedHourly.length / 8))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    unit=" mm"
                    allowDecimals={true}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(val: any) => [`${val ?? 0} mm`, locale === "hi" ? "रिकॉर्ड की गई वर्षा" : "Recorded Rainfall"]}
                    labelFormatter={(label) => `${locale === "hi" ? "समय" : "Time"}: ${label}`}
                  />
                  <Bar
                    dataKey="precipitation"
                    name={locale === "hi" ? "वर्षा (मिमी)" : "Rainfall (mm)"}
                    fill="#2563EB"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart data={formattedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={Math.max(1, Math.floor(formattedHourly.length / 8))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    unit=" mm"
                    allowDecimals={true}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(val: any) => [`${val ?? 0} mm`, locale === "hi" ? "संचयी वर्षा" : "Cumulative Precipitation"]}
                    labelFormatter={(label) => `${locale === "hi" ? "समय" : "Time"}: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name={locale === "hi" ? "संचयी (मिमी)" : "Cumulative (mm)"}
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cumGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
