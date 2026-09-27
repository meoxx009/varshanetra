"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/lib/i18n/context";

export interface DataHealthPanelProps {
  gpmApiStatus?: "LIVE" | "CACHED" | "DEMO" | "ERROR" | "NOT_CONFIGURED" | "ONLINE";
  radarStatus?: "LIVE" | "STALE" | "ERROR";
  tomorrowStatus?:
    | "LIVE"
    | "DEMO"
    | "ERROR"
    | "NOT_CONFIGURED"
    | "DEGRADED"
    | "AUTH_ERROR"
    | "PERMISSION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "UNAVAILABLE"
    | "CONFIGURED";
  lastFetchTime?: string;
}

export const DataHealthPanel: React.FC<DataHealthPanelProps> = ({
  gpmApiStatus = "LIVE",
  radarStatus = "LIVE",
  tomorrowStatus = "NOT_CONFIGURED",
  lastFetchTime = "Just now",
}) => {
  const locale = useLocale();

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          {locale === "hi"
            ? "डेटा स्वास्थ्य एवं स्रोत स्थिति"
            : "Data Health & Sources Status"}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {locale === "hi" ? "अंतिम अपडेट: " : "Last Updated: "}
          {lastFetchTime}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{locale === "hi" ? "डेटा स्रोत" : "Source"}</TableHead>
            <TableHead>{locale === "hi" ? "स्थिति" : "Status"}</TableHead>
            <TableHead>{locale === "hi" ? "उत्पाद / डेटा" : "Product"}</TableHead>
            <TableHead>{locale === "hi" ? "विलंबता" : "Latency"}</TableHead>
            <TableHead>{locale === "hi" ? "लागत" : "Cost"}</TableHead>
            <TableHead>{locale === "hi" ? "प्रदाता" : "Attribution"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* NASA GPM DATA SOURCE ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🛰️ NASA GPM IMERG via POWER API
            </TableCell>
            <TableCell>
              {(gpmApiStatus === "LIVE" || gpmApiStatus === "ONLINE") && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {locale === "hi" ? "लाइव" : "LIVE"}
                </Badge>
              )}
              {gpmApiStatus === "CACHED" && (
                <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
                  {locale === "hi" ? "कैश्ड" : "CACHED"}
                </Badge>
              )}
              {(gpmApiStatus === "DEMO" || gpmApiStatus === "NOT_CONFIGURED") && (
                <Badge variant="secondary">{locale === "hi" ? "डेमो" : "DEMO"}</Badge>
              )}
              {gpmApiStatus === "ERROR" && (
                <Badge variant="destructive">{locale === "hi" ? "ऑफ़लाइन" : "OFFLINE"}</Badge>
              )}
            </TableCell>
            <TableCell className="text-xs">PRECTOTCORR GPM IMERG</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "1 से 3 दिन (QC)" : "1 to 3 days (QC)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त" : "Free"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">NASA Earth Science</TableCell>
          </TableRow>

          {/* OPEN-METEO ENSEMBLE ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🌐 Open-Meteo Multi-Model NWP
            </TableCell>
            <TableCell>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                {locale === "hi" ? "लाइव" : "LIVE"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">ECMWF IFS / GFS / ICON Ensemble</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "रीयल-टाइम (< 1 घंटा)" : "Real-time (< 1 hr)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त" : "Free"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">Open-Meteo CC BY 4.0</TableCell>
          </TableRow>

          {/* RAINVIEWER GLOBAL RADAR ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🛰️ RainViewer Global Radar
            </TableCell>
            <TableCell>
              {radarStatus === "LIVE" && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {locale === "hi" ? "लाइव" : "LIVE"}
                </Badge>
              )}
              {radarStatus === "STALE" && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-600">
                  {locale === "hi" ? "अतिदेय" : "STALE"}
                </Badge>
              )}
              {radarStatus === "ERROR" && (
                <Badge variant="destructive">{locale === "hi" ? "त्रुटि" : "ERROR"}</Badge>
              )}
            </TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "डॉप्लर कम्पोजिट व नाउकास्ट" : "Doppler Composite & Nowcast"}
            </TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "हर 10 मिनट (2-10 मि. विलंब)" : "Every 10 min (2-10m delay)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त सार्वजनिक एपीआई" : "Free public API"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">RainViewer.com</TableCell>
          </TableRow>

          {/* COPERNICUS EMS ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🇪🇺 Copernicus EMS &amp; GloFAS
            </TableCell>
            <TableCell>
              <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                {locale === "hi" ? "निगरानी" : "MONITORING"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">Rapid Mapping (EMSR) &amp; GloFAS 30d</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "घटना-आधारित / 15 मि. कैश" : "Event-based / 15m Cache"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त सार्वजनिक फीड" : "Free public feed"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">European Space Agency EU</TableCell>
          </TableRow>

          {/* TOMORROW.IO ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🔮 Tomorrow.io Real-Time &amp; Nowcast
            </TableCell>
            <TableCell>
              {tomorrowStatus === "LIVE" && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {locale === "hi" ? "लाइव" : "LIVE"}
                </Badge>
              )}
              {(tomorrowStatus === "DEGRADED" || tomorrowStatus === "RATE_LIMITED") && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-600">
                  {locale === "hi" ? "सीमित" : "DEGRADED"}
                </Badge>
              )}
              {tomorrowStatus === "DEMO" && (
                <Badge className="bg-purple-600 text-white hover:bg-purple-700">
                  {locale === "hi" ? "डेमो" : "DEMO"}
                </Badge>
              )}
              {tomorrowStatus === "CONFIGURED" && (
                <Badge variant="outline" className="text-blue-600 border-blue-400">
                  {locale === "hi" ? "कॉन्फ़िगर किया गया" : "CONFIGURED"}
                </Badge>
              )}
              {tomorrowStatus === "NOT_CONFIGURED" && (
                <Badge variant="secondary">
                  {locale === "hi" ? "कॉन्फ़िगर नहीं" : "NOT CONFIGURED"}
                </Badge>
              )}
              {(tomorrowStatus === "AUTHENTICATION_ERROR" || tomorrowStatus === "AUTH_ERROR") && (
                <Badge variant="destructive">
                  {locale === "hi" ? "प्रमाणीकरण त्रुटि" : "AUTH ERROR"}
                </Badge>
              )}
              {tomorrowStatus === "PERMISSION_ERROR" && (
                <Badge variant="destructive" className="bg-amber-600 text-white hover:bg-amber-700">
                  {locale === "hi" ? "अनुमति त्रुटि" : "PERMISSION ERROR"}
                </Badge>
              )}
              {(tomorrowStatus === "ERROR" || tomorrowStatus === "TIMEOUT" || tomorrowStatus === "UNAVAILABLE") && (
                <Badge variant="destructive">
                  {locale === "hi" ? "ऑफ़लाइन" : "OFFLINE"}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-xs">Proprietary AI NWP 1h/1d Timelines</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "15 मि. कैश (500 कॉल्स/दिन)" : "15m Cache (500 calls/day)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त स्तर" : "Free Tier"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">Tomorrow.io</TableCell>
          </TableRow>

          {/* USGS EARTHQUAKE HAZARDS PROGRAM ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              ⛰️ USGS Earthquake Hazards
            </TableCell>
            <TableCell>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                {locale === "hi" ? "लाइव" : "LIVE"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">Real-time Seismic Events &amp; ShakeMap</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "रीयल-टाइम (घटना के < 5 मि. बाद)" : "Real-time (< 5m after event)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त सार्वजनिक एपीआई" : "Free public API"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">USGS NEIC / ANSS</TableCell>
          </TableRow>

          {/* NASA FIRMS VIIRS C2 FIRE & HEAT ANOMALY ROW */}
          <TableRow>
            <TableCell className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
              🔥 NASA FIRMS VIIRS C2
            </TableCell>
            <TableCell>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                {locale === "hi" ? "लाइव" : "LIVE"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">Thermal Anomalies &amp; Fire Radiative Power</TableCell>
            <TableCell className="text-xs">
              {locale === "hi" ? "प्रत्येक 3 घंटे (NRT)" : "Every 3 hours (NRT)"}
            </TableCell>
            <TableCell className="text-xs font-semibold text-green-600">
              {locale === "hi" ? "मुफ़्त सार्वजनिक एपीआई" : "Free public API"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">NASA EOSDIS / LANCE</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default DataHealthPanel;
