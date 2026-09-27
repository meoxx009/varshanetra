"use client";

import React from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { usePersistentCollapse } from "@/hooks/use-persistent-collapse";
import { cn } from "@/lib/utils";

export function ExperimentalMapDisclaimer({ className }: { className?: string }) {
  const { isExpanded, toggle } = usePersistentCollapse(
    "varshanetra_disclaimer_map_experimental",
    true
  );

  return (
    <Alert
      variant="warning"
      className={cn("shadow-xs transition-all duration-200 overflow-hidden", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTitle className="text-sm font-bold text-amber-950 dark:text-amber-200">
                EXPERIMENTAL SUSCEPTIBILITY MAP • प्रायोगिक संवेदनशीलता मानचित्र
              </AlertTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 uppercase tracking-wide">
                अनुमानित मॉडल • Model-Estimated
              </span>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-300 font-medium">
              यह मानचित्र मौसम और भूभाग डेटा पर आधारित अनुमानित क्षेत्रों को दर्शाता है। यह वास्तविक बाढ़ गहराई या सटीक बाढ़ सीमा की भविष्यवाणी नहीं करता।
            </p>
          </div>
        </div>

        {/* Collapsible toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isExpanded}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? "छिपाएं (Minimize)" : "विस्तार (Expand)"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <AlertDescription className="mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-900/60 space-y-2.5 text-xs text-amber-950 dark:text-amber-200">
          <p className="leading-relaxed">
            <strong className="font-semibold">Notice:</strong> This map shows estimated susceptible areas based on weather and terrain data. It does <strong className="font-bold underline decoration-amber-500">NOT</strong> predict actual flood depth or precise flood boundaries. For accurate flood mapping and ground-truthed hydrological data, refer to official CWC and ISRO flood monitoring.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
              आधिकारिक संदर्भ पोर्टल / Official Reference Portals:
            </span>
            <a
              href="https://ffs.india-water.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition"
            >
              <span>CWC Flood Forecast Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://bhuvan.nrsc.gov.in/disaster/disaster.php"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition"
            >
              <span>ISRO Bhuvan Disaster Services</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </AlertDescription>
      )}
    </Alert>
  );
}
