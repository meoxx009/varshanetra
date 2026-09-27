"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  Users,
  Info,
  ExternalLink,
  X,
  Loader2,
  ShieldAlert,
  Coins,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLocale } from "@/lib/i18n/context";
import { AlertItem, RecipientCategory, RecipientsCountByCategory } from "@/types";

interface SmsBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertItem;
  onBroadcastSuccess?: () => void;
}

const CATEGORY_CONFIG: Array<{
  key: RecipientCategory;
  labelEn: string;
  labelHi: string;
  color: string;
}> = [
  {
    key: "OFFICER",
    labelEn: "District Officers & SDMs",
    labelHi: "जिला अधिकारी एवं उपजिलाधिकारी",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    key: "PRADHAN",
    labelEn: "Gram Pradhans & Sarpanchs",
    labelHi: "ग्राम प्रधान एवं सरपंच",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    key: "SCHOOL_PRINCIPAL",
    labelEn: "School Principals",
    labelHi: "स्कूल प्रधानाचार्य",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    key: "HOSPITAL_ADMIN",
    labelEn: "Hospital Superintendents",
    labelHi: "अस्पताल अधीक्षक",
    color: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    key: "MEDIA",
    labelEn: "Media & Press Liaisons",
    labelHi: "मीडिया एवं जनसंपर्क",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    key: "OTHER",
    labelEn: "Field Responders & NGOs",
    labelHi: "फील्ड उत्तरदाता एवं गैर-सरकारी",
    color: "bg-slate-100 text-slate-800 border-slate-200",
  },
];

