"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  Smartphone,
  Scale,
  Check,
} from "lucide-react";
import { AlertCreationDisclaimer } from "@/components/disclaimers";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { SeverityLevel } from "@/types";
import { cn } from "@/lib/utils";

export type NdmaAlertType =
  | "METEOROLOGICAL_ADVISORY"
  | "FLOOD_WARNING"
  | "EVACUATION_ORDER"
  | "ALL_CLEAR";

export interface NdmaAlertFormPayload {
  title: string;
  severity: SeverityLevel;
  area_name: string;
  description: string;
  recommended_action: string;
  alert_type?: NdmaAlertType;
  expected_impact?: string;
  valid_from?: string;
  valid_until?: string;
  next_update_time?: string;
  message_hindi?: string;
}

interface NdmaCompliantAlertFormProps {
  initialArea: string;
  initialSeverity?: SeverityLevel;
  isSubmitting: boolean;
  formError: string | null;
  onCancel: () => void;
  onSubmit: (payload: NdmaAlertFormPayload, submitForReview: boolean) => Promise<void>;
}

// Recommended Action Option
interface ActionItem {
  id: string;
  hi: string;
  en: string;
}

const IMMEDIATE_ACTIONS: ActionItem[] = [
  { id: "eoc", hi: "EOC सक्रिय करें", en: "Activate EOC" },
  { id: "sdrf", hi: "SDRF दल तैनात करें", en: "Deploy SDRF teams" },
  { id: "hospitals", hi: "जोखिम क्षेत्र के अस्पतालों को सतर्क करें", en: "Alert hospitals in risk zone" },
  { id: "shelters", hi: "आश्रय स्थल खोलें", en: "Open emergency shelters" },
  { id: "schools", hi: "स्कूल प्रशासन को सतर्क करें", en: "Alert school authorities" },
];

const PREPARATORY_ACTIONS: ActionItem[] = [
  { id: "evac_advisory", hi: "सार्वजनिक निकासी परामर्श जारी करें", en: "Issue public evacuation advisory" },
  { id: "pwd_inspection", hi: "PWD सड़क निरीक्षण", en: "PWD road inspection" },
  { id: "medical_supplies", hi: "चिकित्सा आपूर्ति वितरण", en: "Medical supply distribution" },
];

const COORDINATION_ACTIONS: ActionItem[] = [
  { id: "cwc_monitoring", hi: "CWC नदी निगरानी", en: "CWC river monitoring" },
  { id: "sdma_inform", hi: "राज्य SDMA को सूचित करें", en: "Inform State SDMA" },
  { id: "adjacent_districts", hi: "आसपास के जिलों को सतर्क करें", en: "Alert adjacent districts" },
];

