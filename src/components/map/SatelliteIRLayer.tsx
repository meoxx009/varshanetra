"use client";

/**
 * VarshaNetra Satellite Infrared Layer (VN-NOWCAST-001 - Phase 6)
 *
 * Requirements:
 * - Dedicated Leaflet Pane: satellitePane (zIndex 350)
 * - 512px tile scaling: { tileSize: 512, zoomOffset: -1 }
 * - Preload all satellite_ir frames at opacity 0; animate via setOpacity
 * - Remove all layers from map on unmount
 * - Default OFF / toggled from control bar
 */

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { RadarNowcastFrame } from "@/hooks/useRadarFrames";

export interface SatelliteIRLayerProps {
  frames?: RadarNowcastFrame[];
  currentIndex?: number;
  opacity?: number;
  active?: boolean;
}

export function SatelliteIRLayer({
  frames = [],
  currentIndex = 0,
  opacity = 0.65,
  active = false,
}: SatelliteIRLayerProps) {
  const map = useMap();
  const layersMapRef = useRef<Map<number, L.TileLayer>>(new Map());
  const prevFramesKeyRef = useRef<string>("");

  // Ensure satellitePane exists with zIndex 350
  useEffect(() => {
    if (!map) return;
    let satPane = map.getPane("satellitePane");
    if (!satPane) {
      satPane = map.createPane("satellitePane");
      satPane.style.zIndex = "350";
      satPane.style.pointerEvents = "none";
    }
  }, [map]);

  // Preload all frames at opacity 0 on mount / when frames change
  useEffect(() => {
    if (!map || frames.length === 0) return;

    const framesKey = frames.map((f) => `${f.time}_${f.tile}`).join("|");
    if (framesKey === prevFramesKeyRef.current && layersMapRef.current.size === frames.length) {
      return;
    }
    prevFramesKeyRef.current = framesKey;

    // Clean up existing preloaded layers
    layersMapRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch {
        // Ignored
      }
    });
    layersMapRef.current.clear();

    // Preload each satellite frame
    frames.forEach((frame, idx) => {
      const tileLayer = L.tileLayer(frame.tile, {
        pane: "satellitePane",
        tileSize: 512,
        zoomOffset: -1,
        opacity: 0,
        attribution: 'Satellite © <a href="https://www.rainviewer.com" target="_blank" rel="noopener noreferrer">RainViewer.com</a> / NASA GIBS',
        maxZoom: 19,
        minZoom: 2,
        keepBuffer: 3,
      });

      tileLayer.addTo(map);
      layersMapRef.current.set(idx, tileLayer);
    });

    const layersMap = layersMapRef.current;

    return () => {
      layersMap.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {
          // Ignored
        }
      });
      layersMap.clear();
      prevFramesKeyRef.current = "";
    };
  }, [map, frames]);

  // Toggle opacity when active or currentIndex changes
  useEffect(() => {
    if (!map || layersMapRef.current.size === 0) return;

    // In case satellite frames count differs from radar frames, clamp to available count
    const safeIdx = Math.min(currentIndex, layersMapRef.current.size - 1);

    layersMapRef.current.forEach((layer, idx) => {
      if (active && idx === safeIdx) {
        layer.setOpacity(opacity);
      } else {
        layer.setOpacity(0);
      }
    });
  }, [map, active, currentIndex, opacity]);

  return null;
}

export default SatelliteIRLayer;
