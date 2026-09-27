"use client";

import React, { useState, useEffect } from "react";
import { Users, X, AlertTriangle } from "lucide-react";
import { Shelter } from "@/types";
import { Locale } from "@/lib/i18n/context";
import { formatNumber } from "@/lib/i18n/formatters";
import { Button } from "@/components/ui/button";

export interface ShelterOccupancyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shelter: Shelter | null;
  onSave: (shelter: Shelter, newOccupancy: number) => Promise<void>;
  locale: Locale;
}

export function ShelterOccupancyDialog({
  isOpen,
  onClose,
  shelter,
  onSave,
  locale,
}: ShelterOccupancyDialogProps) {
  const [occupancy, setOccupancy] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shelter) {
      setOccupancy(shelter.current_occupancy || 0);
      setError(null);
    }
  }, [shelter]);

  if (!isOpen || !shelter) return null;

  const capacity = shelter.capacity || 1;
  const isOver = occupancy > capacity;
  const available = Math.max(0, capacity - occupancy);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occupancy < 0) {
      setError(locale === "hi" ? "अधिभोग संख्या नकारात्मक नहीं हो सकती।" : "Occupancy cannot be negative.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(shelter, occupancy);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update occupancy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustBy = (delta: number) => {
    setOccupancy((prev) => Math.max(0, prev + delta));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="occupancy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 id="occupancy-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {locale === "hi" ? "अधिभोग अपडेट करें" : "Update Shelter Occupancy"}
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {shelter.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Rated Capacity Info */}
          <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500 block">
                {locale === "hi" ? "निर्धारित कुल क्षमता:" : "Rated Capacity:"}
              </span>
              <span className="font-bold font-mono text-sm text-slate-800 dark:text-slate-200">
                {formatNumber(capacity, locale)} {locale === "hi" ? "विस्थापित" : "persons"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">
                {locale === "hi" ? "वर्तमान स्थान शेष:" : "Available Spaces:"}
              </span>
              <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                {formatNumber(available, locale)}
              </span>
            </div>
          </div>

          {/* Number Input Field */}
          <div className="space-y-1.5">
            <label htmlFor="occupancy-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {locale === "hi" ? "वर्तमान विस्थापित संख्या (अधिभोग)" : "Current Occupancy Count"}
            </label>
            <div className="relative">
              <input
                id="occupancy-input"
                type="number"
                min={0}
                value={occupancy}
                onChange={(e) => setOccupancy(parseInt(e.target.value, 10) || 0)}
                className="w-full h-11 px-3.5 text-lg font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Quick Step Adjusters */}
          <div className="flex items-center gap-1.5 justify-center flex-wrap pt-1">
            <span className="text-xs text-slate-400 mr-1">
              {locale === "hi" ? "त्वरित समायोजन:" : "Quick Step:"}
            </span>
            <button
              type="button"
              onClick={() => adjustBy(-25)}
              className="px-2 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              -25
            </button>
            <button
              type="button"
              onClick={() => adjustBy(-5)}
              className="px-2 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => adjustBy(5)}
              className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => adjustBy(25)}
              className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            >
              +25
            </button>
            <button
              type="button"
              onClick={() => setOccupancy(capacity)}
              className="px-2 py-1 text-xs font-bold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              title={locale === "hi" ? "क्षमता अनुसार पूर्ण भरें" : "Set to 100% capacity"}
            >
              {locale === "hi" ? "100% भरें" : "Max Full"}
            </button>
          </div>

          {/* Overcapacity Warning */}
          {isOver && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                {locale === "hi"
                  ? `चेतावनी: संख्या निर्धारित क्षमता (${capacity}) से ${occupancy - capacity} अधिक है।`
                  : `Warning: Intake exceeds rated capacity (${capacity}) by ${occupancy - capacity} persons.`}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {locale === "hi" ? "रद्द करें" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#059669] hover:bg-[#047857] text-white font-bold"
            >
              {isSubmitting
                ? locale === "hi"
                  ? "सहेजा जा रहा है..."
                  : "Saving..."
                : locale === "hi"
                ? "अधिभोग सहेजें"
                : "Save Occupancy"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShelterOccupancyDialog;
