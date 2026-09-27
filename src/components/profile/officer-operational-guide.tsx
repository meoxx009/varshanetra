"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CircleHelp,
  ChevronDown,
  ChevronUp,
  MapPin,
  LayoutDashboard,
  Sparkles,
  CloudRain,
  Waves,
  Map,
  Radar,
  Bell,
  TriangleAlert,
  ClipboardList,
  Users,
  Database,
  ShieldAlert,
  Clock,
  Info,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

interface OfficerOperationalGuideProps {
  className?: string;
}

export function OfficerOperationalGuide({ className = "" }: OfficerOperationalGuideProps) {
  const locale = useLocale();
  const isHi = locale === "hi";

  // Guide collapse state with sessionStorage persistence
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "quickstart" | "steps" | "reference" | "principles">("all");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("varshanetra_officer_guide_open");
      if (stored !== null) {
        setIsGuideOpen(stored === "true");
      }
    } catch {
      // Non-fatal if sessionStorage is unavailable
    }
  }, []);

  const toggleGuide = () => {
    setIsGuideOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("varshanetra_officer_guide_open", String(next));
      } catch {
        // Non-fatal
      }
      return next;
    });
  };

  // 1. Quick Start Steps (First 60 Seconds)
  const quickStartSteps = isHi
    ? [
        { num: 1, text: "अपना जिला चुनें.", icon: MapPin },
        { num: 2, text: "Dashboard और वर्तमान स्थिति देखें.", icon: LayoutDashboard },
        { num: 3, text: "आधिकारिक अलर्ट देखें.", icon: Bell },
        { num: 4, text: "अगले 6/12/24 घंटे की वर्षा देखें.", icon: CloudRain },
        { num: 5, text: "वर्तमान Flood Risk देखें.", icon: Waves },
        { num: 6, text: "अतिरिक्त स्थानिक जानकारी के लिए GIS/Radar देखें.", icon: Map },
        { num: 7, text: "अनुशंसित परिचालन कार्रवाई देखें.", icon: TriangleAlert },
      ]
    : [
        { num: 1, text: "Select your district.", icon: MapPin },
        { num: 2, text: "Check Dashboard and Current Situation.", icon: LayoutDashboard },
        { num: 3, text: "Check official alerts.", icon: Bell },
        { num: 4, text: "Check next 6/12/24 hour rainfall.", icon: CloudRain },
        { num: 5, text: "Review current Flood Risk.", icon: Waves },
        { num: 6, text: "Inspect GIS/Radar when additional spatial context is needed.", icon: Map },
        { num: 7, text: "Check recommended operational actions.", icon: TriangleAlert },
      ];

  // 2. Step-by-Step Operational Guide (12 steps)
  const operationalSteps = [
    {
      number: 1,
      icon: MapPin,
      title: isHi ? "अपना जिला चुनें" : "Select Your District",
      description: isHi
        ? "सबसे पहले अपने जिम्मेदारी वाले जिले या स्थान का चयन करें। चुना गया स्थान VarshaNetra में मौसम, जोखिम, मानचित्र और अन्य जानकारी को नियंत्रित करता है."
        : "Start by selecting the district or location you are responsible for. The selected location controls the weather, risk, map and operational information shown across VarshaNetra.",
      extendedDetails: isHi
        ? "स्थान चयन जिला जोखिम आकलन, स्वचालित अलर्ट और मौसम रडार केंद्र को नियंत्रित करता है। इसे हेडर में दिए गए लोकेशन सेलेक्टर से कभी भी बदला जा सकता है।"
        : "The selected district anchors telemetry feeds, risk models, early warning thresholds, and emergency responder dispatches. It can be changed anytime from the top navigation bar.",
      route: null,
      badge: isHi ? "स्थान चयन" : "Location Context",
    },
    {
      number: 2,
      icon: LayoutDashboard,
      title: isHi ? "डैशबोर्ड देखें" : "Check the Dashboard",
      description: isHi
        ? "Dashboard से जिले की वर्तमान स्थिति, मौसम, अलर्ट और प्रमुख परिचालन संकेतकों का त्वरित अवलोकन करें."
        : "Use the Dashboard for a quick overview of the current district situation, weather status, alerts and key operational indicators.",
      extendedDetails: isHi
        ? "जिले के मुख्य परिचालन संकेतक, आधिकारिक चेतावनी स्थिति और समग्र जोखिम स्कोर का उच्च-स्तरीय सारांश प्रदान करता है।"
        : "Provides executive situation cards, rapid status indicators, active alert banners, and composite risk index.",
      route: "/dashboard",
      routeName: isHi ? "Dashboard खोलें" : "Open Dashboard",
      badge: isHi ? "त्वरित स्थिति" : "Overview",
    },
    {
      number: 3,
      icon: Sparkles,
      title: isHi ? "कमांड सेंटर देखें" : "Read the Command Center",
      description: isHi
        ? "Command Center में वर्तमान स्थिति, जोखिम के प्रमुख कारण और लागू परिचालन कार्रवाइयों को समझें."
        : "Use Command Center to understand the current situation, important risk drivers and applicable operational actions.",
      extendedDetails: isHi
        ? "विभिन्न स्रोतों के डेटा का विश्लेषण कर निर्णायक परिचालन निर्देश और मानक संचालन प्रक्रियाएं (SOP) प्रस्तुत करता है।"
        : "Synthesizes multi-source telemetry into decisive operational recommendations and dispatch orders.",
      route: "/situation",
      routeName: isHi ? "Command Center खोलें" : "Open Command Center",
      badge: isHi ? "परिचालन कमान" : "Operations",
    },
    {
      number: 4,
      icon: CloudRain,
      title: isHi ? "Weather Intelligence देखें" : "Check Weather Intelligence",
      description: isHi
        ? "वर्तमान मौसम तथा अगले 6, 12 और 24 घंटों की वर्षा संभावना देखें। स्रोत और अपडेट समय को भी देखें."
        : "Review current weather and near-term rainfall outlooks such as the next 6, 12 and 24 hours. Always check the source and update time.",
      extendedDetails: isHi
        ? "Open-Meteo और Tomorrow.io हाइपर-लोकल नाउकास्टिंग के साथ 6h, 12h और 24h वर्षा पूर्वानुमान और चरम वर्षा अलर्ट दिखाता है।"
        : "Displays Open-Meteo and Tomorrow.io hyper-local telemetry with 6h, 12h, and 24h precipitation horizons and convective storm tracking.",
      route: "/weather",
      routeName: isHi ? "Weather Intelligence खोलें" : "Open Weather Intelligence",
      badge: isHi ? "मौसम व वर्षा" : "Nowcasting",
    },
    {
      number: 5,
      icon: Waves,
      title: isHi ? "बाढ़ जोखिम देखें" : "Check Flood Risk",
      description: isHi
        ? "Flood Risk Intelligence में VarshaNetra का वर्तमान जोखिम आकलन, प्रमुख कारण, confidence और स्थान-आधारित जोखिम की जानकारी देखें."
        : "Use Flood Risk Intelligence to understand the current VarshaNetra risk assessment, major contributing factors, confidence and spatial risk information.",
      extendedDetails: isHi
        ? "वर्षा, मिट्टी की नमी, स्थलाकृतिक ढलान और जल निकासी क्षमता के आधार पर 0-100 जोखिम स्कोर और श्रेणी (सामान्य/सतर्कता/चेतावनी/निकासी) की गणना करता है।"
        : "Calculates a 0-100 composite risk score and category (Safe/Watch/Alert/Evacuate) based on precipitation, slope, soil moisture, and drainage capacity.",
      route: "/flood",
      routeName: isHi ? "Flood Risk खोलें" : "Open Flood Risk",
      badge: isHi ? "जोखिम आकलन" : "Risk Engine",
    },
    {
      number: 6,
      icon: Map,
      title: isHi ? "GIS मानचित्र देखें" : "Inspect the GIS Map",
      description: isHi
        ? "GIS मानचित्र से जोखिम क्षेत्रों, बुनियादी ढांचे, स्थानीय क्षेत्रों, जलमार्ग और अन्य मानचित्र-आधारित जानकारी देखें."
        : "Use the GIS map to inspect risk zones, infrastructure, local areas, waterways and other mapped operational information.",
      extendedDetails: isHi
        ? "इंटरएक्टिव Leaflet GIS मानचित्र पर जोखिम क्षेत्र, राहत शिविर, अस्पताल, पुलिस स्टेशन, जलमार्ग और बाढ़ग्रस्त क्षेत्रों का स्थानिक दृश्य प्रदान करता है।"
        : "Interactive Leaflet GIS map with flood hazard zones, critical infrastructure (hospitals, shelters, police, bridges), and river telemetry.",
      route: "/map",
      routeName: isHi ? "GIS Map खोलें" : "Open GIS Map",
      badge: isHi ? "स्थानिक विश्लेषण" : "Spatial GIS",
    },
    {
      number: 7,
      icon: Radar,
      title: isHi ? "Weather Radar देखें" : "Check Weather Radar",
      description: isHi
        ? "Doppler Weather Radar से चयनित क्षेत्र के आसपास उपलब्ध नवीनतम radar reflectivity और वर्षा पैटर्न देखें."
        : "Use the Doppler Weather Radar view to inspect the latest available radar reflectivity and precipitation patterns around the selected region.",
      extendedDetails: isHi
        ? "बादल फटने और तीव्र तूफानों की पहचान के लिए 0 से 65 dBZ स्केल पर MAX(Z) परावर्तन डेटा प्रदर्शित करता है। यह अवलोकन-आधारित संदर्भ है।"
        : "MAX(Z) radar reflectivity intelligence with 0-65 dBZ scale to detect convective storm cells and cloudbursts. Strictly observational context.",
      importantNote: isHi
        ? "Radar जानकारी अवलोकन-आधारित संदर्भ है और इसे आधिकारिक चेतावनियों तथा अन्य सत्यापित डेटा के साथ समझना चाहिए."
        : "Radar information is observational context and must be interpreted together with official warnings and other verified data.",
      route: "/weather",
      routeName: isHi ? "Radar मॉड्यूल खोलें" : "Open Radar Module",
      badge: isHi ? "डॉप्लर रडार" : "Doppler Radar",
    },
    {
      number: 8,
      icon: Bell,
      title: isHi ? "आधिकारिक अलर्ट देखें" : "Check Official Alerts",
      description: isHi
        ? "आपातकालीन कार्रवाई से पहले सरकारी मौसम और आपदा चेतावनियों की जांच करें। आधिकारिक चेतावनी और VarshaNetra के model-derived risk को अलग समझें."
        : "Check official government weather and disaster warnings before taking emergency action. Keep official warnings separate from VarshaNetra model-derived risk.",
      extendedDetails: isHi
        ? "IMD, CWC और राज्य आपदा प्रबंधन प्राधिकरण (SDMA/DDMA) द्वारा जारी वैधानिक आधिकारिक चेतावनियों की सूची और वर्तमान स्तर प्रस्तुत करता है।"
        : "Statutory alerts and warnings issued by IMD, CWC, and DDMA with verified color-coded severity.",
      route: "/alerts",
      routeName: isHi ? "Alerts खोलें" : "Open Alerts",
      badge: isHi ? "सरकारी चेतावनियां" : "Statutory Alerts",
    },
    {
      number: 9,
      icon: TriangleAlert,
      title: isHi ? "अनुशंसित कार्रवाई देखें" : "Review the Recommended Action",
      description: isHi
        ? "उपलब्ध सत्यापित जानकारी के आधार पर क्या निगरानी करनी है या कौन सी कार्रवाई लागू हो सकती है, यह जानने के लिए operational action section देखें."
        : "Use the operational action section to understand what should be monitored or acted upon according to the available verified information.",
      extendedDetails: isHi
        ? "सलाह, सतर्कता, चेतावनी और निकासी स्तरों के अनुसार संरचित मानक संचालन प्रक्रियाएं (SOP) और चेकलिस्ट प्रदान करता है।"
        : "Structured standard operating procedures (SOPs) based on alert levels: Advisory, Watch, Warning, and Evacuate.",
      route: "/situation",
      routeName: isHi ? "Action Protocol देखें" : "View Protocols",
      badge: isHi ? "कमान कार्रवाई" : "Command SOP",
    },
    {
      number: 10,
      icon: ClipboardList,
      title: isHi ? "घटनाएं और फील्ड रिपोर्ट दर्ज करें" : "Record Incidents & Field Reports",
      description: isHi
        ? "Incidents और Field Reports का उपयोग परिचालन घटनाओं और फील्ड से प्राप्त जानकारी दर्ज करने के लिए करें."
        : "Use Incidents and Field Reports to record operational observations and field information already supported by the application workflow.",
      extendedDetails: isHi
        ? "सत्यापित ग्राउंड-ट्रूथ डेटा, जलभराव की तस्वीरें और भू-संदर्भित नागरिक/अधिकारी अवलोकनों की श्रृंखला बनाए रखता है।"
        : "Maintains an incident ticket chain with geotagged citizen and field officer telemetry for rapid ground-truth verification.",
      route: "/incidents",
      secondaryRoute: "/field-reports",
      routeName: isHi ? "Incidents खोलें" : "Open Incidents",
      secondaryRouteName: isHi ? "Field Reports" : "Field Reports",
      badge: isHi ? "फील्ड रिपोर्टिंग" : "Field Telemetry",
    },
    {
      number: 11,
      icon: Users,
      title: isHi ? "रिस्पॉन्स टीम के साथ समन्वय करें" : "Coordinate Response",
      description: isHi
        ? "जहां सुविधा उपलब्ध है, Response Teams और Resources के माध्यम से उपलब्ध टीमों तथा संसाधनों की जानकारी देखें."
        : "Use Response Teams and Resources to review available response capacity and operational resources where configured.",
      extendedDetails: isHi
        ? "NDRF, SDRF, अग्निशमन और पुलिस टीमों की तैनाती स्थिति और उपलब्ध वाहनों, नौकाओं और उपकरणों की तत्परता सूची प्रदान करता है।"
        : "Deployment matrices for NDRF, SDRF, Fire, and Police teams with vehicle, boat, and specialized equipment readiness.",
      route: "/response",
      secondaryRoute: "/resources",
      routeName: isHi ? "Response Teams" : "Response Teams",
      secondaryRouteName: isHi ? "Resources" : "Resources",
      badge: isHi ? "संसाधन समन्वय" : "Resource Ops",
    },
    {
      number: 12,
      icon: Database,
      title: isHi ? "Data Health जांचें" : "Check Data Health",
      description: isHi
        ? "Data Health में data sources की उपलब्धता, telemetry health, freshness और data intelligence की स्थिति जांचें."
        : "Use Data Health to verify data-source availability, telemetry health, freshness and data-intelligence status.",
      extendedDetails: isHi
        ? "सभी डेटा स्रोतों की अपटाइम उपलब्धता, लेटेंसी, कैश ताज़गी और बैकअप API फॉलबैक स्थिति की पारदर्शी निगरानी करता है।"
        : "Transparently monitors data source uptime, telemetry latency, cache freshness, and graceful degradation indicators.",
      route: "/data-sources",
      routeName: isHi ? "Data Health खोलें" : "Open Data Health",
      badge: isHi ? "डेटा विश्वसनीयता" : "Data Provenance",
    },
  ];

  // 3. Quick Reference ("Which feature should I use?")
  const quickReferenceItems = [
    {
      feature: isHi ? "Dashboard" : "Dashboard",
      purpose: isHi ? "जिले की त्वरित स्थिति" : "Quick district overview",
      route: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      feature: isHi ? "Command Center" : "Command Center",
      purpose: isHi ? "स्थिति + परिचालन कार्रवाई" : "Situation + operational actions",
      route: "/situation",
      icon: Sparkles,
    },
    {
      feature: isHi ? "Weather Intelligence" : "Weather Intelligence",
      purpose: isHi ? "मौसम और वर्षा पूर्वानुमान" : "Weather and rainfall outlook",
      route: "/weather",
      icon: CloudRain,
    },
    {
      feature: isHi ? "Flood Risk Intelligence" : "Flood Risk Intelligence",
      purpose: isHi ? "बाढ़ जोखिम आकलन" : "Flood-risk assessment",
      route: "/flood",
      icon: Waves,
    },
    {
      feature: isHi ? "Live GIS Map" : "Live GIS Map",
      purpose: isHi ? "स्थानिक जोखिम और बुनियादी ढांचा" : "Spatial risk and infrastructure",
      route: "/map",
      icon: Map,
    },
    {
      feature: isHi ? "Weather Radar" : "Weather Radar",
      purpose: isHi ? "रडार आधारित वर्षा पैटर्न" : "Radar precipitation patterns",
      route: "/weather",
      icon: Radar,
    },
    {
      feature: isHi ? "Alerts" : "Alerts",
      purpose: isHi ? "आधिकारिक चेतावनियां" : "Official warnings",
      route: "/alerts",
      icon: Bell,
    },
    {
      feature: isHi ? "Incidents" : "Incidents",
      purpose: isHi ? "घटनाओं को ट्रैक करें" : "Track incidents",
      route: "/incidents",
      icon: ClipboardList,
    },
    {
      feature: isHi ? "Field Reports" : "Field Reports",
      purpose: isHi ? "फील्ड अवलोकन दर्ज करें" : "Record field observations",
      route: "/field-reports",
      icon: ClipboardList,
    },
    {
      feature: isHi ? "Data Health" : "Data Health",
      purpose: isHi ? "डेटा स्रोत और freshness जांचें" : "Check source health and freshness",
      route: "/data-sources",
      icon: Database,
    },
  ];

  // 4. Operational Principles
  const operationalPrinciples = [
    {
      icon: Database,
      en: "Always check the data source and last update time.",
      hi: "हमेशा डेटा स्रोत और अंतिम अपडेट समय देखें.",
      color: "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: ShieldAlert,
      en: "Official government warnings and VarshaNetra model-derived risk are different information types.",
      hi: "सरकारी आधिकारिक चेतावनी और VarshaNetra का model-derived risk अलग-अलग जानकारी हैं.",
      color: "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: Clock,
      en: "A LIVE label means the source has recent verified data; always consider freshness.",
      hi: "LIVE का अर्थ है कि स्रोत से हाल का सत्यापित डेटा मिला है; freshness को ध्यान में रखें.",
      color: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Info,
      en: "Unavailable data should not be treated as zero or normal.",
      hi: "Unavailable डेटा को zero या normal नहीं मानना चाहिए.",
      color: "border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className={`space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Guide Header Banner with Collapse Control */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-sky-50/40 dark:from-slate-900/80 dark:via-slate-900 dark:to-sky-950/20 shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F3D66] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <CircleHelp className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isHi ? "VarshaNetra का उपयोग कैसे करें" : "How to Use VarshaNetra"}
                </CardTitle>
                <Badge className="bg-[#0F3D66] hover:bg-[#0F3D66] text-white text-[10px] font-bold">
                  {isHi ? "परिचालन मार्गदर्शिका" : "Operational Guide"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                {isHi
                  ? "डैशबोर्ड समझने, जोखिम की निगरानी करने और सही कार्रवाई करने के लिए संक्षिप्त मार्गदर्शिका।"
                  : "A quick guide to understand the dashboard, monitor risk and take the right operational action."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGuide}
              className="text-xs font-semibold h-8 gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs"
              aria-expanded={isGuideOpen}
              aria-label={isGuideOpen ? (isHi ? "मार्गदर्शिका छुपाएं" : "Hide Guide") : (isHi ? "मार्गदर्शिका दिखाएं" : "Show Guide")}
            >
              {isGuideOpen ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isHi ? "मार्गदर्शिका छुपाएं" : "Hide Guide"}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-[#0F3D66] dark:text-sky-400" />
                  <span>{isHi ? "मार्गदर्शिका दिखाएं" : "Show Guide"}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {isGuideOpen && (
          <CardContent className="p-4 sm:p-5 pt-0 space-y-6">
            {/* Filter Navigation Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  activeTab === "all"
                    ? "bg-[#0F3D66] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isHi ? "सभी खंड" : "All Sections"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("quickstart")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  activeTab === "quickstart"
                    ? "bg-[#0F3D66] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isHi ? "Quick Start (60 सेकंड)" : "Quick Start (60 Sec)"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("steps")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  activeTab === "steps"
                    ? "bg-[#0F3D66] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isHi ? "12 चरण मार्गदर्शिका" : "12-Step Guide"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reference")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  activeTab === "reference"
                    ? "bg-[#0F3D66] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isHi ? "फीचर संदर्भ" : "Feature Reference"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("principles")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  activeTab === "principles"
                    ? "bg-[#0F3D66] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isHi ? "महत्वपूर्ण बातें" : "Key Principles"}
              </button>
            </div>

            {/* SECTION 1: Quick Start — First 60 Seconds */}
            {(activeTab === "all" || activeTab === "quickstart") && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/50 text-[#0F3D66] dark:text-sky-300 font-bold border-sky-300 dark:border-sky-800">
                    {isHi ? "प्रारंभिक चरण" : "Immediate Onboarding"}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#2563EB]" />
                    <span>{isHi ? "Quick Start — पहले 60 सेकंड" : "Quick Start — First 60 Seconds"}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
                  {quickStartSteps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={step.num}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between space-y-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-[#0F3D66] text-white text-[10px] font-bold flex items-center justify-center">
                            {step.num}
                          </span>
                          <StepIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                        </div>
                        <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {step.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 2: 12-Step Operational Guide */}
            {(activeTab === "all" || activeTab === "steps") && (
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border-indigo-300 dark:border-indigo-800">
                      {isHi ? "विस्तृत परिचालन प्रक्रिया" : "Standard Operating Workflow"}
                    </Badge>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isHi ? "12-चरणीय परिचालन मार्गदर्शिका" : "12-Step Operational Guide"}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    {isHi ? "प्रत्येक मॉड्यूल की भूमिका और उपयोग" : "Module roles and usage guidelines"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {operationalSteps.map((step) => {
                    const StepIcon = step.icon;
                    const isExpanded = expandedStep === step.number;
                    return (
                      <Card
                        key={step.number}
                        className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <CardHeader className="p-3.5 pb-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-[#0F3D66] text-white text-xs font-black flex items-center justify-center shrink-0">
                                {String(step.number).padStart(2, "0")}
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {step.badge}
                              </Badge>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center shrink-0">
                              <StepIcon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {step.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3.5 pt-0 space-y-2.5 text-xs">
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            {step.description}
                          </p>

                          {step.importantNote && (
                            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5 leading-snug">
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{step.importantNote}</span>
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800">
                            {step.route ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={step.route}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F3D66] dark:text-blue-400 hover:underline"
                                >
                                  <span>{step.routeName}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                                {step.secondaryRoute && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <Link
                                      href={step.secondaryRoute}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                                    >
                                      <span>{step.secondaryRouteName}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                {isHi ? "शीर्ष पट्टी से बदलें" : "Header context selector"}
                              </span>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                              className="text-[10px] h-6 px-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-0.5 ml-auto"
                              aria-expanded={isExpanded}
                            >
                              <span>{isExpanded ? (isHi ? "कम" : "Less") : (isHi ? "विस्तृत" : "Details")}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>

                          {isExpanded && step.extendedDetails && (
                            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                              {step.extendedDetails}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 3: Quick Reference ("Which feature should I use?") */}
            {(activeTab === "all" || activeTab === "reference") && (
              <section className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold border-purple-300 dark:border-purple-800">
                    {isHi ? "त्वरित मार्गदर्शन" : "Feature Selector"}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isHi ? "कौन सा फीचर कब उपयोग करें?" : "Which feature should I use?"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {quickReferenceItems.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.route}
                        className="group p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col justify-between space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0F3D66] dark:group-hover:text-blue-400 flex items-center gap-1.5">
                            <ItemIcon className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span className="truncate">{item.feature}</span>
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#0F3D66] dark:group-hover:text-blue-400 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {item.purpose}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 4: Operational Principles ("Important things to remember") */}
            {(activeTab === "all" || activeTab === "principles") && (
              <section className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border-amber-300 dark:border-amber-800">
                    {isHi ? "परिचालन सिद्धांत" : "Operational Principles"}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isHi ? "महत्वपूर्ण बातें (Important Things to Remember)" : "Important things to remember"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {operationalPrinciples.map((principle, idx) => {
                    const PrincipleIcon = principle.icon;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${principle.color} shadow-2xs`}
                      >
                        <PrincipleIcon className={`w-4 h-4 shrink-0 mt-0.5 ${principle.iconColor}`} />
                        <p className="text-xs leading-relaxed font-medium">
                          {isHi ? principle.hi : principle.en}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 5: Profile Context Reminder */}
            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <UserCheck className="w-4 h-4 text-[#0F3D66] dark:text-sky-400 shrink-0" />
                <span className="font-semibold">
                  {isHi ? "आपकी परिचालन प्रोफ़ाइल:" : "Your Operational Profile:"}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {isHi
                    ? "अपना पद, विभाग, जिला और संपर्क जानकारी सही रखें ताकि परिचालन workflows आपके खाते के साथ सही तरीके से जुड़े रहें."
                    : "Keep your designation, department, district and contact information accurate so operational workflows remain correctly associated with your account."}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-slate-500 shrink-0 font-mono">
                {isHi ? "नियम 10 व 17 अनुपालन" : "Rules 10 & 17 Protected"}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
