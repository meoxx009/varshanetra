"use client";

import React, { useState } from "react";
import { AlertCircle, X, Send } from "lucide-react";
import { Shelter } from "@/types";
import { Locale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

export interface ShelterIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shelter: Shelter | null;
  onSubmitIssue: (shelter: Shelter, issueText: string, category: string) => Promise<void>;
  locale: Locale;
}

export function ShelterIssueDialog({
  isOpen,
  onClose,
  shelter,
  onSubmitIssue,
  locale,
}: ShelterIssueDialogProps) {
  const [issueText, setIssueText] = useState("");
  const [category, setCategory] = useState("WATER_FOOD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !shelter) return null;

  const categories = [
    { id: "WATER_FOOD", hindi: "💧 राशन व पेयजल", english: "Water & Food" },
    { id: "MEDICAL", hindi: "🏥 चिकित्सा सहायता", english: "Medical Aid" },
    { id: "ELECTRICITY", hindi: "💡 बिजली / जनरेटर", english: "Power & Generator" },
    { id: "SANITATION", hindi: "🚻 स्वच्छता / शौचालय", english: "Sanitation" },
    { id: "OVERCROWDING", hindi: "👥 अत्यधिक भीड़", english: "Overcrowding" },
    { id: "INFRASTRUCTURE", hindi: "🏚️ भवन क्षति / रिसाव", english: "Structural Damage" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) {
      setError(locale === "hi" ? "कृपया समस्या का विवरण दर्ज करें।" : "Please enter issue description.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmitIssue(shelter, issueText.trim(), category);
      setIssueText("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit issue report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-amber-50/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 id="issue-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {locale === "hi" ? "आश्रय समस्या रिपोर्ट करें" : "Report Shelter Issue"}
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
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Issue Category Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {locale === "hi" ? "समस्या श्रेणी" : "Issue Category"}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold transition ${
                    category === cat.id
                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {locale === "hi" ? cat.hindi : cat.english}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Description Text Input */}
          <div className="space-y-1.5">
            <label htmlFor="issue-textarea" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {locale === "hi" ? "समस्या का विवरण (Text Input)" : "Issue Description"}
            </label>
            <textarea
              id="issue-textarea"
              rows={4}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder={
                locale === "hi"
                  ? "उदा. पेयजल टैंकर की तत्काल आवश्यकता, जेनरेटर में ईंधन समाप्त, या दवाइयों की कमी..."
                  : "e.g., Potable water tanker urgently needed, generator fuel exhausted, or medical supplies depleted..."
              }
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 focus:ring-2 focus:ring-amber-500 outline-hidden"
              required
              autoFocus
            />
            <span className="text-[11px] text-slate-400 block">
              {locale === "hi"
                ? "यह रिपोर्ट जिला EOC नियंत्रण लॉग में दर्ज होगी।"
                : "This report will be logged into District EOC operational logs."}
            </span>
          </div>

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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {isSubmitting
                  ? locale === "hi"
                    ? "प्रेषित हो रहा है..."
                    : "Submitting..."
                  : locale === "hi"
                  ? "रिपोर्ट भेजें"
                  : "Submit Report"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShelterIssueDialog;
