"use client";

import React, { useState } from "react";
import {
  Clock,
  CloudRain,
  Satellite,
  Radio,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

export interface TimelineEvent {
  id: string;
  time: string; // e.g. "14:32"
  relativeTime: string; // e.g. "12m ago"
  source: string;
  category: "meteo" | "satellite" | "radar" | "hazard" | "field";
  summary: string;
  summaryHi: string;
  value?: string;
  severity: "info" | "warning" | "alert";
}

export interface TelemetryTimelineProps {
  districtName?: string;
  events?: TimelineEvent[];
}

export function TelemetryTimeline({
  districtName = "District",
  events: propEvents,
}: TelemetryTimelineProps) {
  const locale = useLocale();
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Default chronological timeline for the last 6 hours
  const defaultEvents: TimelineEvent[] = [
    {
      id: "ev-1",
      time: "14:32",
      relativeTime: "12m ago",
      source: "Open-Meteo",
      category: "meteo",
      summary: "ECMWF & GFS multi-model ensemble forecast cycle refreshed",
      summaryHi: "ईसीएमडब्ल्यूएफ व जीएफएस बहु-मॉडल पूर्वानुमान चक्र अद्यतन",
      value: "24h rainfall forecast 87.0 mm",
      severity: "alert",
    },
    {
      id: "ev-2",
      time: "14:15",
      relativeTime: "29m ago",
      source: "Field Reports (112)",
      category: "field",
      summary: "Field Report received: Severe waterlogging reported near Sector 4 underpass",
      summaryHi: "मैदानी रिपोर्ट प्राप्त: सेक्टर 4 अंडरपास के पास गंभीर जलभराव",
      value: "Waterlogging Ward 5 [UNVERIFIED]",
      severity: "warning",
    },
    {
      id: "ev-3",
      time: "13:45",
      relativeTime: "59m ago",
      source: "NASA GPM IMERG",
      category: "satellite",
      summary: "Calibrated satellite microwave-IR precipitation pass completed",
      summaryHi: "कैलिब्रेटेड उपग्रह माइक्रोवेव-आईआर वर्षा स्कैन संपन्न",
      value: "Yesterday rainfall 65.0 mm recorded",
      severity: "info",
    },
    {
      id: "ev-4",
      time: "13:30",
      relativeTime: "1h 14m ago",
      source: "USGS Seismic",
      category: "hazard",
      summary: "Seismic event detected in regional foothills corridor",
      summaryHi: "क्षेत्रीय तलहटी क्षेत्र में भूकंपीय गतिविधि दर्ज",
      value: "Magnitude 3.8 earthquake 180 km away",
      severity: "warning",
    },
    {
      id: "ev-5",
      time: "13:00",
      relativeTime: "1h 44m ago",
      source: "RainViewer Radar",
      category: "radar",
      summary: "Doppler composite frames synthesized across 120km radius",
      summaryHi: "120 किमी दायरे में डॉपलर कंपोजिट फ्रेम का संश्लेषण संपन्न",
      value: "Precipitation cell approaching from NW (18 dBZ)",
      severity: "info",
    },
    {
      id: "ev-6",
      time: "12:15",
      relativeTime: "2h 29m ago",
      source: "CWC Hydrology",
      category: "hazard",
      summary: "Manual & telemetry river gauge reading recorded at downstream station",
      summaryHi: "डाउनस्ट्रीम स्टेशन पर नदी गेज रीडिंग का अभिलेखन",
      value: "Water level 102.4m (Warning threshold: 104.0m)",
      severity: "info",
    },
    {
      id: "ev-7",
      time: "11:20",
      relativeTime: "3h 24m ago",
      source: "Copernicus EMS",
      category: "satellite",
      summary: "Rapid flood delineation metadata synchronized from EU Copernicus portal",
      summaryHi: "ईयू कोपरनिकस पोर्टल से त्वरित बाढ़ चित्रण मेटाडेटा समकालिक किया गया",
      value: "2 active Indian monsoon flood activations checked",
      severity: "info",
    },
    {
      id: "ev-8",
      time: "09:40",
      relativeTime: "5h 04m ago",
      source: "NASA FIRMS",
      category: "hazard",
      summary: "VIIRS SNPP thermal anomaly swath scanned for emergency relief safety",
      summaryHi: "राहत शिविर सुरक्षा हेतु वीआईआईआरएस थर्मल विसंगति स्कैन संपन्न",
      value: "1 nominal thermal hotspot detected in periphery",
      severity: "info",
    },
  ];

  const events = propEvents || defaultEvents;

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === "all") return true;
    return ev.category === activeFilter;
  });

  const getSourceBadgeStyle = (category: string) => {
    switch (category) {
      case "meteo":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "satellite":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      case "radar":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "hazard":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800";
      case "field":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const getSourceIcon = (category: string) => {
    switch (category) {
      case "meteo":
        return CloudRain;
      case "satellite":
        return Satellite;
      case "radar":
        return Radio;
      case "hazard":
        return Activity;
      case "field":
        return FileSpreadsheet;
      default:
        return Clock;
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{locale === "hi" ? "टेलीमेट्री समयरेखा (विगत 6 घंटे)" : "Telemetry Event Timeline (Past 6 Hours)"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === "hi"
                  ? `${districtName} के सभी डेटा चैनलों के अद्यतन का कालानुक्रमिक विवरण`
                  : `Chronological stream of sensor synchronization and telemetry feeds for ${districtName}`}
              </CardDescription>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="h-7 text-xs px-2.5"
            >
              {locale === "hi" ? "सभी" : "All Feeds"}
            </Button>
            <Button
              variant={activeFilter === "meteo" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("meteo")}
              className="h-7 text-xs px-2.5"
            >
              {locale === "hi" ? "मौसम" : "Meteorology"}
            </Button>
            <Button
              variant={activeFilter === "radar" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("radar")}
              className="h-7 text-xs px-2.5"
            >
              {locale === "hi" ? "रडार" : "Radar"}
            </Button>
            <Button
              variant={activeFilter === "hazard" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("hazard")}
              className="h-7 text-xs px-2.5"
            >
              {locale === "hi" ? "आपदा/भूकंप" : "Hazards"}
            </Button>
            <Button
              variant={activeFilter === "field" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("field")}
              className="h-7 text-xs px-2.5"
            >
              {locale === "hi" ? "मैदानी रिपोर्ट" : "Ground Field"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredEvents.map((event) => {
            const Icon = getSourceIcon(event.category);
            const badgeStyle = getSourceBadgeStyle(event.category);

            return (
              <div key={event.id} className="relative group">
                {/* Timeline Node Icon */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-xs">
                  <Icon className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {event.time}
                      </span>
                      <span className="text-[11px] text-slate-400">({event.relativeTime})</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${badgeStyle}`}>
                        {event.source}
                      </Badge>
                    </div>

                    {event.severity === "alert" && (
                      <Badge className="bg-red-500 text-white text-[10px] px-2 py-0">
                        {locale === "hi" ? "उच्च प्रभाव" : "High Impact"}
                      </Badge>
                    )}
                    {event.severity === "warning" && (
                      <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0">
                        {locale === "hi" ? "ध्यान देने योग्य" : "Action Needed"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {locale === "hi" ? event.summaryHi : event.summary}
                  </p>

                  {event.value && (
                    <div className="mt-2 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 shadow-2xs">
                      <span className="text-slate-400 text-[11px]">→</span>
                      <span>{event.value}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default TelemetryTimeline;
