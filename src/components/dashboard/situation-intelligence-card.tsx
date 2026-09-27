"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Clock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SituationIntelligenceReport } from "@/types/situation-intelligence";
import { SeverityLevel } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";
import { formatSeverity } from "@/lib/i18n/formatters";

interface SituationIntelligenceCardProps {
  latitude: number;
  longitude: number;
  districtName?: string;
  className?: string;
}

export function SituationIntelligenceCard({
  latitude,
  longitude,
  districtName = "Selected District",
  className = "",
}: SituationIntelligenceCardProps) {
  const locale = useLocale();
  const [report, setReport] = useState<SituationIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        district: districtName,
      });

      const res = await fetch(`/api/situation-intelligence?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to generate situation intelligence`);
      }

      const json = await res.json();
      if (!json.success || !json.report) {
        throw new Error(json.error || "Malformed situation intelligence response");
      }

      setReport(json.report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate situation briefing";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, districtName]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleCopy = async () => {
    if (!report) return;
    try {
      const textToCopy = `[VARSHANETRA SITUATION BRIEFING - ${districtName.toUpperCase()}]
${report.summaryParagraph}

Generated: ${formatDateTime(report.generatedAt)} | Severity: ${report.overallSeverity}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            {formatSeverity("CRITICAL", locale)}
          </span>
        );
      case "ALERT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            {formatSeverity("ALERT", locale)}
          </span>
        );
      case "ADVISORY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {formatSeverity("ADVISORY", locale)}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {formatSeverity("NORMAL", locale)}
          </span>
        );
    }
  };

  return (
    <Card className={`border-slate-200 dark:border-slate-800 bg-linear-to-br from-white via-slate-50/50 to-blue-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/20 shadow-xs ${className}`}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0F3D66] text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  {locale === "hi" ? "स्थिति सारांश" : "Situation Summary"}
                </CardTitle>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                  {locale === "hi" ? "स्वचालित विश्लेषण" : "Automated Analysis"}
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? "लाइव टेलीमेट्री, स्थानिक परतों और आधिकारिक लॉग से संकलित परिचालन सारांश।"
                  : "Operational synthesis derived from live telemetry, spatial layers & official logs."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {report && getSeverityBadge(report.overallSeverity)}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
              className="text-xs h-8 gap-1.5 border-slate-200 dark:border-slate-700"
              title="Re-synthesize situation report"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="p-6 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 pt-2" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchReport} className="text-xs h-7">
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </Button>
          </div>
        )}

        {/* Success State */}
        {!loading && !error && report && (
          <>
            {/* Primary Executive Summary Paragraph */}
            <div className="relative p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {locale === "hi" ? (report.summaryParagraphHi || report.summaryParagraph) : report.summaryParagraph}
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 h-8 gap-1.5 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  title="Copy Situation Briefing for WhatsApp / EOC Radio Dispatch"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {locale === "hi" ? "कॉपी हो गया" : "Copied"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">
                        {locale === "hi" ? "कॉपी करें" : "Copy Brief"}
                      </span>
                    </>
                  )}
                </Button>
              </div>

              {/* Operational Synthesis Context Bar */}
              <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {locale === "hi" ? "जोखिम में बुनियादी ढांचा" : "Critical Facilities Exposed"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {report.keyStatistics.exposedInfrastructureCount} {locale === "hi" ? "संस्थान" : "Facilities"}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {locale === "hi" ? "अधिसूचना प्रसारण स्थिति" : "Statutory Advisory Status"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {report.keyStatistics.issuedAlertsCount > 0
                      ? `${report.keyStatistics.issuedAlertsCount} ${locale === "hi" ? "अलर्ट प्रसारित" : "Broadcasts Active"}`
                      : (locale === "hi" ? "सामान्य (सुरक्षित)" : "Baseline Normal")}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Recommended Actions */}
            {report.considerations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    {locale === "hi" ? "अनुशंसित कार्रवाइयां" : "Recommended Actions"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {locale === "hi" ? "जिला प्रोटोकॉल" : "District Protocol"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {report.considerations.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              c.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                                : c.priority === "MEDIUM"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {c.priority} {locale === "hi" ? "प्राथमिकता" : "PRIORITY"}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {locale === "hi" ? (c.suggestionHi || c.suggestion) : c.suggestion}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {locale === "hi" ? (c.rationaleHi || c.rationale) : c.rationale}
                        </p>
                      </div>

                      {c.deepLink && (
                        <Link
                          href={c.deepLink}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition mt-2 self-start"
                        >
                          <span>{locale === "hi" ? "विवरण देखें" : "View Details"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why? / Underlying Data Sources Audit Expander */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  {locale === "hi"
                    ? `इसकी वजह क्या है? (${report.statements.length} कारक)`
                    : `Why am I seeing this? (${report.statements.length} Factors)`}
                </span>
                {showEvidence ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>

              {showEvidence && (
                <div className="mt-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    <span>{locale === "hi" ? "विश्लेषण कारक" : "Analysis Factors"}</span>
                    <span>{locale === "hi" ? "सटीक डेटाबेस टेलीमेट्री देखने के लिए किसी भी कारक पर क्लिक करें" : "Click any factor to inspect exact database telemetry"}</span>
                  </div>

                  <div className="space-y-2">
                    {report.statements.map((stmt) => (
                      <div
                        key={stmt.id}
                        className={`p-2.5 rounded-lg border transition cursor-pointer ${
                          selectedStatementId === stmt.id
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800"
                            : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50"
                        }`}
                        onClick={() =>
                          setSelectedStatementId(selectedStatementId === stmt.id ? null : stmt.id)
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5">
                              {stmt.topic}
                            </span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug">
                              {locale === "hi" ? (stmt.textHi || stmt.text) : stmt.text}
                            </p>
                          </div>
                          <span className="text-[10px] text-blue-600 font-semibold shrink-0">
                            {selectedStatementId === stmt.id
                              ? (locale === "hi" ? "साक्ष्य छिपाएँ" : "Hide Evidence")
                              : (locale === "hi" ? "क्यों?" : "Why?")}
                          </span>
                        </div>

                        {/* Expandable Evidence Drawer */}
                        {selectedStatementId === stmt.id && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                            <span className="font-bold text-slate-600 dark:text-slate-400 block">
                              {locale === "hi" ? "ट्रैसेबल साक्ष्य एवं स्रोत रिकॉर्ड:" : "Traceable Evidence & Source Records:"}
                            </span>
                            {stmt.evidence.length === 0 ? (
                              <p className="text-slate-400 italic">
                                {locale === "hi" ? "कोई सीधा रिकॉर्ड लिंक नहीं है।" : "No direct records linked."}
                              </p>
                            ) : (
                              stmt.evidence.map((ev, i) => (
                                <div
                                  key={i}
                                  className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-2"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {ev.label}
                                    </span>
                                    <span className="text-slate-400 mx-1.5">•</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                                      {ev.value}
                                    </span>
                                    {ev.details && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">{ev.details}</p>
                                    )}
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                      {locale === "hi" ? "प्रदाता:" : "Provider:"} {ev.sourceTableOrProvider}
                                    </p>
                                  </div>

                                  {ev.deepLink && (
                                    <Link
                                      href={ev.deepLink}
                                      className="text-[10px] font-semibold text-blue-600 hover:underline shrink-0 flex items-center gap-0.5"
                                    >
                                      <span>{locale === "hi" ? "अभिलेख" : "Record"}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Telemetry Providers Audit Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span suppressHydrationWarning>
                      Generated: {formatDateTime(report.generatedAt)} ({report.dataSourcesQueried.length} live feeds queried)
                    </span>
                    <Link href="/situation" className="text-blue-600 font-semibold hover:underline">
                      Open Dedicated Situation Console →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
