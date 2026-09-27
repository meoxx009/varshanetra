"use client";

import React, { useState } from "react";
import {
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Calendar,
  CloudRain,
  ShieldCheck,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/lib/i18n/context";
import { ImdManualEntry } from "@/types";

export interface IMDManualDataEntryProps {
  onSuccess?: (entry: ImdManualEntry) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function IMDManualDataEntry({
  onSuccess,
  onClose,
  isOpen = true,
}: IMDManualDataEntryProps) {
  const { profile } = useAuth();
  const locale = useLocale();

  // Role authorization: Admin or DM / District Magistrate
  const userRole = (profile?.role || "").toUpperCase();
  const [demoOverride, setDemoOverride] = useState(false);
  const isAuthorized =
    demoOverride ||
    userRole.includes("ADMIN") ||
    userRole.includes("DM") ||
    userRole.includes("MAGISTRATE") ||
    userRole === "COMMANDER";

  // Form state
  const nowIso = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  const [entryDatetime, setEntryDatetime] = useState<string>(nowIso);
  const [rainfallToday, setRainfallToday] = useState<string>("45.0");
  const [rainfallYesterday, setRainfallYesterday] = useState<string>("62.5");
  const [rainfallWeek, setRainfallWeek] = useState<string>("178.0");
  const [normalRainfall, setNormalRainfall] = useState<string>("38.0");
  const [colorCode, setColorCode] = useState<"Green" | "Yellow" | "Orange" | "Red">("Orange");
  const [forecastNarrative, setForecastNarrative] = useState<string>(
    "Heavy to very heavy rainfall expected in isolated ghat areas. Low-lying urban regions advised to stay on alert for localized inundation."
  );
  const [dataSource, setDataSource] = useState<string>("IMD District Bulletin");
  const officerName = profile?.full_name || "District Magistrate (EOC In-Charge)";

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/weather/imd-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_datetime: new Date(entryDatetime).toISOString(),
          district_rainfall_today: parseFloat(rainfallToday) || 0,
          district_rainfall_yesterday: parseFloat(rainfallYesterday) || 0,
          district_rainfall_week: parseFloat(rainfallWeek) || 0,
          normal_rainfall: parseFloat(normalRainfall) || 0,
          imd_color_code: colorCode,
          forecast_narrative: forecastNarrative,
          data_source: dataSource,
          entered_by: officerName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to persist IMD manual entry.");
      }

      setStatusMessage({
        type: "success",
        text: locale === "hi"
          ? "आईएमडी बुलेटिन सफलतापूर्वक दर्ज किया गया।"
          : "IMD Bulletin successfully recorded and active in system.",
      });

      if (onSuccess && json.data) {
        onSuccess(json.data);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error submitting IMD bulletin",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-slate-300 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#0F3D66] text-white">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {locale === "hi"
                    ? "IMD बुलेटिन हस्तचालित डेटा प्रविष्टि"
                    : "IMD Bulletin Manual Data Entry"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "आधिकारिक मौसम बुलेटिन या ffis.cwc.gov.in से दर्ज करने हेतु विशेष इंटरफेस।"
                    : "Authorized interface for ingestion of official IMD bulletins and CWC flood telemetry."}
                </CardDescription>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Role Authorization Check */}
          {!isAuthorized ? (
            <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">
                    {locale === "hi"
                      ? "पहुंच प्रतिबंधित: केवल जिला मजिस्ट्रेट (DM/DC) या व्यवस्थापक (Admin) हेतु।"
                      : "Restricted Access: District Magistrate (DM/DC) or Administrator role required."}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {locale === "hi"
                      ? `आप वर्तमान में "${userRole || "सामान्य अधिकारी"}" के रूप में लॉग इन हैं।`
                      : `You are currently logged in as "${userRole || "Standard Officer"}".`}
                  </p>
                </div>
              </div>

              {/* Demo Evaluation Override */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {locale === "hi" ? "मूल्यांकन हेतु डीएम भूमिका सक्रिय करें:" : "Evaluation Drill Override:"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDemoOverride(true)}
                  className="text-xs font-semibold gap-1.5 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "डीएम मोड सक्षम करें" : "Simulate DM Access"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date & Time */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{locale === "hi" ? "प्रविष्टि दिनांक एवं समय" : "Data Entry Date & Time"}</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={entryDatetime}
                    onChange={(e) => setEntryDatetime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>

                {/* 2. IMD Warning Color Code */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{locale === "hi" ? "IMD चेतावनी रंग कोड" : "IMD Warning Color Code"}</span>
                  </label>
                  <select
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value as "Green" | "Yellow" | "Orange" | "Red")}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  >
                    <option value="Green">
                      {locale === "hi" ? "🟢 हरा (सामान्य - कोई चेतावनी नहीं)" : "🟢 Green (Normal - No Warning)"}
                    </option>
                    <option value="Yellow">
                      {locale === "hi" ? "🟡 पीला (सतर्कता - निगरानी रखें)" : "🟡 Yellow (Watch - Be Updated)"}
                    </option>
                    <option value="Orange">
                      {locale === "hi" ? "🟠 नारंगी (चेतावनी - सतर्क रहें)" : "🟠 Orange (Alert - Be Prepared)"}
                    </option>
                    <option value="Red">
                      {locale === "hi" ? "🔴 लाल (आपातकालीन - तत्काल कार्रवाई)" : "🔴 Red (Emergency - Take Action)"}
                    </option>
                  </select>
                </div>

                {/* 3. Rainfall Today */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                    <span>{locale === "hi" ? "आज की वर्षा (मिमी)" : "District Rainfall Today (mm)"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={rainfallToday}
                    onChange={(e) => setRainfallToday(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>

                {/* 4. Rainfall Yesterday */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-slate-400" />
                    <span>{locale === "hi" ? "कल की वर्षा (मिमी)" : "District Rainfall Yesterday (mm)"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={rainfallYesterday}
                    onChange={(e) => setRainfallYesterday(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>

                {/* 5. Rainfall This Week */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "इस सप्ताह की वर्षा (मिमी)" : "District Rainfall This Week (mm)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={rainfallWeek}
                    onChange={(e) => setRainfallWeek(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>

                {/* 6. Normal Rainfall (IMD Climatology) */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi"
                      ? "सामान्य वर्षा (IMD जलवायु विज्ञान से - मिमी)"
                      : "Normal Rainfall for Date (mm from IMD climatology)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={normalRainfall}
                    onChange={(e) => setNormalRainfall(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>
              </div>

              {/* 7. Forecast Narrative */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {locale === "hi"
                    ? "IMD पूर्वानुमान विवरण (बुलेटिन पाठ पेस्ट करें)"
                    : "IMD Forecast Narrative (Paste official bulletin text)"}
                </label>
                <textarea
                  rows={3}
                  value={forecastNarrative}
                  onChange={(e) => setForecastNarrative(e.target.value)}
                  required
                  placeholder="Paste IMD district meteorological bulletin or CWC advisory text..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                />
              </div>

              {/* 8. Data Source & 9. Officer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "डेटा स्रोत" : "Data Source"}
                  </label>
                  <input
                    type="text"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "अधिकारी नाम (स्वतः पूर्ण)" : "Officer Name (Auto-filled)"}
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    readOnly
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                {onClose && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    {locale === "hi" ? "रद्द करें" : "Cancel"}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? (locale === "hi" ? "सहेजा जा रहा है..." : "Saving...") : (locale === "hi" ? "बुलेटिन दर्ज करें" : "Record IMD Bulletin")}</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
