"use client";

import React, { useState, useEffect, useId } from "react";
import {
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import {
  FieldReportType,
  FIELD_REPORT_TYPES,
  RoadStatus,
  ROAD_STATUSES,
  SeverityLevel,
} from "@/types";
import { cn } from "@/lib/utils";

export interface FieldReportFormData {
  report_type: FieldReportType;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  observed_water_depth_cm: string | number;
  people_requiring_assistance: string | number;
  road_status: RoadStatus;
  description: string;
  photo_url?: string | null;
  photo_thumbnail_url?: string | null;
  observer_name: string;
  observer_role?: string | null;
  observer_contact?: string | null;
}

interface StructuredFieldReportFormProps {
  initialData: FieldReportFormData;
  geoStatus: "idle" | "acquiring" | "success" | "denied";
  geoAccuracy: number | null;
  onAcquireLocation: () => void;
  onSubmit: (data: FieldReportFormData) => Promise<void>;
  onCancel: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploadingPhoto: boolean;
  uploadError: string | null;
}

// SECTION 3 ASSISTANCE OPTIONS
interface AssistanceOption {
  id: string;
  hi: string;
  en: string;
  icon: string;
  lucideIcon?: React.ReactNode;
}

const ASSISTANCE_OPTIONS: AssistanceOption[] = [
  { id: "boats", hi: "नाव", en: "Boats", icon: "🚣" },
  { id: "ambulance", hi: "एम्बुलेंस", en: "Ambulance", icon: "🚑" },
  { id: "rescue_team", hi: "बचाव दल", en: "Rescue Team", icon: "👥" },
  { id: "food_water", hi: "खाना-पानी", en: "Food and Water", icon: "🍱" },
  { id: "medical_help", hi: "चिकित्सा", en: "Medical Help", icon: "🏥" },
  { id: "police", hi: "पुलिस", en: "Police", icon: "🚔" },
  { id: "fire_brigade", hi: "अग्निशमन", en: "Fire Brigade", icon: "🔥" },
  { id: "none", hi: "अभी नहीं", en: "None Currently", icon: "❌" },
];

// SECTION 2 WATER LEVEL CARDS
interface WaterLevelCard {
  level: number;
  depthCm: number;
  hi: string;
  en: string;
  range: string;
  severity: SeverityLevel;
  bgGradient: string;
  borderClass: string;
  waterPercent: number; // percentage of human figure submerged
}

const WATER_LEVEL_CARDS: WaterLevelCard[] = [
  {
    level: 1,
    depthCm: 0,
    hi: "कोई पानी नहीं",
    en: "No Water",
    range: "0 mm",
    severity: "NORMAL",
    bgGradient: "from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 text-slate-800 dark:text-slate-100",
    borderClass: "border-slate-300 dark:border-slate-700",
    waterPercent: 0,
  },
  {
    level: 2,
    depthCm: 25,
    hi: "टखने तक",
    en: "Ankle Deep",
    range: "< 0.5m",
    severity: "ADVISORY",
    bgGradient: "from-cyan-50 to-blue-100 dark:from-cyan-950/30 dark:to-blue-900/40 text-blue-950 dark:text-blue-100",
    borderClass: "border-blue-300 dark:border-blue-700",
    waterPercent: 15,
  },
  {
    level: 3,
    depthCm: 75,
    hi: "घुटने तक",
    en: "Knee Deep",
    range: "0.5 to 1m",
    severity: "ALERT",
    bgGradient: "from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/50 text-blue-950 dark:text-white",
    borderClass: "border-blue-400 dark:border-blue-600",
    waterPercent: 40,
  },
  {
    level: 4,
    depthCm: 125,
    hi: "कमर तक",
    en: "Waist Deep",
    range: "1 to 1.5m",
    severity: "CRITICAL",
    bgGradient: "from-blue-500 to-indigo-600 text-white",
    borderClass: "border-blue-600 dark:border-blue-400",
    waterPercent: 65,
  },
  {
    level: 5,
    depthCm: 180,
    hi: "कमर से ऊपर",
    en: "Above Waist",
    range: "> 1.5m",
    severity: "CRITICAL",
    bgGradient: "from-blue-800 to-indigo-950 text-white",
    borderClass: "border-blue-900 dark:border-blue-300",
    waterPercent: 90,
  },
];

export function StructuredFieldReportForm({
  initialData,
  geoStatus,
  geoAccuracy,
  onAcquireLocation,
  onSubmit,
  onCancel,
  onPhotoSelect,
  isUploadingPhoto,
  uploadError,
}: StructuredFieldReportFormProps) {
  const locale = useLocale();
  const formId = useId();

  // Controlled form state
  const [formData, setFormData] = useState<FieldReportFormData>(initialData);

  // Selected water level card index (1 to 5, or null if customized)
  const [selectedWaterLevel, setSelectedWaterLevel] = useState<number | null>(() => {
    const depth = Number(initialData.observed_water_depth_cm);
    if (depth === 0) return 1;
    if (depth > 0 && depth <= 35) return 2;
    if (depth > 35 && depth <= 90) return 3;
    if (depth > 90 && depth <= 140) return 4;
    if (depth > 140) return 5;
    return 3; // Default Knee Deep
  });

  // Selected assistance items
  const [selectedAssistance, setSelectedAssistance] = useState<string[]>([]);

  // Section 5: Certification Checkbox
  const [isCertified, setIsCertified] = useState<boolean>(false);

  // Active quick button highlight
  const [activeQuickPreset, setActiveQuickPreset] = useState<string | null>(null);

  // Synchronize when initialData changes from outer caller
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // SECTION 1: QUICK REPORT PRESETS
  const handleQuickPreset = (preset: "danger" | "flood" | "road" | "safe") => {
    setActiveQuickPreset(preset);

    if (preset === "danger") {
      // Button 1: Life Danger -> CRITICAL, Rescue Needed, People stranded
      setFormData((prev) => ({
        ...prev,
        severity: "CRITICAL",
        report_type: "Rescue Needed",
        people_requiring_assistance: prev.people_requiring_assistance || "4",
        road_status: "IMPASSABLE_CLOSED",
        description: prev.description
          ? prev.description
          : locale === "hi"
          ? "जीवन संकट स्थिति: तत्काल बचाव दल एवं नाव की आवश्यकता है।"
          : "Life danger situation: Immediate rescue team and boat assistance required.",
      }));
      setSelectedWaterLevel(4);
      setSelectedAssistance(["boats", "rescue_team"]);
    } else if (preset === "flood") {
      // Button 2: Flood Active -> ALERT, Waterlogging
      setFormData((prev) => ({
        ...prev,
        severity: "ALERT",
        report_type: "Waterlogging",
        observed_water_depth_cm: prev.observed_water_depth_cm || "75",
        road_status: "SUBMERGED_PASSABLE",
        description: prev.description
          ? prev.description
          : locale === "hi"
          ? "बाढ़ सक्रिय: क्षेत्र में गंभीर जलभराव, सड़क पर जलप्रवाह जारी।"
          : "Flood active: Heavy waterlogging observed across the sector.",
      }));
      setSelectedWaterLevel(3);
    } else if (preset === "road") {
      // Button 3: Road Blocked -> ALERT, Road Block, IMPASSABLE_CLOSED
      setFormData((prev) => ({
        ...prev,
        severity: "ALERT",
        report_type: "Road Block",
        road_status: "IMPASSABLE_CLOSED",
        description: prev.description
          ? prev.description
          : locale === "hi"
          ? "रास्ता बंद: पुलिया या मुख्य मार्ग पर जलभराव अथवा अवरोध के कारण आवागमन पूरी तरह ठप।"
          : "Road blocked: Culvert or main transit route completely submerged and impassable.",
      }));
    } else if (preset === "safe") {
      // Button 4: I Am Safe -> NORMAL, LOW water, 0 depth
      setFormData((prev) => ({
        ...prev,
        severity: "NORMAL",
        report_type: "Other",
        observed_water_depth_cm: 0,
        people_requiring_assistance: 0,
        road_status: "CLEAR",
        description: prev.description
          ? prev.description
          : locale === "hi"
          ? "स्थिति सामान्य: क्षेत्र में पानी उतर गया है और कोई संकट नहीं है।"
          : "Status clear: Water receded, no immediate emergency in this sector.",
      }));
      setSelectedWaterLevel(1);
      setSelectedAssistance(["none"]);
    }
  };

  // SECTION 2: WATER LEVEL SELECTOR HANDLER
  const handleSelectWaterLevel = (card: WaterLevelCard) => {
    setSelectedWaterLevel(card.level);
    setFormData((prev) => ({
      ...prev,
      observed_water_depth_cm: card.depthCm,
      severity: card.severity,
    }));
  };

  // SECTION 3: ASSISTANCE CHECKBOXES HANDLER
  const toggleAssistance = (id: string) => {
    if (id === "none") {
      setSelectedAssistance(["none"]);
      setFormData((prev) => ({
        ...prev,
        people_requiring_assistance: 0,
      }));
      return;
    }

    const withoutNone = selectedAssistance.filter((item) => item !== "none");
    const isSelected = withoutNone.includes(id);
    const updated = isSelected
      ? withoutNone.filter((item) => item !== id)
      : [...withoutNone, id];

    setSelectedAssistance(updated);

    // If assistance requested, set at least 1 person if currently 0 or empty
    if (updated.length > 0 && (!formData.people_requiring_assistance || Number(formData.people_requiring_assistance) === 0)) {
      setFormData((prev) => ({
        ...prev,
        people_requiring_assistance: "2",
      }));
    }
  };

  // FORM SUBMISSION GATE
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCertified) return;

    // Append assistance requirements note into description if selected
    let enhancedDescription = formData.description.trim();
    if (selectedAssistance.length > 0 && !selectedAssistance.includes("none")) {
      const assistanceLabels = selectedAssistance
        .map((id) => {
          const opt = ASSISTANCE_OPTIONS.find((o) => o.id === id);
          return opt ? `${opt.en} (${opt.hi})` : id;
        })
        .join(", ");
      
      const assistanceNote = `[Required Assistance: ${assistanceLabels}]`;
      if (!enhancedDescription.includes("[Required Assistance:")) {
        enhancedDescription = enhancedDescription
          ? `${enhancedDescription}\n\n${assistanceNote}`
          : assistanceNote;
      }
    }

    await onSubmit({
      ...formData,
      description: enhancedDescription,
    });
  };

  return (
    <form
      id={formId}
      onSubmit={handleFormSubmit}
      className="p-3 sm:p-5 space-y-5 text-sm max-h-[82vh] overflow-y-auto"
    >
      {/* ============================================================= */}
      {/* SECTION 1 - QUICK REPORT BUTTONS (Large 2x2 Grid >= 80px tall) */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-sm">
            <span className="text-base">⚡</span>
            <span>त्वरित रिपोर्ट • Quick Report</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {locale === "hi" ? "आपातकालीन त्वरित पूर्व-चयन" : "Tap for instant emergency preset"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Button 1: Life Danger */}
          <button
            type="button"
            onClick={() => handleQuickPreset("danger")}
            className={cn(
              "min-h-[80px] p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 shadow-sm border-2 select-none active:scale-[0.98]",
              "bg-red-600 hover:bg-red-700 text-white border-red-700",
              activeQuickPreset === "danger" ? "ring-4 ring-red-400 ring-offset-2 dark:ring-offset-slate-900 font-black" : ""
            )}
          >
            <span className="text-2xl mb-1 filter drop-shadow">🆘</span>
            <span className="text-sm sm:text-base font-bold leading-tight block">
              जीवन संकट
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-95 block">
              LIFE DANGER
            </span>
          </button>

          {/* Button 2: Flood Active */}
          <button
            type="button"
            onClick={() => handleQuickPreset("flood")}
            className={cn(
              "min-h-[80px] p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 shadow-sm border-2 select-none active:scale-[0.98]",
              "bg-amber-600 hover:bg-amber-700 text-white border-amber-700",
              activeQuickPreset === "flood" ? "ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900 font-black" : ""
            )}
          >
            <span className="text-2xl mb-1 filter drop-shadow">💧</span>
            <span className="text-sm sm:text-base font-bold leading-tight block">
              बाढ़ आई
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-95 block">
              FLOOD ACTIVE
            </span>
          </button>

          {/* Button 3: Road Blocked */}
          <button
            type="button"
            onClick={() => handleQuickPreset("road")}
            className={cn(
              "min-h-[80px] p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 shadow-sm border-2 select-none active:scale-[0.98]",
              "bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500 font-bold",
              activeQuickPreset === "road" ? "ring-4 ring-amber-600 ring-offset-2 dark:ring-offset-slate-900 font-black" : ""
            )}
          >
            <span className="text-2xl mb-1 filter drop-shadow">🚧</span>
            <span className="text-sm sm:text-base font-bold leading-tight block">
              रास्ता बंद
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase opacity-90 block">
              ROAD BLOCKED
            </span>
          </button>

          {/* Button 4: I Am Safe */}
          <button
            type="button"
            onClick={() => handleQuickPreset("safe")}
            className={cn(
              "min-h-[80px] p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 shadow-sm border-2 select-none active:scale-[0.98]",
              "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
              activeQuickPreset === "safe" ? "ring-4 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900 font-black" : ""
            )}
          >
            <span className="text-2xl mb-1 filter drop-shadow">✅</span>
            <span className="text-sm sm:text-base font-bold leading-tight block">
              मैं सुरक्षित
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-95 block">
              I AM SAFE
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 4 - GPS DISPLAY & TELEMETRY (Prominent display)      */}
      {/* ============================================================= */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
            <span>वर्तमान जीपीएस स्थिति • Current GPS Location</span>
          </span>
          {geoAccuracy !== null && (
            <span
              className={cn(
                "text-xs font-mono font-bold px-2 py-0.5 rounded-full border",
                geoAccuracy <= 100
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              ±{Math.round(geoAccuracy)}m {locale === "hi" ? "सटीकता" : "accuracy"}
            </span>
          )}
        </div>

        {/* GPS Low Accuracy Warning */}
        {geoAccuracy !== null && geoAccuracy > 100 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {locale === "hi" ? "चेतावनी: जीपीएस सटीकता कम है" : "Warning: GPS accuracy is low"} (±{Math.round(geoAccuracy)}m)
              </span>
              <span className="text-[11px] block mt-0.5">
                {locale === "hi"
                  ? "कृपया नीचे स्थान का नाम और सीमा चिह्न स्पष्ट रूप से दर्ज करें।"
                  : "Please verify and describe landmark or street name clearly below."}
              </span>
            </div>
          </div>
        )}

        {/* Coordinates readout */}
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            {formData.latitude.toFixed(5)}° N, {formData.longitude.toFixed(5)}° E
          </div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            WGS84 Lat/Lon
          </span>
        </div>

        {/* Acquire GPS Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onAcquireLocation}
          disabled={geoStatus === "acquiring"}
          className="w-full min-h-[44px] text-xs sm:text-sm gap-2 font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer"
        >
          <Compass className={cn("w-4 h-4 text-blue-600", geoStatus === "acquiring" && "animate-spin")} />
          <span>
            {geoStatus === "acquiring"
              ? (locale === "hi" ? "जीपीएस स्थिति प्राप्त की जा रही है..." : "Acquiring GPS Position...")
              : (locale === "hi" ? "वर्तमान जीपीएस स्थान रीफ्रेश करें" : "Refresh Device GPS Location")}
          </span>
        </Button>
      </div>

      {/* Landmark / Street Name */}
      <div className="space-y-1">
        <label htmlFor="field-report-location" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
          {locale === "hi" ? "स्थान / सीमा चिह्न / सड़क का नाम *" : "Landmark / Causeway / Street Name *"}
        </label>
        <input
          id="field-report-location"
          type="text"
          required
          placeholder={locale === "hi" ? "उदा. पौड़-कोलवण रोड पुलिया किमी 14" : "e.g., Paud-Kolvan Road Culvert KM 14"}
          value={formData.location_name}
          onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
          className="w-full px-3.5 py-2.5 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
        />
      </div>

      {/* ============================================================= */}
      {/* SECTION 2 - WATER LEVEL VISUAL SELECTOR (5 Horizontal Cards)   */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
            <span>🌊</span>
            <span>जलभराव स्तर • Water Level Visual Assessment</span>
          </label>
          <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
            {formData.observed_water_depth_cm !== "" ? `${formData.observed_water_depth_cm} cm` : "-- cm"}
          </span>
        </div>

        {/* 5 Horizontal Scrollable Cards */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin snap-x">
          {WATER_LEVEL_CARDS.map((card) => {
            const isSelected = selectedWaterLevel === card.level;
            return (
              <button
                key={card.level}
                type="button"
                onClick={() => handleSelectWaterLevel(card)}
                className={cn(
                  "flex-shrink-0 w-[145px] sm:w-[155px] p-3 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer snap-start relative select-none bg-gradient-to-b",
                  card.bgGradient,
                  isSelected
                    ? "ring-3 ring-[#0F3D66] dark:ring-blue-400 border-[#0F3D66] dark:border-blue-400 shadow-md scale-[1.02]"
                    : `${card.borderClass} hover:opacity-95 opacity-80 hover:scale-[1.01]`
                )}
              >
                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-[#0F3D66] flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}

                {/* Submersion Human SVG Icon */}
                <div className="w-12 h-16 mx-auto my-1 flex items-end justify-center relative">
                  {/* Human Figure Silhouette */}
                  <svg
                    viewBox="0 0 24 36"
                    className="w-8 h-14"
                    fill="currentColor"
                  >
                    {/* Head */}
                    <circle cx="12" cy="5" r="4" />
                    {/* Body */}
                    <path d="M7 11h10v10H7z" />
                    {/* Legs */}
                    <path d="M8 21h3v13H8z M13 21h3v13H13z" />
                    {/* Arms */}
                    <path d="M4 12h2v9H4z M18 12h2v9H18z" />
                  </svg>

                  {/* Water line overlay */}
                  {card.waterPercent > 0 && (
                    <div
                      className="absolute inset-x-0 bottom-0 bg-blue-500/60 dark:bg-blue-400/70 border-t-2 border-blue-300 dark:border-blue-200 transition-all rounded-b"
                      style={{ height: `${card.waterPercent}%` }}
                    />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <span className="text-xs sm:text-sm font-bold block leading-tight">
                    {card.hi}
                  </span>
                  <span className="text-[11px] font-semibold opacity-90 block">
                    {card.en}
                  </span>
                  <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/15 dark:bg-white/20 font-bold">
                    {card.range}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Type & Severity Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="field-report-type" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
            {locale === "hi" ? "रिपोर्ट का प्रकार *" : "Report Category *"}
          </label>
          <select
            id="field-report-type"
            value={formData.report_type}
            onChange={(e) => setFormData({ ...formData, report_type: e.target.value as FieldReportType })}
            className="w-full min-h-[44px] text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          >
            {FIELD_REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="field-report-severity" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
            {locale === "hi" ? "गंभीरता स्तर *" : "Severity Level *"}
          </label>
          <select
            id="field-report-severity"
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as SeverityLevel })}
            className="w-full min-h-[44px] text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          >
            <option value="NORMAL">{locale === "hi" ? "सामान्य (कम पानी) • NORMAL" : "Normal (Low Water) • NORMAL"}</option>
            <option value="ADVISORY">{locale === "hi" ? "सलाह / निगरानी • ADVISORY" : "Advisory (Watch) • ADVISORY"}</option>
            <option value="ALERT">{locale === "hi" ? "अलर्ट (गंभीर जलभराव) • ALERT" : "Alert (Severe Overflow) • ALERT"}</option>
            <option value="CRITICAL">{locale === "hi" ? "अति-गंभीर (जीवन संकट) • CRITICAL" : "Critical (Life Threat) • CRITICAL"}</option>
          </select>
        </div>
      </div>

      {/* Road Passability & People Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="field-road-status" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
            {locale === "hi" ? "सड़क आवागमन स्थिति" : "Road Passability Status"}
          </label>
          <select
            id="field-road-status"
            value={formData.road_status}
            onChange={(e) => setFormData({ ...formData, road_status: e.target.value as RoadStatus })}
            className="w-full min-h-[44px] text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          >
            {ROAD_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="field-people-assistance" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
            {locale === "hi" ? "सहायता अपेक्षित नागरिक संख्या" : "People Requiring Assistance (Count)"}
          </label>
          <input
            id="field-people-assistance"
            type="number"
            min="0"
            placeholder={locale === "hi" ? "0 (यदि कोई न हो)" : "0 (If none)"}
            value={formData.people_requiring_assistance}
            onChange={(e) => setFormData({ ...formData, people_requiring_assistance: e.target.value })}
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 3 - ASSISTANCE CHECKBOXES (2-column touch-friendly)   */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
            <span>🆘</span>
            <span>आवश्यक सहायता • Assistance Required</span>
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            {locale === "hi" ? "लागू सभी विकल्प चुनें" : "Select all that apply"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ASSISTANCE_OPTIONS.map((opt) => {
            const isChecked = selectedAssistance.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleAssistance(opt.id)}
                className={cn(
                  "min-h-[48px] p-3 rounded-xl border-2 flex items-center gap-3 transition-all duration-150 cursor-pointer select-none text-left",
                  isChecked
                    ? "bg-blue-50 dark:bg-blue-950/50 border-[#0F3D66] dark:border-blue-400 text-slate-950 dark:text-white shadow-xs font-bold"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                    isChecked
                      ? "bg-[#0F3D66] border-[#0F3D66] text-white"
                      : "border-slate-400 bg-white dark:bg-slate-800"
                  )}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="truncate">
                    <span className="text-xs sm:text-sm block leading-tight truncate">
                      {opt.hi}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {opt.en}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="field-description" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm block">
          {locale === "hi" ? "जमीनी स्थिति का विवरण *" : "Ground Condition Description *"}
        </label>
        <textarea
          id="field-description"
          required
          rows={3}
          placeholder={locale === "hi" ? "बाढ़ की स्थिति, संरचनात्मक क्षति, जल प्रवाह की गति व तात्कालिक खतरों का विवरण..." : "Describe flood conditions, structural damage, waterflow velocity, and immediate risks..."}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 min-h-[75px] focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
        />
      </div>

      {/* Photo Upload Box */}
      <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <label htmlFor="field-photo-file" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
          <span>{locale === "hi" ? "मैदानी फोटो साक्ष्य (सुपाबेस स्टोरेज)" : "Ground Photo Evidence"}</span>
        </label>
        <input
          id="field-photo-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPhotoSelect}
          disabled={isUploadingPhoto}
          className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0F3D66] file:text-white hover:file:bg-[#0c3152] cursor-pointer"
        />
        {isUploadingPhoto && (
          <p className="text-xs text-blue-600 font-semibold animate-pulse">
            {locale === "hi" ? "फोटो अपलोड की जा रही है..." : "Uploading photo..."}
          </p>
        )}
        {uploadError && <p className="text-xs text-red-600 font-medium">{uploadError}</p>}
        {formData.photo_url && (
          <div className="flex items-center gap-2 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={formData.photo_thumbnail_url || formData.photo_url}
              alt="Evidence Preview"
              className="w-14 h-14 object-cover rounded-lg border border-slate-200"
            />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {locale === "hi" ? "फोटो संलग्न" : "Photo attached"}
            </span>
          </div>
        )}
      </div>

      {/* Observer Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="space-y-1">
          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
            {locale === "hi" ? "रिपोर्टर नाम *" : "Observer Name *"}
          </label>
          <input
            required
            placeholder={locale === "hi" ? "उदा. वी. आर. कुलकर्णी" : "e.g., V. R. Kulkarni"}
            value={formData.observer_name}
            onChange={(e) => setFormData({ ...formData, observer_name: e.target.value })}
            className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
            {locale === "hi" ? "पदनाम" : "Designation"}
          </label>
          <input
            placeholder={locale === "hi" ? "उदा. तलाठी" : "e.g., Talathi"}
            value={formData.observer_role || ""}
            onChange={(e) => setFormData({ ...formData, observer_role: e.target.value })}
            className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
            {locale === "hi" ? "संपर्क फोन" : "Contact Phone"}
          </label>
          <input
            placeholder="+91 98..."
            value={formData.observer_contact || ""}
            onChange={(e) => setFormData({ ...formData, observer_contact: e.target.value })}
            className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 5 - CERTIFICATION CHECKBOX (Required before submit)    */}
      {/* ============================================================= */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            required
            checked={isCertified}
            onChange={(e) => setIsCertified(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-slate-400 text-[#0F3D66] focus:ring-[#0F3D66] cursor-pointer shrink-0"
          />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm block leading-snug">
              मैं प्रमाणित करता हूं कि यह रिपोर्ट मेरी जानकारी के अनुसार सटीक है
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-xs block">
              I certify this report is accurate to the best of my knowledge.
            </span>
          </div>
        </label>
      </div>

      {/* ============================================================= */}
      {/* MOBILE-OPTIMIZED FULL-WIDTH SUBMIT & CANCEL BUTTONS           */}
      {/* ============================================================= */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="submit"
          disabled={!isCertified}
          className={cn(
            "w-full min-h-[48px] text-base font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2",
            isCertified
              ? "bg-[#0F3D66] hover:bg-[#0c3152] text-white"
              : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>{locale === "hi" ? "मैदानी रिपोर्ट जमा करें" : "Submit Ground Report"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full min-h-[44px] text-sm font-semibold rounded-xl border-slate-300 dark:border-slate-700 cursor-pointer"
        >
          {locale === "hi" ? "रद्द करें (Cancel)" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
