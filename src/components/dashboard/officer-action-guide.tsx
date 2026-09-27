"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  CheckSquare2,
  Square,
  RotateCcw,
  Landmark,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

export type RiskTier = "SEVERE" | "HIGH" | "MODERATE" | "LOW";

export interface ActionItem {
  id: string;
  hindi: string;
  english: string;
  urgent?: boolean;
}

export interface OfficerSection {
  id: "dm" | "sdm" | "field";
  roleHindi: string;
  roleEnglish: string;
  icon: React.ElementType;
  items: ActionItem[];
}

export interface OfficerActionGuideProps {
  /** Risk level from live flood/disaster risk assessment (e.g. SEVERE, HIGH, MODERATE, LOW) */
  riskLevel?: string | null;
  /** Optional custom class name */
  className?: string;
}

/** Normalize arbitrary risk strings to 4 standard tiers */
function normalizeRiskLevel(risk?: string | null): RiskTier {
  if (!risk) return "MODERATE";
  const upper = risk.trim().toUpperCase();
  if (["SEVERE", "CRITICAL", "RED"].includes(upper)) return "SEVERE";
  if (["HIGH", "ALERT", "ORANGE"].includes(upper)) return "HIGH";
  if (["MODERATE", "ADVISORY", "MEDIUM", "YELLOW"].includes(upper)) return "MODERATE";
  if (["LOW", "NORMAL", "SAFE", "GREEN"].includes(upper)) return "LOW";
  return "MODERATE";
}

/** Action configurations for each risk tier adhering strictly to Disaster Management Act 2005 */
const ACTION_GUIDES: Record<
  RiskTier,
  {
    tier: RiskTier;
    dotEmoji: string;
    headerHindi: string;
    headerEnglish: string;
    descriptionHindi: string;
    descriptionEnglish: string;
    cardBorderClass: string;
    cardBgClass: string;
    headerBadgeBg: string;
    accentColor: string;
    sections: OfficerSection[];
  }
