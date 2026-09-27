"use client";

import React from "react";
import { ExternalLink, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

interface BhuvanLinkCardProps {
  className?: string;
  compact?: boolean;
}

export function BhuvanLinkCard({ className = "", compact = false }: BhuvanLinkCardProps) {
  const locale = useLocale();

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <a
          href="https://bhuvan.nrsc.gov.in/disaster/disaster.php"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            size="sm"
            className="bg-[#0F3D66] hover:bg-[#0c3152] text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>{locale === "hi" ? "ISRO भुवन पर देखें" : "View on ISRO Bhuvan"}</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </Button>
        </a>
      </div>
    );
  }

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-linear-to-r from-blue-50/50 via-slate-50 to-orange-50/30 dark:from-slate-900 dark:to-slate-850 ${className}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#0F3D66] dark:text-blue-400">
                <Globe className="w-5 h-5 text-orange-500" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>ISRO Bhuvan (National Remote Sensing Centre - NRSC)</span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {locale === "hi" ? "निःशुल्क पहुंच" : "FREE ACCESS"}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {locale === "hi"
                    ? "भुवन पर लाइव उपग्रह चित्र और बाढ़ निगरानी उत्पाद उपलब्ध हैं"
                    : "Live satellite imagery and flood monitoring products available on Bhuvan."}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-9">
              {locale === "hi"
                ? "ISRO राष्ट्रीय सुदूर संवेदन केंद्र (NRSC) का आपदा निगरानी मंच बिना किसी पंजीकरण के वास्तविक समय के बाढ़ मानचित्र उपलब्ध कराता है।"
                : "ISRO NRSC disaster services provide official near-real-time flood inundation maps, water extent polygons, and Cartosat/Resourcesat spatial layers without requiring any login or API credentials."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {/* Primary Action: Flood & Disaster Portal */}
            <a
              href="https://bhuvan.nrsc.gov.in/disaster/disaster.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="w-full bg-[#0F3D66] hover:bg-[#0c3152] text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span>{locale === "hi" ? "ISRO भुवन पर देखें" : "View on ISRO Bhuvan"}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Button>
            </a>

            {/* Secondary Action: Main Bhuvan Portal */}
            <a
              href="https://bhuvan.nrsc.gov.in"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-medium gap-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                <span>bhuvan.nrsc.gov.in</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
