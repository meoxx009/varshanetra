"use client";

import React, { useState } from "react";
import { FileCode, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { downloadCapXmlFile, CAP_XML_NOTICE } from "@/lib/services/cap-xml";
import { AlertItem } from "@/types";

interface CapXmlExportButtonProps {
  alert: AlertItem;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
  className?: string;
}

export function CapXmlExportButton({
  alert,
  size = "sm",
  variant = "outline",
  className = "",
}: CapXmlExportButtonProps) {
  const locale = useLocale();
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [showNotice, setShowNotice] = useState<boolean>(false);

  const handleDownload = () => {
    downloadCapXmlFile(alert, "District Emergency Operations Center", locale === "hi" ? "hi-IN" : "en-IN");
    setDownloaded(true);
    setShowNotice(true);
    setTimeout(() => {
      setDownloaded(false);
    }, 2500);
    setTimeout(() => {
      setShowNotice(false);
    }, 6000);
  };

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleDownload}
        variant={variant}
        size={size}
        className={`text-xs font-semibold gap-1 ${className}`}
        title={locale === "hi" ? "CAP v1.2 XML प्रारूप निर्यात करें" : "Export CAP v1.2 XML file"}
      >
        {downloaded ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 dark:text-emerald-400">
              {locale === "hi" ? "डाउनलोड पूर्ण" : "Exported XML"}
            </span>
          </>
        ) : (
          <>
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>{locale === "hi" ? "CAP XML निर्यात" : "Export CAP XML"}</span>
          </>
        )}
      </Button>

      {/* Standard Compliance Notice Toast / Tooltip */}
      {showNotice && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 bottom-full mb-2 w-72 p-2.5 rounded-lg bg-slate-900 text-white text-[11px] leading-tight shadow-xl z-50 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-100">
                {locale === "hi" ? CAP_XML_NOTICE.hi : CAP_XML_NOTICE.en}
              </p>
              <p className="text-slate-400 text-[10px] mt-1">OASIS CAP v1.2 Interoperability Standard</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
