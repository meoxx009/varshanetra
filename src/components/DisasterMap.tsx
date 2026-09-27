"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { MapOverlayProps } from "./map/disaster-map";

const DynamicDisasterMap = dynamic(
  () => import("./map/disaster-map").then((mod) => mod.DisasterMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full relative rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        मानचित्र लोड हो रहा है (Loading Disaster Map)...
      </div>
    ),
  }
);

export default function DisasterMap(props: MapOverlayProps) {
  return <DynamicDisasterMap {...props} />;
}

export { DisasterMap };
export type { MapOverlayProps };