// Helper to get formatted local datetime string for input[type="datetime-local"]
function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function NdmaCompliantAlertForm({
  initialArea,
  initialSeverity = "ALERT",
  isSubmitting,
  formError,
  onCancel,
  onSubmit,
}: NdmaCompliantAlertFormProps) {
  const locale = useLocale();

  // Core Form Fields
  const [title, setTitle] = useState("Flash Flood Advisory: Mutha River Basin");
  const [severity, setSeverity] = useState<SeverityLevel>(initialSeverity);
  const [areaName, setAreaName] = useState(initialArea);
  const [description, setDescription] = useState(
    "Continuous heavy precipitation (145mm/24h) recorded in catchment basin. Khadakwasla dam discharge escalated to 28,000 cusecs. Backwater inundation expected in low-lying riverside causeways."
  );

  // Field 1: Alert Type Dropdown
  const [alertType, setAlertType] = useState<NdmaAlertType>("FLOOD_WARNING");

  // Field 2: Expected Impact Text Area
  const [expectedImpact, setExpectedImpact] = useState(
    "Potential inundation of 12 low-lying causeways, affecting approximately 4,500 residents in riverside settlements. Disruption of vehicular transit on riverside bypass routes."
  );

  // Field 3: Validity Period
  const [validFrom, setValidFrom] = useState(() => formatDateTimeLocal(new Date()));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return formatDateTimeLocal(d);
  });

  // Field 4: Next Update Time
  const [nextUpdate, setNextUpdate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 3);
    return formatDateTimeLocal(d);
  });

  // Field 5: Recommended Actions Checkboxes
  const [selectedActions, setSelectedActions] = useState<string[]>([
    "eoc",
    "hospitals",
    "pwd_inspection",
    "cwc_monitoring",
  ]);

  // Field 6: Bilingual Hindi Message (with SMS limit)
  const [hindiMessage, setHindiMessage] = useState(
    "पुणे मुठा नदी बेसिन: भारी वर्षा व बांध विसर्जन के कारण तटीय क्षेत्रों में जलभराव का अलर्ट। सुरक्षित स्थानों पर रहें। आपातकालीन डायल: 1077"
  );

  // Active Preview Tab
  const [previewTab, setPreviewTab] = useState<"sms" | "ndma">("ndma");

  // Synchronize Alert Type change with Severity
  const handleAlertTypeChange = (newType: NdmaAlertType) => {
    setAlertType(newType);
    if (newType === "EVACUATION_ORDER") {
      setSeverity("CRITICAL");
      if (!title.includes("EVACUATION")) {
        setTitle(`STATUTORY EVACUATION ORDER: ${areaName}`);
      }
    } else if (newType === "FLOOD_WARNING") {
      setSeverity("ALERT");
      if (!title.includes("Flood")) {
        setTitle(`Flood Warning: ${areaName} Basin`);
      }
    } else if (newType === "METEOROLOGICAL_ADVISORY") {
      setSeverity("ADVISORY");
      if (!title.includes("Advisory")) {
        setTitle(`Heavy Rainfall Advisory: ${areaName}`);
      }
    } else if (newType === "ALL_CLEAR") {
      setSeverity("NORMAL");
      setTitle(`ALL CLEAR: Weather Normalization in ${areaName}`);
    }
  };

  // Toggle Action Checkbox
  const toggleAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Compile Structured Recommended Actions
  const compiledActionsText = useMemo(() => {
    const allActions = [...IMMEDIATE_ACTIONS, ...PREPARATORY_ACTIONS, ...COORDINATION_ACTIONS];
    const active = allActions.filter((a) => selectedActions.includes(a.id));
    if (active.length === 0) return "";
    return active.map((a) => `• ${a.en} (${a.hi})`).join("\n");
  }, [selectedActions]);

  // Compile Comprehensive Description to satisfy existing schema
  const compilePayload = (): NdmaAlertFormPayload => {
    // Append NDMA compliance metadata into description seamlessly
    let fullDescription = description.trim();

    const ndmaMetaBlock = [
      `[NDMA Alert Type: ${alertType.replace(/_/g, " ")}]`,
      expectedImpact ? `[Expected Impact: ${expectedImpact.trim()}]` : null,
      validFrom && validUntil ? `[Validity: ${validFrom} to ${validUntil}]` : null,
      nextUpdate ? `[Next Bulletin: ${nextUpdate}]` : null,
      hindiMessage ? `[Hindi SMS: ${hindiMessage.trim()}]` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (!fullDescription.includes("[NDMA Alert Type:")) {
      fullDescription = `${fullDescription}\n\n${ndmaMetaBlock}`;
    }

    return {
      title: title.trim(),
      severity,
      area_name: areaName.trim(),
      description: fullDescription,
      recommended_action: compiledActionsText,
      alert_type: alertType,
      expected_impact: expectedImpact,
      valid_from: validFrom,
      valid_until: validUntil,
      next_update_time: nextUpdate,
      message_hindi: hindiMessage,
    };
  };

  const handleSubmit = (e: React.FormEvent, submitForReview: boolean) => {
    e.preventDefault();
    const payload = compilePayload();
    onSubmit(payload, submitForReview);
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5 text-xs sm:text-sm">
      {/* ============================================================= */}
      {/* SECTION AT TOP - NDMA COMPLIANT ALERT FORMAT BADGE            */}
      {/* ============================================================= */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900 via-[#0F3D66] to-slate-900 text-white shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
            <Scale className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-white tracking-wide">
                NDMA अनुरूप चेतावनी प्रारूप
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                NDMA SOP 2024
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              National Disaster Management Authority Compliant Statutory Format • DM Act 2005
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono bg-white/15 px-2.5 py-1 rounded-md border border-white/20 text-blue-100 font-semibold">
          EOC-STD-V2.4
        </span>
      </div>

      {/* Mandatory Statutory Disclaimer 4 */}
      <AlertCreationDisclaimer />

      {formError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs font-semibold"
        >
          {formError}
        </div>
      )}

      {/* ============================================================= */}
      {/* FIELD 1 - ALERT TYPE DROPDOWN & SEVERITY                      */}
      {/* ============================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Field 1: Alert Type Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="alert-ndma-type"
              className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center justify-between"
            >
              <span>{locale === "hi" ? "चेतावनी प्रकार *" : "Alert Type *"}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                {locale === "hi" ? "(एनडीएमए वर्गीकरण)" : "(NDMA Classification)"}
              </span>
            </label>
            <select
              id="alert-ndma-type"
              value={alertType}
              onChange={(e) => handleAlertTypeChange(e.target.value as NdmaAlertType)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
            >
              <option value="METEOROLOGICAL_ADVISORY">
                {locale === "hi" ? "मौसम परामर्श (मौसम आधारित)" : "METEOROLOGICAL ADVISORY (Weather-based)"}
              </option>
              <option value="FLOOD_WARNING">
                {locale === "hi" ? "बाढ़ चेतावनी (नदी / वर्षा आधारित)" : "FLOOD WARNING (River / Rainfall-based)"}
              </option>
              <option value="EVACUATION_ORDER">
                {locale === "hi" ? "निकासी आदेश (केवल डीएम अनुमोदन)" : "EVACUATION ORDER (Needs DM approval only)"}
              </option>
              <option value="ALL_CLEAR">
                {locale === "hi" ? "स्थिति सामान्य (संकट समाधान)" : "ALL CLEAR (Situation resolved)"}
              </option>
            </select>
          </div>

          {/* Severity Classification */}
          <div className="space-y-1.5">
            <label
              htmlFor="create-alert-severity"
              className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm"
            >
              {locale === "hi" ? "गंभीरता वर्गीकरण *" : "Severity Classification *"}
            </label>
            <select
              id="create-alert-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
              className={cn(
                "w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0F3D66]",
                severity === "CRITICAL"
                  ? "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200"
                  : severity === "ALERT"
                  ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200"
                  : severity === "ADVISORY"
                  ? "bg-yellow-50 text-yellow-950 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200"
                  : "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200"
              )}
            >
              <option value="CRITICAL">
                {locale === "hi" ? "अति-गंभीर (निकासी / लाल)" : "CRITICAL (Evacuation / Red)"}
              </option>
              <option value="ALERT">
                {locale === "hi" ? "गंभीर खतरा (चेतावनी / नारंगी)" : "ALERT (Severe Threat / Orange)"}
              </option>
              <option value="ADVISORY">
                {locale === "hi" ? "सलाह (सावधानी / पीला)" : "ADVISORY (Precaution / Yellow)"}
              </option>
              <option value="NORMAL">
                {locale === "hi" ? "सामान्य (सूचनात्मक / हरा)" : "NORMAL (Informational / Green)"}
              </option>
            </select>
          </div>
        </div>

        {/* Legal Note for Evacuation Orders */}
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200 space-y-0.5">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {locale === "hi"
                ? "निकासी आदेश केवल जिला मजिस्ट्रेट आपदा प्रबंधन अधिनियम 2005 की धारा 34 के तहत जारी कर सकते हैं।"
                : "Evacuation orders can only be issued by District Magistrate as per DM Act 2005 Section 34."}
            </span>
          </p>
        </div>
      </div>

      {/* Title & Target Area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="sm:col-span-2 space-y-1.5">
          <label htmlFor="create-alert-title" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
            {locale === "hi" ? "चेतावनी शीर्षक *" : "Warning Headline / Title *"}
          </label>
          <input
            id="create-alert-title"
            type="text"
            required
            placeholder="e.g. Flash Flood Warning: Mutha River Basin"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-alert-area" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
            {locale === "hi" ? "लक्षित परिचालन क्षेत्र *" : "Target Area *"}
          </label>
          <input
            id="create-alert-area"
            type="text"
            required
            placeholder="e.g. Pune City, Haveli"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
          />
        </div>
      </div>

      {/* Narrative Description */}
      <div className="space-y-1.5">
        <label htmlFor="create-alert-desc" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
          {locale === "hi" ? "परिस्थिति विवरण ब्रीफिंग *" : "Situation Narrative Briefing *"}
        </label>
        <textarea
          id="create-alert-desc"
          rows={3}
          required
          placeholder="Describe specific hazard conditions, reservoir releases, or meteorological triggers..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66] min-h-[75px]"
        />
      </div>

      {/* ============================================================= */}
      {/* FIELD 2 - EXPECTED IMPACT TEXT AREA                           */}
      {/* ============================================================= */}
      <div className="space-y-1.5">
        <label
          htmlFor="alert-expected-impact"
          className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center justify-between"
        >
          <span>{locale === "hi" ? "अपेक्षित प्रभाव" : "Expected Impact Assessment"}</span>
          <span className="text-[10px] text-slate-500 font-normal">
            {locale === "hi" ? "(जनसंख्या, बुनियादी ढांचा एवं जलभराव)" : "(Population, Infrastructure & Inundation)"}
          </span>
        </label>
        <textarea
          id="alert-expected-impact"
          rows={2}
          placeholder={locale === "hi" ? "इस घटना से कितने लोग, क्षेत्र और बुनियादी ढांचे प्रभावित होने की संभावना है..." : "Describe expected impact on population, area, and infrastructure."}
          value={expectedImpact}
          onChange={(e) => setExpectedImpact(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66] min-h-[60px]"
        />
      </div>

      {/* ============================================================= */}
      {/* FIELD 3 & 4 - DURATION SPECIFICATION & NEXT UPDATE TIME       */}
      {/* ============================================================= */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{locale === "hi" ? "चेतावनी वैधता एवं बुलेटिन चक्र" : "Validity & Bulletin Cycle"}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {locale === "hi" ? "चेतावनी वैधता अवधि" : "Alert validity period"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Field 3a: From */}
          <div className="space-y-1">
            <label htmlFor="alert-valid-from" className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
              {locale === "hi" ? "प्रभावी प्रारंभ *" : "From *"}
            </label>
            <input
              id="alert-valid-from"
              type="datetime-local"
              required
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
          </div>

          {/* Field 3b: Until */}
          <div className="space-y-1">
            <label htmlFor="alert-valid-until" className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
              {locale === "hi" ? "प्रभावी समाप्ति *" : "Until *"}
            </label>
            <input
              id="alert-valid-until"
              type="datetime-local"
              required
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
          </div>

          {/* Field 4: Next Update Time */}
          <div className="space-y-1">
            <label htmlFor="alert-next-update" className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
              {locale === "hi" ? "अगला अपडेट" : "Next Update"}
            </label>
            <input
              id="alert-next-update"
              type="datetime-local"
              value={nextUpdate}
              onChange={(e) => setNextUpdate(e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
              *as per NDMA SOPs (Next mandatory bulletin)
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* FIELD 5 - RECOMMENDED ACTIONS STRUCTURED CHECKBOXES (3 GROUPS)*/}
      {/* ============================================================= */}
      <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
            <span>🛡️</span>
            <span>{locale === "hi" ? "अनुशंसित विभागीय कार्रवाई" : "Recommended Actions (NDMA Structured)"}</span>
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            {locale === "hi" ? `${selectedActions.length} चयनित` : `${selectedActions.length} selected`}
          </span>
        </div>

        {/* Group 1: Immediate 0 to 6 hours */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>{locale === "hi" ? "तत्काल 0 से 6 घंटे" : "Immediate 0 to 6 hours"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {IMMEDIATE_ACTIONS.map((action) => {
              const isChecked = selectedActions.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={cn(
                    "min-h-[44px] p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer select-none",
                    isChecked
                      ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-200 font-semibold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isChecked ? "bg-red-600 border-red-600 text-white" : "border-slate-400"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs leading-tight font-medium">
                      {locale === "hi" ? action.hi : action.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group 2: Preparatory 6 to 24 hours */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{locale === "hi" ? "तैयारी 6 से 24 घंटे" : "Preparatory 6 to 24 hours"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PREPARATORY_ACTIONS.map((action) => {
              const isChecked = selectedActions.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={cn(
                    "min-h-[44px] p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer select-none",
                    isChecked
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-semibold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-slate-400"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs leading-tight font-medium">
                      {locale === "hi" ? action.hi : action.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group 3: Coordination */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{locale === "hi" ? "समन्वय" : "Coordination"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COORDINATION_ACTIONS.map((action) => {
              const isChecked = selectedActions.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={cn(
                    "min-h-[44px] p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer select-none",
                    isChecked
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200 font-semibold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-400"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs leading-tight font-medium">
                      {locale === "hi" ? action.hi : action.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* FIELD 6 - BILINGUAL HINDI MESSAGE (WITH 160-CHAR SMS LIMIT)   */}
      {/* ============================================================= */}
      <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label htmlFor="alert-hindi-message" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
            {locale === "hi" ? "हिंदी में चेतावनी संदेश" : "Alert Message in Hindi"}
          </label>
          <span
            className={cn(
              "font-mono text-xs font-bold px-2 py-0.5 rounded",
              hindiMessage.length <= 160
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            )}
          >
            {hindiMessage.length} / 160 {locale === "hi" ? "वर्ण (एसएमएस सीमा)" : "chars (SMS limit)"}
          </span>
        </div>

        <textarea
          id="alert-hindi-message"
          rows={2}
          value={hindiMessage}
          onChange={(e) => setHindiMessage(e.target.value)}
          placeholder="उदा. पुणे जिला आपदा नियंत्रण: मुठा नदी बेसिन में भारी जलभराव। सुरक्षित स्थानों पर रहें..."
          className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D66] min-h-[60px]"
        />

        {hindiMessage.length > 160 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {locale === "hi"
              ? `⚠️ संदेश 160 अक्षरों से अधिक है। दूरसंचार वाहक इसे ${Math.ceil(hindiMessage.length / 153)} अलग-अलग एसएमएस भागों में विभाजित करेंगे।`
              : `⚠️ Message exceeds 160 characters. Carriers will segment this into ${Math.ceil(hindiMessage.length / 153)} SMS parts.`}
          </p>
        )}
      </div>

      {/* ============================================================= */}
      {/* APPROVAL WORKFLOW DISPLAY (Horizontal Steps Chain)             */}
      {/* ============================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wider">
            {locale === "hi" ? "अनुमोदन कार्यप्रवाह" : "Approval Workflow Chain"}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200">
            DM Act § 34 Protocol
          </span>
        </div>

        {/* Horizontal Workflow Chain */}
        <div className="flex items-center justify-between overflow-x-auto py-2 px-1">
          {/* Step 1: Draft (Active) */}
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#0F3D66] text-white flex items-center justify-center font-bold text-xs ring-4 ring-blue-200 dark:ring-blue-900 shadow-sm">
              1
            </div>
            <span className="text-xs font-bold text-[#0F3D66] dark:text-blue-400 mt-1">
              {locale === "hi" ? "मसौदा" : "Draft"}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {locale === "hi" ? "● वर्तमान स्थिति" : "● Active Stage"}
            </span>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mx-1" />

          {/* Step 2: Pending Review */}
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
              {locale === "hi" ? "समीक्षाधीन" : "Pending Review"}
            </span>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mx-1" />

          {/* Step 3: DM Approval */}
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 mt-1">
              {locale === "hi" ? "डीएम अनुमोदन" : "DM Approval"}
            </span>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mx-1" />

          {/* Step 4: Issued */}
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
              {locale === "hi" ? "जारी" : "Issued"}
            </span>
            <span className="text-[10px] text-slate-400">
              {locale === "hi" ? "सार्वजनिक प्रसारण" : "Public Broadcast"}
            </span>
          </div>
        </div>

        {/* Note on DM Approval Requirement */}
        <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed">
          {locale === "hi"
            ? "इस चेतावनी को जारी करने के लिए जिला मजिस्ट्रेट के अनुमोदन की आवश्यकता है।"
            : "This alert requires District Magistrate approval before public issuance as per statutory command procedures."}
        </p>
      </div>

      {/* ============================================================= */}
      {/* DELIVERY PREVIEW SECTION (SMS & NDMA Standard Format)        */}
      {/* ============================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
              {locale === "hi" ? "प्रसारण पूर्वावलोकन" : "Delivery Preview"}
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPreviewTab("ndma")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer",
                previewTab === "ndma"
                  ? "bg-[#0F3D66] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              )}
            >
              {locale === "hi" ? "एनडीएमए मानक बुलेटिन" : "NDMA Standard Bulletin"}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("sms")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer",
                previewTab === "sms"
                  ? "bg-[#0F3D66] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              )}
            >
              {locale === "hi" ? "एसएमएस / सीएपी (160 वर्ण)" : "SMS / CAP (160 Chars)"}
            </button>
          </div>
        </div>

        {/* Tab 1: NDMA Standard Bulletin Format */}
        {previewTab === "ndma" && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
            <div className="text-center border-b border-slate-150 dark:border-slate-800 pb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                DISTRICT DISASTER MANAGEMENT AUTHORITY (DDMA)
              </span>
              <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                {title || (locale === "hi" ? "आपातकालीन परामर्श बुलेटिन" : "EMERGENCY ADVISORY BULLETIN")}
              </h4>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200">
                  {alertType.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-200">
                  {severity}
                </span>
                <span className="text-[10px] text-slate-500 font-medium font-mono">
                  TARGET: {areaName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {locale === "hi" ? "वैधता अवधि:" : "VALIDITY WINDOW:"}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {validFrom || "--"} to {validUntil || "--"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {locale === "hi" ? "अगला अपडेट अनुसूची:" : "NEXT UPDATE SCHEDULE:"}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {nextUpdate || (locale === "hi" ? "एनडीएमए एसओपी अनुसार" : "As per NDMA SOP")}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {locale === "hi" ? "स्थिति सारांश:" : "SITUATION SUMMARY:"}
              </span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                {description || (locale === "hi" ? "कोई विवरण निर्दिष्ट नहीं है।" : "No description specified.")}
              </p>
            </div>

            {expectedImpact && (
              <div className="space-y-1 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                  {locale === "hi" ? "जनसंख्या एवं बुनियादी ढांचे पर अनुमानित प्रभाव:" : "PROJECTED IMPACT ON POPULATION & INFRASTRUCTURE:"}
                </span>
                <p className="text-amber-950 dark:text-amber-200 text-[11px] leading-relaxed">
                  {expectedImpact}
                </p>
              </div>
            )}

            {compiledActionsText && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {locale === "hi" ? "अनिवार्य निर्देश एवं कार्रवाइयां:" : "MANDATED DIRECTIVES & ACTIONS:"}
                </span>
                <pre className="text-[11px] font-sans text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {compiledActionsText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: SMS Preview (160 characters) */}
        {previewTab === "sms" && (
          <div className="max-w-sm mx-auto p-4 rounded-2xl bg-slate-800 text-white shadow-lg space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700 pb-1.5 font-mono">
              <span>SENDER: [MH-DDMA]</span>
              <span>CELL BROADCAST / SMS</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-600 text-white space-y-1.5 text-xs shadow-xs">
              <p className="font-medium leading-relaxed font-sans">
                {hindiMessage || (locale === "hi" ? "चेतावनी संदेश यहाँ प्रदर्शित होगा..." : "Warning message will display here...")}
              </p>
              <div className="text-[10px] text-blue-200 text-right">
                {locale === "hi" ? `अभी • अधिकतम 160 वर्ण (${hindiMessage.length} प्रयुक्त)` : `Just now • 160 Char Max (${hindiMessage.length} used)`}
              </div>
            </div>

            <div className="text-[10.5px] text-slate-400 text-center">
              {locale === "hi"
                ? "नागरिक प्रसारण प्रोटोकॉल: टॉवर क्षेत्र के सभी सक्रिय मोबाइल सिम पर सीधे पहुंचाने में सक्षम।"
                : "Civil Broadcast Protocol: Capable of delivery to active mobile SIMs in tower zone."}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* FORM ACTION FOOTER BUTTONS                                    */}
      {/* ============================================================= */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] px-4 font-semibold text-xs sm:text-sm cursor-pointer"
        >
          {locale === "hi" ? "रद्द करें" : "Cancel"}
        </Button>

        <div className="flex items-center gap-2">
          {/* Button 1: Save as Draft */}
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            className="min-h-[44px] px-4 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            {locale === "hi" ? "मसौदे के रूप में सहेजें" : "Save as Draft"}
          </Button>

          {/* Button 2: Save & Submit for Review */}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e, true)}
            className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold min-h-[44px] px-5 text-xs sm:text-sm shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{locale === "hi" ? "सहेजें और समीक्षा हेतु भेजें" : "Save & Submit for Review"}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
