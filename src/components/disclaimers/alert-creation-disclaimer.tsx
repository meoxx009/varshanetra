"use client";

import React from "react";
import { Scale, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { usePersistentCollapse } from "@/hooks/use-persistent-collapse";
import { cn } from "@/lib/utils";

export function AlertCreationDisclaimer({ className }: { className?: string }) {
  const { isExpanded, toggle } = usePersistentCollapse(
    "varshanetra_disclaimer_alert_creation",
    true
  );

  return (
    <Alert
      variant="warning"
      className={cn("shadow-xs transition-all duration-200 overflow-hidden", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Scale className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTitle className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <span>संवैधानिक कानूनी प्रोटोकॉल • STATUTORY PROTOCOL</span>
              </AlertTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 uppercase tracking-wide">
                DM Act 2005 § 34
              </span>
            </div>
            <p className="text-xs text-amber-950 dark:text-amber-200 font-semibold leading-relaxed">
              चेतावनी जारी करने से पहले: VarshaNetra जोखिम मूल्यांकन एक सहायक उपकरण है। आधिकारिक निकासी आदेश जिला मजिस्ट्रेट के अनुमोदन से ही जारी करें।
            </p>
          </div>
        </div>

        {/* Collapsible Toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isExpanded}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-amber-900 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 transition shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? "छिपाएं (Minimize)" : "विस्तार (Expand)"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <AlertDescription className="mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-900/60 space-y-2 text-xs text-amber-950 dark:text-amber-200">
          <p className="leading-relaxed">
            <strong className="font-semibold">Before issuing an alert:</strong> VarshaNetra risk assessment is an automated decision-support tool. Official public warnings and evacuation directives must be formally authorized by the District Magistrate / District Disaster Management Authority (DDMA) Chairperson in accordance with statutory powers under the{" "}
            <strong className="font-bold underline decoration-amber-600">Disaster Management Act 2005 (Section 34)</strong>.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-amber-900/90 dark:text-amber-300/90 bg-amber-100/70 dark:bg-amber-950/40 p-2 rounded border border-amber-200/80 dark:border-amber-900/50 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Mandatory EOC Verification: Verify automated thresholds against field ground reports and SDM situational intelligence before dispatching sirens or broadcast SMS.
            </span>
          </div>
        </AlertDescription>
      )}
    </Alert>
  );
}
