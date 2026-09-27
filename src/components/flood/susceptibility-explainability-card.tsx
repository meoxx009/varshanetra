"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Waves,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  CloudRain,
  Droplets,
  Mountain,
  Layers,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  InundationSusceptibilityResult,
  InundationSusceptibilityClass,
  DataCompletenessLevel,
  InundationFactorKey,
} from "@/types";
import { useLocale } from "@/lib/i18n/context";

interface SusceptibilityExplainabilityCardProps {
  susceptibilityData?: InundationSusceptibilityResult | null;
  isLoading?: boolean;
  className?: string;
}

export function getSusceptibilityClassMeta(cls: InundationSusceptibilityClass, locale: string = "en"): {
  label: string;
  badgeClass: string;
  colorHex: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
} {
  switch (cls) {
    case "SEVERE":
      return {
        label: locale === "hi" ? "अति गंभीर संवेदनशीलता" : "SEVERE SUSCEPTIBILITY",
        badgeClass: "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-800",
        colorHex: "#DC2626",
        icon: ShieldAlert,
        description:
          locale === "hi"
            ? "गंभीर जलभराव की संभावना; प्राकृतिक जल निकासी क्षमता सीमित। आपातकालीन पंप एवं रेस्क्यू दल तैयार रखें।"
            : "Severe inundation susceptibility; natural drainage capacity severely constrained. Pre-position dewatering pumps and cordon low-lying sectors.",
      };
    case "HIGH":
      return {
        label: locale === "hi" ? "उच्च संवेदनशीलता" : "HIGH SUSCEPTIBILITY",
        badgeClass: "bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:border-orange-700",
        colorHex: "#EA580C",
        icon: AlertTriangle,
        description:
          locale === "hi"
            ? "निचले बेसिनों एवं जलमार्ग तटबंधों पर जलभराव की उच्च आशंका। निरंतर निगरानी आवश्यक।"
            : "High ponding vulnerability in low-lying basins and waterway buffers. Active drainage monitoring advised.",
      };
    case "MODERATE":
      return {
        label: locale === "hi" ? "मध्यम संवेदनशीलता" : "MODERATE SUSCEPTIBILITY",
        badgeClass: "bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-700",
        colorHex: "#EAB308",
        icon: Waves,
        description:
          locale === "hi"
            ? "मध्यम सतही अपवाह एवं धीमी जल निकासी। तूफानी नालों की निगरानी करें।"
            : "Moderate surface runoff and sluggish drainage. Monitor storm sewer conduits and depression culverts.",
      };
    case "LOW":
    default:
      return {
        label: locale === "hi" ? "कम संवेदनशीलता" : "LOW SUSCEPTIBILITY",
        badgeClass: "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-800",
        colorHex: "#16A34A",
        icon: ShieldCheck,
        description:
          locale === "hi"
            ? "प्राकृतिक गुरुत्वाकर्षण जल निकासी सक्रिय; वर्षा एवं ढलान संकेतक सुरक्षित सीमा के भीतर।"
            : "Natural gravitational drainage adequate; meteorological and elevation metrics within normal retention limits.",
      };
  }
}

export function getCompletenessLevelMeta(lvl: DataCompletenessLevel, locale: string = "en"): {
  label: string;
  badgeClass: string;
  colorHex: string;
} {
  switch (lvl) {
    case "HIGH":
      return {
        label: locale === "hi" ? "उच्च पूर्णता (>=80%)" : "HIGH (>=80%)",
        badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
        colorHex: "#16A34A",
      };
    case "MEDIUM":
      return {
        label: locale === "hi" ? "मध्यम पूर्णता (50-79%)" : "MEDIUM (50-79%)",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
        colorHex: "#D97706",
      };
    case "LIMITED":
    default:
      return {
        label: locale === "hi" ? "सीमित (<50%)" : "LIMITED (<50%)",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        colorHex: "#64748B",
      };
  }
}

function getFactorIcon(key: InundationFactorKey) {
  switch (key) {
    case "FORECAST_PRECIPITATION":
      return CloudRain;
    case "ANTECEDENT_RAINFALL":
      return Droplets;
    case "RELATIVE_ELEVATION":
      return Layers;
    case "TERRAIN_SLOPE":
      return Mountain;
    case "WATERWAY_PROXIMITY":
      return Compass;
    default:
      return Waves;
  }
}

