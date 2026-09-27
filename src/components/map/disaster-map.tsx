"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Radio } from "lucide-react";
import { createDistrictCenterIcon } from "./map-icons";

export interface MapOverlayProps {
  districtName: string;
  lat: number;
  lng: number;
  yesterdayRainfallMm?: number | null;
}

function GPMControlBox({ yesterdayRainfallMm }: { yesterdayRainfallMm: number | null }) {
  return (
    <div className="leaflet-top leaflet-right mt-3 mr-3 z-[1000] pointer-events-auto">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 px-3 rounded-lg shadow-md border text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <span>🛰️ NASA GPM:</span>
        <span className="text-blue-600 dark:text-blue-400 font-bold">
          {yesterdayRainfallMm !== null && yesterdayRainfallMm !== undefined ? `${yesterdayRainfallMm} mm` : "N/A"}
        </span>
        <span className="text-[10px] text-muted-foreground font-normal">(yesterday)</span>
      </div>
    </div>
  );
}

function RadarControlBox({
  active,
  onToggle,
  frameTime,
}: {
  active: boolean;
  onToggle: () => void;
  frameTime?: string;
}) {
  return (
    <div className="leaflet-top leaflet-left mt-3 ml-12 z-[1000] pointer-events-auto">
      <button
        type="button"
        onClick={onToggle}
        title="Toggle RainViewer Live Radar Overlay"
        className={`backdrop-blur-md p-1.5 px-3 rounded-lg shadow-md border text-xs font-semibold flex items-center gap-1.5 transition ${
          active
            ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
            : "bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <Radio className="w-3.5 h-3.5" />
        <span>{active ? "रडार (Radar ON)" : "रडार (Radar)"}</span>
        {active && frameTime && <span className="text-[10px] opacity-90">({frameTime})</span>}
      </button>
    </div>
  );
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function DisasterMap({
  lat,
  lng,
  districtName,
  yesterdayRainfallMm = 18.4,
}: MapOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [radarTileUrl, setRadarTileUrl] = useState<string | null>(null);
  const [radarFrameTime, setRadarFrameTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    async function fetchRadar() {
      try {
        const res = await fetch("/api/radar/rainviewer");
        if (res.ok) {
          const json = await res.json();
          if (json.radar_frames && json.radar_frames.length > 0) {
            const latest = json.radar_frames[json.radar_frames.length - 1];
            setRadarTileUrl(`${json.host}${latest.path}/256/{z}/{x}/{y}/4/1_1.png`);
            setRadarFrameTime(latest.datetime);
          }
        }
      } catch (e) {
        console.error("DisasterMap radar load error:", e);
      }
    }
    fetchRadar();
  }, []);

  if (!mounted) {
    return (
      <div className="h-[400px] w-full relative rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        मानचित्र लोड हो रहा है (Loading Disaster Map)...
      </div>
    );
  }

  const markerIcon = typeof window !== "undefined"
    ? createDistrictCenterIcon(districtName.slice(0, 3).toUpperCase())
    : undefined;

  return (
    <div className="h-[400px] w-full relative rounded-lg overflow-hidden border shadow-xs">
      <MapContainer center={[lat, lng]} zoom={9} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter lat={lat} lng={lng} />

        {/* RainViewer Live Radar Tile Layer */}
        {showRadar && radarTileUrl && (
          <TileLayer
            key={radarTileUrl}
            attribution='&copy; <a href="https://www.rainviewer.com">RainViewer</a>'
            url={radarTileUrl}
            opacity={0.6}
            zIndex={400}
          />
        )}

        {/* Map Control Box for NASA Satellite GPM Indicator */}
        <GPMControlBox yesterdayRainfallMm={yesterdayRainfallMm ?? null} />

        {/* Map Control Box for RainViewer Live Radar Toggle */}
        <RadarControlBox
          active={showRadar}
          onToggle={() => setShowRadar(!showRadar)}
          frameTime={radarFrameTime}
        />

        {markerIcon && (
          <Marker position={[lat, lng]} icon={markerIcon}>
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <p className="font-bold text-slate-900">{districtName}</p>
                <p>
                  🛰️ NASA GPM उपग्रह वर्षा (कल): <strong>{yesterdayRainfallMm !== null && yesterdayRainfallMm !== undefined ? `${yesterdayRainfallMm} mm` : "N/A"}</strong>
                </p>
                <p className="text-[10px] text-muted-foreground">स्रोत: NASA POWER GPM IMERG</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export { DisasterMap };
