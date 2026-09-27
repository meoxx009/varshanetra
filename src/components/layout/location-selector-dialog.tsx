"use client";

import React, { useState } from "react";
import {
  MapPin,
  Search,
  X,
  Compass,
  AlertCircle,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { SUPPORTED_DISTRICTS } from "@/data/supportedDistricts";
import { useLocale } from "@/lib/i18n/context";
import { DistrictLocation, GeocodeLocation } from "@/types";

export interface LocationSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationSelectorDialog({
  isOpen,
  onClose,
}: LocationSelectorDialogProps) {
  const { location, setLocation, resetToDefault } = useDistrictLocation();
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeLocation[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when dialog is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!query || query.trim().length < 2) {
      setErrorMessage(
        locale === "hi"
          ? "कृपया खोजने के लिए कम से कम 2 अक्षर दर्ज करें।"
          : "Please enter at least 2 characters to search."
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        setStatus("error");
        setErrorMessage(
          payload.error ||
            (locale === "hi"
              ? "ओपनस्ट्रीटमैप नोमिनाटिम सेवा से स्थान खोजने में विफल।"
              : "Failed to search location from OpenStreetMap Nominatim service.")
        );
        return;
      }

      const locations: GeocodeLocation[] = payload.data || [];
      if (locations.length === 0) {
        setStatus("empty");
        setResults([]);
      } else {
        setStatus("success");
        setResults(locations);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setStatus("error");
      setErrorMessage(
        locale === "hi"
          ? `नोमिनाटिम अनुरोध विफल: ${msg}`
          : `Nominatim request failed: ${msg}`
      );
    }
  };

  const handleSelectLocation = (loc: GeocodeLocation) => {
    // Extract short name from displayName (take first 2 parts before comma)
    const parts = loc.displayName.split(",");
    const shortName = parts.slice(0, 2).join(",").trim();

    const newDistrictLocation: DistrictLocation = {
      displayName: loc.displayName,
      shortName,
      latitude: Math.round(loc.latitude * 10000) / 10000,
      longitude: Math.round(loc.longitude * 10000) / 10000,
      type: loc.type,
    };

    setLocation(newDistrictLocation);
    onClose();
  };

  const handleSelectPreset = (preset: DistrictLocation) => {
    setLocation(preset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-xs"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center" aria-hidden="true">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 id="location-dialog-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === "hi" ? "परिचालन ज़िला संदर्भ निर्धारित करें" : "Set Operational District Context"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "स्थानीयकृत पूर्व चेतावनी हेतु भारतीय ज़िले/तालुक का चयन या खोज करें।"
                  : "Select or search Indian district/taluk for localized early warning intelligence."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label={locale === "hi" ? "डायलॉग बंद करें" : "Close dialog"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Form (Explicit action to respect Nominatim policy) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <label htmlFor="location-search-input" className="sr-only">
                {locale === "hi"
                  ? "भारतीय ज़िला, तालुक, या शहर खोजें"
                  : "Search Indian district, taluk, or city"}
              </label>
              <input
                id="location-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  locale === "hi"
                    ? "भारतीय ज़िला, तालुक, या शहर खोजें (उदा. कोल्हापुर, वायनाड)..."
                    : "Search Indian district, taluk, or city (e.g. Kolhapur, Wayanad)..."
                }
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            </div>
            <Button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#0F3D66] hover:bg-[#0c3152] text-white text-xs font-bold px-4 py-2 shrink-0 gap-1.5 cursor-pointer"
            >
              {status === "loading" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{locale === "hi" ? "खोजें" : "Search"}</span>
            </Button>
          </form>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {locale === "hi"
              ? "नोमिनाटिम नीति: खोज केवल स्पष्ट अनुरोध पर होती है, प्रति-कीस्ट्रोक नहीं।"
              : "Nominatim Policy: Queries fire strictly on explicit search, never per-keystroke."}
          </span>
        </div>

        {/* Content Body: Results or Presets */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading State */}
          {status === "loading" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-[#0F3D66] animate-spin" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {locale === "hi"
                  ? "ओपनस्ट्रीटमैप नोमिनाटिम से संपर्क हो रहा है..."
                  : "Contacting OpenStreetMap Nominatim..."}
              </p>
              <p className="text-[11px] text-slate-400">
                {locale === "hi"
                  ? "सत्यापित भारतीय प्रशासनिक सीमाओं की जांच की जा रही है।"
                  : "Querying verified Indian administrative boundaries."}
              </p>
            </div>
          )}

          {/* Error State (Actionable retry, never fakes coordinates) */}
          {status === "error" && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900 dark:text-red-100">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{locale === "hi" ? "जियोकोडिंग सेवा सूचना" : "Geocoding Service Notice"}</span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                {errorMessage}
              </p>
              <div className="pt-1">
                <Button
                  onClick={() => handleSearch()}
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-slate-900 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "पुनः प्रयास करें" : "Retry Geocoding Query"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {status === "empty" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-1 text-slate-500">
              <Compass className="w-8 h-8 text-slate-300 mb-1" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {locale === "hi" ? "कोई भारतीय स्थान नहीं मिला" : "No Indian Locations Found"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                {locale === "hi"
                  ? `&quot;${query}&quot; के लिए कोई ज़िला या तालुक नहीं मिला। व्यापक ज़िला या शहर का नाम आज़माएँ।`
                  : `No matching district or taluk was returned by Nominatim for "${query}". Try a broader district or city name.`}
              </p>
            </div>
          )}

          {/* Search Results */}
          {status === "success" && results.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "hi"
                  ? `खोज परिणाम (${results.length} मिले)`
                  : `Search Results (${results.length} Found)`}
              </span>
              <div className="space-y-1.5">
                {results.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(res)}
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-[#0F3D66] dark:hover:border-blue-500 transition text-left flex items-start justify-between gap-3 group cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {res.displayName.split(",")[0]}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-medium">
                          {res.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-5">
                        {res.displayName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 pl-5">
                        Lat: {res.latitude.toFixed(4)}°, Lon: {res.longitude.toFixed(4)}°
                      </p>
                    </div>

                    <span className="shrink-0 text-xs font-semibold text-[#0F3D66] dark:text-blue-400 group-hover:underline pt-1">
                      {locale === "hi" ? "चुनें →" : "Select →"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Districts */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {locale === "hi"
                  ? "रणनीतिक आपदा ग्रिड ज़िले"
                  : "Quick Select Disaster Grid Districts"}
              </span>
              <button
                onClick={resetToDefault}
                className="text-[10px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
              >
                {locale === "hi" ? "डिफ़ॉल्ट (पुणे) पर रीसेट करें" : "Reset to Default (Pune)"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORTED_DISTRICTS.map((preset) => {
                const isSelected =
                  location.latitude === preset.latitude &&
                  location.longitude === preset.longitude;

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#0F3D66] text-white border-[#0F3D66] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs block">
                        {locale === "hi" && preset.displayNameHi ? preset.displayNameHi : preset.shortName}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {preset.latitude.toFixed(4)}° N, {preset.longitude.toFixed(4)}° E • {preset.state}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Mandatory OSM Attribution (Rule 19) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>
            {locale === "hi" ? "जियोकोडिंग प्रदाता: " : "Geocoding powered by "}
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              OpenStreetMap Nominatim
            </a>{" "}
            (ODbL 1.0).
          </span>
          <span className="font-medium">
            {locale === "hi" ? "सक्रिय: " : "Active: "}
            {location.shortName}
          </span>
        </div>
      </div>
    </div>
  );
}
