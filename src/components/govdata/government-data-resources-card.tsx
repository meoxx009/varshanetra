"use client";

import React from "react";
import {
  ExternalLink,
  Database,
  CloudRain,
  Waves,
  ShieldAlert,
  Globe2,
  Satellite,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { GovDataBadge } from "@/components/common/gov-data-badge";
import { cn } from "@/lib/utils";

interface OfficialResourceLink {
  domain: string;
  url: string;
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  icon: React.ReactNode;
  iconBg: string;
  tag: string;
}

const OFFICIAL_RESOURCES: OfficialResourceLink[] = [
  {
    domain: "data.gov.in",
    url: "https://data.gov.in",
    titleEn: "India National Data Portal",
    titleHi: "भारत का राष्ट्रीय डेटा पोर्टल",
    descEn: "Open Government Data (OGD) platform providing free API feeds for district rainfall and disaster telemetry.",
    descHi: "ओपन गवर्नमेंट डेटा (OGD) प्लेटफॉर्म जो जिला वर्षा और आपदा टेलीमेट्री के लिए निःशुल्क API प्रदान करता है।",
    icon: <Database className="w-5 h-5 text-amber-700 dark:text-amber-300" />,
    iconBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
    tag: "GOVT PORTAL",
  },
  {
    domain: "mausam.imd.gov.in",
    url: "https://mausam.imd.gov.in",
    titleEn: "IMD Weather Services",
    titleHi: "IMD मौसम सेवाएं",
    descEn: "India Meteorological Department live Doppler radar, nowcasts, and district heavy rainfall color warnings.",
    descHi: "भारत मौसम विज्ञान विभाग का लाइव डॉपलर रडार, नाउकास्ट और जिला भारी वर्षा चेतावनी बुलेटिन।",
    icon: <CloudRain className="w-5 h-5 text-blue-700 dark:text-blue-300" />,
    iconBg: "bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
    tag: "IMD OFFICIAL",
  },
  {
    domain: "ffis.cwc.gov.in",
    url: "https://ffis.cwc.gov.in",
    titleEn: "CWC Flood Forecasting",
    titleHi: "CWC बाढ़ पूर्वानुमान",
    descEn: "Central Water Commission Flood Forecast Information System monitoring river danger water levels nationwide.",
    descHi: "केंद्रीय जल आयोग बाढ़ पूर्वानुमान सूचना प्रणाली, जो देश भर में नदी के खतरे के जलस्तर की निगरानी करती है।",
    icon: <Waves className="w-5 h-5 text-cyan-700 dark:text-cyan-300" />,
    iconBg: "bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800",
    tag: "CWC HYDROLOGY",
  },
  {
    domain: "ndma.gov.in",
    url: "https://ndma.gov.in",
    titleEn: "National Disaster Management Authority",
    titleHi: "राष्ट्रीय आपदा प्रबंधन प्राधिकरण",
    descEn: "Apex statutory body headed by Prime Minister for disaster response policies, NDMA SOPs, and mitigation.",
    descHi: "आपदा प्रबंधन नीतियों, राहत दिशा-निर्देशों एवं राहत प्रतिक्रिया हेतु प्रधानमंत्री की अध्यक्षता वाला शीर्ष निकाय।",
    icon: <ShieldAlert className="w-5 h-5 text-red-700 dark:text-red-300" />,
    iconBg: "bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800",
    tag: "NDMA APEX",
  },
  {
    domain: "bhuvan.nrsc.gov.in",
    url: "https://bhuvan.nrsc.gov.in",
    titleEn: "ISRO Bhuvan Geo-Portal",
    titleHi: "ISRO भुवन भू-पोर्टल",
    descEn: "National Remote Sensing Centre (NRSC) spatial portal with flood inundation mapping and Cartosat DEM.",
    descHi: "राष्ट्रीय सुदूर संवेदन केंद्र (NRSC) का स्थानिक भू-पोर्टल, बाढ़ जलभराव उपग्रह मानचित्र एवं कार्टोसैट DEM।",
    icon: <Globe2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
    tag: "ISRO NRSC",
  },
  {
    domain: "mosdac.gov.in",
    url: "https://mosdac.gov.in",
    titleEn: "ISRO MOSDAC Satellite Data",
    titleHi: "ISRO MOSDAC उपग्रह डेटा",
    descEn: "Meteorological and Oceanographic Satellite Data Archival Centre hosting INSAT-3D/3DR rainfall products.",
    descHi: "मौसम एवं महासागर उपग्रह डेटा संग्रह केंद्र, जहां INSAT-3D/3DR वर्षा हाइड्रोएस्टीमेटर डेटा उपलब्ध है।",
    icon: <Satellite className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />,
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800",
    tag: "ISRO MOSDAC",
  },
];

interface GovernmentDataResourcesCardProps {
  className?: string;
}

export const GovernmentDataResourcesCard: React.FC<GovernmentDataResourcesCardProps> = ({
  className = "",
}) => {
  const locale = useLocale();

  return (
    <Card className={cn("border border-slate-200 dark:border-slate-800 shadow-xs", className)}>
      <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-lg leading-none" role="img" aria-label="Flag of India">
                🇮🇳
              </span>
              <span>{locale === "hi" ? "सरकारी डेटा संसाधन" : "Government Data Resources"}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {locale === "hi"
                ? "भारत सरकार के आधिकारिक पोर्टल्स, मौसम, उपग्रह एवं हाइड्रोलॉजिकल सेवाओं के सीधे लिंक"
                : "Direct verified links to official Government of India open data, meteorological, and hydrological portals"}
            </p>
          </div>

          <GovDataBadge source="data.gov.in" size="sm" />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {OFFICIAL_RESOURCES.map((item) => (
            <a
              key={item.domain}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] dark:hover:border-blue-500 bg-white dark:bg-slate-900/90 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-2xs transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg border", item.iconBg)}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {item.tag}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                      {locale === "hi" ? item.titleHi : item.titleEn}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {locale === "hi" ? item.descHi : item.descEn}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <span className="font-mono">{item.domain}</span>
                <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernmentDataResourcesCard;
