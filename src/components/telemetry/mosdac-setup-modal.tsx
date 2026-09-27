"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

interface MosdacSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MosdacSetupModal({ isOpen, onClose }: MosdacSetupModalProps) {
  const locale = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mosdac-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with National/ISRO Tri-color Accent */}
        <div className="h-1.5 w-full bg-linear-to-r from-orange-500 via-white to-emerald-600" />
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                🇮🇳 ISRO / भारतीय अंतरिक्ष अनुसंधान संगठन
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                MOSDAC
              </span>
            </div>
            <h2
              id="mosdac-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {locale === "hi"
                ? "MOSDAC एकीकरण - भारतीय अंतरिक्ष अनुसंधान संगठन"
                : "MOSDAC Integration - Indian Space Research Organisation"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              INSAT-3D / INSAT-3DR Geostationary Meteorological Satellite Telemetry
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Statutory Educational Disclosure */}
          <div className="p-3.5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 text-xs flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                MOSDAC पंजीकरण पूर्णतः निःशुल्क है और सभी भारतीय नागरिकों एवं संस्थानों के लिए खुला है।
              </p>
              <p className="opacity-90">
                MOSDAC registration is completely free and open for operational disaster management, researchers, and government departments.
              </p>
            </div>
          </div>

          {/* Why This Matters Section */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#0F3D66] dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>
                {locale === "hi" ? "यह एकीकरण क्यों महत्वपूर्ण है?" : "Why does this integration matter?"}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {locale === "hi"
                ? "ISRO का INSAT-3D उपग्रह भारत के लिए विशेष रूप से अनुकूलित है। यह IMD के मौसम पूर्वानुमान में उपयोग किया जाता है।"
                : "ISRO INSAT-3D satellite is specifically optimized for India. It is used in IMD weather forecasts."}
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Equipped with a 6-channel Imager and 19-channel Sounder, INSAT-3D provides 15-minute cadence Hydroestimator precipitation rates and cloud-top thermal profiles directly calibrated for Indian monsoonal cloud physics.
            </p>
          </div>

          {/* 3 Steps Setup Instructions */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              {locale === "hi" ? "चरणबद्ध सेटअप निर्देश (3 आसान चरण)" : "Step-by-Step Setup Guide (3 Simple Steps)"}
            </h3>

            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">
                    {locale === "hi"
                      ? "mosdac.gov.in पर जाएं और निःशुल्क खाता बनाएं"
                      : "Go to mosdac.gov.in and create a free account"}
                  </span>
                </div>
                <a
                  href="https://mosdac.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium"
                >
                  mosdac.gov.in
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-500 ml-7">
                {locale === "hi"
                  ? "ISRO के आधिकारिक MOSDAC पोर्टल पर 'Register' विकल्प चुनें और अपने ईमेल से खाता बनाएं।"
                  : "Visit ISRO's official MOSDAC portal, click 'Register', and verify your email to create a free government data account."}
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">
                    {locale === "hi"
                      ? "Profile section से API token प्राप्त करें"
                      : "Get API token from profile section"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 ml-7">
                {locale === "hi"
                  ? "लॉगिन करने के बाद अपने 'User Profile' या 'API Access' टैब में जाएं और व्यक्तिगत API Token कॉपी करें।"
                  : "After login, navigate to your User Profile / API Access section and copy your generated personal API access token."}
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">
                    {locale === "hi"
                      ? "Environment variable में जोड़ें: MOSDAC_TOKEN"
                      : "Add to environment variable: MOSDAC_TOKEN"}
                  </span>
                </div>
              </div>
              <div className="ml-7 space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs">
                  <span>MOSDAC_TOKEN=your_token_here</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy("MOSDAC_TOKEN=your_token_here", "token")}
                    className="h-6 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    {copiedKey === "token" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {locale === "hi"
                    ? "सर्वर को पुनरारंभ करने पर INSAT-3D लाइव डेटा स्वतः सक्रिय हो जाएगा।"
                    : "Paste this into your local `.env.local` file and restart the server to activate live INSAT-3D telemetry."}
                </p>
              </div>
            </div>
          </div>

          {/* Dual-Mode Architecture Summary */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <span className="font-bold block text-slate-800 dark:text-white">
              {locale === "hi" ? "स्वचालित डेमो सैंडबॉक्स मोड" : "Automatic Demo Sandbox Mode"}
            </span>
            <p>
              Without credentials, VarshaNetra automatically runs in <strong>DEMO MODE</strong>, displaying realistic INSAT-3D Hydroestimator structures so command staff and reviewers can test all workflows seamlessly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ISRO Space Applications Centre (SAC) Feed
          </span>
          <Button
            onClick={onClose}
            className="bg-[#0F3D66] hover:bg-[#0c3152] text-white text-xs px-5"
          >
            {locale === "hi" ? "समझ गया / बंद करें" : "Got it / Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
