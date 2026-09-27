"use client";

import React, { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import type { EarthquakeHazardResponse } from "@/types/earthquake";
import type { FirmsHazardResponse } from "@/types/firms";
import {
  ActiveMapLayerId,
  FacilitiesGroupedResponse,
  MapInspectorData,
  DistrictLocation,
  MapFeatureItem,
  SpatialRiskGridFeatureCollection,
  SpatialRiskCellProperties,
  RiverGauge,
  SatelliteRainfallResponse,
} from "@/types";
import type {
  SusceptibilityFeatureCollection,
  SusceptibilityFeatureProperties,
} from "@/lib/services/floodSusceptibility";
import {
  createDistrictCenterIcon,
  createInspectorMarkerIcon,
  createCategoryIcon,
  createRadarCrosshairIcon,
  createFirmsFireIcon,
} from "./map-icons";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  MapPin,
  ExternalLink,
  Navigation,
  Info,
  Crosshair,
  X,
} from "lucide-react";
import type { CopernicusApiResponse } from "@/types/copernicus";
import { RadarLayer } from "./RadarLayer";
import { RadarControlBar } from "./RadarControlBar";
import { SatelliteIRLayer } from "./SatelliteIRLayer";
import { IMDRadarOverlay } from "./IMDRadarOverlay";
import { RadarLegend } from "./RadarLegend";
import { NowcastClickPopup } from "./NowcastClickPopup";
import { useRadarFrames } from "@/hooks/useRadarFrames";


interface GisMapProps {
  location: DistrictLocation;
  facilities: FacilitiesGroupedResponse | null;
  activeLayers: Partial<Record<ActiveMapLayerId, boolean>>;
  riskGridData?: SpatialRiskGridFeatureCollection | null;
  onSelectRiskCell?: (cell: SpatialRiskCellProperties | null) => void;
  selectedRiskCell?: SpatialRiskCellProperties | null;
  onInspectLocation: (data: MapInspectorData | null) => void;
  inspectorData: MapInspectorData | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
  focusCoordinates?: { lat: number; lon: number; zoom?: number } | null;
  riverGauges?: RiverGauge[];
  susceptibilityData?: SusceptibilityFeatureCollection | null;
  onSelectSusceptibilityCell?: (cell: SusceptibilityFeatureProperties | null) => void;
  selectedSusceptibilityCell?: SusceptibilityFeatureProperties | null;
  satelliteRainfallData?: SatelliteRainfallResponse | null;
}



/**
 * Calculates great-circle distance between two geographic coordinates in kilometers.
 */
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Internal controller component that listens to location changes and flies to coordinates.
 */
function MapCenterController({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const prevCoordsRef = useRef({ lat: latitude, lon: longitude });

  useEffect(() => {
    if (
      prevCoordsRef.current.lat !== latitude ||
      prevCoordsRef.current.lon !== longitude
    ) {
      map.flyTo([latitude, longitude], 13, { duration: 1.5 });
      prevCoordsRef.current = { lat: latitude, lon: longitude };
    }
  }, [latitude, longitude, map]);

  return null;
}

/**
 * Internal controller component to smoothly pan and focus the map on target coordinates.
 */
function MapFocusController({
  focusCoordinates,
}: {
  focusCoordinates?: { lat: number; lon: number; zoom?: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      focusCoordinates &&
      typeof focusCoordinates.lat === "number" &&
      typeof focusCoordinates.lon === "number"
    ) {
      map.flyTo(
        [focusCoordinates.lat, focusCoordinates.lon],
        focusCoordinates.zoom || 16,
        { duration: 1.2 }
      );
    }
  }, [focusCoordinates, map]);

  return null;
}

/**
 * Internal map click listener for dropping the inspector pin and computing distance.
 */
function MapClickHandler({
  centerLat,
  centerLon,
  onInspect,
}: {
  centerLat: number;
  centerLon: number;
  onInspect: (data: MapInspectorData) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const distance = calculateHaversineDistanceKm(centerLat, centerLon, lat, lng);
      onInspect({
        latitude: lat,
        longitude: lng,
        distanceKm: distance,
      });
    },
  });

  return null;
}

/**
 * Reusable enriched facility popup component adhering strictly to VARSHANETRA-06 specification.
 */