> = {
  SEVERE: {
    tier: "SEVERE",
    dotEmoji: "🔴",
    headerHindi: "🔴 अति गंभीर स्थिति - तत्काल कार्रवाई आवश्यक",
    headerEnglish: "SEVERE SITUATION - IMMEDIATE ACTION REQUIRED",
    descriptionHindi: "आपदा प्रबंधन अधिनियम 2005 की धारा 30/34 के अंतर्गत आपातकालीन अधिकार सक्रिय। जीवन रक्षा एवं त्वरित निकासी सर्वोच्च प्राथमिकता।",
    descriptionEnglish: "Emergency powers activated under Sections 30/34 of Disaster Management Act 2005. Preservation of life and mass evacuation are highest priority.",
    cardBorderClass: "border-2 border-red-500/90 dark:border-red-600 shadow-sm",
    cardBgClass: "bg-red-50/70 dark:bg-red-950/20",
    headerBadgeBg: "bg-red-600 text-white",
    accentColor: "#DC2626",
    sections: [
      {
        id: "dm",
        roleHindi: "जिला मजिस्ट्रेट के लिए",
        roleEnglish: "For District Magistrate",
        icon: Landmark,
        items: [
          {
            id: "sev-dm-1",
            hindi: "DDMA आपात बैठक बुलाएं",
            english: "Convene emergency DDMA meeting",
            urgent: true,
          },
          {
            id: "sev-dm-2",
            hindi: "जिले में आपदा घोषित करने पर विचार करें",
            english: "Consider declaring disaster in district",
            urgent: true,
          },
          {
            id: "sev-dm-3",
            hindi: "राज्य से NDRF सहायता का अनुरोध करें",
            english: "Request NDRF assistance from state",
            urgent: true,
          },
          {
            id: "sev-dm-4",
            hindi: "सभी विभागाध्यक्षों को सतर्क करें",
            english: "Alert all department heads",
            urgent: true,
          },
          {
            id: "sev-dm-5",
            hindi: "निकासी आदेश जारी करने पर विचार करें",
            english: "Consider issuing evacuation order",
            urgent: true,
          },
        ],
      },
      {
        id: "sdm",
        roleHindi: "SDM और तहसीलदार के लिए",
        roleEnglish: "For SDM and Tehsildar",
        icon: ShieldCheck,
        items: [
          {
            id: "sev-sdm-1",
            hindi: "नदी तटीय गांवों को तत्काल सतर्क करें",
            english: "Immediately alert riverbank villages",
            urgent: true,
          },
          {
            id: "sev-sdm-2",
            hindi: "आश्रय स्थल तुरंत खोलें",
            english: "Open shelters immediately",
            urgent: true,
          },
          {
            id: "sev-sdm-3",
            hindi: "SDRF दल तैनात करें",
            english: "Deploy SDRF teams",
            urgent: true,
          },
          {
            id: "sev-sdm-4",
            hindi: "पुलिस को सीमा नियंत्रण के लिए कहें",
            english: "Ask police for perimeter control",
            urgent: true,
          },
        ],
      },
      {
        id: "field",
        roleHindi: "क्षेत्र अधिकारियों के लिए",
        roleEnglish: "For Field Officers",
        icon: Radio,
        items: [
          {
            id: "sev-fld-1",
            hindi: "हर 30 मिनट में रिपोर्ट भेजें",
            english: "Send report every 30 minutes",
            urgent: true,
          },
          {
            id: "sev-fld-2",
            hindi: "लोगों को ऊंचे स्थान पर ले जाएं",
            english: "Move people to high ground",
            urgent: true,
          },
          {
            id: "sev-fld-3",
            hindi: "अकेले काम न करें",
            english: "Do not work alone",
            urgent: true,
          },
          {
            id: "sev-fld-4",
            hindi: "EOC से संपर्क में रहें",
            english: "Stay in contact with EOC",
            urgent: true,
          },
        ],
      },
    ],
  },
  HIGH: {
    tier: "HIGH",
    dotEmoji: "🟠",
    headerHindi: "🟠 उच्च जोखिम स्थिति - त्वरित तैयारी और एहतियाती कार्रवाई",
    headerEnglish: "HIGH RISK SITUATION - PROMPT PREPAREDNESS & PREVENTIVE ACTION",
    descriptionHindi: "आपदा प्रबंधन नियंत्रण कक्ष 24x7 सक्रिय। अग्रिम दल तैनाती एवं संभावित जलभराव क्षेत्रों की निगरानी सुनिश्चित करें।",
    descriptionEnglish: "Disaster management control room active 24x7. Ensure forward team pre-positioning and low-lying area surveillance.",
    cardBorderClass: "border-2 border-orange-500/90 dark:border-orange-600 shadow-sm",
    cardBgClass: "bg-orange-50/70 dark:bg-orange-950/20",
    headerBadgeBg: "bg-orange-600 text-white",
    accentColor: "#EA580C",
    sections: [
      {
        id: "dm",
        roleHindi: "जिला मजिस्ट्रेट के लिए",
        roleEnglish: "For District Magistrate",
        icon: Landmark,
        items: [
          {
            id: "high-dm-1",
            hindi: "DDMA नियंत्रण कक्ष को 24x7 सक्रिय करें",
            english: "Activate DDMA emergency control room 24x7",
          },
          {
            id: "high-dm-2",
            hindi: "राहत दलों (NDRF/SDRF) को अग्रिम तैनाती पर रखें",
            english: "Place relief teams (NDRF/SDRF) on standby/pre-positioning",
          },
          {
            id: "high-dm-3",
            hindi: "राशन, दवा और पेयजल के बफर स्टॉक की समीक्षा करें",
            english: "Review buffer stocks of food, medicine and potable water",
          },
          {
            id: "high-dm-4",
            hindi: "संभावित जलभराव क्षेत्रों की निकासी योजना तैयार रखें",
            english: "Keep evacuation plans ready for low-lying vulnerable areas",
          },
          {
            id: "high-dm-5",
            hindi: "राज्य आपदा प्रबंधन प्राधिकरण (SDMA) को स्थिति ब्रीफ करें",
            english: "Brief SDMA on emerging district situation",
          },
        ],
      },
      {
        id: "sdm",
        roleHindi: "SDM और तहसीलदार के लिए",
        roleEnglish: "For SDM and Tehsildar",
        icon: ShieldCheck,
        items: [
          {
            id: "high-sdm-1",
            hindi: "संवेदनशील क्षेत्रों और तटबंधों का स्थलीय निरीक्षण करें",
            english: "Inspect vulnerable embankments and low-lying zones",
          },
          {
            id: "high-sdm-2",
            hindi: "बाढ़ आश्रयों में जनरेटर और पेयजल सुनिश्चित करें",
            english: "Ensure generators and drinking water at designated flood shelters",
          },
          {
            id: "high-sdm-3",
            hindi: "नदी जलस्तर गेज और नालों की प्रति घंटा निगरानी करें",
            english: "Monitor river gauges and drainage outfalls hourly",
          },
          {
            id: "high-sdm-4",
            hindi: "लाउडस्पीकर से सार्वजनिक सतर्कता घोषणाएं कराएं",
            english: "Conduct public awareness announcements via loudspeakers",
          },
        ],
      },
      {
        id: "field",
        roleHindi: "क्षेत्र अधिकारियों के लिए",
        roleEnglish: "For Field Officers",
        icon: Radio,
        items: [
          {
            id: "high-fld-1",
            hindi: "हर 1 घंटे में स्थिति रिपोर्ट EOC को प्रेषित करें",
            english: "Send ground status report to EOC every hour",
          },
          {
            id: "high-fld-2",
            hindi: "जलभराव और मार्ग अवरोधों की जीपीएस मैपिंग करें",
            english: "Map waterlogged spots and blocked routes with GPS",
          },
          {
            id: "high-fld-3",
            hindi: "बचाव बोट और रस्सियों की परिचालन जांच करें",
            english: "Perform operational check on rescue boats and ropes",
          },
          {
            id: "high-fld-4",
            hindi: "स्थानीय ग्राम प्रधानों एवं स्वयंसेवकों से संपर्क बनाए रखें",
            english: "Maintain direct contact with village heads and volunteers",
          },
        ],
      },
    ],
  },
  MODERATE: {
    tier: "MODERATE",
    dotEmoji: "🟡",
    headerHindi: "🟡 मध्यम जोखिम - प्रारंभिक तैयारी और निरंतर निगरानी",
    headerEnglish: "MODERATE RISK - PREPARATORY ACTIONS & CONTINUOUS MONITORING",
    descriptionHindi: "सावधानी एवं विभागीय समन्वय आवश्यक। जलभराव बिंदुओं, नालों और संचार प्रणालियों की पूर्व-सत्यापना करें।",
    descriptionEnglish: "Precaution and inter-departmental coordination required. Pre-verify drainage culverts and emergency communication.",
    cardBorderClass: "border-2 border-amber-400 dark:border-amber-500 shadow-sm",
    cardBgClass: "bg-amber-50/70 dark:bg-amber-950/20",
    headerBadgeBg: "bg-amber-600 text-white",
    accentColor: "#D97706",
    sections: [
      {
        id: "dm",
        roleHindi: "जिला मजिस्ट्रेट के लिए",
        roleEnglish: "For District Magistrate",
        icon: Landmark,
        items: [
          {
            id: "mod-dm-1",
            hindi: "संबंधित विभागों को मौसम एडवाइजरी जारी करें",
            english: "Issue weather advisory to key line departments",
          },
          {
            id: "mod-dm-2",
            hindi: "आपातकालीन संचार व वायरलेस नेटवर्क की जांच करें",
            english: "Verify emergency wireless and satellite communication networks",
          },
          {
            id: "mod-dm-3",
            hindi: "तालुक स्तर के नियंत्रण कक्षों की तत्परता जांचें",
            english: "Check readiness of sub-divisional/taluk control rooms",
          },
          {
            id: "mod-dm-4",
            hindi: "संसाधन सूची और राहत दलों की उपलब्धता की पुष्टि करें",
            english: "Confirm inventory of rescue resources and team readiness",
          },
        ],
      },
      {
        id: "sdm",
        roleHindi: "SDM और तहसीलदार के लिए",
        roleEnglish: "For SDM and Tehsildar",
        icon: ShieldCheck,
        items: [
          {
            id: "mod-sdm-1",
            hindi: "नालों और पुलियाओं की सफाई और ड्रेनेज क्लियरेंस सत्यापित करें",
            english: "Verify desilting and clearing of culverts and drains",
          },
          {
            id: "mod-sdm-2",
            hindi: "आश्रय स्थलों की सूची और संपर्क विवरण अद्यतन करें",
            english: "Update shelter directory and nodal officer contact list",
          },
          {
            id: "mod-sdm-3",
            hindi: "पंचायतों और ग्राम सचिवों को सतर्क रहने का निर्देश दें",
            english: "Instruct panchayat secretaries to remain on standby",
          },
          {
            id: "mod-sdm-4",
            hindi: "जलभराव संभावित निचले इलाकों की अग्रिम पहचान करें",
            english: "Pre-identify low-lying water stagnation points",
          },
        ],
      },
      {
        id: "field",
        roleHindi: "क्षेत्र अधिकारियों के लिए",
        roleEnglish: "For Field Officers",
        icon: Radio,
        items: [
          {
            id: "mod-fld-1",
            hindi: "प्रमुख जलभराव बिंदुओं और पुलियों का निरीक्षण करें",
            english: "Inspect major water accumulation points and culverts",
          },
          {
            id: "mod-fld-2",
            hindi: "वायरलेस हैंडसेट और बैटरी बैकअप चार्ज रखें",
            english: "Keep wireless handsets and battery packs fully charged",
          },
          {
            id: "mod-fld-3",
            hindi: "किसी भी असामान्य जलस्तर वृद्धि की तुरंत सूचना दें",
            english: "Immediately report any abnormal water level surge to EOC",
          },
          {
            id: "mod-fld-4",
            hindi: "प्राथमिक चिकित्सा किट और आपात किट तैयार रखें",
            english: "Keep first aid kits and emergency gear ready",
          },
        ],
      },
    ],
  },
  LOW: {
    tier: "LOW",
    dotEmoji: "🟢",
    headerHindi: "🟢 सामान्य / कम जोखिम - मानक निगरानी और नियमित समीक्षा",
    headerEnglish: "LOW RISK - STANDARD MONITORING & ROUTINE REVIEW",
    descriptionHindi: "मानक संचालन प्रक्रियाएं लागू। सामान्य मौसम पूर्वानुमान, जल निकासी एवं राहत सामग्री का नियमित ऑडिट जारी रखें।",
    descriptionEnglish: "Standard Operating Procedures in effect. Continue routine weather telemetry monitoring, drainage desilting, and stockpile checks.",
    cardBorderClass: "border-2 border-emerald-500/90 dark:border-emerald-600 shadow-sm",
    cardBgClass: "bg-emerald-50/70 dark:bg-emerald-950/20",
    headerBadgeBg: "bg-emerald-700 text-white",
    accentColor: "#15803D",
    sections: [
      {
        id: "dm",
        roleHindi: "जिला मजिस्ट्रेट के लिए",
        roleEnglish: "For District Magistrate",
        icon: Landmark,
        items: [
          {
            id: "low-dm-1",
            hindi: "दैनिक मौसम बुलेटिन और नदी जलस्तर रिपोर्ट की समीक्षा",
            english: "Review daily weather bulletin and river gauge reports",
          },
          {
            id: "low-dm-2",
            hindi: "आपदा प्रबंधन सामग्री और उपकरणों का त्रैमासिक ऑडिट",
            english: "Audit disaster relief stockpiles and machinery readiness",
          },
          {
            id: "low-dm-3",
            hindi: "विभागवार नोडल अधिकारियों की ड्यूटी रोस्टर अद्यतन रखें",
            english: "Maintain updated departmental nodal officer duty roster",
          },
        ],
      },
      {
        id: "sdm",
        roleHindi: "SDM और तहसीलदार के लिए",
        roleEnglish: "For SDM and Tehsildar",
        icon: ShieldCheck,
        items: [
          {
            id: "low-sdm-1",
            hindi: "जल निकायों और नालों की नियमित सफाई की निगरानी",
            english: "Monitor routine desilting of stormwater drains and canals",
          },
          {
            id: "low-sdm-2",
            hindi: "सामुदायिक चेतावनी प्रणालियों और सायरन का नियमित परीक्षण",
            english: "Conduct periodic tests of public sirens and alert systems",
          },
          {
            id: "low-sdm-3",
            hindi: "राहत शिविरों और आश्रय स्थलों का बुनियादी ढांचा निरीक्षण",
            english: "Inspect civic infrastructure at designated relief shelters",
          },
        ],
      },
      {
        id: "field",
        roleHindi: "क्षेत्र अधिकारियों के लिए",
        roleEnglish: "For Field Officers",
        icon: Radio,
        items: [
          {
            id: "low-fld-1",
            hindi: "स्वचालित वर्षामापी (ARG) टेलीमेट्री का सामान्य लॉगिंग",
            english: "Log regular automatic rain gauge (ARG) telemetry",
          },
          {
            id: "low-fld-2",
            hindi: "क्षेत्रीय आपदा उपकरणों की नियमित सर्विसिंग व रखरखाव",
            english: "Perform periodic servicing of field emergency equipment",
          },
          {
            id: "low-fld-3",
            hindi: "सामान्य संचार जांच (रेडियो/हॉटलाइन चेक) पूरा करें",
            english: "Complete routine communication checks (radio/hotline check)",
          },
        ],
      },
    ],
  },
};

