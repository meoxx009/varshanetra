"use client";

import React from "react";
import { ExternalLink, Database, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

export interface SourceAttributionItem {
  id: string;
  source: string;
  service: string;
  purpose: string;
  purposeHi: string;
  license: string;
  url: string;
  isFree: boolean;
}

export function SourceAttributionFooter() {
  const locale = useLocale();

  const attributions: SourceAttributionItem[] = [
    {
      id: "nasa-gpm",
      source: "NASA POWER API / Goddard GES DISC",
      service: "GPM IMERG Precipitation Telemetry",
      purpose: "Daily and hourly calibrated satellite precipitation estimates",
      purposeHi: "दैनिक और प्रति घंटा कैलिब्रेटेड उपग्रह वर्षा अनुमान",
      license: "NASA Open Data Policy (Public Domain)",
      url: "https://gpm.nasa.gov/data/imerg",
      isFree: true,
    },
    {
      id: "open-meteo",
      source: "Open-Meteo Weather API",
      service: "ECMWF IFS, NOAA GFS & DWD ICON",
      purpose: "Multi-model numerical weather prediction ensemble and 7-day forecast",
      purposeHi: "बहु-मॉडल संख्यात्मक मौसम पूर्वानुमान और 7-दिवसीय अनुमान",
      license: "Open Data Commons / CC-BY 4.0",
      url: "https://open-meteo.com",
      isFree: true,
    },
    {
      id: "rainviewer",
      source: "RainViewer Global Weather Radar",
      service: "Real-time Radar Reflectivity Composite",
      purpose: "10-minute Doppler radar precipitation nowcasting and storm tracking",
      purposeHi: "10-मिनट डॉपलर रडार वर्षा नाउकास्टिंग और तूफान ट्रैकिंग",
      license: "RainViewer API Free Tier",
      url: "https://www.rainviewer.com/api.html",
      isFree: true,
    },
    {
      id: "usgs",
      source: "USGS Earthquake Hazards Program",
      service: "FDSNWS Earthquake Event Web Service",
      purpose: "Real-time global M2.5+ earthquake monitoring and compound landslide hazard",
      purposeHi: "वास्तविक समय भूकंप निगरानी और संयुक्त भूस्खलन जोखिम",
      license: "US Public Domain (Free & Unrestricted)",
      url: "https://earthquake.usgs.gov",
      isFree: true,
    },
    {
      id: "nasa-firms",
      source: "NASA FIRMS (Earthdata)",
      service: "VIIRS SNPP / MODIS Thermal Hotspots",
      purpose: "Active thermal anomaly detection for post-disaster burning and relief camp safety",
      purposeHi: "सक्रिय तापीय विसंगति का पता लगाना एवं राहत शिविर सुरक्षा",
      license: "NASA Earthdata Open Access",
      url: "https://firms.modaps.eosdis.nasa.gov",
      isFree: true,
    },
    {
      id: "copernicus",
      source: "Copernicus Emergency Management Service",
      service: "Rapid Mapping & GloFAS River Telemetry",
      purpose: "European Commission satellite-based rapid emergency and flood extent maps",
      purposeHi: "यूरोपीय आयोग उपग्रह आधारित त्वरित आपातकालीन एवं बाढ़ सीमा मानचित्र",
      license: "EU Copernicus Open Access (Free)",
      url: "https://emergency.copernicus.eu",
      isFree: true,
    },
    {
      id: "govdata",
      source: "data.gov.in (Open Government Data)",
      service: "National Data & Analytics Platform (NDAP)",
      purpose: "Official Indian historical rainfall and hydrometeorological station observations",
      purposeHi: "आधिकारिक भारतीय ऐतिहासिक वर्षा एवं मौसम केंद्र प्रेक्षण",
      license: "Government Open Data License - India (GODL)",
      url: "https://data.gov.in",
      isFree: true,
    },
    {
      id: "osm",
      source: "OpenStreetMap Contributors",
      service: "Cartographic Tiles, Nominatim & Overpass",
      purpose: "District administrative boundaries, critical infrastructure and facility geocoding",
      purposeHi: "जिला प्रशासनिक सीमाएं, महत्वपूर्ण बुनियादी ढांचा और भूकोडिंग",
      license: "Open Database License (ODbL)",
      url: "https://www.openstreetmap.org",
      isFree: true,
    },
    {
      id: "srtm",
      source: "NASA SRTM (Shuttle Radar Topography)",
      service: "30-Meter Global Digital Elevation Model",
      purpose: "Topographic slope, flow accumulation and flood sink elevation modeling",
      purposeHi: "स्थलाकृतिक ढलान, जल संचय और बाढ़ बेसिन ऊंचाई मॉडलिंग",
      license: "NASA / USGS Open Elevation (Public Domain)",
      url: "https://www.earthdata.nasa.gov",
      isFree: true,
    },
    {
      id: "esa-worldcover",
      source: "ESA WorldCover 10m",
      service: "Sentinel-1 & Sentinel-2 Global Land Cover",
      purpose: "High-resolution land use classification, urban impervious surface modeling",
      purposeHi: "उच्च-रिजोल्यूशन भूमि उपयोग वर्गीकरण एवं शहरी अपारगम्य सतह मॉडलिंग",
      license: "Creative Commons Attribution 4.0 International",
      url: "https://esa-worldcover.org",
      isFree: true,
    },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "डेटा स्रोत आभार एवं संस्थागत श्रेय" : "Data Source Attribution & Licensing"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? "वर्षानेत्र में प्रयुक्त सभी 10 अंतरराष्ट्रीय व राष्ट्रीय खुले डेटा प्रदाताओं का पारदर्शी विवरण"
                  : "Complete attribution, scientific references and open data licensing compliance"}
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Open Data Compliance</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {attributions.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {item.source}
                  </h4>
                  {item.isFree && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-extrabold text-[10px] px-2 py-0">
                      FREE
                    </Badge>
                  )}
                </div>

                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  {item.service}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  {locale === "hi" ? item.purposeHi : item.purpose}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono truncate max-w-[210px]">{item.license}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default SourceAttributionFooter;