export function SmsBroadcastModal({
  isOpen,
  onClose,
  alert,
  onBroadcastSuccess,
}: SmsBroadcastModalProps) {
  const locale = useLocale();

  // Selected categories state (default: all)
  const [selectedCategories, setSelectedCategories] = useState<RecipientCategory[]>([
    "OFFICER",
    "PRADHAN",
    "SCHOOL_PRINCIPAL",
    "HOSPITAL_ADMIN",
    "MEDIA",
  ]);

  // Language tab state
  const [activeLang, setActiveLang] = useState<"en" | "hi">("en");

  // Message drafts
  const defaultMsgEn = useMemo(() => {
    return `[VarshaNetra DDMA] ${alert.severity} ALERT: ${alert.title}. ${alert.area_name}. Action: ${alert.recommended_action}. Emergency: 112`;
  }, [alert]);

  const defaultMsgHi = useMemo(() => {
    return `[वर्षानेत्र डीडीएमए] ${alert.severity === "CRITICAL" ? "अति-गंभीर" : "चेतावनी"}: ${alert.title}। क्षेत्र: ${alert.area_name}। निर्देश: ${alert.recommended_action}। आपातकालीन: 112`;
  }, [alert]);

  const [messageEn, setMessageEn] = useState<string>(defaultMsgEn);
  const [messageHi, setMessageHi] = useState<string>(defaultMsgHi);

  // Recipient counts
  const [counts, setCounts] = useState<RecipientsCountByCategory>({
    OFFICER: 0,
    PRADHAN: 0,
    SCHOOL_PRINCIPAL: 0,
    HOSPITAL_ADMIN: 0,
    MEDIA: 0,
    OTHER: 0,
    TOTAL: 0,
    ACTIVE: 0,
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState<boolean>(true);

  // Transmission state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    sent: number;
    failed: number;
    mode: string;
  } | null>(null);

  // Confirmation dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Fetch live counts
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingCounts(true);
    setErrorMessage(null);
    setSuccessResult(null);

    fetch("/api/recipients")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.counts) {
          setCounts(data.counts);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch recipient counts:", err);
      })
      .finally(() => {
        setIsLoadingCounts(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Active message & character math
  const currentMessage = activeLang === "en" ? messageEn : messageHi;
  const charLength = currentMessage.length;
  // GSM single segment is 160 chars; UTF-16 (e.g. Hindi) single segment is 70 chars
  const maxSingleSms = activeLang === "hi" ? 70 : 160;
  const segments = Math.max(1, Math.ceil(charLength / maxSingleSms));
  const isOverLength = charLength > maxSingleSms;

  // Total recipients calculated from selected categories
  const targetRecipientCount = selectedCategories.reduce((acc, cat) => {
    return acc + (counts[cat] || 0);
  }, 0);

  // Cost calculation (~₹0.20 per SMS segment)
  const COST_PER_SMS = 0.2;
  const estimatedCost = (targetRecipientCount * segments * COST_PER_SMS).toFixed(2);

  const toggleCategory = (cat: RecipientCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleAll = () => {
    if (selectedCategories.length === CATEGORY_CONFIG.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(CATEGORY_CONFIG.map((c) => c.key));
    }
  };

  // Perform broadcast
  const handleExecuteBroadcast = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/alerts/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          categories: selectedCategories,
          message: currentMessage,
          language: activeLang,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "SMS broadcast failed.");
      }

      setSuccessResult({
        sent: data.total_sent,
        failed: data.failed,
        mode: data.mode,
      });

      if (onBroadcastSuccess) {
        onBroadcastSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "SMS dispatch encountered an error.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sms-broadcast-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      >
        <Card className="w-full max-w-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 sm:my-6 max-h-[92vh] overflow-hidden flex flex-col">
          {/* Header */}
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <MessageSquare className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle id="sms-broadcast-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{locale === "hi" ? "आपातकालीन एसएमएस प्रसारण" : "Emergency SMS Broadcast"}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                      STATUS: ISSUED
                    </span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {alert.title} ({alert.area_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>

          {/* Content Body */}
          <CardContent className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* SUCCESS STATE */}
            {successResult ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-100">
                    {locale === "hi" ? "एसएमएस प्रसारण सफलतापूर्वक निष्पादित!" : "SMS Broadcast Executed Successfully!"}
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
                    {locale === "hi"
                      ? `${successResult.sent} संदेश प्रेषित किए गए (${successResult.failed} विफल)।`
                      : `${successResult.sent} messages successfully dispatched (${successResult.failed} failed).`}
                  </p>
                  {successResult.mode === "TRIAL_SIMULATED" && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded mt-2 border border-amber-200">
                      ℹ️ {locale === "hi"
                        ? "परीक्षण मोड सक्रिय: संदेश सिम्युलेट किए गए और डिलीवरी लॉग में दर्ज किए गए।"
                        : "Trial Mode Active: Messages safely simulated and recorded in SMS delivery audit log."}
                    </p>
                  )}
                </div>
                <Button
                  onClick={onClose}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  {locale === "hi" ? "पूर्ण करें" : "Done"}
                </Button>
              </div>
            ) : (
              <>
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{locale === "hi" ? "त्रुटि:" : "Error:"} </span>
                      <span>{errorMessage}</span>
                    </div>
                  </div>
                )}

                {/* Section 1: Recipient Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#0F3D66]" />
                      <span>{locale === "hi" ? "प्राप्तकर्ता श्रेणियां चुनें:" : "Select Recipient Categories:"}</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                    >
                      {selectedCategories.length === CATEGORY_CONFIG.length
                        ? (locale === "hi" ? "सभी अचयनित करें" : "Deselect All")
                        : (locale === "hi" ? "सभी चुनें" : "Select All")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORY_CONFIG.map((cat) => {
                      const isChecked = selectedCategories.includes(cat.key);
                      const count = counts[cat.key] || 0;

                      return (
                        <label
                          key={cat.key}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition select-none ${
                            isChecked
                              ? "border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCategory(cat.key)}
                              className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {locale === "hi" ? cat.labelHi : cat.labelEn}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}
                          >
                            {isLoadingCounts ? "..." : `${count}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Bilingual Message Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>{locale === "hi" ? "एसएमएस संदेश प्रारूप:" : "SMS Message Content:"}</span>
                    </label>

                    {/* Language Switcher Tabs */}
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setActiveLang("en")}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition ${
                          activeLang === "en"
                            ? "bg-white dark:bg-slate-900 text-[#0F3D66] dark:text-blue-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLang("hi")}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition ${
                          activeLang === "hi"
                            ? "bg-white dark:bg-slate-900 text-[#0F3D66] dark:text-blue-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        हिन्दी (Hindi)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={4}
                      value={activeLang === "en" ? messageEn : messageHi}
                      onChange={(e) =>
                        activeLang === "en"
                          ? setMessageEn(e.target.value)
                          : setMessageHi(e.target.value)
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans text-xs focus:ring-2 focus:ring-[#2563EB] focus:outline-hidden"
                      placeholder="Enter emergency SMS alert text..."
                    />
                  </div>

                  {/* Character Counter & Segment Indicator */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-1">
                    <div className="flex items-center gap-2">
                      <span className={isOverLength ? "font-bold text-amber-600 dark:text-amber-400" : ""}>
                        {charLength} / {maxSingleSms} chars
                      </span>
                      {segments > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px]">
                          {segments} SMS segments
                        </span>
                      )}
                    </div>
                    {isOverLength && (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {locale === "hi"
                          ? "संदेश 160 अक्षरों से अधिक है (अतिरिक्त सेगमेंट)"
                          : "Message exceeds standard segment limit"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 3: Summary & Cost Calculation Box */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-slate-500 font-medium">
                      {locale === "hi" ? "लक्षित प्राप्तकर्ता:" : "Target Recipients:"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <PhoneCall className="w-4 h-4 text-[#2563EB]" />
                      <span>{targetRecipientCount} mobile numbers</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:text-right">
                    <div className="text-slate-500 font-medium flex items-center sm:justify-end gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>{locale === "hi" ? "अनुमानित लागत (@ ₹0.20/SMS):" : "Estimated Cost (@ ₹0.20/SMS):"}</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      ₹{estimatedCost} INR
                      <span className="text-[10px] text-slate-500 font-sans font-normal ml-1">
                        ({targetRecipientCount * segments} total segments)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Mandatory Notices (Free Tier & NIC Gateway) */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {/* Notice 1: Twilio Trial Account notice */}
                  <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        वर्तमान में Twilio परीक्षण खाते का उपयोग हो रहा है। उत्पादन में NIC SMS गेटवे या राज्य SMS सेवा का उपयोग किया जाएगा।
                      </div>
                      <div className="text-blue-700/80 dark:text-blue-300/80">
                        Currently using Twilio trial account. Production will use NIC SMS Gateway or State SMS service.
                      </div>
                    </div>
                  </div>

                  {/* Notice 2: NIC SMS Gateway info */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-0.5 flex-1">
                      <div>
                        NIC SMS Gateway सरकारी विभागों के लिए निःशुल्क उपलब्ध है। अधिक जानकारी:{" "}
                        <a
                          href="https://nicgw.gov.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-0.5"
                        >
                          nicgw.gov.in <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="text-emerald-700/80 dark:text-emerald-300/80">
                        NIC SMS Gateway is free for government departments. More info: nicgw.gov.in
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>

          {/* Footer Actions */}
          {!successResult && (
            <CardFooter className="pt-3 pb-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSending}
                className="text-xs font-semibold"
              >
                {locale === "hi" ? "रद्द करें" : "Cancel"}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isSending || targetRecipientCount === 0 || !currentMessage.trim()}
                className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{locale === "hi" ? "प्रसारण प्रगति पर है..." : "Broadcasting SMS..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {locale === "hi"
                        ? `एसएमएस भेजें (${targetRecipientCount})`
                        : `Broadcast SMS (${targetRecipientCount})`}
                    </span>
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Confirmation Step Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={locale === "hi" ? "आपातकालीन एसएमएस प्रसारण पुष्टि" : "Confirm Emergency SMS Broadcast"}
        description={
          <div className="space-y-2 text-xs">
            <p>
              {locale === "hi"
                ? `क्या आप वास्तव में ${targetRecipientCount} प्राप्तकर्ताओं को यह आपातकालीन चेतावनी एसएमएस प्रसारित करना चाहते हैं?`
                : `Are you sure you want to broadcast this emergency alert via SMS to ${targetRecipientCount} verified district recipients?`}
            </p>
            <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
              &quot;{currentMessage.slice(0, 100)}...&quot;
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
              ⚠️ {locale === "hi" ? "अनुमानित कुल लागत:" : "Estimated Total Cost:"} ₹{estimatedCost} INR
            </p>
          </div>
        }
        confirmLabel={locale === "hi" ? "हाँ, एसएमएस प्रसारित करें" : "Yes, Broadcast SMS"}
        variant="destructive"
        onConfirm={handleExecuteBroadcast}
      />
    </>
  );
}
