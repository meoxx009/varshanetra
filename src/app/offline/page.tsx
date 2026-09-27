"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  WifiOff,
  PhoneCall,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

const EMERGENCY_NUMBERS = [
  { serviceEn: "Police Emergency", serviceHi: "पुलिस आपातकालीन", number: "100 / 112", color: "bg-blue-50 text-blue-800 border-blue-200" },
  { serviceEn: "Fire & Rescue", serviceHi: "अग्निशमन सेवा", number: "101", color: "bg-red-50 text-red-800 border-red-200" },
  { serviceEn: "Ambulance Medical", serviceHi: "एम्बुलेंस सेवा", number: "108", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { serviceEn: "National Disaster Response (NDRF)", serviceHi: "राष्ट्रीय आपदा प्रतिक्रिया (NDRF)", number: "011-24363260", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { serviceEn: "District EOC Control Room", serviceHi: "जिला आपातकालीन परिचालन केंद्र (EOC)", number: "1077 / 020-26123371", color: "bg-purple-50 text-purple-800 border-purple-200" },
];

export default function OfflinePage() {
  const locale = useLocale();
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const onOn = () => {
        setIsOnline(true);
        setLastCheckMessage("Connection restored! You are back online.");
      };
      const onOff = () => {
        setIsOnline(false);
        setLastCheckMessage("Connection lost. Running on cached assets.");
      };
      window.addEventListener("online", onOn);
      window.addEventListener("offline", onOff);
      return () => {
        window.removeEventListener("online", onOn);
        window.removeEventListener("offline", onOff);
      };
    }
  }, []);

  const handleTestConnection = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    try {
      const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        setIsOnline(true);
        setLastCheckMessage(
          locale === "hi"
            ? "कनेक्शन पुनः स्थापित हो गया है! आप ऑनलाइन हैं।"
            : "Connection restored! You are back online."
        );
      } else {
        throw new Error();
      }
    } catch {
      setIsOnline(false);
      setLastCheckMessage(
        locale === "hi"
          ? "अभी भी कोई कनेक्शन नहीं मिला। ऑफ़लाइन मोड सक्रिय है।"
          : "Still no internet connection. Offline emergency shell active."
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-6 max-w-3xl mx-auto my-4 sm:my-8">
      <Card className="w-full border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-[#1e293b] text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-red-600/20 mx-auto flex items-center justify-center border-2 border-red-500/40 shadow-inner">
            <WifiOff className="w-10 h-10 text-red-400 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {locale === "hi" ? "आप ऑफलाइन हैं" : "You are offline"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              {locale === "hi"
                ? "इंटरनेट कनेक्शन नहीं मिला। VarshaNetra का कैश्ड डेटा उपलब्ध है।"
                : "No internet connection. VarshaNetra cached data is available."}
            </p>
          </div>

          {/* Connection Test Action */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={isChecking}
              size="sm"
              className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>
                {isChecking
                  ? locale === "hi" ? "जांच रहे हैं..." : "Checking Connection..."
                  : locale === "hi" ? "पुनः प्रयास करें (Check Connection)" : "Retry Connection"}
              </span>
            </Button>

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold text-slate-200 border-slate-700 hover:bg-slate-800 gap-1"
              >
                <span>{locale === "hi" ? "कैश्ड डैशबोर्ड पर जाएं" : "Go to Cached Dashboard"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {lastCheckMessage && (
            <p
              className={`text-xs font-semibold mt-2 px-3 py-1 rounded inline-block ${
                isOnline ? "bg-emerald-600/30 text-emerald-300" : "bg-red-600/30 text-red-300"
              }`}
            >
              {lastCheckMessage}
            </p>
          )}
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6 text-xs">
          {/* Section 1: What IS Available Offline from Cache */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
              <span>{locale === "hi" ? "ऑफ़लाइन कैश में क्या उपलब्ध है" : "What IS Available from Offline Cache"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{locale === "hi" ? "कैश्ड टेलीमेट्री एवं मैप्स" : "Cached Telemetry & Maps"}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {locale === "hi"
                    ? "पिछले 15-30 मिनटों का मौसम पूर्वानुमान, नदी गेज और ओपनस्ट्रीटमैप बेस टाइल्स कैश में सुरक्षित हैं।"
                    : "Last 15–30 minutes of weather data, river gauges, and OSM base map tiles remain visible."}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{locale === "hi" ? "ऑफ़लाइन फ़ील्ड रिपोर्ट कतार" : "Offline Report Queuing"}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {locale === "hi"
                    ? "फ़ील्ड रिपोर्ट दर्ज करें। यह IndexedDB में सुरक्षित रहेगी और इंटरनेट मिलते ही स्वतः अपलोड होगी।"
                    : "Draft field observations anytime. Stored safely in IndexedDB queue and auto-uploaded on reconnect."}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Statutory Emergency Telephone Grid (Hardcoded & Always Available) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-[#DC2626]" />
              <span>{locale === "hi" ? "वैधानिक आपातकालीन टेलीफोन नंबर (सदैव उपलब्ध)" : "Emergency Helpline Numbers (Always Available)"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {EMERGENCY_NUMBERS.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border ${item.color} flex flex-col justify-between`}
                >
                  <span className="text-[11px] font-semibold">
                    {locale === "hi" ? item.serviceHi : item.serviceEn}
                  </span>
                  <a
                    href={`tel:${item.number.replace(/[^0-9]/g, "")}`}
                    className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{item.number}</span>
                    <PhoneCall className="w-3 h-3 text-slate-500" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: SMS Reporting Instructions (When Internet is Down) */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#2563EB]" />
              <h3 className="font-bold text-xs text-blue-950 dark:text-blue-200">
                {locale === "hi"
                  ? "इंटरनेट के बिना एसएमएस रिपोर्टिंग निर्देश"
                  : "SMS Reporting Instructions (No Internet Available)"}
              </h3>
            </div>

            <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
              {locale === "hi"
                ? "यदि मोबाइल डेटा उपलब्ध नहीं है लेकिन सेलुलर नेटवर्क चालू है, तो जिला नियंत्रण कक्ष को इस प्रारूप में सामान्य एसएमएस भेजें:"
                : "If cellular data is unavailable but standard GSM voice/SMS is active, dispatch an SMS to the District Control Room using this syntax:"}
            </p>

            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono text-[11px] text-slate-900 dark:text-slate-100">
              <code>VN FLOOD &lt;LOCATION&gt; &lt;DEPTH_IN_FEET&gt; &lt;PEOPLE_STRANDED&gt;</code>
              <div className="text-[10px] text-slate-500 font-sans mt-1">
                {locale === "hi"
                  ? "उदाहरण: VN FLOOD KHADAKWASLA 3FT 15 to 112 / 1077"
                  : "Example: VN FLOOD SINHAGAD_ROAD 2FT 8 to 112 or 1077"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