function FacilityPopupContent({
  item,
  typeLabel,
  colorClass,
  onFlyTo,
}: {
  item: MapFeatureItem;
  typeLabel: string;
  colorClass: string;
  onFlyTo?: (lat: number, lon: number) => void;
}) {
  const osmLink =
    item.osmUrl ||
    (item.osmId
      ? `https://www.openstreetmap.org/${item.osmType || "node"}/${item.osmId}`
      : "https://www.openstreetmap.org");

  return (
    <div className="p-1 space-y-2 text-xs max-w-[260px]">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
          {typeLabel}
        </span>
        {item.severity && (
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
              item.severity === "CRITICAL"
                ? "bg-red-100 text-red-800"
                : item.severity === "ALERT"
                ? "bg-orange-100 text-orange-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {item.severity}
          </span>
        )}
      </div>

      <div>
        <strong className="text-slate-900 dark:text-white text-xs block leading-snug">
          {item.name}
        </strong>
        {item.address ? (
          <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-tight">
            {item.address}
          </p>
        ) : (
          <p className="text-slate-400 text-[10px] italic mt-0.5">
            Address not tagged in OpenStreetMap
          </p>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700 text-[10px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Coordinates:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {item.latitude.toFixed(4)}° N, {item.longitude.toFixed(4)}° E
          </span>
        </div>
        {item.contactNumber && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Phone:</span>
            <a
              href={`tel:${item.contactNumber}`}
              className="text-[#2563EB] font-bold underline"
            >
              {item.contactNumber}
            </a>
          </div>
        )}
        {item.operator && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Operator:</span>
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
              {item.operator}
            </span>
          </div>
        )}
        {item.details && (
          <div className="pt-1 border-t border-slate-200 dark:border-slate-700/80 text-[10px] text-slate-700 dark:text-slate-200 leading-snug whitespace-pre-line">
            {item.details}
          </div>
        )}
        {(item.photoUrl || item.thumbnailUrl) && (
          <div className="pt-1 border-t border-slate-200 dark:border-slate-700/80">
            <a
              href={item.photoUrl || item.thumbnailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded border border-slate-300 dark:border-slate-700 hover:opacity-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnailUrl || item.photoUrl}
                alt={item.name}
                className="w-full h-24 object-cover"
              />
            </a>
            <span className="text-[9px] text-slate-400 italic block text-center mt-0.5">Click photo to view full resolution</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5 text-[9px] text-slate-400">
          <span>Source:</span>
          <span className="truncate">
            {item.metadata?.provider || (item.osmId ? `OpenStreetMap (#${item.osmId})` : "VarshaNetra EOC")}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        {onFlyTo && (
          <button
            onClick={() => onFlyTo(item.latitude, item.longitude)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-[#0F3D66] text-white text-[10px] font-semibold hover:bg-[#0F3D66]/90 transition"
          >
            <Navigation className="w-2.5 h-2.5" />
            <span>Focus in View</span>
          </button>
        )}
        <a
          href={osmLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Open in OSM</span>
        </a>
      </div>
    </div>
  );
}

function getGpmColor(mm: number) {
  if (mm >= 115.0) return { stroke: "#DC2626", fill: "#EF4444", label: "Very Heavy (>115mm)" };
  if (mm >= 64.5) return { stroke: "#EA580C", fill: "#F97316", label: "Heavy (64-115mm)" };
  if (mm >= 15.6) return { stroke: "#2563EB", fill: "#3B82F6", label: "Moderate (15-64mm)" };
  return { stroke: "#0284C7", fill: "#60A5FA", label: "Light (0-15mm)" };
}

/**
 * Primary Leaflet GIS Map Canvas for VarshaNetra with vector waterways and enriched popups.
 */
export default function GisMap({
  location,
  facilities,
  activeLayers,
  riskGridData,
  onSelectRiskCell,
  selectedRiskCell,
  onInspectLocation,
  inspectorData,
  isFullscreen,
  onToggleFullscreen,
  className = "",
  focusCoordinates,
  riverGauges = [],
  susceptibilityData = null,
  onSelectSusceptibilityCell,
  selectedSusceptibilityCell,
  satelliteRainfallData = null,
}: GisMapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // VarshaNetra Doppler Radar & Satellite Nowcast Hook (VN-NOWCAST-001)
  const radarNowcast = useRadarFrames();
  const [radarOpacity, setRadarOpacity] = useState<number>(0.75);
  const [isSatelliteActive, setIsSatelliteActive] = useState<boolean>(false);
  const [isImdActive, setIsImdActive] = useState<boolean>(false);

  const [showIntensityInstruction, setShowIntensityInstruction] = useState<boolean>(false);

  // Copernicus EMS Rapid Mapping & GloFAS state (SOURCES-001)
  const [copernicusData, setCopernicusData] = useState<CopernicusApiResponse | null>(null);
  const [showCopernicusSidePanel, setShowCopernicusSidePanel] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCopernicus() {
      try {
        const res = await fetch("/api/copernicus");
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setCopernicusData(json);
        }
      } catch (err) {
        console.warn("Copernicus map load error:", err);
      }
    }
    loadCopernicus();
    return () => {
      isMounted = false;
    };
  }, []);

  // USGS Earthquakes layer state (SOURCES-003 PART 3)
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeHazardResponse | null>(null);

  useEffect(() => {
    if (!activeLayers.earthquakes) return;
    let isMounted = true;
    async function loadEarthquakes() {
      try {
        const district = location.district || location.shortName || "District";
        const res = await fetch(
          `/api/hazards/earthquake?lat=${location.latitude}&lon=${location.longitude}&district=${encodeURIComponent(
            district
          )}&radius=200`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setEarthquakeData(json);
        }
      } catch (err) {
        console.warn("USGS Earthquake map layer load error:", err);
      }
    }
    loadEarthquakes();
    return () => {
      isMounted = false;
    };
  }, [activeLayers.earthquakes, location.latitude, location.longitude, location.district, location.shortName]);

  // NASA FIRMS Fire & Thermal Anomaly layer state (SOURCES-004)
  const [firmsData, setFirmsData] = useState<FirmsHazardResponse | null>(null);

  useEffect(() => {
    if (!activeLayers.firmsFire) return;
    let isMounted = true;
    async function loadFirmsFires() {
      try {
        const district = location.district || location.shortName || "District";
        const res = await fetch(
          `/api/hazards/firms?lat=${location.latitude}&lon=${location.longitude}&district=${encodeURIComponent(
            district
          )}&radius=80`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setFirmsData(json);
        }
      } catch (err) {
        console.warn("NASA FIRMS map layer load error:", err);
      }
    }
    loadFirmsFires();
    return () => {
      isMounted = false;
    };
  }, [activeLayers.firmsFire, location.latitude, location.longitude, location.district, location.shortName]);

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.flyTo([location.latitude, location.longitude], 13, { duration: 1.2 });
    }
  };

  const handleFlyTo = (lat: number, lon: number) => {
    if (mapInstance) {
      mapInstance.flyTo([lat, lon], 16, { duration: 1.0 });
    }
  };

  // Check if any active layer has 0 items to notify the user transparently
  const activeEmptyLayers = React.useMemo(() => {
    if (!facilities) return [];
    const emptyList: string[] = [];
    if (activeLayers.hospitals && facilities.hospitals.length === 0) emptyList.push("Hospitals");
    if (activeLayers.clinics && facilities.clinics.length === 0) emptyList.push("Clinics");
    if (activeLayers.police && facilities.police.length === 0) emptyList.push("Police");
    if (activeLayers.fire && facilities.fire.length === 0) emptyList.push("Fire Stations");
    if (activeLayers.schools && facilities.schools.length === 0) emptyList.push("Schools");
    if (activeLayers.rivers && facilities.rivers.length === 0) emptyList.push("Waterways");
    return emptyList;
  }, [facilities, activeLayers]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0 h-screen w-screen" : className
      }`}
    >
      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <button
          onClick={handleResetView}
          title="Reset to District Headquarters"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset View</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Operations View"}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </button>
      </div>

      {/* Floating District Center Badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
        <span>{location.shortName || location.displayName}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
          ({location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°)
        </span>
      </div>

      {/* Transparent Zero-State Overlay when selected layer has no mapped OSM data */}
      {activeEmptyLayers.length > 0 && (
        <div className="absolute bottom-6 left-3 z-[1000] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-lg border border-amber-300 dark:border-amber-700/80 shadow-md text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong>OpenStreetMap Notice:</strong> No mapped data found in OpenStreetMap within current search radius for: {activeEmptyLayers.join(", ")}.
          </p>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[540px]"
        ref={setMapInstance}
      >
        {/* Dynamic Center Controller */}
        <MapCenterController
          latitude={location.latitude}
          longitude={location.longitude}
        />

        {/* Dynamic Focus Controller for Row Selection */}
        <MapFocusController focusCoordinates={focusCoordinates} />

        {/* Map Click Event Inspector */}
        <MapClickHandler
          centerLat={location.latitude}
          centerLon={location.longitude}
          onInspect={onInspectLocation}
        />

        {/* Base Map Tile Layer with Official OpenStreetMap Attribution */}
        {activeLayers.basemap && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* Satellite IR Layer (VN-NOWCAST-001 - Phase 6) */}
        {isSatelliteActive && (
          <SatelliteIRLayer
            frames={radarNowcast.satelliteFrames}
            currentIndex={radarNowcast.currentIndex}
            opacity={0.65}
            active={isSatelliteActive}
          />
        )}

        {/* Live Doppler Radar Tile Layer with Preloaded Panes (VN-NOWCAST-001) */}
        {activeLayers.radar && (
          <RadarLayer
            frames={radarNowcast.allFrames}
            currentIndex={radarNowcast.currentIndex}
            opacity={radarOpacity}
            active={Boolean(activeLayers.radar)}
          />
        )}

        {/* Official IMD Doppler Weather Radar Network (VN-NOWCAST-001 - Phase 6) */}
        {isImdActive && (
          <IMDRadarOverlay active={isImdActive} />
        )}

        {/* Map-Click Point Nowcast Telemetry Popup (VN-NOWCAST-001 - Phase 6) */}
        {activeLayers.radar && (
          <NowcastClickPopup active={Boolean(activeLayers.radar)} />
        )}

        {/* Copernicus EMS WMS Flood Delineation Layer (SOURCES-001 PART 3) */}
        {activeLayers.copernicusWms && (
          <WMSTileLayer
            url="https://emergency.copernicus.eu/mapping/wms/emsn"
            params={{
              format: "image/png",
              transparent: true,
              layers: "EMSN_FLOOD",
              version: "1.3.0",
            }}
            opacity={0.65}
            zIndex={430}
          />
        )}

        {/* Spatial Flood Risk Grid Layer (VARSHANETRA-11) */}
        {activeLayers.floodRisk && riskGridData && riskGridData.features && (
          <GeoJSON
            key={`risk_grid_${riskGridData.summary.forecastWindow}_${riskGridData.features.length}`}
            data={riskGridData as unknown as GeoJsonObject}
            style={(feature) => {

              const props = feature?.properties as SpatialRiskCellProperties;
              const isSelected = selectedRiskCell?.cellId === props?.cellId;
              const color = props?.color || "#16A34A";
              return {
                fillColor: color,
                fillOpacity: isSelected ? 0.65 : 0.40,
                color: isSelected ? "#0F172A" : color,
                weight: isSelected ? 2.5 : 1.2,
                opacity: isSelected ? 1.0 : 0.75,
                dashArray: isSelected ? "3, 3" : undefined,
              };
            }}
            onEachFeature={(feature, layer) => {
              const props = feature.properties as SpatialRiskCellProperties;
              if (!props) return;

              layer.on({
                click: () => {
                  if (onSelectRiskCell) {
                    onSelectRiskCell(props);
                  }
                },
                mouseover: (e) => {
                  const target = e.target;
                  if (target.setStyle && selectedRiskCell?.cellId !== props.cellId) {
                    target.setStyle({ fillOpacity: 0.6, weight: 2 });
                  }
                },
                mouseout: (e) => {
                  const target = e.target;
                  if (target.setStyle && selectedRiskCell?.cellId !== props.cellId) {
                    target.setStyle({ fillOpacity: 0.40, weight: 1.2 });
                  }
                },
              });

              // Bind Leaflet Cell Popup
              const popupHtml = `
                <div style="font-family: system-ui, sans-serif; font-size: 11px; max-width: 260px; line-height: 1.4;">
                  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                    <strong style="font-size: 11px; text-transform: uppercase; color: #0f172a;">
                      Cell #${props.cellId.replace("grid_cell_", "")} Susceptibility
                    </strong>
                    <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${props.color}; color: white;">
                      ${props.susceptibilityClass || props.riskLevel} (${props.susceptibilityScore ?? props.riskScore})
                    </span>
                  </div>
                  <div style="margin-bottom: 6px; font-family: monospace; font-size: 10px; color: #64748b;">
                    GPS: ${props.centerLat.toFixed(4)}° N, ${props.centerLon.toFixed(4)}° E
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 6px;">
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Forecast (+${props.forecastWindow}):</td>
                      <td style="font-weight: bold; text-align: right; color: #0f172a;">${props.forecastRainMm} mm</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Antecedent (24h/48h):</td>
                      <td style="font-weight: bold; text-align: right; color: #0f172a;">${props.antecedent24hMm} / ${props.antecedent48hMm} mm</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Elevation & Slope:</td>
                      <td style="font-weight: bold; text-align: right; color: #0f172a;">${props.elevationMeters}m (${props.slopePercent}%)</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Relative Basin Deficit:</td>
                      <td style="font-weight: bold; text-align: right; color: #0f172a;">${props.relativeElevationMeters !== undefined ? `+${props.relativeElevationMeters}m` : 'Unmeasured'}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Nearest Waterway Reach:</td>
                      <td style="font-weight: bold; text-align: right; color: #0f172a;">${props.distanceToRiverMeters ? props.distanceToRiverMeters + 'm' : 'Not Mapped'}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 2px 0;">Data Completeness:</td>
                      <td style="font-weight: bold; text-align: right; color: #0284c7;">${props.dataCompleteness}% (${props.dataCompletenessLevel || 'HIGH'})</td>
                    </tr>
                  </table>
                  <div style="font-size: 9px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px;">
                    Calculated: ${new Date(props.calculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Susceptibility Engine V1
                  </div>
                </div>
              `;
              layer.bindPopup(popupHtml);
            }}
          />
        )}

        {/* Experimental Hydraulic Susceptibility Model Layer (ROAD-003) */}
        {activeLayers.floodSusceptibility && susceptibilityData && susceptibilityData.features && (
          <GeoJSON
            key={`susceptibility_grid_${susceptibilityData.features.length}`}
            data={susceptibilityData as unknown as GeoJsonObject}
            style={(feature) => {
              const props = feature?.properties as SusceptibilityFeatureProperties;
              const isSelected = selectedSusceptibilityCell?.id === props?.id;
              const color = props?.color || "#15803D";
              const fillColor = props?.fillColor || color;
              return {
                fillColor: fillColor,
                fillOpacity: isSelected ? 0.75 : 0.45,
                color: isSelected ? "#0F172A" : color,
                weight: isSelected ? 3 : 1.2,
                opacity: isSelected ? 1.0 : 0.8,
              };
            }}
            onEachFeature={(feature, layer) => {
              const props = feature.properties as SusceptibilityFeatureProperties;
              if (!props) return;

              layer.on({
                click: () => {
                  if (onSelectSusceptibilityCell) {
                    onSelectSusceptibilityCell(props);
                  }
                },
                mouseover: (e) => {
                  const target = e.target;
                  if (target.setStyle && selectedSusceptibilityCell?.id !== props.id) {
                    target.setStyle({ fillOpacity: 0.7, weight: 2.2 });
                  }
                },
                mouseout: (e) => {
                  const target = e.target;
                  if (target.setStyle && selectedSusceptibilityCell?.id !== props.id) {
                    target.setStyle({ fillOpacity: 0.45, weight: 1.2 });
                  }
                },
              });

              // Popup with mandatory disclaimers and 4-factor breakdown
              const popupHtml = `
                <div style="font-family: sans-serif; font-size: 11px; min-width: 220px; line-height: 1.4;">
                  <div style="padding: 6px 8px; border-radius: 6px; background-color: #FEF3C7; border: 1px solid #F59E0B; margin-bottom: 8px;">
                    <strong style="color: #92400E; display: block; font-size: 10px; margin-bottom: 2px;">
                      यह प्रायोगिक संवेदनशीलता मानचित्रण है, वास्तविक बाढ़ गहराई भविष्यवाणी नहीं
                    </strong>
                    <div style="font-size: 9px; color: #B45309;">
                      This is EXPERIMENTAL susceptibility mapping, NOT actual flood depth prediction.
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 800; font-size: 12px; color: ${props.color};">
                      ${props.category} (${props.categoryHi} / ${props.categoryEn})
                    </span>
                    <span style="font-weight: 800; font-size: 13px; color: #0F172A;">
                      ${props.score} / 100
                    </span>
                  </div>
                  <div style="font-family: monospace; font-size: 10px; color: #64748B; margin-bottom: 6px;">
                    GPS: ${props.lat.toFixed(4)}° N, ${props.lon.toFixed(4)}° E
                  </div>
                  <div style="font-weight: 700; font-size: 10px; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
                    Contributing Factors (4 Components)
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px;">
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                      <td style="color: #64748B; padding: 2px 0;">1. Rainfall (+24h):</td>
                      <td style="font-weight: bold; text-align: right; color: #2563EB;">${props.factors.rainfallScore} / 35</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                      <td style="color: #64748B; padding: 2px 0;">2. Antecedent Moisture:</td>
                      <td style="font-weight: bold; text-align: right; color: #0D9488;">${props.factors.antecedentMoistureScore} / 20</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                      <td style="color: #64748B; padding: 2px 0;">3. Relative Elevation:</td>
                      <td style="font-weight: bold; text-align: right; color: #16A34A;">${props.factors.elevationScore} / 25</td>
                    </tr>
                    <tr>
                      <td style="color: #64748B; padding: 2px 0;">4. River Proximity:</td>
                      <td style="font-weight: bold; text-align: right; color: #0284C7;">${props.factors.riverProximityScore} / 20</td>
                    </tr>
                  </table>
                  <div style="font-size: 9px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px;">
                    यह स्थान-विशेष अनुमान है। CWC और IMD के आधिकारिक डेटा से सत्यापित करें।<br/>
                    <em>This is a location-specific estimate. Verify with official CWC and IMD data.</em>
                  </div>
                </div>
              `;
              layer.bindPopup(popupHtml);
            }}
          />
        )}

        {/* NASA GPM IMERG Satellite Rainfall Layer (LIVE-002) */}
        {activeLayers.nasaGpmRainfall && satelliteRainfallData?.rainfall_spatial_distribution && (
          <>
            {satelliteRainfallData.rainfall_spatial_distribution.map((pt, i) => {
              const color = getGpmColor(pt.value);
              return (
                <Circle
                  key={`gpm-pt-${pt.cellId || i}`}
                  center={[pt.lat, pt.lon]}
                  radius={4200}
                  pathOptions={{
                    color: color.stroke,
                    fillColor: color.fill,
                    fillOpacity: 0.52,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs font-sans min-w-[190px]">
                      <div className="flex items-center justify-between gap-1 border-b pb-1 font-bold text-slate-900">
                        <span>🛰️ NASA GPM IMERG</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] text-white"
                          style={{ backgroundColor: color.stroke }}
                        >
                          {color.label}
                        </span>
                      </div>
                      <div className="text-slate-700 py-1 space-y-0.5">
                        <div>
                          <strong>Observed Rainfall:</strong> {pt.value} mm
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Coordinates: {pt.lat.toFixed(3)}°N, {pt.lon.toFixed(3)}°E
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 pt-1 border-t">
                        {satelliteRainfallData.status === "demo"
                          ? "DEMO Simulated Orbit Grid"
                          : "NASA Earthdata Late Run (4-6h latency)"}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </>
        )}

        {/* District Command Post Center Marker & Operational Buffer Ring */}
        <Marker
          position={[location.latitude, location.longitude]}
          icon={createDistrictCenterIcon(location.shortName?.slice(0, 3) || "HQ")}
        >
          <Popup>
            <div className="p-1 space-y-1 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <span>District Command Post</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-tight">
                {location.displayName}
              </p>
              <div className="pt-1 text-[10px] text-slate-500 font-mono">
                GPS: {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
              </div>
            </div>
          </Popup>
        </Marker>

        {/* District Center Radar Intensity Targeting Crosshair (RADAR-001 PART 4) */}
        {activeLayers.radar && (
          <Marker
            position={[location.latitude, location.longitude]}
            icon={createRadarCrosshairIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="p-1.5 space-y-1.5 text-xs font-sans min-w-[220px]">
                <div className="flex items-center justify-between border-b pb-1 font-bold text-slate-900 dark:text-white">
                  <span>🎯 जिला केंद्र रडार प्रेक्षण</span>
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-mono">Radar Crosshair</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  <strong>जिला केंद्र पर रडार तीव्रता मानचित्र से देखें</strong><br />
                  <span className="text-[10px] text-slate-500">View radar intensity at district center on map.</span>
                </p>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white">रडार रंग गाइड (RainViewer Color Code):</div>
                  <div>• नीला: हल्की वर्षा (1-4 mm/hr)</div>
                  <div>• हरा: मध्यम वर्षा (4-16 mm/hr)</div>
                  <div>• पीला / नारंगी: भारी वर्षा (16-64 mm/hr)</div>
                  <div>• लाल: अत्यधिक भारी (&gt;64 mm/hr)</div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 5km Tactical Operational Reach Radius Buffer */}
        <Circle
          center={[location.latitude, location.longitude]}
          radius={5000}
          pathOptions={{
            color: "#0F3D66",
            weight: 1.5,
            fillColor: "#2563EB",
            fillOpacity: 0.04,
            dashArray: "4, 4",
          }}
        />

        {/* Map Click Inspector Pin */}
        {inspectorData && (
          <Marker
            position={[inspectorData.latitude, inspectorData.longitude]}
            icon={createInspectorMarkerIcon()}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <span className="font-bold text-sky-900 block">Inspected Coordinates</span>
                <p className="font-mono text-[11px] text-slate-600">
                  {inspectorData.latitude.toFixed(5)}° N, {inspectorData.longitude.toFixed(5)}° E
                </p>
                <p className="text-[10px] text-slate-500">
                  Distance to District HQ: <strong>{inspectorData.distanceKm.toFixed(2)} km</strong>
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Facilities Layers */}
        {facilities && (
          <>
            {/* Hospitals */}
            {activeLayers.hospitals &&
              facilities.hospitals.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Hospital & Trauma Care"
                      colorClass="text-emerald-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Clinics */}
            {activeLayers.clinics &&
              facilities.clinics.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Clinic / Dispensary"
                      colorClass="text-teal-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Police */}
            {activeLayers.police &&
              facilities.police.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Police Station / Outpost"
                      colorClass="text-blue-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Fire Stations */}
            {activeLayers.fire &&
              facilities.fire.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Fire & Water Rescue"
                      colorClass="text-red-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Schools / Shelters */}
            {activeLayers.schools &&
              facilities.schools.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="School / Evac Shelter"
                      colorClass="text-indigo-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Rivers & Natural Waterways: Render distinctly as blue vector polylines when geometry exists */}
            {activeLayers.rivers &&
              facilities.rivers.map((item) => {
                if (item.geometry && item.geometry.length > 1) {
                  return (
                    <Polyline
                      key={item.id}
                      positions={item.geometry}
                      pathOptions={{
                        color: "#0284C7",
                        weight: 4.5,
                        opacity: 0.85,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    >
                      <Popup>
                        <FacilityPopupContent
                          item={item}
                          typeLabel="River / Drainage Reach"
                          colorClass="text-sky-700"
                          onFlyTo={handleFlyTo}
                        />
                      </Popup>
                    </Polyline>
                  );
                }

                return (
                  <Marker
                    key={item.id}
                    position={[item.latitude, item.longitude]}
                    icon={createCategoryIcon(item.category)}
                  >
                    <Popup>
                      <FacilityPopupContent
                        item={item}
                        typeLabel="Waterway / Hydrology"
                        colorClass="text-sky-700"
                        onFlyTo={handleFlyTo}
                      />
                    </Popup>
                  </Marker>
                );
              })}

            {/* Field Reports */}
            {activeLayers.fieldReports &&
              facilities.fieldReports.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category, item.severity)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Field Observer Report"
                      colorClass="text-amber-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Incidents */}
            {activeLayers.incidents &&
              facilities.incidents.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category, item.severity)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Emergency Incident Ticket"
                      colorClass="text-red-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Response Teams */}
            {activeLayers.responseTeams &&
              facilities.responseTeams &&
              facilities.responseTeams.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category, item.severity)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Tactical Response Unit"
                      colorClass="text-[#0F3D66]"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* Relief Shelters */}
            {activeLayers.shelters &&
              facilities.shelters &&
              facilities.shelters.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.latitude, item.longitude]}
                  icon={createCategoryIcon(item.category, item.severity)}
                >
                  <Popup>
                    <FacilityPopupContent
                      item={item}
                      typeLabel="Designated Relief Shelter"
                      colorClass="text-emerald-700"
                      onFlyTo={handleFlyTo}
                    />
                  </Popup>
                </Marker>
              ))}

            {/* CWC River Gauge Stations */}
            {activeLayers.riverGauges &&
              riverGauges.filter((g) => g.latitude !== null && g.longitude !== null).map((gauge) => {
                const statusSeverity =
                  gauge.status === "CRITICAL" ? "CRITICAL" :
                  gauge.status === "DANGER" ? "ALERT" :
                  gauge.status === "WARNING" ? "ADVISORY" : undefined;
                const popupContent = `
                  <div style="font-family: sans-serif; font-size: 11px; min-width: 180px;">
                    <div style="font-weight: 800; color: #0F3D66; margin-bottom: 4px; font-size: 12px;">
                      ${gauge.river_name} — ${gauge.station_name}
                    </div>
                    <div style="color: #64748b; margin-bottom: 6px;">${gauge.district}, ${gauge.state}</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                      <tr>
                        <td style="color: #64748b; padding: 2px 0;">Current Level:</td>
                        <td style="font-weight: bold; text-align: right;">${gauge.current_level_m !== null ? gauge.current_level_m.toFixed(2) + ' m' : '—'}</td>
                      </tr>
                      <tr>
                        <td style="color: #DC2626; padding: 2px 0;">Danger Level:</td>
                        <td style="font-weight: bold; text-align: right; color: #DC2626;">${gauge.danger_level_m !== null ? gauge.danger_level_m.toFixed(2) + ' m' : '—'}</td>
                      </tr>
                      <tr>
                        <td style="color: #D97706; padding: 2px 0;">Warning Level:</td>
                        <td style="font-weight: bold; text-align: right; color: #D97706;">${gauge.warning_level_m !== null ? gauge.warning_level_m.toFixed(2) + ' m' : '—'}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; padding: 2px 0;">Trend:</td>
                        <td style="font-weight: bold; text-align: right;">${gauge.level_trend ?? '—'}</td>
                      </tr>
                    </table>
                    <div style="margin-top: 6px; font-size: 9px; color: #94a3b8;">CWC Manual Entry — ffis.cwc.gov.in</div>
                  </div>
                `;
                return (
                  <Marker
                    key={gauge.id}
                    position={[gauge.latitude as number, gauge.longitude as number]}
                    icon={createCategoryIcon("RIVER_GAUGE", statusSeverity)}
                  >
                    <Popup>
                      <div dangerouslySetInnerHTML={{ __html: popupContent }} />
                    </Popup>
                  </Marker>
                );
              })}

            {/* USGS Earthquakes Seismic Risk Markers (SOURCES-003 PART 3) */}
            {activeLayers.earthquakes && earthquakeData?.earthquakes && (
              <>
                {earthquakeData.earthquakes.map((eq) => {
                  const radius = eq.magnitude >= 5.0 ? 20 : eq.magnitude >= 4.0 ? 10 : 5;
                  const fillColor = eq.magnitude >= 5.0 ? "#DC2626" : eq.magnitude >= 4.0 ? "#EA580C" : "#EAB308";
                  const strokeColor = eq.magnitude >= 5.0 ? "#991B1B" : eq.magnitude >= 4.0 ? "#C2410C" : "#A16207";

                  return (
                    <CircleMarker
                      key={`eq_${eq.id}`}
                      center={[eq.latitude, eq.longitude]}
                      radius={radius}
                      pathOptions={{
                        color: strokeColor,
                        fillColor: fillColor,
                        fillOpacity: 0.8,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="p-1.5 space-y-1.5 text-xs font-sans min-w-[210px] max-w-[270px]">
                          <div className="flex items-center justify-between border-b pb-1">
                            <span className="font-extrabold text-sm" style={{ color: strokeColor }}>
                              M {eq.magnitude.toFixed(1)} {eq.magnitude >= 5 ? "Strong" : eq.magnitude >= 4 ? "Moderate" : "Minor"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {eq.distanceKm.toFixed(1)} km away
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {eq.place}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-0.5">
                            <div><strong>Time:</strong> {new Date(eq.timestamp).toLocaleString()}</div>
                            <div><strong>Depth:</strong> {eq.depthKm.toFixed(1)} km</div>
                            <div><strong>Coordinates:</strong> {eq.latitude.toFixed(4)}° N, {eq.longitude.toFixed(4)}° E</div>
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <a
                              href={eq.shakemapUrl || eq.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>USGS ShakeMap / Event Page</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            )}

            {/* NASA FIRMS Active Fire & Thermal Anomaly Markers (SOURCES-004) */}
            {activeLayers.firmsFire && firmsData?.fire_locations && (
              <>
                {firmsData.fire_locations.map((fire) => (
                  <Marker
                    key={fire.id}
                    position={[fire.latitude, fire.longitude]}
                    icon={createFirmsFireIcon(fire.confidence)}
                  >
                    <Popup>
                      <div className="p-1.5 space-y-1.5 text-xs font-sans min-w-[210px] max-w-[270px]">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-extrabold text-sm text-red-600 flex items-center gap-1">
                            <span>🔥</span>
                            <span>{fire.confidence === "high" ? "High Confidence Fire" : "Thermal Anomaly"}</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-red-100 text-red-800">
                            {fire.distanceKm.toFixed(1)} km away
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 pt-0.5">
                          <div>
                            <strong>Detection Time:</strong> {fire.acq_date} {fire.acq_time} UTC
                          </div>
                          <div>
                            <strong>Confidence:</strong>{" "}
                            <span className="capitalize font-semibold text-red-700 dark:text-red-400">
                              {fire.confidence}
                            </span>
                          </div>
                          {fire.frp !== undefined && (
                            <div>
                              <strong>Fire Radiative Power (FRP):</strong>{" "}
                              <span className="font-bold text-orange-600">{fire.frp.toFixed(1)} MW</span>
                            </div>
                          )}
                          <div>
                            <strong>Sensor:</strong> {fire.satellite} ({fire.instrument}) • {fire.daynight === "D" ? "Day Pass" : "Night Pass"}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 pt-0.5">
                            GPS: {fire.latitude.toFixed(4)}° N, {fire.longitude.toFixed(4)}° E
                          </div>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                          NASA FIRMS VIIRS 375m NRT Feed
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </>
            )}
          </>
        )}
      </MapContainer>

      {/* RainViewer Live Radar: Nowcast Mode Alert Banner (Top Center) */}
      {activeLayers.radar && radarNowcast.allFrames[radarNowcast.currentIndex]?.kind === "forecast" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-orange-600/95 dark:bg-orange-700/95 text-white px-3.5 py-1.5 rounded-lg shadow-lg border border-orange-500/80 text-xs font-semibold flex items-center gap-2 pointer-events-auto backdrop-blur-xs animate-pulse">
          <span className="text-sm">⚠️</span>
          <div>
            <div className="font-bold tracking-tight">
              पूर्वानुमान मोड - अगले 30 मिनट (NOWCAST MODE - Next 30 minutes)
            </div>
            <div className="text-[10px] text-orange-100 font-normal leading-tight">
              यह रडार-आधारित अल्पकालिक पूर्वानुमान है (This is radar-based short-term nowcast)
            </div>
          </div>
        </div>
      )}

      {/* District Radar Intensity Guidance Banner (PART 4) */}
      {activeLayers.radar && showIntensityInstruction && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[92%] sm:w-auto max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-blue-400 dark:border-blue-700 p-3 rounded-xl shadow-xl text-xs pointer-events-auto">
          <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-300 pb-1.5 border-b border-slate-200 dark:border-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-red-600" />
              <span>रडार वर्षा तीव्रता निर्देश (Intensity Guide)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowIntensityInstruction(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            जिले के ऊपर रडार रंग देखें: <span className="text-blue-600 font-bold">नीला = हल्की वर्षा</span>, <span className="text-green-600 font-bold">हरा = मध्यम</span>, <span className="text-orange-500 font-bold">पीला/नारंगी = भारी</span>, <span className="text-red-600 font-bold">लाल = अत्यधिक भारी</span>।
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
            Check radar color over district center crosshair (🎯): Blue = light rain, Green = moderate, Orange = heavy, Red = extreme rain.
          </p>
        </div>
      )}

      {/* Doppler Radar Reflectivity Legend (VN-NOWCAST-001 - Phase 6) */}
      {activeLayers.radar && (
        <RadarLegend />
      )}

      {/* Doppler Radar & Nowcast Control Bar (VN-NOWCAST-001 - Phase 5, 6 & 7) */}
      {activeLayers.radar && (
        <RadarControlBar
          allFrames={radarNowcast.allFrames}
          radarPast={radarNowcast.radarPast}
          radarNowcast={radarNowcast.radarNowcast}
          currentIndex={radarNowcast.currentIndex}
          setCurrentIndex={radarNowcast.setCurrentIndex}
          isLoading={radarNowcast.isLoading}
          error={radarNowcast.error}
          onRetry={radarNowcast.refresh}
          isStale={radarNowcast.isStale}
          radarActive={Boolean(activeLayers.radar)}
          satelliteActive={isSatelliteActive}
          onToggleSatellite={() => setIsSatelliteActive((prev) => !prev)}
          imdActive={isImdActive}
          onToggleImd={() => setIsImdActive((prev) => !prev)}
          radarOpacity={radarOpacity}
          onChangeRadarOpacity={setRadarOpacity}
        />
      )}

      {/* Copernicus Emergency Flood Maps Viewer Panel (SOURCES-001 PART 3) */}
      {(activeLayers.copernicusWms || showCopernicusSidePanel) && (
        <div className="absolute top-14 right-3 z-[1000] w-80 max-w-[90vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-blue-400 dark:border-blue-700/80 rounded-xl shadow-2xl p-3 text-xs space-y-2.5 pointer-events-auto">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              <span className="text-base">🇪🇺</span>
              <span>Copernicus बाढ़ मानचित्र (Flood Maps)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowCopernicusSidePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
            {copernicusData?.has_active_india_event ? (
              <span className="text-red-600 font-bold">
                ⚠️ सक्रिय भारतीय बाढ़ उपग्रह मानचित्रण (Active India Event Triggered)
              </span>
            ) : (
              <span>
                वर्तमान में कोई सक्रिय आपातकालीन मानचित्रण नहीं (No active India activation). आधिकारिक उपग्रह मानचित्र अभिलेख:
              </span>
            )}
          </div>

          {/* List of Activations with direct 1-click links */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(copernicusData?.activations || []).slice(0, 3).map((act) => (
              <div
                key={act.activation_code}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1 text-[11px]"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-blue-600 dark:text-blue-400">{act.activation_code}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      act.status === "ONGOING"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 dark:text-slate-200 line-clamp-1">
                  {act.title}
                </div>
                <div className="flex items-center justify-between pt-0.5 text-[10px]">
                  <span className="text-slate-400">{act.products_count ?? 1} Maps</span>
                  <a
                    href={act.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>मानचित्र देखें (View Maps)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>WMS: emsn_flood</span>
            <a
              href="https://emergency.copernicus.eu/mapping/list-of-activations-rapid?f[0]=field_countries:India"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>All India Feed</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
