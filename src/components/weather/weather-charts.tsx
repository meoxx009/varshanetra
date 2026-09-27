"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { HourlyForecastPoint, DailyForecastSummary } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Thermometer, Wind } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface WeatherChartsProps {
  hourly: HourlyForecastPoint[];
  daily?: DailyForecastSummary[];
  viewMode: "24h" | "7d";
}

function formatHourLabel(isoString: string, viewMode: "24h" | "7d", locale: string = "en"): string {
  try {
    const d = new Date(isoString);
    if (viewMode === "24h") {
      return d.toLocaleTimeString(locale === "hi" ? "hi-IN" : [], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    const day = d.toLocaleDateString(locale === "hi" ? "hi-IN" : [], { weekday: "short", day: "numeric" });
    const hour = d.toLocaleTimeString(locale === "hi" ? "hi-IN" : [], { hour: "2-digit", hour12: false });
    return `${day} ${hour}:00`;
  } catch {
    return isoString.slice(11, 16);
  }
}

export const WeatherCharts: React.FC<WeatherChartsProps> = ({
  hourly,
  daily = [],
  viewMode,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter hourly points for the active view mode (24h = next 24 points; 7d = downsampled or full series)
  const chartData = React.useMemo(() => {
    const points = viewMode === "24h" ? hourly.slice(0, 24) : hourly;
    return points.map((pt) => ({
      time: pt.time,
      displayTime: formatHourLabel(pt.time, viewMode, locale),
      rain: pt.precipitation,
      rainProb: pt.precipitationProbability,
      temp: pt.temperature,
      humidity: pt.relativeHumidity,
      wind: pt.windSpeed,
      condition: pt.weatherDescription || "N/A",
    }));
  }, [hourly, viewMode, locale]);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400"
          >
            {locale === "hi" ? "मौसम विज्ञान चार्ट इंजन प्रारंभ हो रहा है..." : "Initializing meteorological chart engine..."}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Rainfall Amount & Rainfall Probability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Rainfall Volume (Bar Chart) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <BarChart3 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                {locale === "hi" ? "प्रति घंटा वर्षा संचय (मिमी)" : "Hourly Precipitation Accumulation (mm)"}
              </CardTitle>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {viewMode === "24h" ? (locale === "hi" ? "अगले 24 घंटे" : "Next 24 Hours") : (locale === "hi" ? "7 दिवसीय प्रक्षेपण" : "7-Day Projection")}
              </span>
            </div>
            <CardDescription className="text-xs">
              {locale === "hi"
                ? "ओपन-मेटियो सीमलेस मॉडल समूह से अनुमानित प्रति घंटा वर्षा दर।"
                : "Projected rainfall rate per hour from Open-Meteo seamless model ensemble."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={viewMode === "24h" ? 2 : 11}
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
                    formatter={(value: any) => [`${value ?? 0} mm`, locale === "hi" ? "अनुमानित वर्षा" : "Expected Rain"]}
                    labelFormatter={(label) => `${locale === "hi" ? "समय" : "Time"}: ${label}`}
                  />
                  <Bar
                    dataKey="rain"
                    name={locale === "hi" ? "वर्षा" : "Precipitation"}
                    fill="#2563EB"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rainfall Probability Chart (Area Chart) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                {locale === "hi" ? "वर्षा संभावना वक्र (%)" : "Rainfall Probability Curve (%)"}
              </CardTitle>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                {locale === "hi" ? "विश्वास सूचकांक" : "Confidence Index"}
              </span>
            </div>
            <CardDescription className="text-xs">
              {locale === "hi"
                ? "चेतावनी सीमा के साथ मापने योग्य वर्षा (>0.1 मिमी) की प्रति घंटा संभावना।"
                : "Hourly likelihood of measurable precipitation (>0.1 mm) with warning thresholds."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={viewMode === "24h" ? 2 : 11}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    unit="%"
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
                    formatter={(value: any) => [`${value ?? 0}%`, locale === "hi" ? "वर्षा संभावना" : "Rain Probability"]}
                    labelFormatter={(label) => `${locale === "hi" ? "समय" : "Time"}: ${label}`}
                  />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: locale === "hi" ? "निगरानी (50%)" : "Watch (50%)", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="3 3" label={{ value: locale === "hi" ? "उच्च (80%)" : "High (80%)", fill: "#dc2626", fontSize: 9, position: "insideTopRight" }} />
                  <Area
                    type="monotone"
                    dataKey="rainProb"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#probGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Temperature & Humidity Dynamics + Wind Speed Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature & Humidity Dual-Axis Trend */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                {locale === "hi" ? "वायुमंडलीय गतिकी (तापमान बनाम सापेक्ष आर्द्रता)" : "Atmospheric Dynamics (Temp vs. Relative Humidity)"}
              </CardTitle>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                {locale === "hi" ? "ऊष्मागतिकी" : "Thermodynamics"}
              </span>
            </div>
            <CardDescription className="text-xs">
              {locale === "hi"
                ? "सतही तापमान (°C) एवं वायुमंडलीय संतृप्ति (%) प्रवृत्तियाँ।"
                : "Surface temperature (°C) and atmospheric saturation (%) trends."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={viewMode === "24h" ? 2 : 11}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="left"
                    tick={{ fontSize: 10, fill: "#ea580c" }}
                    unit="°C"
                  />
                  <YAxis
                    yAxisId="humidity"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#0891b2" }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temp"
                    name={locale === "hi" ? "तापमान (°C)" : "Temperature (°C)"}
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="humidity"
                    type="monotone"
                    dataKey="humidity"
                    name={locale === "hi" ? "आर्द्रता (%)" : "Humidity (%)"}
                    stroke="#0891b2"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Wind Speed Trend (Line Chart) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Wind className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                {locale === "hi" ? "सतही हवा की गति प्रवृत्ति (10m AGL)" : "Surface Wind Speed Trend (10m AGL)"}
              </CardTitle>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                {locale === "hi" ? "10m सतह" : "10m Surface"}
              </span>
            </div>
            <CardDescription className="text-xs">
              {locale === "hi"
                ? "तूफान एवं चक्रवाती झोंकों का आकलन करने हेतु सतही हवा की गति (किमी/घं)।"
                : "Surface wind velocities in km/h to assess squall and cyclone gusts."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={viewMode === "24h" ? 2 : 11}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    unit=" km/h"
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
                    formatter={(value: any) => [`${value ?? 0} km/h`, locale === "hi" ? "हवा की गति" : "Wind Speed"]}
                    labelFormatter={(label) => `${locale === "hi" ? "समय" : "Time"}: ${label}`}
                  />
                  <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: locale === "hi" ? "झंझावात निगरानी (40 km/h)" : "Gale Watch (40 km/h)", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />
                  <Line
                    type="monotone"
                    dataKey="wind"
                    name={locale === "hi" ? "हवा की गति (km/h)" : "Wind Speed (km/h)"}
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optional Daily Summary Grid when in 7-day mode */}
      {viewMode === "7d" && daily.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {locale === "hi" ? "7 दिवसीय सिनॉप्टिक मौसम विज्ञान आउटलुक" : "7-Day Synoptic Meteorological Outlook"}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === "hi"
                ? "चरम तापमान, संचित वर्षा एवं अधिकतम झोंकों का दैनिक समग्र।"
                : "Daily aggregates of extreme temperatures, accumulated rainfall, and peak gusts."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {daily.map((d) => {
                const dateObj = new Date(d.date);
                const dayName = dateObj.toLocaleDateString(locale === "hi" ? "hi-IN" : [], { weekday: "short" });
                const dateStr = dateObj.toLocaleDateString(locale === "hi" ? "hi-IN" : [], { day: "numeric", month: "short" });
                return (
                  <div
                    key={d.date}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between text-xs space-y-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {dayName}
                      </span>
                      <span className="text-[11px] text-slate-500">{dateStr}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{locale === "hi" ? "वर्षा" : "Rain"}</span>
                        <span className="font-bold text-[#0F3D66] dark:text-blue-400">
                          {d.totalPrecipitation} mm
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{locale === "hi" ? "संभावना" : "Prob"}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {d.precipitationProbability}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{locale === "hi" ? "तापमान" : "Temp"}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {Math.round(d.minTemp)}° - {Math.round(d.maxTemp)}°C
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{locale === "hi" ? "हवा" : "Wind"}</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {d.maxWindSpeed} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
