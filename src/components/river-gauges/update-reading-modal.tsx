"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GaugeTrendIndicator } from "./gauge-trend-indicator";
import { RiverGauge, GaugeTrend } from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface UpdateReadingModalProps {
  gauge: RiverGauge | null;
  onClose: () => void;
  onSuccess: (updatedGauge: RiverGauge) => void;
}

const TREND_OPTIONS: { value: GaugeTrend; label: string; labelHi: string }[] = [
  { value: "RISING", label: "Rising", labelHi: "बढ़ रहा" },
  { value: "STEADY", label: "Steady", labelHi: "स्थिर" },
  { value: "FALLING", label: "Falling", labelHi: "घट रहा" },
];

export function UpdateReadingModal({ gauge, onClose, onSuccess }: UpdateReadingModalProps) {
  const locale = useLocale();
  const [waterLevel, setWaterLevel] = useState<string>("");
  const [trend, setTrend] = useState<GaugeTrend>("STEADY");
  const [discharge, setDischarge] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = gauge !== null;

  const handleClose = useCallback(() => {
    setWaterLevel("");
    setTrend("STEADY");
    setDischarge("");
    setNotes("");
    setError(null);
    setSubmitting(false);
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gauge) return;

    const level = parseFloat(waterLevel);
    if (isNaN(level) || level < 0 || level > 999) {
      setError(
        locale === "hi"
          ? "कृपया एक मान्य जलस्तर दर्ज करें (0 - 999 मीटर)।"
          : "Please enter a valid water level (0 – 999 m)."
      );
      return;
    }

    const dischargeVal = discharge !== "" ? parseFloat(discharge) : null;
    if (dischargeVal !== null && (isNaN(dischargeVal) || dischargeVal < 0)) {
      setError(
        locale === "hi"
          ? "कृपया एक मान्य डिस्चार्ज मान दर्ज करें (या खाली छोड़ें)।"
          : "Please enter a valid discharge value (or leave blank)."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/river-gauges/${gauge.id}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          water_level_m: level,
          trend,
          discharge_cumec: dischargeVal,
          source: "CWC_MANUAL_ENTRY",
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            (locale === "hi"
              ? "रीडिंग सहेजने में विफल। कृपया पुनः प्रयास करें।"
              : "Failed to save reading. Please try again.")
        );
      }

      onSuccess(data.data.gauge);
      handleClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : locale === "hi"
            ? "नेटवर्क त्रुटि हुई।"
            : "Network error occurred.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2
            id="reading-modal-title"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {locale === "hi" ? "जलस्तर अपडेट करें" : "Update River Reading"}
          </h2>
          {gauge && (
            <p className="text-xs text-slate-500 mt-1">
              {gauge.station_name} — {gauge.river_name} ({gauge.district})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Water Level */}
          <div className="space-y-1.5">
            <label
              htmlFor="water-level"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {locale === "hi" ? "जलस्तर (मीटर)" : "Water Level (m)"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="water-level"
                type="number"
                step="0.01"
                min="0"
                max="999"
                placeholder={
                  gauge?.danger_level_m
                    ? `e.g. ${gauge.danger_level_m.toFixed(2)}`
                    : locale === "hi"
                      ? "मीटर में स्तर दर्ज करें"
                      : "Enter level in meters"
                }
                value={waterLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaterLevel(e.target.value)}
                required
                className="w-full px-3 py-2 pr-8 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                aria-describedby="water-level-hint"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
            </div>
            {gauge && (
              <p id="water-level-hint" className="text-[10px] text-slate-400">
                {gauge.danger_level_m !== null &&
                  `${locale === "hi" ? "खतरा स्तर" : "Danger"}: ${gauge.danger_level_m.toFixed(2)} m`}
                {gauge.warning_level_m !== null &&
                  ` • ${locale === "hi" ? "चेतावनी स्तर" : "Warning"}: ${gauge.warning_level_m.toFixed(2)} m`}
              </p>
            )}
          </div>

          {/* Trend Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {locale === "hi" ? "प्रवृत्ति" : "Trend"} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2" role="group" aria-label="Water level trend">
              {TREND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTrend(opt.value)}
                  aria-pressed={trend === opt.value}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    trend === opt.value
                      ? "border-[#0F3D66] bg-[#0F3D66]/10 text-[#0F3D66] dark:border-blue-400 dark:text-blue-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <GaugeTrendIndicator trend={opt.value} size="sm" showLabel={false} />
                  <span>{locale === "hi" ? opt.labelHi : opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discharge (optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="discharge"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {locale === "hi" ? "प्रवाह (Cumecs)" : "Discharge (Cumecs)"}{" "}
              <span className="text-slate-400 font-normal">
                ({locale === "hi" ? "वैकल्पिक" : "optional"})
              </span>
            </label>
            <div className="relative">
              <input
                id="discharge"
                type="number"
                step="0.001"
                min="0"
                placeholder="e.g. 12450.000"
                value={discharge}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDischarge(e.target.value)}
                className="w-full px-3 py-2 pr-16 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                m³/s
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {locale === "hi" ? "टिप्पणी" : "Notes"}{" "}
              <span className="text-slate-400 font-normal">
                ({locale === "hi" ? "वैकल्पिक" : "optional"})
              </span>
            </label>
            <textarea
              id="notes"
              placeholder={
                locale === "hi"
                  ? "उदा. सीडब्ल्यूसी बुलेटिन के अनुसार दोपहर की रीडिंग।"
                  : "e.g. Afternoon reading as per CWC bulletin."
              }
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F3D66] resize-none"
            />
          </div>

          {/* Data Source Attribution */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            <div className="flex-1 text-[10px] text-blue-700 dark:text-blue-400">
              <span className="font-semibold block">
                {locale === "hi" ? "स्रोत: सीडब्ल्यूसी मैनुअल प्रविष्टि" : "Source: CWC Manual Entry"}
              </span>
              <span>
                {locale === "hi"
                  ? "ffis.cwc.gov.in बुलेटिन से सत्यापित प्रविष्टि"
                  : "Manually entered from ffis.cwc.gov.in bulletin"}
              </span>
            </div>
            <a
              href="https://ffis.cwc.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline shrink-0"
            >
              <span>{locale === "hi" ? "सीडब्ल्यूसी खोलें" : "Open CWC"}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer"
            >
              {locale === "hi" ? "रद्द करें" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !waterLevel}
              className="bg-[#0F3D66] hover:bg-[#0a2d4f] text-white font-semibold cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {locale === "hi" ? "सहेजा जा रहा है…" : "Saving…"}
                </>
              ) : (
                locale === "hi" ? "रीडिंग सहेजें" : "Save Reading"
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-[9px] text-slate-400 text-center">
            {locale === "hi"
              ? "सर्वर समय पर ऑटो-सेट टाइमस्टैम्प। वर्तमान लॉगिन अधिकारी द्वारा दर्ज।"
              : "Timestamp auto-set to server time. Entered by current logged-in officer."}
          </p>
        </form>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          aria-label={locale === "hi" ? "मॉडल बंद करें" : "Close modal"}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
