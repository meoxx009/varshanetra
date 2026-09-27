"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Clock,
  MapPin,
  Waves,
  Truck,
  Ambulance,
  Flame,
  LifeBuoy,
  Send,
  X,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { formatSeverity } from "@/lib/i18n/formatters";
import { IncidentItem, Resource } from "@/types";
import { cn } from "@/lib/utils";

export interface PriorityScoredIncident {
  incident: IncidentItem;
  priorityScore: number;
  priorityLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendation: {
    labelHi: string;
    labelEn: string;
    variant: "blue" | "yellow" | "red" | "orange" | "gray";
    icon: React.ReactNode;
  };
  timeElapsedHours: number;
  timeFormatted: string;
}

interface ResourcePriorityQueueProps {
  incidents: IncidentItem[];
  resources: Resource[];
  districtName?: string;
  onDeployIncident?: (incident: IncidentItem) => void;
  onViewTimeline?: (incident: IncidentItem) => void;
  className?: string;
}

// 1. Calculate Priority Score (Frontend JS strictly out of 80 max)
export function calculateIncidentPriorityScore(incident: IncidentItem): {
  score: number;
  timeHours: number;
} {
  let score = 0;

  // Severity Points
  const sev = String(incident.severity).toUpperCase();
  if (sev === "CRITICAL") {
    score += 40;
  } else if (sev === "HIGH" || sev === "ALERT") {
    score += 25;
  } else if (sev === "MODERATE" || sev === "ADVISORY") {
    score += 10;
  } else if (sev === "LOW" || sev === "NORMAL") {
    score += 0;
  }

  // Time Elapsed Points (5 points per hour, up to 25 max)
  const reportedTime = new Date(incident.created_at).getTime();
  const now = Date.now();
  const timeHours = Math.max(0, (now - reportedTime) / (1000 * 60 * 60));
  const timePoints = Math.min(25, Math.floor(timeHours) * 5);
  score += timePoints;

  // Keyword Bonus Points
  const searchCorpus = `${incident.type} ${incident.title} ${incident.description}`.toLowerCase();
  if (
    searchCorpus.includes("stranded") ||
    searchCorpus.includes("rescue") ||
    searchCorpus.includes("life")
  ) {
    score += 15;
  }

  if (searchCorpus.includes("medical") || searchCorpus.includes("hospital")) {
    score += 10;
  }

  // Total score capped at 80 maximum
  return {
    score: Math.min(80, Math.max(0, score)),
    timeHours,
  };
}

// 2. Resource Recommendation based on type
export function getResourceRecommendation(incident: IncidentItem): {
  labelHi: string;
  labelEn: string;
  variant: "blue" | "yellow" | "red" | "orange" | "gray";
  icon: React.ReactNode;
} {
  const typeText = `${incident.type} ${incident.title}`.toLowerCase();

  if (
    typeText.includes("waterlog") ||
    typeText.includes("flood") ||
    typeText.includes("stranded") ||
    typeText.includes("river")
  ) {
    return {
      labelHi: "नाव + SDRF दल अनुशंसित",
      labelEn: "Boats + SDRF Team Recommended",
      variant: "blue",
      icon: <Waves className="w-3.5 h-3.5" />,
    };
  }

  if (typeText.includes("road") || typeText.includes("bridge") || typeText.includes("culvert")) {
    return {
      labelHi: "PWD + पुलिस अनुशंसित",
      labelEn: "PWD + Police Recommended",
      variant: "yellow",
      icon: <Truck className="w-3.5 h-3.5" />,
    };
  }

  if (
    typeText.includes("medical") ||
    typeText.includes("hospital") ||
    typeText.includes("health") ||
    typeText.includes("injury")
  ) {
    return {
      labelHi: "एम्बुलेंस + चिकित्सा दल",
      labelEn: "Ambulance + Medical Team",
      variant: "red",
      icon: <Ambulance className="w-3.5 h-3.5" />,
    };
  }

  if (typeText.includes("fire") || typeText.includes("gas") || typeText.includes("hazard")) {
    return {
      labelHi: "अग्निशमन",
      labelEn: "Fire Brigade",
      variant: "orange",
      icon: <Flame className="w-3.5 h-3.5" />,
    };
  }

  return {
    labelHi: "सामान्य प्रतिक्रिया",
    labelEn: "General Response",
    variant: "gray",
    icon: <LifeBuoy className="w-3.5 h-3.5" />,
  };
}

