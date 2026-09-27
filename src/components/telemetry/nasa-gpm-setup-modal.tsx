"use client";

import React, { useState } from "react";
import {
  Satellite,
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

interface NasaGpmSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NasaGpmSetupModal({ isOpen, onClose }: NasaGpmSetupModalProps) {
  const locale = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const steps = [
    {
      num: 1,
      titleEn: "Create Free NASA Earthdata Account",
      titleHi: "निःशुल्क नासा अर्थडेटा खाता बनाएं",
      descEn: "Visit the Earthdata User Registration System and sign up for an account.",
      descHi: "अर्थडेटा यूज़र रजिस्ट्रेशन सिस्टम (URS) पर जाएं और निःशुल्क खाता बनाएं।",
      actionText: "https://urs.earthdata.nasa.gov",
      actionType: "link" as const,
      copyValue: "https://urs.earthdata.nasa.gov",
    },
    {
      num: 2,
      titleEn: "Navigate to Authorized Applications",
      titleHi: "अधिकृत एप्लिकेशन सेक्शन में जाएं",
      descEn: "After logging in to Earthdata, click Applications in the top menu and select Authorized Apps.",
      descHi: "लॉगिन करने के बाद, शीर्ष मेनू में Applications पर क्लिक करें और Authorized Apps चुनें।",
      actionText: "Applications → Authorized Apps",
      actionType: "text" as const,
    },
    {
      num: 3,
      titleEn: "Authorize NASA GESDISC Archive",
      titleHi: "नासा GESDISC डेटा आर्काइव को अधिकृत करें",
      descEn: "Search for 'NASA GESDISC DATA ARCHIVE' and click Approve/Authorize to grant precipitation data access.",
      descHi: "'NASA GESDISC DATA ARCHIVE' खोजें और उपग्रह वर्षा डेटा हेतु Approve/Authorize पर क्लिक करें।",
      actionText: "NASA GESDISC DATA ARCHIVE",
      actionType: "copy" as const,
      copyValue: "NASA GESDISC DATA ARCHIVE",
    },
    {
      num: 4,
      titleEn: "Generate User API Token",
      titleHi: "उपयोगकर्ता एपीआई टोकन जनरेट करें",
      descEn: "Go to your User Profile → Generate Token. Copy the generated secret bearer token.",
      descHi: "अपने यूज़र प्रोफाइल पर जाएं → Generate Token पर क्लिक करें और टोकन कॉपी करें।",
      actionText: "Profile → Generate Token",
      actionType: "text" as const,
    },
    {
      num: 5,
      titleEn: "Configure NASA_EARTHDATA_TOKEN",
      titleHi: "पर्यावरण चर NASA_EARTHDATA_TOKEN सेट करें",
      descEn: "Add your generated token to your project's .env.local file on the server.",
      descHi: "अपने प्रोजेक्ट की .env.local फ़ाइल में अपना टोकन जोड़ें।",
      actionText: "NASA_EARTHDATA_TOKEN=your_token_here",
      actionType: "copy" as const,
      copyValue: "NASA_EARTHDATA_TOKEN=",
    },
    {
      num: 6,
      titleEn: "Configure NASA_EARTHDATA_USERNAME",
      titleHi: "पर्यावरण चर NASA_EARTHDATA_USERNAME सेट करें",
      descEn: "Add your Earthdata login username to .env.local for Basic HTTP authentication.",
      descHi: "बेसिक प्रमाणीकरण हेतु .env.local में अपना यूज़रनेम जोड़ें।",
      actionText: "NASA_EARTHDATA_USERNAME=your_username",
      actionType: "copy" as const,
      copyValue: "NASA_EARTHDATA_USERNAME=",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F3D66] dark:bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {locale === "hi"
                  ? "नासा GPM IMERG उपग्रह वर्षा सेटअप"
                  : "NASA GPM IMERG Satellite Rainfall Setup"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "वास्तविक उपग्रह अवलोकनों को सक्रिय करने हेतु चरण-दर-चरण मार्गदर्शिका"
                  : "Step-by-step developer guide to activate live satellite observation"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Important Educational & Legal Notice */}
          <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                NASA Earthdata पंजीकरण पूर्णतः निःशुल्क है और शैक्षणिक एवं शोध उपयोग के लिए अनुमत है
              </p>
              <p className="text-emerald-800 dark:text-emerald-300 opacity-90">
                NASA Earthdata registration is completely free and permitted for educational and research use.
              </p>
            </div>
          </div>

          {/* Stepper list */}
          <div className="space-y-3">
            {steps.map((s) => (
              <div
                key={s.num}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="w-6 h-6 rounded-full bg-[#0F3D66] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {s.num}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {locale === "hi" ? s.titleHi : s.titleEn}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {locale === "hi" ? s.descHi : s.descEn}
                  </p>

                  {/* Action widget / copy box */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    <span className="truncate select-all">{s.actionText}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.actionType === "link" && (
                        <a
                          href={s.actionText}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 text-[11px] font-sans font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{locale === "hi" ? "खोलें" : "Open"}</span>
                        </a>
                      )}
                      {s.copyValue && (
                        <button
                          onClick={() => handleCopy(s.copyValue!, `step-${s.num}`)}
                          className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 text-[11px] font-sans font-medium"
                          title="Copy"
                        >
                          {copiedKey === `step-${s.num}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture note */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              {locale === "hi" ? "प्रणाली वास्तुकला नोट:" : "System Architecture Note:"}
            </span>
            <p>
              {locale === "hi"
                ? "टोकन केवल सर्वर-साइड (Directives #7 & #8) में उपयोग होता है। NASA GPM IMERG Late Run में लगभग 4-6 घंटे की उपग्रह विलंबता होती है।"
                : "Credentials remain strictly on the server (Directives #7 & #8). NASA GPM IMERG Late Run has approximately 4-6 hour latency for orbital data ingestion."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {locale === "hi"
              ? "कॉन्फ़िगर करने के बाद सर्वर पुनः प्रारंभ करें।"
              : "Restart the server after adding environment variables."}
          </span>
          <Button onClick={onClose} size="sm" className="bg-[#0F3D66] hover:bg-[#0c2f4f] text-white">
            {locale === "hi" ? "समझ गया / बंद करें" : "Got It / Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