export const SusceptibilityExplainabilityCard: React.FC<SusceptibilityExplainabilityCardProps> = ({
  susceptibilityData,
  isLoading = false,
  className = "",
}) => {
  const locale = useLocale();
  const [showTechnical, setShowTechnical] = useState(false);

  if (isLoading) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-20 bg-slate-100 dark:bg-slate-900 rounded w-full" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (!susceptibilityData) {
    return (
      <Card className={`border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 ${className}`}>
        {locale === "hi"
          ? "जलभराव संवेदनशीलता डेटा टेलीमेट्री लोड होने की प्रतीक्षा में है।"
          : "Inundation susceptibility evaluation awaiting telemetry inputs."}
      </Card>
    );
  }

  const {
    score,
    susceptibilityClass,
    dataCompleteness,
    completenessLevel,
    missingFactors,
    contributingFactors,
    summaryReasons,
    summaryReasonsHi,
    plainLanguageExplanation,
    plainLanguageExplanationHi,
    calculatedAt,
    disclaimer,
    disclaimerHi,
  } = susceptibilityData;

  const classMeta = getSusceptibilityClassMeta(susceptibilityClass, locale);
  const completenessMeta = getCompletenessLevelMeta(completenessLevel, locale);
  const ClassIcon = classMeta.icon;

  const activeReasons = locale === "hi" && summaryReasonsHi?.length ? summaryReasonsHi : summaryReasons;
  const activePlainExplanation = locale === "hi" && plainLanguageExplanationHi ? plainLanguageExplanationHi : plainLanguageExplanation;
  const activeDisclaimer = locale === "hi" && disclaimerHi ? disclaimerHi : disclaimer;

  const calculatedTimeStr = new Date(calculatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: classMeta.colorHex }}
            >
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {locale === "hi"
                    ? "प्रायोगिक जलभराव संवेदनशीलता विश्लेषण (इंजन V1)"
                    : "Experimental Inundation Susceptibility Analysis (Engine V1)"}
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {locale === "hi" ? "नियतात्मक बहु-कारक" : "Deterministic Multi-Factor"}
                </span>
              </div>
              <CardDescription className="text-xs mt-0.5">
                {locale === "hi"
                  ? "वर्षा, पूर्ववर्ती संतृप्ति, डीईएम सापेक्ष ऊंचाई कमी, ढलान एवं जलमार्ग निकटता का पारदर्शी सूचकांक।"
                  : "Transparent index combining precipitation forecasts, antecedent moisture, DEM elevation deficit, slope & waterway proximity."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`text-xs font-black uppercase px-3 py-1.5 rounded-full border shadow-xs flex items-center gap-1.5 ${classMeta.badgeClass}`}
            >
              <ClassIcon className="w-3.5 h-3.5" />
              {classMeta.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Score Tile */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {locale === "hi" ? "संवेदनशीलता सूचकांक स्कोर" : "Susceptibility Score"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono" style={{ color: classMeta.colorHex }}>
                {score}
              </span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%`, backgroundColor: classMeta.colorHex }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 (Low)</span>
              <span>30 (Mod)</span>
              <span>50 (High)</span>
              <span>75 (Sev)</span>
            </div>
          </div>

          {/* Completeness Tile */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {locale === "hi" ? "डेटा पूर्णता स्तर" : "Data Completeness"}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${completenessMeta.badgeClass}`}>
                {completenessMeta.label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono text-[#0F3D66] dark:text-blue-400">
                {dataCompleteness}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0F3D66] dark:bg-blue-500 transition-all duration-500"
                style={{ width: `${dataCompleteness}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {missingFactors.length === 0
                ? (locale === "hi" ? "सभी 5 स्थलाकृतिक एवं मौसमी इनपुट सत्यापित।" : "All 5 terrain & meteorological factors confirmed.")
                : (locale === "hi"
                    ? `${missingFactors.length} कारक अनुपलब्ध; सक्रिय भार पुनर्वितरित।`
                    : `${missingFactors.length} unmeasured factor(s); active weights re-scaled.`)}
            </p>
          </div>

          {/* Qualitative Plain-Language Driver Tile */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">{locale === "hi" ? "मुख्य परिचालन निष्कर्ष" : "Operational Finding"}</span>
              <span className="text-[10px] font-mono text-slate-400">{calculatedTimeStr}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {activePlainExplanation}
            </p>
            <span className="mt-2 text-[10px] text-slate-400 italic">
              {locale === "hi" ? "शून्य कृत्रिम गहराई • पारदर्शी सत्यापन" : "Zero fabricated depths • Transparent validation"}
            </span>
          </div>
        </div>

        {/* Explainability Breakdown Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
              {locale === "hi"
                ? "यह संवेदनशीलता स्तर क्यों? कारक भार एवं योगदान विश्लेषण"
                : "Why this susceptibility level? Factor Breakdown & Active Weights"}
            </h4>
            <span className="text-[11px] text-slate-500">
              {locale === "hi"
                ? "सक्रिय कारकों का कुल भार 100% पर पुनः-सामान्यीकृत"
                : "Active factor weights re-normalized to 100%"}
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">{locale === "hi" ? "कारक" : "Factor"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "कच्चा मान" : "Raw Telemetry"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "सामान्यीकृत स्कोर" : "Normalized (0-100)"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "आधार भार" : "Base Wt"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "सक्रिय भार" : "Active Wt"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "अंक योगदान" : "Weighted Pts"}</th>
                  <th className="py-2.5 px-3">{locale === "hi" ? "परिचालन तर्क" : "Hydrological Rationale"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {contributingFactors.map((f, idx) => {
                  const FIcon = getFactorIcon(f.key);
                  const activeLabel = locale === "hi" && f.labelHi ? f.labelHi : f.label;
                  const activeRationale = locale === "hi" && f.rationaleHi ? f.rationaleHi : f.rationale;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <FIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{activeLabel}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {typeof f.rawValue === "number" ? `${f.rawValue} ${f.unit}` : f.rawValue}
                      </td>
                      <td className="py-2.5 px-3">
                        {f.available ? (
                          <span className="font-mono font-bold text-[#0F3D66] dark:text-blue-400">
                            {f.normalizedScore} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {locale === "hi" ? "अमापित" : "Unmeasured"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {Math.round(f.weight * 100)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {f.available ? `${Math.round(f.activeWeight * 100)}%` : "--"}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {f.available ? `+${f.weightedContribution.toFixed(1)}` : "--"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                        {activeRationale}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Missing Factors Notice if any */}
        {missingFactors.length > 0 && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>
                {locale === "hi" ? "डेटा पूर्णता समायोजन सूचना:" : "Data Completeness Notice:"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {locale === "hi"
                ? `निम्नलिखित कारक सक्रिय निर्देशांक हेतु उपलब्ध नहीं हैं: ${missingFactors.join(", ")}। नियम #14 के तहत कोई काल्पनिक या नकली मान शामिल नहीं किया गया है। शेष सक्रिय कारकों के अनुपात में भार को 100% पर पुनः-सामान्यीकृत किया गया है।`
                : `The following factors were unmeasured for the active coordinates: ${missingFactors.join(", ")}. In compliance with Directive #14, synthetic data is never substituted. Active factor weights were proportionally re-allocated.`}
            </p>
          </div>
        )}

        {/* Primary Drivers List */}
        <div className="space-y-1.5 pt-1">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {locale === "hi" ? "परिचालन सारांश चालक:" : "Summary Drivers:"}
          </h5>
          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
            {activeReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* Expandable Technical Formulation */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {locale === "hi"
                ? "तकनीकी एल्गोरिथम सूत्र एवं वैज्ञानिक कार्यप्रणाली देखें"
                : "View Technical Mathematical Formulation & Methodology"}
            </span>
            {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnical && (
            <div className="p-4 bg-white dark:bg-slate-950 space-y-2.5 text-xs border-t border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {locale === "hi"
                  ? "जलभराव संवेदनशीलता सूचकांक (S) की गणना 5 घटकों के भारित योग के रूप में की जाती है: S = Σ (N_i × W_i) / Σ W_available, जहाँ N_i प्रत्येक कारक का 0-100 सामान्यीकृत स्कोर है। डीईएम सापेक्ष ऊंचाई बेसिन के न्यूनतम संदर्भ स्तर (522m) के विरुद्ध मापी जाती है।"
                  : "The Inundation Susceptibility Index (S) is evaluated as the normalized weighted sum: S = Σ (N_i × W_i) / Σ W_available, where N_i is the 0-100 normalized score of each available factor. Relative elevation deficit is evaluated against the local basin base (522m)."}
              </p>
              <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900 p-2.5 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                S = (0.30·F_rain + 0.20·A_antecedent + 0.20·E_relElev + 0.15·T_slope + 0.15·W_waterway) / Σ W_avail
              </div>
            </div>
          )}
        </div>

        {/* Transparency Governance Notice */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 text-xs flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>{locale === "hi" ? "प्रशासनिक अस्वीकरण:" : "Governance Disclaimer:"}</strong> {activeDisclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
