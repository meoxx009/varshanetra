"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RiverGaugeReading } from "@/types";

interface GaugeSparklineProps {
  gaugeId: string;
  dangerLevelM: number | null;
  warningLevelM: number | null;
  height?: number;
}

interface ChartPoint {
  time: string;
  level: number;
}

export function GaugeSparkline({
  gaugeId,
  dangerLevelM,
  warningLevelM,
  height = 90,
}: GaugeSparklineProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/river-gauges/${gaugeId}/readings?limit=24`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) {
          const points: ChartPoint[] = (json.data as RiverGaugeReading[]).map((r) => ({
            time: new Date(r.reading_datetime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            level: r.water_level_m,
          }));
          setData(points);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load trend data");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gaugeId]);

  if (loading) {
    return (
      <div
        style={{ height }}
        className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded"
        aria-label="Loading sparkline"
      />
    );
  }

  if (error || data.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900 rounded border border-dashed border-slate-200 dark:border-slate-800"
      >
        {data.length < 2
          ? "Need ≥2 readings for trend chart"
          : error}
      </div>
    );
  }

  // Compute Y domain with padding
  const levels = data.map((d) => d.level);
  const allLevels = [
    ...levels,
    ...(dangerLevelM !== null ? [dangerLevelM] : []),
    ...(warningLevelM !== null ? [warningLevelM] : []),
  ];
  const minY = Math.min(...allLevels) * 0.995;
  const maxY = Math.max(...allLevels) * 1.005;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 9, fill: "#94a3b8" }}
          interval="preserveStartEnd"
          tickLine={false}
        />
        <YAxis
          domain={[minY, maxY]}
          tick={{ fontSize: 9, fill: "#94a3b8" }}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            borderRadius: "6px",
            fontSize: "11px",
            border: "none",
          }}
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            return [!isNaN(num) ? `${num.toFixed(2)} m` : "—", "Level"];
          }}
        />
        {dangerLevelM !== null && (
          <ReferenceLine
            y={dangerLevelM}
            stroke="#DC2626"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: "खतरा", position: "insideTopRight", fontSize: 9, fill: "#DC2626" }}
          />
        )}
        {warningLevelM !== null && (
          <ReferenceLine
            y={warningLevelM}
            stroke="#D97706"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: "चेतावनी", position: "insideBottomRight", fontSize: 9, fill: "#D97706" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="level"
          stroke="#2563EB"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#2563EB" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
