"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Layers, ShieldCheck } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";



import { useLocale } from "@/lib/i18n/context";

export const FloodMethodologyCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === "hi" ? "मॉडल पद्धति एवं वैज्ञानिक शासन" : "Model Methodology & Scientific Governance"}
              </CardTitle>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "पारदर्शी बहु-कारक गणितीय सूत्रीकरण एवं 2D हाइड्रोलिक मॉडल से अंतर।"
                  : "Transparent multi-factor mathematical formulation and distinction from 2D hydraulic models."}
              </CardDescription>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
          >
            <span>{isOpen ? (locale === "hi" ? "संक्षिप्त करें" : "Collapse") : (locale === "hi" ? "मूल्यांकन समझें" : "Explain Assessment")}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-4 text-xs">
          {/* Conceptual Framework */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <strong className="text-slate-900 dark:text-white block">
              {locale === "hi" ? "1. सांख्यिकीय निर्णय सूचकांक बनाम हाइड्रोडायनामिक जलभराव" : "1. Statistical Decision Index vs. Hydrodynamic Inundation"}
            </strong>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              {locale === "hi" ? (
                <>
                  वर्षानेत्र जानबूझकर <strong>बाढ़ जोखिम इंडेक्सिंग</strong> को <strong>2D हाइड्रोडायनामिक मॉडलिंग</strong> से अलग रखता है:
                </>
              ) : (
                <>
                  VarshaNetra deliberately segregates <strong>Flood Risk Indexing</strong> from{" "}
                  <strong>2D Hydrodynamic Modeling</strong>:
                </>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "जोखिम सूचकांक (इंजन V1 - सक्रिय)" : "Risk Index (Engine V1 - Active)"}</span>
                </div>
                <p className="text-slate-500 leading-tight">
                  {locale === "hi"
                    ? "मौसम संबंधी दबाव, पूर्ववर्ती मिट्टी संतृप्ति, डीईएम भूभाग ढलान प्रवणता एवं जलमार्ग निकटता का सामान्यीकृत बहु-कारक संश्लेषण (0-100)। पूर्णतः नियतात्मक एवं सत्यापनीय।"
                    : "Normalized multi-factor synthesis (0-100) evaluating meteorological loading, antecedent soil saturation, DEM terrain slope gradient, and waterway proximity. Purely deterministic and verifiable."}
                </p>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{locale === "hi" ? "2D हाइड्रोलिक्स (HEC-RAS / LISFLOOD)" : "2D Hydraulics (HEC-RAS / LISFLOOD)"}</span>
                </div>
                <p className="text-slate-500 leading-tight">
                  {locale === "hi"
                    ? "मैनिंग खुरदरापन, पुल अवरोधों और क्रॉस-सेक्शन के साथ 2D सेंट-वेनेंट उथले पानी के समीकरणों को हल करता है। बहु-वर्षीय कैलिब्रेटेड बाथिमेट्री चालू होने तक कॉन्फ़िगर नहीं किया गया है।"
                    : "Solves the 2D Saint-Venant shallow water equations with Manning's roughness, bridge obstructions, and cross-sections. Not configured until multi-year calibrated bathymetry is operational."}
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Formulation */}
          <div className="space-y-2">
            <strong className="text-slate-900 dark:text-white block">
              {locale === "hi" ? "2. भार वितरण एवं सामान्यीकरण सूत्र" : "2. Weight Distribution & Normalization Formulas"}
            </strong>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                    <th className="py-1.5 px-2 font-semibold">{locale === "hi" ? "कारक कुंजी" : "Factor Key"}</th>
                    <th className="py-1.5 px-2 font-semibold">{locale === "hi" ? "मूल भार" : "Base Wt"}</th>
                    <th className="py-1.5 px-2 font-semibold">{locale === "hi" ? "सामान्यीकरण फलन" : "Normalization Function"}</th>
                    <th className="py-1.5 px-2 font-semibold">{locale === "hi" ? "वैज्ञानिक आधार" : "Scientific Baseline"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-2 px-2 font-semibold">{locale === "hi" ? "अग्रिम वर्षा" : "Forward Precipitation"}</td>
                    <td className="py-2 px-2 font-mono">35%</td>
                    <td className="py-2 px-2 font-mono text-[10px]">{locale === "hi" ? "आईडीएफ बर्स्ट वक्र के सापेक्ष खंडशः रैखिक" : "Piecewise linear against IDF burst curve"}</td>
                    <td className="py-2 px-2">{locale === "hi" ? "आईएमडी भारी वर्षा सीमा (15.5mm, 64.5mm, 115.5mm)" : "IMD Heavy Rainfall thresholds (15.5mm, 64.5mm, 115.5mm)"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-semibold">{locale === "hi" ? "पूर्ववर्ती 24घंटे वर्षा" : "Antecedent 24h Rainfall"}</td>
                    <td className="py-2 px-2 font-mono">20%</td>
                    <td className="py-2 px-2 font-mono text-[10px]">0-15mm (30pts), 15-45mm (70pts), &gt;75mm (100pts)</td>
                    <td className="py-2 px-2">{locale === "hi" ? "ऊपरी मिट्टी की नमी संतृप्ति" : "Upper vadose soil moisture saturation"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-semibold">{locale === "hi" ? "पूर्ववर्ती 48घंटे वर्षा" : "Antecedent 48h Rainfall"}</td>
                    <td className="py-2 px-2 font-mono">15%</td>
                    <td className="py-2 px-2 font-mono text-[10px]">0-25mm (30pts), 25-60mm (70pts), &gt;100mm (100pts)</td>
                    <td className="py-2 px-2">{locale === "hi" ? "उपसतह आधार प्रवाह एवं जलग्रहण पुनर्भरण (AMC-III)" : "Subsurface baseflow & watershed recharge (AMC-III)"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-semibold">{locale === "hi" ? "डीईएम ढलान प्रवणता" : "DEM Slope Gradient"}</td>
                    <td className="py-2 px-2 font-mono">15%</td>
                    <td className="py-2 px-2 font-mono text-[10px]">&lt;1% (95pts), 1-3% (75pts), 3-6% (45pts), &gt;10% (15pts)</td>
                    <td className="py-2 px-2">{locale === "hi" ? "नासा SRTM / कोपरनिकस GLO-30 2D प्रवणता" : "NASA SRTM / Copernicus GLO-30 2D finite-difference gradient"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-semibold">{locale === "hi" ? "नदी निकटता" : "River Proximity"}</td>
                    <td className="py-2 px-2 font-mono">15%</td>
                    <td className="py-2 px-2 font-mono text-[10px]">&lt;150m (100pts), 150-500m (75pts), &gt;3000m (5pts)</td>
                    <td className="py-2 px-2">{locale === "hi" ? "ओपनस्ट्रीटमैप नदी रेखाओं से यूक्लिडियन दूरी" : "Euclidean point-to-line distance to OSM river polylines"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Data Policy */}
          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
            <strong className="block font-bold">{locale === "hi" ? "3. पारदर्शी डेटा पूर्णता नीति" : "3. Transparent Data Completeness Policy"}</strong>
            <p className="leading-relaxed">
              {locale === "hi"
                ? "जब भूभाग ढलान या जलमार्ग डेटा असत्यापित या पायलट डीईएम सेक्टर से बाहर होता है, तो इंजन सिंथेटिक मान बनाने से सख्ती से बचता है। इसके बजाय, डेटा पूर्णता 100% से गिरकर 70% या 85% हो जाती है, और सक्रिय भार पुष्ट मौसम संबंधी इनपुट पर आनुपातिक रूप से सामान्यीकृत किए जाते हैं।"
                : "When terrain slope or waterway reach data is unverified or outside the pilot DEM sector, the engine strictly refrains from fabricating synthetic values. Instead, data completeness drops from 100% to 70% or 85%, and the active weights are proportionally normalized across confirmed meteorological inputs."}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