export function OfficerActionGuide({ riskLevel, className }: OfficerActionGuideProps) {
  const locale = useLocale();

  // Normalize live risk from props
  const liveTier = useMemo(() => normalizeRiskLevel(riskLevel), [riskLevel]);

  // Allow officer or evaluator to preview other SOP tiers (defaults to live tier)
  const [selectedTier, setSelectedTier] = useState<RiskTier>(liveTier);

  // Sync selected tier when live risk level prop updates
  useEffect(() => {
    setSelectedTier(liveTier);
  }, [liveTier]);

  // Overall guide collapse state:
  // "Default is expanded when risk is HIGH or SEVERE, collapsed when MODERATE or LOW."
  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(() => {
    return liveTier === "SEVERE" || liveTier === "HIGH";
  });

  // Track if user manually toggled the guide
  const [userToggled, setUserToggled] = useState<boolean>(false);

  // Re-evaluate default when selectedTier changes (if user hasn't manually collapsed/expanded)
  useEffect(() => {
    if (!userToggled) {
      setIsGuideExpanded(selectedTier === "SEVERE" || selectedTier === "HIGH");
    }
  }, [selectedTier, userToggled]);

  // Collapsible accordion panels state for the three sections
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    dm: true,
    sdm: true,
    field: true,
  });

  // Checkbox state for visual tracking during this session only
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const togglePanel = (panelId: string) => {
    setOpenPanels((prev) => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const resetAllChecks = () => {
    setCheckedItems({});
  };

  const currentGuide = ACTION_GUIDES[selectedTier];

  // Calculate total and completed checks for the current tier
  const tierStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    currentGuide.sections.forEach((sec) => {
      sec.items.forEach((item) => {
        total += 1;
        if (checkedItems[item.id]) {
          completed += 1;
        }
      });
    });
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [currentGuide, checkedItems]);

  return (
    <section
      aria-label="Officer Action Guide"
      className={cn(
        "rounded-xl transition-all duration-200 overflow-hidden bg-card text-card-foreground",
        currentGuide.cardBorderClass,
        className
      )}
    >
      {/* Top Banner / Card Header */}
      <div
        className={cn(
          "px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b",
          currentGuide.cardBgClass,
          selectedTier === "SEVERE" && "border-red-200 dark:border-red-900/60",
          selectedTier === "HIGH" && "border-orange-200 dark:border-orange-900/60",
          selectedTier === "MODERATE" && "border-amber-200 dark:border-amber-900/60",
          selectedTier === "LOW" && "border-emerald-200 dark:border-emerald-900/60"
        )}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs",
              selectedTier === "SEVERE" && "bg-red-600 text-white animate-pulse",
              selectedTier === "HIGH" && "bg-orange-600 text-white",
              selectedTier === "MODERATE" && "bg-amber-500 text-white",
              selectedTier === "LOW" && "bg-emerald-600 text-white"
            )}
            aria-hidden="true"
          >
            {selectedTier === "SEVERE" ? (
              <ShieldAlert className="w-5 h-5" />
            ) : selectedTier === "HIGH" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : selectedTier === "MODERATE" ? (
              <Info className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{locale === "hi" ? currentGuide.headerHindi : currentGuide.headerEnglish}</span>
            </h2>
          </div>
        </div>

        {/* Header Right Actions: Tier Filter / Drill preview + Main Collapse Toggle */}
        <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
          {/* Quick SOP Tier Switcher (allows evaluators/officers to preview all risk tiers) */}
          <div className="inline-flex items-center rounded-lg border bg-white/90 dark:bg-slate-900/90 p-0.5 shadow-2xs text-xs font-semibold">
            {(["SEVERE", "HIGH", "MODERATE", "LOW"] as RiskTier[]).map((tier) => {
              const isSelected = selectedTier === tier;
              const isLive = liveTier === tier;
              const tierLabel =
                tier === "SEVERE"
                  ? locale === "hi" ? "🔴 अति गंभीर" : "🔴 Severe"
                  : tier === "HIGH"
                  ? locale === "hi" ? "🟠 उच्च" : "🟠 High"
                  : tier === "MODERATE"
                  ? locale === "hi" ? "🟡 मध्यम" : "🟡 Moderate"
                  : locale === "hi" ? "🟢 सामान्य" : "🟢 Low";

              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setSelectedTier(tier);
                    setUserToggled(false);
                  }}
                  className={cn(
                    "px-2 py-1 rounded-md transition-all text-[11px] font-bold flex items-center gap-1",
                    isSelected
                      ? tier === "SEVERE"
                        ? "bg-red-600 text-white shadow-2xs"
                        : tier === "HIGH"
                        ? "bg-orange-600 text-white shadow-2xs"
                        : tier === "MODERATE"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-emerald-700 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title={
                    isLive
                      ? locale === "hi"
                        ? `${tier} (लाइव जिला स्थिति)`
                        : `${tier} (Live District State)`
                      : locale === "hi"
                      ? `${tier} एसओपी पूर्वावलोकन`
                      : `${tier} SOP Preview`
                  }
                >
                  <span>{tierLabel}</span>
                  {isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Master Collapse / Expand Button */}
          <button
            type="button"
            onClick={() => {
              setIsGuideExpanded(!isGuideExpanded);
              setUserToggled(true);
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition"
            aria-expanded={isGuideExpanded}
            aria-label={isGuideExpanded ? "निर्देशिका सिकोड़ें (Collapse Guide)" : "निर्देशिका विस्तार करें (Expand Guide)"}
          >
            <span>
              {isGuideExpanded
                ? locale === "hi"
                  ? "गाइड सिकोड़ें"
                  : "Collapse Guide"
                : locale === "hi"
                ? "गाइड देखें"
                : "Expand Guide"}
            </span>
            {isGuideExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {isGuideExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Subtitle / Operational Intent & Session Reset Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                {locale === "hi" ? currentGuide.descriptionHindi : currentGuide.descriptionEnglish}
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    {locale === "hi"
                      ? "आपदा प्रबंधन प्रोटोकॉल: प्रशासनिक एवं फील्ड नोडल अधिकारियों के लिए मानक संचालन प्रक्रिया"
                      : "Disaster Management Protocol: Standard Operating Procedures for Nodal & Field Officers"}
                  </span>
                </span>
              </div>
            </div>

            {/* Session Checklist Progress & Reset */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {tierStats.completed}/{tierStats.total}{" "}
                  <span className="font-normal text-slate-500">
                    ({tierStats.percent}% {locale === "hi" ? "पूर्ण" : "Completed"})
                  </span>
                </div>
              </div>
              {tierStats.completed > 0 && (
                <button
                  type="button"
                  onClick={resetAllChecks}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-medium transition"
                  title={locale === "hi" ? "सत्र चेकलिस्ट रीसेट करें" : "Reset session checklist"}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{locale === "hi" ? "रीसेट" : "Reset"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Three Accordion Panels: DM, SDM/Tehsildar, Field Officers */}
          <div className="space-y-3">
            {currentGuide.sections.map((section) => {
              const isPanelOpen = openPanels[section.id] !== false;
              const completedCount = section.items.filter((item) => checkedItems[item.id]).length;
              const allDone = completedCount === section.items.length;
              const SectionIcon = section.icon;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "rounded-lg border bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all",
                    allDone
                      ? "border-emerald-300 dark:border-emerald-800/60"
                      : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  {/* Panel Accordion Header */}
                  <button
                    type="button"
                    onClick={() => togglePanel(section.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    aria-expanded={isPanelOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                          section.id === "dm"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : section.id === "sdm"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                        )}
                      >
                        <SectionIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {locale === "hi" ? section.roleHindi : section.roleEnglish}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-bold tabular-nums",
                          allDone
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : completedCount > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {completedCount}/{section.items.length}{" "}
                        <span className="hidden sm:inline">
                          {locale === "hi" ? "पूर्ण" : "Done"}
                        </span>
                      </span>

                      {isPanelOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Panel Items List */}
                  {isPanelOpen && (
                    <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {section.items.map((item) => {
                        const isChecked = !!checkedItems[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                              "py-2.5 flex items-start gap-3 cursor-pointer rounded-md px-2 -mx-2 transition select-none",
                              isChecked
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-500 dark:text-slate-400"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                            )}
                            role="checkbox"
                            aria-checked={isChecked}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                toggleItem(item.id);
                              }
                            }}
                          >
                            <div className="pt-0.5 shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400">
                              {isChecked ? (
                                <CheckSquare2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-sm font-medium leading-snug",
                                    isChecked && "line-through text-slate-500 dark:text-slate-400",
                                    !isChecked && item.urgent && "font-bold text-red-700 dark:text-red-400"
                                  )}
                                >
                                  {locale === "hi" ? item.hindi : item.english}
                                </span>
                                {item.urgent && !isChecked && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                    {locale === "hi" ? "तत्काल" : "Immediate"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Footer: Session Checkbox Note & Legal Reference */}
          <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            {/* Session Note */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 italic">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                ये चेकबॉक्स केवल इस सत्र के लिए हैं (पृष्ठ रीफ्रेश पर रीसेट होते हैं) &bull; These checkboxes are for this session only (resets on page refresh).
              </span>
            </div>

            {/* Legal Reference */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium shrink-0 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>
                आपदा प्रबंधन अधिनियम 2005 के अनुसार &bull; As per Disaster Management Act 2005
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default OfficerActionGuide;
