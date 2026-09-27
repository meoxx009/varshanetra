"use client";

/**
 * VarshaNetra Doppler Radar Layer (VN-NOWCAST-001 - Phase 4)
 *
 * Requirements:
 * - Dedicated Leaflet Panes: radarPane (zIndex 400), satellitePane (zIndex 350) [C6]
 * - 512px tile scaling: { tileSize: 512, zoomOffset: -1 } [C1]
 * - Preload ALL frames at opacity 0 on mount; animate exclusively via setOpacity() [C4]
 * - Remove all layers from map on unmount [C7]
 * - react-leaflet pattern via useMap()
 */

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useRadarFrames, RadarNowcastFrame } from "@/hooks/useRadarFrames";

export interface RadarLayerProps {
  frames?: RadarNowcastFrame[];
  currentIndex?: number;
  opacity?: number;
  active?: boolean;
}

export function RadarLayer({
  frames: propFrames,
  currentIndex: propCurrentIndex,
  opacity = 0.75,
  active = true,
}: RadarLayerProps) {
  const map = useMap();

  // Internal hook fallback if parent did not provide controlled state
  const internalHook = useRadarFrames();
  const frames = propFrames ?? internalHook.allFrames;
  const currentIndex = propCurrentIndex ?? internalHook.currentIndex;

  // Track preloaded TileLayer instances: Map<frameIndex, L.TileLayer>
  const layersMapRef = useRef<Map<number, L.TileLayer>>(new Map());
  const prevFramesKeyRef = useRef<string>("");

  // Setup custom Leaflet panes (Constraint C6)
  useEffect(() => {
    if (!map) return;

    // radarPane: zIndex 400 (sits above basemap, below markers/polygons)
    let radarPane = map.getPane("radarPane");
    if (!radarPane) {
      radarPane = map.createPane("radarPane");
      radarPane.style.zIndex = "400";
      radarPane.style.pointerEvents = "none";
    }

    // satellitePane: zIndex 350
    let satPane = map.getPane("satellitePane");
    if (!satPane) {
      satPane = map.createPane("satellitePane");
      satPane.style.zIndex = "350";
      satPane.style.pointerEvents = "none";
    }

    // Ensure overlayPane (GeoJSON polygons) is strictly above radarPane (zIndex 450)
    const overlayPane = map.getPane("overlayPane");
    if (overlayPane) {
      overlayPane.style.zIndex = "450";
    }
  }, [map]);

  // Preload all frames at opacity 0 on mount / when frames change (Constraints C1, C4, C7)
  useEffect(() => {
    if (!map || frames.length === 0) return;

    // Unique signature for current frame list to prevent unnecessary teardown/rebuild
    const framesKey = frames.map((f) => `${f.time}_${f.tile}`).join("|");
    if (framesKey === prevFramesKeyRef.current && layersMapRef.current.size === frames.length) {
      return;
    }
    prevFramesKeyRef.current = framesKey;

    // Clean up existing preloaded layers before instantiating new frame set
    layersMapRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch {
        // Ignored if already removed
      }
    });
    layersMapRef.current.clear();

    // Preload each frame TileLayer once at opacity 0
    frames.forEach((frame, idx) => {
      const tileLayer = L.tileLayer(frame.tile, {
        pane: "radarPane",
        tileSize: 512,       // Constraint C1
        zoomOffset: -1,      // Constraint C1
        opacity: 0,          // Constraint C4: preloaded invisible
        attribution: 'Radar © <a href="https://www.rainviewer.com" target="_blank" rel="noopener noreferrer">RainViewer.com</a>',
        maxZoom: 19,
        minZoom: 2,
        keepBuffer: 4,
      });

      tileLayer.addTo(map);
      layersMapRef.current.set(idx, tileLayer);
    });

    const layersMap = layersMapRef.current;

    // Cleanup on unmount (Constraint C7)
    return () => {
      layersMap.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {
          // Ignored if already detached
        }
      });
      layersMap.clear();
      prevFramesKeyRef.current = "";
    };
  }, [map, frames]);

  // Animate purely via setOpacity() when currentIndex, opacity, or active changes (Constraint C4)
  useEffect(() => {
    if (!map || layersMapRef.current.size === 0) return;

    layersMapRef.current.forEach((layer, idx) => {
      if (active && idx === currentIndex) {
        layer.setOpacity(opacity);
      } else {
        layer.setOpacity(0);
      }
    });
  }, [map, active, currentIndex, opacity]);

  return null;
}

export default RadarLayer;
