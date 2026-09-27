"use client";

import React, { useState } from "react";
import { Crosshair, Copy, Check, X, Navigation } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapInspectorData } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface MapInspectorProps {
  inspectorData: MapInspectorData | null;
  districtName: string;
  onClose: () => void;
  onSetFocus?: (lat: number, lon: number) => void;
}

export const MapInspector: React.FC<MapInspectorProps> = ({
  inspectorData,
  districtName,
  onClose,
  onSetFocus,
}) => {
  const [copied, setCopied] = useState(false);
  const locale = useLocale();

  if (!inspectorData) return null;

  const handleCopy = () => {
    const text = `${inspectorData.latitude.toFixed(5)}, ${inspectorData.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-sky-300 dark:border-sky-800 bg-sky-50/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md transition-all">
      <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-sky-900 dark:text-sky-200">
          <Crosshair className="w-4 h-4 text-[#2563EB]" />
          {locale === "hi" ? "निर्देशांक निरीक्षक" : "Coordinate Inspector"}
        </CardTitle>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
          aria-label={locale === "hi" ? "निरीक्षक बंद करें" : "Close Inspector"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0 text-xs space-y-2.5">
        <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-sky-200 dark:border-slate-700">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">{locale === "hi" ? "अक्षांश" : "Latitude"}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {inspectorData.latitude.toFixed(5)}° N
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">{locale === "hi" ? "देशांतर" : "Longitude"}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {inspectorData.longitude.toFixed(5)}° E
            </span>
          </div>
        </div>

        {inspectorData.isWithinPilotTerrain && inspectorData.elevationMeters !== undefined && (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-emerald-800 dark:text-emerald-300 font-bold block">
                {locale === "hi" ? "ऊँचाई:" : "Elevation:"} {inspectorData.elevationMeters} m AMSL
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                {locale === "hi" ? "ढलान:" : "Slope:"} {inspectorData.slopePercent}% ({inspectorData.terrainClassification})
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              DEM OK
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-1">
          <span>{locale === "hi" ? `${districtName} से दूरी:` : `Distance from ${districtName}:`}</span>
          <span className="font-bold text-[#0F3D66] dark:text-sky-400">
            {inspectorData.distanceKm.toFixed(2)} km
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>{locale === "hi" ? "कॉपी किया गया!" : "Copied!"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>{locale === "hi" ? "जीपीएस कॉपी करें" : "Copy GPS"}</span>
              </>
            )}
          </button>

          {onSetFocus && (
            <button
              onClick={() => onSetFocus(inspectorData.latitude, inspectorData.longitude)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white text-[11px] font-semibold shadow-2xs transition"
              title={locale === "hi" ? "मानचित्र केंद्र बनाएं" : "Center Map"}
            >
              <Navigation className="w-3 h-3" />
              <span>{locale === "hi" ? "केंद्र करें" : "Center"}</span>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
