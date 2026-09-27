"use client";

/**
 * VarshaNetra Doppler Radar Control Bar (VN-NOWCAST-001 - Phase 5)
 *
 * Requirements:
 * - Play/pause animation at 450 ms per frame with loop
 * - Split-track scrubber: slate-500 (#64748b) for past, violet-500 (#8b5cf6) for nowcast
 * - 2px white "NOW" tick absolutely positioned at splitPct
 * - WebKit and Mozilla transparent track overrides
 * - IST timestamp in tabular-nums with min-width 150px
 * - Dynamic Status Badges: 📡 LIVE (with pulsing green dot) / 🔮 NOWCAST / ⚠️ STALE
 * - Dragging scrubber auto-pauses playback
 * - Glassmorphism styling, docked bottom-4 left-1/2 -translate-x-1/2
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Radio, Satellite, ShieldAlert, Sliders, RotateCcw, AlertTriangle, RefreshCw } from "lucide-react";
import type { RadarNowcastFrame } from "@/hooks/useRadarFrames";

export interface RadarControlBarProps {
  allFrames: RadarNowcastFrame[];
  radarPast: RadarNowcastFrame[];
  radarNowcast: RadarNowcastFrame[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  isLoading?: boolean;
  isStale?: boolean;
  error?: string | null;
  onRetry?: () => void;
  // Layer toggles & opacity controls (wired in Phase 6)
  radarActive?: boolean;
  onToggleRadar?: () => void;
  satelliteActive?: boolean;
  onToggleSatellite?: () => void;
  imdActive?: boolean;
  onToggleImd?: () => void;
  radarOpacity?: number;
  onChangeRadarOpacity?: (opacity: number) => void;
  className?: string;
}

export function RadarControlBar({
  allFrames,
  radarPast,
  currentIndex,
  setCurrentIndex,
  isLoading = false,
  isStale = false,
  error = null,
  onRetry,
  radarActive = true,
  onToggleRadar,
  satelliteActive = false,
  onToggleSatellite,
  imdActive = false,
  onToggleImd,
  radarOpacity = 0.75,
  onChangeRadarOpacity,
  className = "",
}: RadarControlBarProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback loop: cycle every 450 ms
  useEffect(() => {
    if (!isPlaying || allFrames.length === 0) {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    playTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= allFrames.length - 1) {
          return 0; // Loop back to start
        }
        return prev + 1;
      });
    }, 450);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, allFrames.length, setCurrentIndex]);

  // Compute split percentage between past and forecast frames
  const totalFrames = allFrames.length;
  const pastCount = radarPast.length;
  const splitPct = totalFrames > 0 ? (pastCount / totalFrames) * 100 : 80;

  // Active frame metadata
  const currentFrame: RadarNowcastFrame | undefined = allFrames[currentIndex];
  const isForecast = currentFrame?.kind === "forecast";

  // Formatted IST timestamp (min-width 150px, tabular-nums)
  const formattedIstTime = React.useMemo(() => {
    if (!currentFrame?.time) return "--:-- IST";
    try {
      const d = new Date(currentFrame.time * 1000);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return currentFrame.ist || "--:-- IST";
    }
  }, [currentFrame]);

  // Handle timeline scrubber drag: auto-pauses playback
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    const newIdx = parseInt(e.target.value, 10);
    if (!isNaN(newIdx) && newIdx >= 0 && newIdx < totalFrames) {
      setCurrentIndex(newIdx);
    }
  };

  const handleScrubberStart = () => {
    setIsPlaying(false);
  };

  const handleResetToNow = () => {
    setIsPlaying(false);
    const nowIdx = pastCount > 0 ? pastCount - 1 : 0;
    setCurrentIndex(nowIdx);
  };

  return (
    <>
      {/* Native Range Track overrides to allow CSS linear-gradient to show through cleanly */}
      <style jsx>{`
        .radar-scrubber::-webkit-slider-runnable-track {
          background: transparent !important;
          height: 6px;
        }
        .radar-scrubber::-moz-range-track {
          background: transparent !important;
          height: 6px;
        }
        .radar-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 0 0 2px #3b82f6, 0 2px 6px rgba(0, 0, 0, 0.4);
          margin-top: -4.5px;
          transition: transform 0.1s ease;
        }
        .radar-scrubber::-webkit-slider-thumb:hover {
          transform: scale(1.18);
        }
        .radar-scrubber::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #3b82f6;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
      `}</style>

      {/* 1. Loading Skeleton State */}
      {isLoading && totalFrames === 0 && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[96%] sm:w-[92%] max-w-[880px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl text-slate-100 p-3 transition-all ${className}`}
          role="status"
          aria-label="Loading Doppler Radar Telemetry"
        >
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0" />
            <div className="h-9 w-12 rounded-lg bg-slate-800 shrink-0 hidden sm:block" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 bg-slate-800 rounded-full w-full" />
              <div className="flex justify-between">
                <div className="h-2 bg-slate-800 rounded-full w-12" />
                <div className="h-2 bg-slate-800 rounded-full w-8" />
                <div className="h-2 bg-slate-800 rounded-full w-12" />
              </div>
            </div>
            <div className="h-8 bg-slate-800 rounded-lg w-28 shrink-0 hidden sm:block" />
            <div className="h-7 bg-slate-800 rounded-full w-20 shrink-0" />
          </div>
        </div>
      )}

      {/* 2. Error Pill State (Telemetry Offline) */}
      {!isLoading && error && totalFrames === 0 && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[96%] sm:w-[92%] max-w-[880px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-rose-500/40 shadow-2xl text-slate-100 p-3 transition-all ${className}`}
          role="alert"
          aria-label="Doppler Radar Telemetry Error"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>रडार टेलीमेट्री अनुपलब्ध (Radar Feed Offline) — Retrying automatically with backoff...</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors self-end sm:self-center"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Now</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Empty State (Zero frames available) */}
      {!isLoading && !error && totalFrames === 0 && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[96%] sm:w-[92%] max-w-[880px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl text-slate-100 p-3 transition-all ${className}`}
          role="status"
          aria-label="No Radar Frames Available"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium py-1">
            <Radio className="w-4 h-4 text-slate-500" />
            <span>कोई सक्रिय रडार फ्रेम उपलब्ध नहीं (No radar frames available for current area or time window)</span>
          </div>
        </div>
      )}

      {/* 4. Operational Control Bar (Two-Row Stack Below 640px, Width 96%) */}
      {totalFrames > 0 && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[96%] sm:w-[92%] max-w-[880px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl text-slate-100 p-2.5 sm:p-3 transition-all ${className}`}
          role="region"
          aria-label="Doppler Radar & Nowcast Timeline Controls"
        >
          <div className="flex flex-col gap-2">
            {/* ROW 1: Play/Pause, NOW jump, and Split-Track Scrubber (Full Width on Mobile) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              {/* Play/Pause Button (40x40px on desktop, 36x36px on mobile) */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isLoading}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 flex items-center justify-center text-white shadow-md transition-all shrink-0 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                aria-label={isPlaying ? "Pause Radar Animation" : "Play Radar Animation"}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Reset to NOW Button */}
              <button
                type="button"
                onClick={handleResetToNow}
                className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-[11px] font-semibold text-slate-300 flex items-center gap-1 border border-white/10 transition-colors shrink-0"
                title="Jump to current observed frame (NOW)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>NOW</span>
              </button>

              {/* Split-Track Timeline Scrubber Container (Fills row) */}
              <div className="flex-1 w-full flex flex-col justify-center px-1">
                <div className="relative flex items-center h-6 w-full">
                  {/* Visual Track with Split Colors: slate-500 (past) & violet-500 (forecast) */}
                  <div
                    className="absolute inset-x-0 h-1.5 rounded-full pointer-events-none overflow-hidden"
                    style={{
                      background: `linear-gradient(to right, #64748b 0%, #64748b ${splitPct}%, #8b5cf6 ${splitPct}%, #8b5cf6 100%)`,
                    }}
                  />

                  {/* 2px white vertical "NOW" tick at splitPct */}
                  <div
                    className="absolute top-1 bottom-1 w-[2px] bg-white rounded-full pointer-events-none -translate-x-1/2 z-10 shadow-xs"
                    style={{ left: `${splitPct}%` }}
                    title="Current Time Boundary (NOW)"
                  />

                  {/* Interactive Slider Input */}
                  <input
                    type="range"
                    min={0}
                    max={totalFrames > 0 ? totalFrames - 1 : 0}
                    value={currentIndex}
                    onChange={handleScrubberChange}
                    onMouseDown={handleScrubberStart}
                    onTouchStart={handleScrubberStart}
                    disabled={isLoading}
                    className="radar-scrubber relative w-full h-6 bg-transparent appearance-none cursor-pointer focus:outline-hidden z-20"
                    aria-label="Radar frame timeline scrub"
                  />
                </div>

                {/* Scrubber Tick Labels */}
                <div className="relative flex justify-between text-[10px] font-mono text-slate-400 px-0.5 mt-0.5 select-none">
                  <span>PAST (-2h)</span>
                  <span
                    className="absolute font-bold text-white -translate-x-1/2"
                    style={{ left: `${splitPct}%` }}
                  >
                    NOW
                  </span>
                  <span className="text-violet-300 font-semibold">+30 min</span>
                </div>
              </div>
            </div>

            {/* ROW 2: IST Timestamp, Status Badges, and Layer Controls */}
            <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-slate-800/80">
              {/* Left Group: IST Timestamp readout + Status Badge */}
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs tabular-nums text-center font-semibold text-slate-100 bg-slate-800/90 px-2 sm:px-2.5 py-1 rounded-md border border-white/10 shadow-xs min-w-[130px] sm:min-w-[150px]">
                  {formattedIstTime}
                </div>

                {/* Operational Status Badge */}
                <div className="shrink-0">
                  {error ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-600 text-rose-50 shadow-xs">
                      ⚠️ OFFLINE
                    </span>
                  ) : isStale ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-600 text-amber-50 shadow-xs">
                      ⚠️ STALE
                    </span>
                  ) : isForecast ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-violet-600 text-violet-50 shadow-xs">
                      🔮 NOWCAST
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      📡 LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Right Group: Layer Toggles & Settings */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Radar Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleRadar}
                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition-all ${
                    radarActive
                      ? "bg-blue-600/30 text-blue-300 ring-2 ring-blue-400"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  title={radarActive ? "Disable Doppler Radar" : "Enable Doppler Radar"}
                  aria-label="Toggle Doppler Radar Layer"
                >
                  <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Satellite IR Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleSatellite}
                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition-all ${
                    satelliteActive
                      ? "bg-purple-600/30 text-purple-300 ring-2 ring-purple-400"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Toggle Satellite Infrared"
                  aria-label="Toggle Satellite IR Layer"
                >
                  <Satellite className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* IMD Radar Stations Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleImd}
                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition-all ${
                    imdActive
                      ? "bg-amber-600/30 text-amber-300 ring-2 ring-amber-400"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Toggle IMD Official Radar Network"
                  aria-label="Toggle IMD Stations Layer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Settings / Opacity Popover Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition-all ${
                    showSettings
                      ? "bg-slate-700 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Radar Display Settings"
                  aria-label="Radar Display Settings"
                >
                  <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Collapsible Quick Settings Popover */}
            {showSettings && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs text-slate-300 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">Opacity:</span>
                  <input
                    type="range"
                    min={0.3}
                    max={1.0}
                    step={0.05}
                    value={radarOpacity}
                    onChange={(e) => onChangeRadarOpacity?.(parseFloat(e.target.value))}
                    className="w-24 sm:w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    aria-label="Radar opacity adjustment"
                  />
                  <span className="font-mono text-[11px] text-slate-300">
                    {Math.round(radarOpacity * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400">
                  <span>Palette: The Weather Channel</span>
                  <span>•</span>
                  <span>512px High-DPI</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RadarControlBar;
