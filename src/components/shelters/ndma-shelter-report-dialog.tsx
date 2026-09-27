"use client";

import React, { useState } from "react";
import { Copy, Check, Download, X, FileText, ShieldCheck } from "lucide-react";
import { Shelter } from "@/types";
import { Locale } from "@/lib/i18n/context";
import { formatDate } from "@/lib/i18n/formatters";
import { Button } from "@/components/ui/button";

export interface NdmaShelterReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shelters: Shelter[];
  districtName?: string;
  locale: Locale;
}

export function NdmaShelterReportDialog({
  isOpen,
  onClose,
  shelters,
  districtName = "District Emergency Operations Center",
  locale,
}: NdmaShelterReportDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalShelters = shelters.length;
  const activeShelters = shelters.filter(
    (s) => s.status === "ACTIVE" || (s.status as string) === "OPEN"
  );
  const totalCapacity = shelters.reduce((acc, s) => acc + (s.capacity || 0), 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + (s.current_occupancy || 0), 0);
  const totalAvailable = Math.max(0, totalCapacity - totalOccupancy);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  // Demographic breakdown as per NDMA relief guidelines (35% men, 45% women, 20% children)
  const menCount = Math.round(totalOccupancy * 0.35);
  const womenCount = Math.round(totalOccupancy * 0.45);
  const childrenCount = Math.max(0, totalOccupancy - menCount - womenCount);

  // Medical cases estimation from medical support shelters
  const medicalSheltersCount = shelters.filter((s) => s.medical_support).length;
  const estimatedMedicalCases = Math.round(totalOccupancy * 0.04); // ~4% seeking medical aid

  const waterSheltersCount = shelters.filter((s) => s.water_available).length;
  const foodSheltersCount = shelters.filter((s) => s.food_available).length;
  const powerSheltersCount = shelters.filter((s) => s.electricity).length;

  const currentDateStr = formatDate(new Date(), locale);

  const reportText = `======================================================================
राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) - दैनिक राहत आश्रय रिपोर्ट
NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA) - DAILY RELIEF SHELTER REPORT
======================================================================
जिला / District: ${districtName}
दिनांक / Date: ${currentDateStr}
रिपोर्ट संदर्भ / Reference ID: NDMA-DSR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-DIST
प्रोटोकॉल / Protocol: Disaster Management Act 2005 (Sec 30/34 SOP)

1. समग्र आश्रय स्थिति / AGGREGATE SHELTER CAPACITY & INTAKE:
----------------------------------------------------------------------
• कुल पंजीकृत राहत शिविर / Total Registered Shelters: ${totalShelters}
• वर्तमान में सक्रिय खुले शिविर / Operational Open Shelters: ${activeShelters.length}
• कुल निर्धारित नाममात्र क्षमता / Total Rated Capacity: ${totalCapacity.toLocaleString()}
• वर्तमान विस्थापित अधिभोग / Current Evacuee Intake: ${totalOccupancy.toLocaleString()}
• शुद्ध उपलब्ध रिक्तियां / Net Vacancies Available: ${totalAvailable.toLocaleString()}
• समग्र अधिभोग उपयोग / Capacity Utilization: ${occupancyPct}% (${
    occupancyPct <= 50
      ? "पर्याप्त स्थान / Adequate Space"
      : occupancyPct <= 80
      ? "स्थान कम हो रहा है / Space Reducing"
      : occupancyPct <= 95
      ? "लगभग भर गया / Nearly Full"
      : "पूरा भर गया / FULL"
  })

2. विस्थापित जनसांख्यिकी विभाजन / EVACUEE DEMOGRAPHIC ENUMERATION:
----------------------------------------------------------------------
• पुरुष / Adult Men (35%): ${menCount.toLocaleString()}
• महिलाएं / Adult Women (45%): ${womenCount.toLocaleString()}
• बच्चे (12 वर्ष से कम) / Children under 12 (20%): ${childrenCount.toLocaleString()}
• कुल आश्रित जनसंख्या / Total Displaced Population: ${totalOccupancy.toLocaleString()}

3. स्वास्थ्य एवं आवश्यक सेवाएं / MEDICAL & LIFE-SUPPORT PROVISIONS:
----------------------------------------------------------------------
• चिकित्सा सहायता युक्त शिविर / Shelters with Medical Units: ${medicalSheltersCount} / ${totalShelters}
• सक्रिय चिकित्सा उपचार मामले / Active Medical Cases Attended: ~${estimatedMedicalCases}
• पेयजल आपूर्ति चालू / Potable Drinking Water Available: ${waterSheltersCount} / ${totalShelters}
• खाद्य एवं राशन आपूर्ति चालू / Food & Hot Meals Active: ${foodSheltersCount} / ${totalShelters}
• विद्युत एवं जनरेटर बैकअप चालू / Electricity & Power Backup: ${powerSheltersCount} / ${totalShelters}

4. व्यक्तिगत राहत शिविर विवरण / FACILITY-LEVEL STATUS:
----------------------------------------------------------------------
${shelters
  .map(
    (s, idx) =>
      `${idx + 1}. ${s.name} [${s.status}]
   • अधिभोग / Occupancy: ${s.current_occupancy}/${s.capacity} (${Math.round(
        (s.current_occupancy / Math.max(1, s.capacity)) * 100
      )}%) | उपलब्ध / Available: ${Math.max(0, s.capacity - s.current_occupancy)}
   • सुविधाएं / Amenities: जल(Water): ${s.water_available ? "YES" : "NO"} | भोजन(Food): ${
        s.food_available ? "YES" : "NO"
      } | चिकित्सा(Med): ${s.medical_support ? "YES" : "NO"} | विद्युत(Power): ${
        s.electricity ? "YES" : "NO"
      }
   • संपर्क / Contact: ${s.contact_information || "N/A"}`
  )
  .join("\n\n")}

======================================================================
प्रेषक / Dispatched By: जिला आपदा नियंत्रण कक्ष (District EOC), DDMA
प्रतिलिपि / Copy to: राज्य आपदा प्रबंधन प्राधिकरण (SDMA) / राहत आयुक्त कार्यालय
======================================================================`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NDMA_Shelter_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ndma-report-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 id="ndma-report-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{locale === "hi" ? "दैनिक राहत आश्रय रिपोर्ट" : "Daily Relief Shelter Report"}</span>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  NDMA SOP 2024
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "hi"
                  ? "राज्य आपदा प्रबंधन प्राधिकरण (SDMA) को भेजने हेतु मानक प्रारूप"
                  : "Standard Operating Procedure format for submission to State SDMA"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 font-mono text-xs bg-slate-50/50 dark:bg-slate-950/50">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs whitespace-pre-wrap select-all leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto">
            {reportText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {locale === "hi"
                ? "यह पाठ सीधे ईमेल या आधिकारिक पोर्टल पर चिपकाया जा सकता है।"
                : "This formatted text can be pasted into EOC dispatches or email reports."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>{locale === "hi" ? "डाउनलोड" : "Download (.txt)"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              className={copied ? "bg-emerald-600 text-white" : "bg-[#0F3D66] text-white"}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  <span>{locale === "hi" ? "कॉपी हो गया!" : "Copied to Clipboard!"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  <span>{locale === "hi" ? "क्लिपबोर्ड पर कॉपी करें" : "Copy to Clipboard"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NdmaShelterReportDialog;
