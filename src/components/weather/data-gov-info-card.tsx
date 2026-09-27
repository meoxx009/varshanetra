"use client";

import React from "react";
import { ExternalLink, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

export function DataGovInfoCard() {
  const locale = useLocale();

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {locale === "hi"
                  ? "ऐतिहासिक वर्षा डेटा और IMD वार्षिक रिपोर्ट data.gov.in पर उपलब्ध हैं"
                  : "Historical rainfall data and IMD Annual Reports are available on data.gov.in"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "भारत सरकार के ओपन गवर्नमेंट डेटा (OGD) प्लेटफॉर्म से 50+ वर्षों के जिला स्तर के वर्षा आंकड़े और मोनोग्राफ डाउनलोड करें।"
                  : "Access 50+ years of district-level rain gauges and annual meteorological monographs via Open Government Data (OGD) Platform India."}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {locale === "hi"
                    ? "यह डेटा जोखिम मॉडल सत्यापन के लिए उपयोग किया जाएगा"
                    : "This data will be used for risk model validation"}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 sm:self-center">
            <a
              href="https://data.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open data.gov.in portal in a new tab"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
            >
              <span>data.gov.in</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