export function ResourcePriorityQueue({
  incidents,
  resources,
  districtName = "District Headquarters",
  onDeployIncident,
  onViewTimeline,
  className,
}: ResourcePriorityQueueProps) {
  const locale = useLocale();

  // State Requisition Modal
  const [isRequisitionOpen, setIsRequisitionOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Compute prioritized list
  const scoredIncidents: PriorityScoredIncident[] = useMemo(() => {
    // Only prioritize unresolved/open/responding incidents
    const active = incidents.filter(
      (inc) => inc.status !== "RESOLVED" && inc.status !== "CLOSED"
    );

    return active
      .map((incident) => {
        const { score, timeHours } = calculateIncidentPriorityScore(incident);

        let priorityLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
        if (score > 60) priorityLevel = "CRITICAL";
        else if (score >= 40) priorityLevel = "HIGH";
        else if (score >= 20) priorityLevel = "MEDIUM";

        // Time format
        let timeFormatted = `${Math.floor(timeHours)}h ago`;
        if (timeHours < 1) {
          timeFormatted = `${Math.max(1, Math.round(timeHours * 60))}m ago`;
        }

        return {
          incident,
          priorityScore: score,
          priorityLevel,
          recommendation: getResourceRecommendation(incident),
          timeElapsedHours: timeHours,
          timeFormatted,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [incidents]);

  // RESOURCE GAP AUDIT
  const criticalHighCount = useMemo(() => {
    return scoredIncidents.filter(
      (item) => item.priorityLevel === "CRITICAL" || item.priorityLevel === "HIGH"
    ).length;
  }, [scoredIncidents]);

  const availableBoatsCount = useMemo(() => {
    const boatResources = resources.filter(
      (r) =>
        r.type === "Boat" ||
        r.name.toLowerCase().includes("boat") ||
        r.name.toLowerCase().includes("नाव")
    );
    return boatResources.reduce((sum, r) => sum + (r.available_quantity || 0), 0);
  }, [resources]);

  // Shortage condition: critical/high count exceeds available boats (and > 0 critical incidents)
  const isShortage = criticalHighCount > availableBoatsCount;

  // Pre-filled state requisition message template
  const requisitionMessage = useMemo(() => {
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    return `URGENT RELIEF REQUISITION - DISTRICT DISASTER MANAGEMENT AUTHORITY (${districtName.toUpperCase()})
Date/Time: ${timestamp}
To: State Emergency Operations Centre (SEOC) & SDRF Headquarters
Subject: Immediate Allocation of Additional Flood Rescue Boats & Battalion Support

Situational Summary:
• Active Critical/High Priority Flood Incidents: ${criticalHighCount}
• Currently Available District Inflatable Boats: ${availableBoatsCount}
• Deficit / Immediate Gap: ${Math.max(1, criticalHighCount - availableBoatsCount)} Units

Action Requested:
1. Dispatch 1x SDRF Flood Rescue Column with OBM motorboats immediately.
2. Direct adjacent district water-safety equipment to staging area.

Authorized as per DM Act 2005 Section 34 Emergency Powers.
EOC Duty Magistrate, ${districtName}`;
  }, [districtName, criticalHighCount, availableBoatsCount]);

  const handleCopyRequisition = async () => {
    try {
      await navigator.clipboard.writeText(requisitionMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <Card className={cn("border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden", className)}>
      {/* SECTION HEADER */}
      <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                <span>संसाधन प्राथमिकता सूची • Resource Priority Queue</span>
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0F3D66] dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wide">
                स्मार्ट निर्णय समर्थन
              </span>
            </div>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              प्राथमिकता स्वचालित रूप से गंभीरता और समय के आधार पर निर्धारित की जाती है • Priority automatically determined by severity and time elapsed.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>यह सुझावात्मक है, अंतिम निर्णय अधिकारी का होगा (Advisory)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* ============================================================= */}
        {/* RESOURCE GAP ALERT BOX                                        */}
        {/* ============================================================= */}
        {isShortage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 flex items-center justify-between flex-wrap gap-3 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-red-950 dark:text-red-200 tracking-wide uppercase">
                    संसाधन की कमी • RESOURCE SHORTAGE
                  </span>
                </div>
                <p className="text-xs text-red-900 dark:text-red-300 font-semibold">
                  {criticalHighCount} गंभीर घटनाएं, {availableBoatsCount} नावें उपलब्ध
                  <span className="block text-[11px] text-red-800/90 dark:text-red-400 font-normal">
                    {criticalHighCount} critical incidents but only {availableBoatsCount} boats available in district inventory.
                  </span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsRequisitionOpen(true)}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 min-h-[38px] px-3.5 shadow-sm cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>राज्य से संसाधन अनुरोध • Request Resources from State</span>
            </Button>
          </div>
        )}

        {/* ============================================================= */}
        {/* PRIORITIZED INCIDENTS LIST                                    */}
        {/* ============================================================= */}
        {scoredIncidents.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <Check className="w-8 h-8 text-emerald-600 mx-auto" />
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
              {locale === "hi" ? "कोई सक्रिय गंभीर घटना लंबित नहीं है" : "No Active Distress Incidents in Queue"}
            </span>
            <p className="text-xs text-slate-500">
              {locale === "hi"
                ? "सभी आपातकालीन टिकट आवंटित या हल कर दिए गए हैं।"
                : "All emergency reports are assigned or resolved."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {scoredIncidents.map((item, index) => {
              const rank = index + 1;
              const { incident, priorityScore, priorityLevel, recommendation, timeFormatted } = item;

              // Recommendation variant colors
              const recColorClass =
                recommendation.variant === "blue"
                  ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  : recommendation.variant === "yellow"
                  ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
                  : recommendation.variant === "red"
                  ? "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
                  : recommendation.variant === "orange"
                  ? "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

              // Priority badge colors
              const badgeClass =
                priorityLevel === "CRITICAL"
                  ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                  : priorityLevel === "HIGH"
                  ? "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800"
                  : priorityLevel === "MEDIUM"
                  ? "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";

              return (
                <div
                  key={incident.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between flex-wrap sm:flex-nowrap gap-3.5 shadow-2xs"
                >
                  {/* Left: Rank & Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Rank Number */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0",
                        rank === 1
                          ? "bg-red-600 text-white shadow-xs"
                          : rank === 2
                          ? "bg-orange-500 text-white"
                          : rank === 3
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                      )}
                    >
                      #{rank}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Meta Line: Badges & Ticket # */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10.5px] font-bold border uppercase tracking-wider",
                            badgeClass
                          )}
                        >
                          {formatSeverity(priorityLevel, locale)} ({priorityScore}/80)
                        </span>

                        {/* Ticket Number */}
                        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {incident.incident_number}
                        </span>

                        {/* Reported Time */}
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeFormatted}</span>
                        </span>
                      </div>

                      {/* Incident Title & Type */}
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                        {onViewTimeline ? (
                          <button
                            type="button"
                            onClick={() => onViewTimeline(incident)}
                            className="hover:text-[#2563EB] dark:hover:text-blue-400 text-left transition truncate cursor-pointer"
                            title={locale === "hi" ? "समयरेखा एवं विवरण देखें" : "View Timeline & Details"}
                          >
                            {incident.title}
                          </button>
                        ) : (
                          <span>{incident.title}</span>
                        )}
                      </div>

                      {/* Location & Recommendation Tag */}
                      <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{incident.location_name}</span>
                        </span>

                        {/* Recommendation Tag */}
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold",
                            recColorClass
                          )}
                        >
                          {recommendation.icon}
                          <span>
                            {recommendation.labelEn}
                            <span className="opacity-80 text-[10px] ml-1">({recommendation.labelHi})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Deploy Action & Timeline */}
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    {onViewTimeline && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewTimeline(incident)}
                        className="text-xs min-h-[36px] px-2.5 flex items-center gap-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title={locale === "hi" ? "घटना समयरेखा एवं विवरण" : "Incident Timeline & Details"}
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">{locale === "hi" ? "समयरेखा" : "Timeline"}</span>
                      </Button>
                    )}
                    {onDeployIncident ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onDeployIncident(incident)}
                        className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs min-h-[36px] px-3.5 shadow-xs cursor-pointer"
                      >
                        <span>तैनात करें • Deploy</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Link
                        href={`/resources?incidentId=${incident.id}&area=${encodeURIComponent(incident.location_name)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs shadow-xs min-h-[36px] transition cursor-pointer"
                      >
                        <span>तैनात करें • Deploy</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* ============================================================= */}
      {/* STATE REQUISITION MODAL                                       */}
      {/* ============================================================= */}
      {isRequisitionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50/70 dark:bg-red-950/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    राज्य से संसाधन अनुरोध • State Resource Requisition
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Disaster Management Act 2005 § 34 Statutory Mutual Aid Protocol
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequisitionOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                This official dispatch requisition has been automatically synthesized from live district distress metrics. It can be directly transmitted to the State Emergency Operations Centre (SEOC) and SDRF Commandant.
              </p>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] whitespace-pre-wrap text-slate-800 dark:text-slate-200 max-h-[220px] overflow-y-auto select-all">
                {requisitionMessage}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRequisition}
                  className="gap-1.5 font-semibold text-xs min-h-[40px]"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? "प्रतिलिपि बनाई गई (Copied)" : "पाठ कॉपी करें (Copy Draft)"}</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRequisitionOpen(false)}
                    className="text-xs min-h-[40px]"
                  >
                    बंद करें (Close)
                  </Button>
                  <a
                    href={`mailto:seoc.maharashtra@gov.in?subject=${encodeURIComponent(
                      `URGENT RELIEF REQUISITION - ${districtName}`
                    )}&body=${encodeURIComponent(requisitionMessage)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs min-h-[40px] shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ईमेल से प्रेषित करें (Dispatch Email)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
