"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Megaphone,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  FileText,
  Lock,
  Building2,
  Compass,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useLocale } from "@/lib/i18n/context";

export default function LandingPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. GOVERNMENT-GRADE TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Descriptor */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-[#0F3D66] rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-black text-base sm:text-lg tracking-tight text-[#0F3D66] dark:text-white">
                VARSHA<span className="text-[#2563EB]">NETRA</span>
              </span>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                {locale === "hi"
                  ? "बाढ़ पूर्व चेतावनी एवं आसूचना"
                  : "Flood Early Warning & Intelligence"}
              </p>
            </div>
          </Link>

          {/* Right Controls: Language Switcher, Theme Toggle, Quick Helpline */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <a
              href="tel:112"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold transition hover:bg-red-100 dark:hover:bg-red-900/80"
              title={locale === "hi" ? "राष्ट्रीय आपातकालीन नंबर 112" : "National Emergency Helpline 112"}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>112</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. COMPACT HERO SECTION */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0F3D66] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>
              {locale === "hi"
                ? "जिला आपदा प्रबंधन निर्णय सहायता प्रणाली • वर्षानेत्र"
                : "District Disaster Management Decision Support • VarshaNetra"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F3D66] dark:text-white tracking-tight">
            VARSHA<span className="text-[#2563EB]">NETRA</span>
          </h1>

          <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
            {locale === "hi"
              ? "बाढ़ पूर्व चेतावनी एवं निर्णय सहायता प्रणाली"
              : "Flood Early Warning & Decision Support System"}
          </p>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase">
            {locale === "hi"
              ? "पूर्व चेतावनी। स्पष्ट मार्गदर्शन। सुरक्षित निर्णय।"
              : "Early Warning. Clear Guidance. Safer Decisions."}
          </p>
        </div>
      </section>

      {/* 3. PRIMARY ENTRY CARDS (BALANCED TWO-PATH ARCHITECTURE) */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-12 flex-1">
        <div>
          <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "अपना प्रवेश मार्ग चुनें" : "Select Your Portal Access"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {locale === "hi"
                ? "सरकारी आपदा प्रबंधन अधिकारियों और नागरिकों के लिए समर्पित पृथक पोर्टल।"
                : "Dedicated gateways for authorized emergency responders and public citizens."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {/* PATH 1: GOVERNMENT LOGIN CARD */}
            <Card className="flex flex-col justify-between border-slate-300 dark:border-slate-800 hover:border-[#0F3D66] dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md bg-white dark:bg-slate-900 relative overflow-hidden">
              <div className="h-1.5 w-full bg-[#0F3D66] dark:bg-blue-600" />
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0F3D66] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>{locale === "hi" ? "लॉगिन आवश्यक" : "LOGIN REQUIRED"}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {locale === "hi" ? "सरकारी अधिकारी लॉगिन" : "Government Login"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {locale === "hi"
                      ? "ज़िला प्रशासन, डीडीएमए, ईओसी, एसडीआरएफ एवं त्वरित प्रतिक्रिया दलों हेतु सुरक्षित पहुंच।"
                      : "Secure access for district administration, DDMA, EOC, SDRF, and response teams."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {locale === "hi"
                    ? "अधिकृत सरकारी उपयोगकर्ताओं हेतु सुरक्षित परिचालन पहुंच।"
                    : "Secure operational access for authorized government users."}
                </p>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "ज़िला आपातकालीन परिचालन केंद्र (EOC) कमांड बोर्ड" : "District EOC & Incident Command Center"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "लाइव डॉपलर रडार, सैटेलाइट एवं जलभराव आसूचना" : "Live Doppler Radar & Inundation Intelligence"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "आपदा प्रतिक्रिया दल, संसाधन एवं आश्रय स्थल प्रबंधन" : "Response Teams, Resource Deployment & Shelters"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#0F3D66] dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "एनडीएमए-अनुरूप बहुभाषी चेतावनी व एसएमएस प्रेषण" : "NDMA-Compliant Multilingual Alert Dispatches"}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-sm transition shadow-sm hover:shadow group focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#0F3D66]"
                  >
                    <span>{locale === "hi" ? "सरकारी लॉगिन करें" : "Government Login"}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <p className="text-[11px] text-center text-slate-400">
                    {locale === "hi"
                      ? "केवल अधिकृत कर्मियों हेतु • सुरक्षित क्रेडेंशियल्स"
                      : "Authorized personnel only • Protected credentials"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* PATH 2: PUBLIC INFORMATION CARD */}
            <Card className="flex flex-col justify-between border-slate-300 dark:border-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md bg-white dark:bg-slate-900 relative overflow-hidden">
              <div className="h-1.5 w-full bg-emerald-600 dark:bg-emerald-500" />
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{locale === "hi" ? "लॉगिन की आवश्यकता नहीं" : "NO LOGIN REQUIRED"}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {locale === "hi" ? "नागरिक सूचना पोर्टल" : "Public Information"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {locale === "hi"
                      ? "मौसम, आधिकारिक चेतावनी, बाढ़ सुरक्षा निर्देश और आपातकालीन हेल्पलाइन देखें।"
                      : "Check weather, alerts, safety guidance and emergency contacts."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-0 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {locale === "hi"
                    ? "स्थानीय मौसम, सक्रिय चेतावनी, सुरक्षा निर्देश और आपातकालीन संपर्क देखें।"
                    : "View local weather, active alerts, safety guidance and emergency contacts."}
                </p>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "लाइव स्थानीय मौसम एवं वर्षा निगरानी" : "Live Local Weather & Rainfall Monitoring"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "आधिकारिक मौसम एवं बाढ़ चेतावनी स्तर" : "Official Weather Warnings & Flood Watches"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "नागरिक सुरक्षा निर्देश (क्या करें और क्या न करें)" : "Actionable Safety Guidance & Do's / Don'ts"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{locale === "hi" ? "24×7 आपातकालीन सहायता व राहत संपर्क नंबर" : "24×7 Emergency Helplines & Assistance"}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Link
                    href="/public"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm hover:shadow group focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
                  >
                    <span>{locale === "hi" ? "नागरिक पोर्टल खोलें" : "Open Public Portal"}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <p className="text-[11px] text-center text-slate-400">
                    {locale === "hi"
                      ? "सभी नागरिकों हेतु निःशुल्क एवं खुली पहुंच • कोई खाता आवश्यक नहीं"
                      : "Open to all citizens • Instant access without registration"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 4. BELOW-THE-FOLD STRUCTURED SECTIONS */}
        <div className="space-y-10 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* SECTION 1 & 2: WHAT YOU CAN ACCESS & HOW VARSHANETRA HELPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Section 1: What you can access */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F3D66] dark:text-blue-400">
                <FileText className="w-5 h-5" />
                <h3 className="font-extrabold text-base sm:text-lg">
                  {locale === "hi" ? "आप क्या जानकारी प्राप्त कर सकते हैं" : "What you can access"}
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{locale === "hi" ? "लाइव स्थानीय मौसम (तापमान, वर्षा, हवा की दिशा)" : "Live local weather (precipitation, wind, hourly trends)"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{locale === "hi" ? "आधिकारिक मौसम चेतावनियां (लाल, नारंगी, पीला स्तर)" : "Official weather warnings (Red, Orange, Yellow advisories)"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{locale === "hi" ? "बाढ़ एवं जलभराव से बचाव हेतु सुरक्षा निर्देश" : "Safety guidance & flood evacuation do's and don'ts"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{locale === "hi" ? "राष्ट्रीय एवं राज्य आपातकालीन हेल्पलाइन" : "National and state 24×7 emergency helplines"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{locale === "hi" ? "ज़िला आपदा नियंत्रण कक्ष एवं नोडल संपर्क" : "District emergency contacts & DDMA control room"}</span>
                </li>
              </ul>
            </div>

            {/* Section 2: How VarshaNetra helps */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F3D66] dark:text-blue-400">
                <Compass className="w-5 h-5" />
                <h3 className="font-extrabold text-base sm:text-lg">
                  {locale === "hi" ? "वर्षानेत्र कैसे सहायता करता है" : "How VarshaNetra helps"}
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{locale === "hi" ? "वर्तमान मौसमी परिस्थितियों को सरलता से समझें" : "Understand current weather conditions accurately"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{locale === "hi" ? "आधिकारिक चेतावनियों की समय पर पुष्टि करें" : "Check official warnings without rumors or delay"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{locale === "hi" ? "आपात स्थिति में तत्काल सही निर्णय लें" : "Know what action to take for yourself and family"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{locale === "hi" ? "आपातकालीन सेवाओं से तुरंत संपर्क साधें" : "Reach emergency services quickly with direct dial"}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* SECTION 3: OFFICIAL DATA & SAFETY INFORMATION */}
          <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-700 dark:text-slate-300 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                  {locale === "hi" ? "आधिकारिक डेटा एवं सुरक्षा सूचना" : "Official Data & Safety Information"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {locale === "hi"
                    ? "वर्षानेत्र भारत मौसम विज्ञान विभाग (IMD), केंद्रीय जल आयोग (CWC), ओपन-मेटियो (Open-Meteo), नासा (NASA GPM) एवं ओपनस्ट्रीटमैप (OSM) के खुले डेटा एवं सार्वजनिक मानकों पर आधारित है। अनधिकृत या असत्यापित निजी डेटा स्वीकार नहीं किया जाता।"
                    : "VarshaNetra integrates authoritative telemetry from Open-Meteo API, OpenStreetMap ODbL 1.0, and standardized IMD / CWC hydrological formats. Real-time feeds adhere strictly to zero-mock data integrity directives (Engineering Rules 14-19)."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {locale === "hi" ? "डेटा स्रोत:" : "Data Providers:"}
              </span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Open-Meteo NWP</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">OpenStreetMap ODbL</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">NASA GPM IMERG</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">RainViewer Radar</span>
            </div>
          </div>

          {/* 5. EMERGENCY HELPLINES AREA */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-red-600" />
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    {locale === "hi" ? "आपातकालीन हेल्पलाइन" : "Emergency Helplines"}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  {locale === "hi" ? "24×7 आपातकालीन सहायता" : "24×7 emergency assistance across India"}
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {locale === "hi" ? "टोल-फ्री नंबर" : "Toll-Free Government Services"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <a
                href="tel:112"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">112</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">National Emergency</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "राष्ट्रीय आपातकाल" : "All-in-One Helpline"}</span>
              </a>

              <a
                href="tel:1078"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">1078</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Disaster (NDMA)</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "आपदा प्रबंधन" : "NDRF / NDMA Control"}</span>
              </a>

              <a
                href="tel:1070"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">1070</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">State Relief (SDMA)</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "राज्य नियंत्रण कक्ष" : "State EOC Control"}</span>
              </a>

              <a
                href="tel:1077"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">1077</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">District EOC</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "ज़िला नियंत्रण कक्ष" : "District DM Office"}</span>
              </a>

              <a
                href="tel:108"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">108</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Ambulance</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "चिकित्सा आपातकाल" : "Medical EMS"}</span>
              </a>

              <a
                href="tel:101"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-center transition group block"
              >
                <span className="block text-lg font-black text-red-600 group-hover:scale-105 transition-transform">101</span>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Fire & Rescue</span>
                <span className="block text-[9px] text-slate-400">{locale === "hi" ? "दमकल व बचाव" : "Fire Service"}</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* 6. GOVERNMENT-GRADE FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              VarshaNetra • वर्षानेत्र Flood Early Warning & Intelligence
            </p>
            <p className="text-[11px] text-slate-400">
              District Disaster Management Decision Support System (India)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition">
              {locale === "hi" ? "सरकारी लॉगिन" : "Government Login"}
            </Link>
            <span>•</span>
            <Link href="/public" className="hover:text-slate-900 dark:hover:text-white transition">
              {locale === "hi" ? "नागरिक पोर्टल" : "Public Portal"}
            </Link>
            <span>•</span>
            <Link href="/data-sources" className="hover:text-slate-900 dark:hover:text-white transition">
              {locale === "hi" ? "डेटा स्रोत स्वास्थ्य" : "Data Health"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
