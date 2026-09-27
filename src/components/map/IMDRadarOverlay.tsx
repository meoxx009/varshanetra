"use client";

/**
 * VarshaNetra IMD Doppler Weather Radar Network Overlay (VN-NOWCAST-001 - Phase 6)
 *
 * Requirements:
 * - Fetch /api/v1/nowcast/imd-stations on mount
 * - 250 km coverage circle with dashed border (fillOpacity 0.04)
 * - Station radar icon marker with tooltip
 * - Leaflet popup embedding official IMD Doppler radar GIF with skeleton and error fallback
 * - Toggleable via active prop (default OFF)
 */

import React, { useState, useEffect } from "react";
import { Circle, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { RefreshCw, AlertTriangle } from "lucide-react";

export interface IMDStation {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  radius_km: number;
}

export interface IMDRadarOverlayProps {
  active?: boolean;
}

function createIMDStationIcon(): L.DivIcon {
  return L.divIcon({
    className: "imd-station-icon",
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0f172a;
        border: 2px solid #f59e0b;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      ">
        <span style="font-size: 13px;">📡</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

export function IMDRadarOverlay({ active = false }: IMDRadarOverlayProps) {
  const [stations, setStations] = useState<IMDStation[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadStations() {
      try {
        let res: Response | null = null;
        try {
          res = await fetch("/api/v1/nowcast/imd-stations");
        } catch {
          res = null;
        }

        if (!res || !res.ok) {
          res = await fetch("http://localhost:8000/api/v1/nowcast/imd-stations");
        }

        if (!res.ok) {
          throw new Error(`IMD stations HTTP ${res.status}`);
        }

        const data: IMDStation[] = await res.json();
        if (isMounted) {
          setStations(data);
        }
      } catch (err: unknown) {
        console.warn("[IMDRadarOverlay] Failed to load stations:", err);
      }
    }

    loadStations();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!active || stations.length === 0) {
    return null;
  }

  const stationIcon = createIMDStationIcon();

  return (
    <>
      {stations.map((st) => (
        <React.Fragment key={`imd-station-${st.id}`}>
          {/* 250 km Radar Coverage Perimeter Circle */}
          <Circle
            center={[st.lat, st.lon]}
            radius={st.radius_km * 1000}
            pathOptions={{
              color: "#f59e0b",
              dashArray: "6, 8",
              weight: 1.5,
              fillColor: "#f59e0b",
              fillOpacity: 0.04,
            }}
          />

          {/* Station Center Marker */}
          <Marker position={[st.lat, st.lon]} icon={stationIcon}>
            <Tooltip direction="top" offset={[0, -10]}>
              <div className="text-xs font-sans font-bold text-slate-900">
                IMD DWR {st.name} ({st.code.toUpperCase()})
              </div>
            </Tooltip>

            <Popup maxWidth={360} minWidth={280}>
              <IMDStationPopupContent station={st} />
            </Popup>
          </Marker>
        </React.Fragment>
      ))}
    </>
  );
}

function IMDStationPopupContent({ station }: { station: IMDStation }) {
  const [imgError, setImgError] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [product, setProduct] = useState<string>("caz");

  const radarImgUrl = `/api/v1/nowcast/imd-radar/${station.id}?product=${product}&t=${Date.now()}`;

  return (
    <div className="p-1 space-y-2 font-sans text-xs">
      <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
        <div>
          <strong className="text-sm font-bold text-slate-900">
            {station.name} Radar
          </strong>
          <span className="text-[10px] text-amber-700 font-mono ml-1.5 font-bold">
            [{station.code.toUpperCase()}]
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-semibold">
          250 km Range
        </span>
      </div>

      <div className="text-[11px] text-slate-600">
        GPS: {station.lat.toFixed(3)}° N, {station.lon.toFixed(3)}° E • India Meteorological Dept
      </div>

      {/* Product Selector */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-slate-500 font-medium">Product:</span>
        <select
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            setImgLoaded(false);
            setImgError(false);
          }}
          className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-800"
        >
          <option value="caz">Composite Max Reflectivity (CAZ)</option>
          <option value="ppi">Plan Position Indicator (PPI)</option>
          <option value="ppz">PPI Z Reflectivity (PPZ)</option>
          <option value="vp2">Doppler Radial Velocity (VP2)</option>
        </select>
      </div>

      {/* Imagery Container with Skeleton & Fallback */}
      <div className="relative w-full h-[220px] rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-[11px]">Streaming official IMD imagery...</span>
          </div>
        )}

        {imgError ? (
          <div className="p-3 text-center text-slate-300 space-y-1">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="font-semibold text-xs text-white">IMD feed temporarily unavailable</p>
            <p className="text-[10px] text-slate-400">
              Station maintenance or upstream IMD portal delay. RainViewer radar composite remains active.
            </p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={radarImgUrl}
            alt={`IMD Doppler Radar ${station.name}`}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true);
              setImgLoaded(false);
            }}
          />
        )}
      </div>

      <div className="text-[10px] text-slate-400 text-right pt-0.5">
        Source: Mausam IMD • Proxied via VarshaNetra E2
      </div>
    </div>
  );
}

export default IMDRadarOverlay;
