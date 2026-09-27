"use client";

import React from "react";
import { MultiModelEnsembleResponse } from "@/types";
import { TomorrowApiResponse } from "@/types/tomorrow";
import { NwpEnsembleComparisonCard } from "./nwp-ensemble-comparison-card";
import { Nwp10DayForecastChart } from "./nwp-10day-forecast-chart";
import { NwpPast7DaysChart } from "./nwp-past7days-chart";
import { NwpCapeCard } from "./nwp-cape-card";
import { NwpAttributionFooter } from "./nwp-attribution-footer";
import { ThreeSourceEnsemble } from "./three-source-ensemble";
import { TomorrowCard } from "./tomorrow-card";

interface NwpEnsembleDashboardProps {
  ensemble: MultiModelEnsembleResponse | null;
  tomorrowData?: TomorrowApiResponse | null;
  isTomorrowLoading?: boolean;
  isTomorrowRefreshing?: boolean;
  tomorrowError?: string | null;
  onRefreshTomorrow?: () => void;
  isStale?: boolean;
  cacheAgeMinutes?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function NwpEnsembleDashboard({
  ensemble,
  tomorrowData = null,
  isTomorrowLoading = false,
  isTomorrowRefreshing = false,
  tomorrowError = null,
  onRefreshTomorrow,
  isStale = false,
  cacheAgeMinutes = 0,
  isLoading = false,
}: NwpEnsembleDashboardProps) {
  if (isLoading && !ensemble) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-60 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-60 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!ensemble) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* SECTION 0: Three-Source Ensemble (SOURCES-002 PART 3) */}
      <ThreeSourceEnsemble
        nwpEnsemble={ensemble}
        tomorrowData={tomorrowData}
        isLoading={isLoading || isTomorrowLoading}
      />

      {/* SECTION 1: Tomorrow.io Card & 3-Model NWP Comparison Side-by-Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TomorrowCard
          data={tomorrowData}
          isLoading={isTomorrowLoading}
          isRefreshing={isTomorrowRefreshing}
          error={tomorrowError}
          onRefresh={onRefreshTomorrow}
          openMeteoRainfall24h={ensemble.comparison.ensemble.rainfall24h}
          openMeteoProb={ensemble.comparison.ensemble.precipitationProbability}
        />
        <NwpEnsembleComparisonCard
          comparison={ensemble.comparison}
          isStale={isStale}
          cacheAgeMinutes={cacheAgeMinutes}
        />
      </div>

      {/* SECTION 2: 10-Day Multi-Model Rainfall Forecast Grouped Chart */}
      <Nwp10DayForecastChart data={ensemble.forecast10Days} />

      {/* SECTION 3 & SECTION 4: Past 7 Days Actual Rainfall & CAPE Convective Risk Index Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NwpPast7DaysChart
          days={ensemble.past7Days.days}
          totalRainfallMm={ensemble.past7Days.totalRainfallMm}
        />
        <NwpCapeCard cape={ensemble.cape} />
      </div>

      {/* SECTION 5: Data Attribution & Future IMD WRF Integration Note */}
      <NwpAttributionFooter />
    </div>
  );
}

export default NwpEnsembleDashboard;
