"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Phone,
  Clock,
  Wind,
  Droplets,
  Thermometer,
  Compass,
  MapPin,
  Lock,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Waves,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useLocale } from "@/lib/i18n/context";
import { SUPPORTED_DISTRICTS, SupportedDistrict, getCanonicalDistrict } from "@/data/supportedDistricts";
import { useCanonicalTelemetry } from "@/hooks/use-canonical-telemetry";

function PublicPortalContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. District Selection State
  const districtParam = searchParams.get("district");
  const initialDistrict = useMemo(() => {
    if (districtParam) {
      return getCanonicalDistrict(districtParam);
    }
    return SUPPORTED_DISTRICTS[0]; // Default to Pune District
  }, [districtParam]);

  const [selectedDistrict, setSelectedDistrict] = useState<SupportedDistrict>(initialDistrict);

  // Sync selected district when URL parameter changes
  useEffect(() => {
    if (districtParam) {
      const match = getCanonicalDistrict(districtParam);
      if (match.id !== selectedDistrict.id) {
        setSelectedDistrict(match);
      }
    }
  }, [districtParam, selectedDistrict.id]);

  // Handle District Change
  const handleDistrictChange = (district: SupportedDistrict) => {
    setSelectedDistrict(district);
    const params = new URLSearchParams(searchParams.toString());
    params.set("district", district.districtId || district.id);
    router.push(`/public?${params.toString()}`, { scroll: false });
  };

  // 2. Canonical Telemetry Hook (Single Source of Truth)
  const {
    snapshot,
    isLoading,
    isRefreshing,
    error: telemetryError,
    refetch,
    lastUpdated,
  } = useCanonicalTelemetry({
    cityId: selectedDistrict.cityId || selectedDistrict.districtId || selectedDistrict.id,
    districtId: selectedDistrict.districtId,
    latitude: selectedDistrict.latitude,
    longitude: selectedDistrict.longitude,
    pollingIntervalMs: 120_000, // 2-minute passive refresh
  });

  // Extract observations, forecast, official alerts, and derived risk
  const observations = snapshot?.observations;
  const forecast = snapshot?.forecast;
  const officialAlerts = snapshot?.officialAlerts;
  const derivedRisk = snapshot?.derivedRisk;

  // Warning configuration for statutory IMD bulletins
  const officialColor = officialAlerts?.colorCode || "Green";

  const warningConfig = useMemo(() => {
    switch (officialColor) {
      case "Red":
        return {
          titleEn: "Extreme Warning / Take Action",
          titleHi: "अत्यधिक गंभीर चेतावनी / तत्काल कार्रवाई करें",
          labelEn: "Red • Warning / Take Action",
          labelHi: "लाल • चेतावनी / तुरंत सुरक्षात्मक कदम उठाएं",
          bgClass: "bg-red-600 text-white",
          borderClass: "border-red-500",
          pillClass: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border-red-300",
          icon: ShieldAlert,
          hazardEn: "Extremely heavy rainfall & flash flood emergency. Urgent safety action required.",
          hazardHi: "अत्यधिक भारी वर्षा एवं आकस्मिक बाढ़ की स्थिति। तत्काल सुरक्षित स्थानों पर जाएं।",
        };
      case "Orange":
        return {
          titleEn: "Severe Weather Alert / Be Prepared",
          titleHi: "मौसम चेतावनी (अलर्ट) / तैयार रहें",
          labelEn: "Orange • Alert / Be Prepared",
          labelHi: "नारंगी • चेतावनी / तैयार रहें",
          bgClass: "bg-orange-600 text-white",
          borderClass: "border-orange-500",
          pillClass: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-300",
          icon: AlertTriangle,
          hazardEn: "Heavy to very heavy rainfall expected. High risk of localized inundation.",
          hazardHi: "भारी से बहुत भारी वर्षा का पूर्वानुमान। गंभीर जलभराव का जोखिम।",
        };
      case "Yellow":
        return {
          titleEn: "Weather Watch / Be Aware",
          titleHi: "मौसम निगरानी / सतर्क रहें",
          labelEn: "Yellow • Watch / Be Aware",
          labelHi: "पीला • निगरानी रखें व सचेत रहें",
          bgClass: "bg-amber-500 text-slate-950",
          borderClass: "border-amber-400",
          pillClass: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300",
          icon: AlertTriangle,
          hazardEn: "Moderate rainfall and localized waterlogging possible in low-lying sectors.",
          hazardHi: "निचले क्षेत्रों में मध्यम वर्षा एवं स्थानीय जलभराव की संभावना।",
        };
      case "Green":
      default:
        return {
          titleEn: "No Warning / Normal Weather",
          titleHi: "कोई चेतावनी नहीं / सामान्य मौसम",
          labelEn: "Green • No Warning / No Action",
          labelHi: "हरा • कोई चेतावनी नहीं",
          bgClass: "bg-emerald-600 text-white",
          borderClass: "border-emerald-500",
          pillClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300",
          icon: CheckCircle2,
          hazardEn: "Standard atmospheric conditions. No severe weather bulletin active.",
          hazardHi: "मानक मौसमी परिस्थितियां। कोई प्रतिकूल मौसम चेतावनी सक्रिय नहीं है।",
        };
    }
  }, [officialColor]);

  const WarningIcon = warningConfig.icon;

  // Formatted last updated display
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) return "Realtime";
    try {
      return (
        new Date(lastUpdated).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    } catch {
      return "IST";
    }
  }, [lastUpdated, locale]);

  // Derived risk badge color
  const riskBadgeClass = useMemo(() => {
    switch (derivedRisk?.riskLevel) {
      case "SEVERE":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300";
      case "MODERATE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      case "LOW":
      default:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
    }
  }, [derivedRisk?.riskLevel]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. PUBLIC PORTAL TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#0F3D66] dark:text-white">
                VARSHA<span className="text-[#2563EB]">NETRA</span>
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-none">
                {locale === "hi" ? "नागरिक मौसम व आपदा सूचना" : "Public Weather Safety Portal"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{locale === "hi" ? "अधिकारी लॉगिन" : "Official Login"}</span>
              <span className="sm:hidden">{locale === "hi" ? "लॉगिन" : "Login"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MAIN PUBLIC CONTENT CONTAINER */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8 flex-1">
        {/* CITY SELECTION INTERFACE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label
              htmlFor="district-select-dropdown"
              className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#2563EB]" />
              <span>
                {locale === "hi" ? "अपना शहर या जिला चुनें" : "Select your city or district"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === "hi"
                  ? "6 समर्थित जिले (सत्यापित डेटा)"
                  : "6 Supported Districts (Canonical Data)"}
              </span>
              <button
                type="button"
                onClick={() => refetch(true)}
                disabled={isRefreshing}
                title="Refresh telemetry"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#2563EB]" : ""}`} />
              </button>
            </div>
          </div>

          {/* District Select Dropdown and Quick Chips */}
          <div className="space-y-2">
            <div className="relative">
              <select
                id="district-select-dropdown"
                value={selectedDistrict.id}
                onChange={(e) => {
                  const target = getCanonicalDistrict(e.target.value);
                  if (target) handleDistrictChange(target);
                }}
                className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-[#0F3D66] focus:outline-hidden appearance-none cursor-pointer"
              >
                {SUPPORTED_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === "hi" ? `${d.nameHi} (${d.stateHi})` : `${d.shortName}, ${d.state}`}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <Compass className="w-4 h-4" />
              </div>
            </div>

            {/* Quick District Badges for 1-Tap Switching */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">
                {locale === "hi" ? "त्वरित चयन:" : "Quick select:"}
              </span>
              {SUPPORTED_DISTRICTS.map((d) => {
                const isSelected = d.id === selectedDistrict.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleDistrictChange(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                      isSelected
                        ? "bg-[#0F3D66] text-white border-[#0F3D66] shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {locale === "hi" ? d.nameHi : d.shortName.replace(" District", "")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 1. CURRENT SITUATION (PRIORITY #1) */}
        <section aria-labelledby="current-situation-heading">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                  {locale === "hi" ? "वर्तमान ज़िला स्थिति" : "Current Situation"}
                </span>
                <h2 id="current-situation-heading" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {locale === "hi"
                    ? `${selectedDistrict.nameHi}, ${selectedDistrict.stateHi}`
                    : selectedDistrict.displayName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{locale === "hi" ? "अद्यतन:" : "Updated:"} {lastUpdatedDisplay}</span>
                </div>
              </div>
            </div>

            {/* Current Situation KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Location Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {locale === "hi" ? "भौगोलिक क्षेत्र" : "Geographic Sector"}
                </span>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {selectedDistrict.shortName}
                </p>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {selectedDistrict.latitude.toFixed(2)}°N, {selectedDistrict.longitude.toFixed(2)}°E
                </span>
              </div>

              {/* Weather Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {locale === "hi" ? "वर्तमान मौसम" : "Current Weather"}
                </span>
                {isLoading && !observations ? (
                  <p className="text-sm font-medium text-slate-400 animate-pulse">Loading weather...</p>
                ) : observations ? (
                  <div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {observations.weatherDescription || "Clear"} • {observations.temperature ?? "--"}°C
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {locale === "hi" ? "वर्षा:" : "Precipitation:"} {observations.precipitation ?? 0} mm
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                    UNAVAILABLE
                  </p>
                )}
              </div>

              {/* Official Warning Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {locale === "hi" ? "आधिकारिक चेतावनी स्थिति" : "Official Warning Status"}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${warningConfig.pillClass}`}>
                    <WarningIcon className="w-3.5 h-3.5" />
                    <span>{officialColor}</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {locale === "hi" ? warningConfig.titleHi : warningConfig.titleEn}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  {locale === "hi" ? "स्रोत: भारत मौसम विज्ञान विभाग (IMD)" : "Source: IMD / DDMA Bulletin"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. OFFICIAL WARNING (STATUTORY IMD ALERT) */}
        <section aria-labelledby="official-warning-heading">
          <Card className={`overflow-hidden border-2 ${warningConfig.borderClass} shadow-md`}>
            {/* Banner Header */}
            <div className={`${warningConfig.bgClass} p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 flex-wrap`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
                  <WarningIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider block opacity-90">
                    {locale === "hi" ? "आधिकारिक मौसम चेतावनी" : "Official Statutory Weather Warning"}
                  </span>
                  <h3 id="official-warning-heading" className="text-xl sm:text-2xl font-black tracking-tight">
                    {locale === "hi" ? warningConfig.titleHi : warningConfig.titleEn}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-white/30 text-white uppercase tracking-wider">
                  OFFICIAL WARNING
                </span>
                <span className="px-3 py-1 rounded-full bg-white/90 text-slate-900 font-extrabold text-xs uppercase tracking-wider shadow-xs">
                  {locale === "hi" ? warningConfig.labelHi : warningConfig.labelEn}
                </span>
              </div>
            </div>

            {/* Warning Body Information */}
            <CardContent className="p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
              {/* Detailed Hazard Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {locale === "hi" ? "पूर्वानुमान एवं प्रभाव" : "Hazard & Operational Watch"}
                </span>
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {locale === "hi" ? warningConfig.hazardHi : warningConfig.hazardEn}
                </p>
              </div>

              {/* Warning Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">
                    {locale === "hi" ? "प्रभावित क्षेत्र:" : "Affected Location:"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedDistrict.shortName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {locale === "hi" ? "वैधता अवधि:" : "Validity:"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {locale === "hi" ? "आगामी 24 घंटे" : "Next 24 Hours"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {locale === "hi" ? "जारी होने का समय:" : "Issued Time:"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {lastUpdatedDisplay}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {locale === "hi" ? "आधिकारिक स्रोत:" : "Official Source:"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {officialAlerts?.source || "India Meteorological Department (IMD)"}
                  </span>
                </div>
              </div>

              {/* IMD Guidance */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>
                      {locale === "hi"
                        ? "वर्तमान आधिकारिक मौसम मार्गदर्शन"
                        : "Current official weather guidance"}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    IMD / NDMA Standards
                  </span>
                </div>

                <div className="p-4 space-y-2 text-xs sm:text-sm">
                  <p className="text-slate-800 dark:text-slate-200 font-medium italic">
                    &ldquo;
                    {(locale === "hi" ? officialAlerts?.narrativeHi : officialAlerts?.narrativeEn) ||
                      (locale === "hi"
                        ? "क्षेत्र में सामान्य मानसूनी गतिविधियां सक्रिय हैं। स्थानीय स्तर पर वर्षा पर नजर रखी जा रही है।"
                        : "Regional weather patterns normal. Local convective precipitation expected over selected pockets. Monitor local updates.")}
                    &rdquo;
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. VARSHANETRA RISK ASSESSMENT (MODEL-DERIVED FLOOD INUNDATION INTELLIGENCE) */}
        {derivedRisk && (
          <section aria-labelledby="model-risk-heading">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-[#0F3D66] dark:text-blue-300 uppercase">
                        VARSHANETRA RISK ASSESSMENT
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {locale === "hi" ? "मॉडल-आधारित जलभराव विश्लेषण" : "Multi-factor Inundation Intelligence"}
                      </span>
                    </div>
                    <CardTitle id="model-risk-heading" className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Waves className="w-5 h-5 text-[#2563EB]" />
                      <span>
                        {locale === "hi"
                          ? `${selectedDistrict.shortName} जलभराव संवेदनशीलता`
                          : `Flood Susceptibility for ${selectedDistrict.shortName}`}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase border ${riskBadgeClass}`}>
                      {derivedRisk.riskLevel} RISK ({derivedRisk.riskScore}/100)
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {locale === "hi"
                    ? derivedRisk.plainLanguageExplanationHi
                    : derivedRisk.plainLanguageExplanationEn}
                </p>

                {/* Key contributing factors */}
                {derivedRisk.contributingFactors && derivedRisk.contributingFactors.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {derivedRisk.contributingFactors.map((factor, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {locale === "hi" && factor.labelHi ? factor.labelHi : factor.label}
                        </span>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {factor.rawValue} {factor.unit}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {locale === "hi" && factor.rationaleHi ? factor.rationaleHi : factor.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    {locale === "hi"
                      ? "डेटा पूर्णता स्तर: " + derivedRisk.dataCompleteness + "% (स्थलाकृति, वर्षा एवं जल विज्ञान)"
                      : "Data completeness: " + derivedRisk.dataCompleteness + "% (terrain, antecedent rainfall & hydrology)"}
                  </span>
                  {snapshot?.snapshotId && (
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      ID: {snapshot.snapshotId}
                    </span>
                  )}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Non-Statutory Decision Support
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 4. WEATHER OBSERVATIONS & SHORT-TERM FORECAST */}
        <section aria-labelledby="weather-heading">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {locale === "hi" ? "मौसम अवलोकन" : "Weather Observations"}
                  </span>
                  <CardTitle id="weather-heading" className="text-lg sm:text-xl font-bold">
                    {locale === "hi"
                      ? `${selectedDistrict.shortName} में मौसम की स्थिति`
                      : `Weather Conditions in ${selectedDistrict.shortName}`}
                  </CardTitle>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span className="font-semibold block text-slate-700 dark:text-slate-300">
                    Open-Meteo Multi-Model Ensemble
                  </span>
                  <span>{locale === "hi" ? "स्रोत: प्रत्यक्ष अवलोकन एवं पूर्वानुमान" : "Source: Observed & Forecast"}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {telemetryError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{telemetryError} (Displaying cached telemetry).</span>
                </div>
              )}

              {/* Observed Telemetry Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* Temperature */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-rose-500" />
                    <span>{locale === "hi" ? "तापमान" : "Temperature"}</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {observations ? `${observations.temperature}°C` : "UNAVAILABLE"}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {observations?.temperature
                      ? `${locale === "hi" ? "अनुमानित अहसास:" : "Feels like:"} ${Math.round(observations.apparentTemperature ?? (observations.temperature + 1))}°C`
                      : "No reading"}
                  </span>
                </div>

                {/* Rainfall */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span>{locale === "hi" ? "वर्षा दर" : "Rainfall"}</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {observations ? `${observations.precipitation ?? 0} mm` : "UNAVAILABLE"}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {locale === "hi" ? "गत 1 घंटे में दर्ज" : "Observed past hour"}
                  </span>
                </div>

                {/* Humidity */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-teal-500" />
                    <span>{locale === "hi" ? "सापेक्ष आर्द्रता" : "Humidity"}</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {observations ? `${observations.relativeHumidity ?? "--"}%` : "UNAVAILABLE"}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {locale === "hi" ? "वायु में नमी का स्तर" : "Atmospheric moisture"}
                  </span>
                </div>

                {/* Wind Speed */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-sky-500" />
                    <span>{locale === "hi" ? "हवा की गति" : "Wind Speed"}</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {observations ? `${observations.windSpeed ?? "--"} km/h` : "UNAVAILABLE"}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {locale === "hi" ? "दिशा:" : "Direction:"} {observations?.windDirectionCompass || "W"}
                  </span>
                </div>
              </div>

              {/* Short-Term Hourly Forecast (Next 6 Hours) */}
              {forecast?.hourly && forecast.hourly.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "आगामी 6 घंटों का पूर्वानुमान" : "Short-Term Forecast (Next 6 Hours)"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {locale === "hi" ? "1-घंटे का अंतराल" : "1-hour interval"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {forecast.hourly.slice(0, 6).map((h, idx) => {
                      const hourStr = new Date(h.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-1"
                        >
                          <span className="text-[11px] font-bold text-slate-500 block">{hourStr}</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">{Math.round(h.temperature)}°C</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
                            {h.precipitation > 0 ? `${h.precipitation}mm` : "0mm"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 5. WHAT TO DO (SAFETY GUIDANCE) */}
        <section aria-labelledby="what-to-do-heading">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {locale === "hi" ? "सुरक्षा निर्देश" : "Safety Guidance"}
                  </span>
                  <CardTitle id="what-to-do-heading" className="text-lg sm:text-xl font-bold">
                    {locale === "hi" ? "अभी आपको क्या करना चाहिए?" : "What should you do now?"}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-bold text-[#0F3D66] dark:text-blue-300 block">
                  {locale === "hi"
                    ? `सक्रिय मौसम स्थिति (${officialColor}) के आधार पर नागरिक निर्देश:`
                    : `Citizen Action Instructions for ${officialColor} Status:`}
                </span>
                <p className="text-xs text-slate-500">
                  {locale === "hi"
                    ? "राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) के आधिकारिक जन सुरक्षा प्रोटोकॉल के अनुरूप।"
                    : "Aligned with NDMA official community safety directives. Plain language guidance without jargon."}
                </p>
              </div>

              {/* Action Bullet Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Immediate Safe Actions */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{locale === "hi" ? "सुरक्षा हेतु क्या करें (DO's)" : "Safe Actions To Take (DO's)"}</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "मोबाइल फोन और इमरजेंसी लाइट को पूरी तरह चार्ज रखें।" : "Keep mobile phones and emergency flashlights fully charged."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "पीने का साफ पानी, आवश्यक दवाइयां और सूखा भोजन सुरक्षित स्थान पर रखें।" : "Store clean drinking water, essential medicines, and non-perishable food."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "स्थानीय प्रशासन (DDMA) के आधिकारिक बुलेटिन व रेडियो प्रसारण सुनते रहें।" : "Listen to official DDMA bulletins and local radio for verified updates."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "यदि निचले क्षेत्र में जलभराव हो, तो बिना देर किए सुरक्षित ऊंचे स्थानों या आश्रय स्थल पर जाएं।" : "If located in low-lying flooded areas, move to higher ground or relief shelters."}</span>
                    </li>
                  </ul>
                </div>

                {/* Things to Avoid */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{locale === "hi" ? "किन बातों से बचें (DON'Ts)" : "Actions to Avoid (DON'Ts)"}</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "जलमग्न सड़कों, पुलियाओं या अंडरपास में गाड़ी न चलाएं।" : "Do NOT drive or walk through flooded underpasses or submerged roads."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "बिजली के खंभों, गिरे तारों या बिजली के उपकरणों को न छुएं।" : "Do NOT touch electric poles, fallen wires, or submerged appliances."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "सोशल मीडिया की अपुष्ट अफवाहों पर विश्वास न करें और न ही उन्हें फैलाएं।" : "Do NOT believe or spread unverified social media rumors."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{locale === "hi" ? "नदी या नालों के किनारों पर सेल्फी या तमाशा देखने न जाएं।" : "Do NOT visit swollen river banks or canals for sightseeing."}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 6. EMERGENCY CONTACTS */}
        <section aria-labelledby="emergency-contacts-heading">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                    {locale === "hi" ? "24×7 आपातकालीन नंबर" : "24×7 Emergency Helplines"}
                  </span>
                  <CardTitle id="emergency-contacts-heading" className="text-lg sm:text-xl font-bold">
                    {locale === "hi"
                      ? `${selectedDistrict.shortName} एवं राष्ट्रीय हेल्पलाइन`
                      : `Emergency Contacts for ${selectedDistrict.shortName}`}
                  </CardTitle>
                </div>
                <span className="text-xs text-slate-500">
                  {locale === "hi" ? "मोबाइल पर क्लिक कर कॉल करें" : "Tap number to call directly"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "सभी हेल्पलाइन नंबर भारत सरकार एवं राज्य आपदा प्रबंधन प्राधिकरण द्वारा प्रमाणित हैं। आपात स्थिति में बिना झिझक संपर्क करें।"
                  : "All helpline numbers are verified authoritative government emergency services. Available 24×7 toll-free."}
              </p>

              {/* Verified Contact Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {selectedDistrict.emergencyContacts.map((contact, idx) => {
                  const serviceTitle = locale === "hi" ? contact.serviceNameHi : contact.serviceName;
                  const isDeoc = contact.category === "DISTRICT";

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                        isDeoc
                          ? "bg-blue-50/70 dark:bg-blue-950/40 border-[#2563EB] shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {contact.category}
                          </span>
                          {contact.isTollFree && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {locale === "hi" ? "टोल-फ्री" : "TOLL-FREE"}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {serviceTitle}
                        </h4>
                        {contact.notes && (
                          <p className="text-[11px] text-slate-500">
                            {locale === "hi" ? contact.notesHi || contact.notes : contact.notes}
                          </p>
                        )}
                      </div>

                      {/* Primary Dial Button */}
                      <div className="space-y-1.5 pt-1">
                        <a
                          href={`tel:${contact.number}`}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition shadow-xs ${
                            isDeoc
                              ? "bg-[#0F3D66] hover:bg-[#0c3152] text-white"
                              : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{contact.number}</span>
                        </a>

                        {contact.secondaryNumber && (
                          <a
                            href={`tel:${contact.secondaryNumber}`}
                            className="w-full py-1.5 px-2 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-800"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>{contact.secondaryNumber}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* 7. PUBLIC FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              VarshaNetra • वर्षानेत्र Public Weather & Disaster Safety Portal
            </p>
            <p className="text-[11px] text-slate-400">
              District Disaster Decision Support System • Public Safety Portal
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">
              {locale === "hi" ? "मुख्य पृष्ठ" : "Home"}
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition">
              {locale === "hi" ? "अधिकारी लॉगिन" : "Official Login"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function PublicInformationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="w-10 h-10 border-4 border-[#0F3D66] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Loading VarshaNetra Public Weather Safety Portal...
            </p>
          </div>
        </div>
      }
    >
      <PublicPortalContent />
    </Suspense>
  );
}
