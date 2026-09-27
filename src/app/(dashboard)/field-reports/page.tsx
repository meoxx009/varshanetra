"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Camera,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  X,
  XCircle,
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  AlertOctagon,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { SeverityBadge } from "@/components/common/severity-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StructuredFieldReportForm, FieldReportFormData } from "@/components/field-reports/structured-field-report-form";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatStatus, formatDateTime, formatIncidentType } from "@/lib/i18n/formatters";
import {
  FieldReport,
  FieldReportType,
  FIELD_REPORT_TYPES,
  RoadStatus,
  VerificationStatus,
  VERIFICATION_STATUSES,
  SeverityLevel,
  DataSourceMeta,
} from "@/types";
import { enqueueOfflineReport } from "@/lib/storage/offlineStorage";

const FIELD_SOURCE_META: DataSourceMeta = {
  provider: "Ground Field Truth Inspection Desk & Talathi Mobile Ingress",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Direct on-site field observation reports submitted by revenue officers and municipal inspectors. Visually verified ground truth; not a mathematical forecast.",
};

export default function FieldReportsPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tFieldReports = useTranslations("fieldReports");
  const tCommon = useTranslations("common");
  const [viewState, setViewState] = useState<ComponentViewState>("success");

  // Reports data
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState<boolean>(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Geolocation acquisition state
  const [geoStatus, setGeoStatus] = useState<"idle" | "acquiring" | "success" | "denied">("idle");
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    report_type: "Waterlogging" as FieldReportType,
    severity: "ALERT" as SeverityLevel,
    latitude: location.latitude,
    longitude: location.longitude,
    location_name: "",
    observed_water_depth_cm: "" as string | number,
    people_requiring_assistance: "" as string | number,
    road_status: "PARTIALLY_BLOCKED" as RoadStatus,
    description: "",
    photo_url: "",
    photo_thumbnail_url: "",
    observer_name: "Field Officer",
    observer_role: "Revenue Talathi",
    observer_contact: "",
  });

  // Verify form
  const [verifyForm, setVerifyForm] = useState({
    verification_status: "VERIFIED" as VerificationStatus,
    verified_by: "District EOC Duty Officer",
    verification_notes: "",
  });

  // Load Reports
  const fetchReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/field-reports");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load field observations");
      }
      setReports(json.data || []);
      setViewState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to server";
      setErrorMsg(msg);
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Update default coordinates when district location changes
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  }, [location.latitude, location.longitude]);

  // Handle Geolocation with browser navigator.geolocation
  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      setFeedback({
        type: "warning",
        message: "Geolocation is not supported by your device browser. Using district center coordinates.",
      });
      return;
    }

    setGeoStatus("acquiring");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lon = parseFloat(pos.coords.longitude.toFixed(5));
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        setGeoAccuracy(Math.round(pos.coords.accuracy));
        setGeoStatus("success");
        setFeedback({
          type: "success",
          message: `GPS position acquired: ${lat}° N, ${lon}° E (±${Math.round(pos.coords.accuracy)}m accuracy).`,
        });
      },
      (err) => {
        setGeoStatus("denied");
        let msg = "Geolocation permission denied. You can manually enter or tap coordinates on the map.";
        if (err.code === err.TIMEOUT) msg = "Geolocation acquisition timed out. Using default district position.";
        setFeedback({ type: "warning", message: msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Handle Image File Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/field-reports/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload photo.");
      }

      setForm((prev) => ({
        ...prev,
        photo_url: json.url,
        photo_thumbnail_url: json.thumbnailUrl,
      }));
      setFeedback({ type: "success", message: "Evidence photo uploaded and verified successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Create Field Report
  const handleSubmitReport = async (submittedData?: FieldReportFormData | React.FormEvent) => {
    if (submittedData && "preventDefault" in submittedData) {
      submittedData.preventDefault();
    }
    setFeedback(null);

    const sourceData: FieldReportFormData =
      submittedData && !("preventDefault" in submittedData) ? submittedData : form;

    try {
      const payload = {
        ...sourceData,
        observed_water_depth_cm:
          sourceData.observed_water_depth_cm !== "" && sourceData.observed_water_depth_cm !== undefined
            ? parseInt(String(sourceData.observed_water_depth_cm), 10)
            : undefined,
        people_requiring_assistance:
          sourceData.people_requiring_assistance !== "" && sourceData.people_requiring_assistance !== undefined
            ? parseInt(String(sourceData.people_requiring_assistance), 10)
            : 0,
      };

      // ROAD-005 PART 6: OFFLINE QUEUE CHECK
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const localId = await enqueueOfflineReport(payload as unknown as Record<string, unknown>);
        setFeedback({
          type: "success",
          message: locale === "hi"
            ? `रिपोर्ट सहेजी गई (${localId})। ऑनलाइन होने पर स्वतः भेजी जाएगी।`
            : `Report saved (${localId}). Will auto-submit when online.`,
        });
        setIsCreateOpen(false);
        setForm({
          report_type: "Waterlogging",
          severity: "ALERT",
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: "",
          observed_water_depth_cm: "",
          people_requiring_assistance: "",
          road_status: "PARTIALLY_BLOCKED",
          description: "",
          photo_url: "",
          photo_thumbnail_url: "",
          observer_name: "Field Officer",
          observer_role: "Revenue Talathi",
          observer_contact: "",
        });
        return;
      }

      const res = await fetch("/api/field-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to record field observation");
      }

      setFeedback({
        type: "success",
        message: `Field report ${json.data.report_number} submitted successfully as GROUND TRUTH OBSERVATION.`,
      });
      setIsCreateOpen(false);
      setForm({
        report_type: "Waterlogging",
        severity: "ALERT",
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: "",
        observed_water_depth_cm: "",
        people_requiring_assistance: "",
        road_status: "PARTIALLY_BLOCKED",
        description: "",
        photo_url: "",
        photo_thumbnail_url: "",
        observer_name: "Field Officer",
        observer_role: "Revenue Talathi",
        observer_contact: "",
      });
      setGeoStatus("idle");
      fetchReports(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to submit report" });
    }
  };

  // Verify Field Report
  const handleVerifyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setFeedback(null);

    try {
      const res = await fetch(`/api/field-reports/${selectedReport.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to verify field report");
      }

      setFeedback({
        type: "success",
        message: `Field report ${selectedReport.report_number} updated to ${verifyForm.verification_status}.`,
      });
      setIsVerifyOpen(false);
      setSelectedReport(null);
      fetchReports(true);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Verification update failed" });
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "ALL" || r.verification_status === statusFilter;
      const matchesType = typeFilter === "ALL" || r.report_type === typeFilter;
      const matchesSearch =
        !searchQuery ||
        r.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.observer_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [reports, statusFilter, typeFilter, searchQuery]);

  // Aggregate Metrics
  const verifiedCount = useMemo(() => reports.filter((r) => r.verification_status === "VERIFIED").length, [reports]);
  const unverifiedCount = useMemo(() => reports.filter((r) => r.verification_status === "UNVERIFIED").length, [reports]);
  const highDepthCount = useMemo(
    () => reports.filter((r) => (r.observed_water_depth_cm || 0) >= 50).length,
    [reports]
  );
  const assistanceNeededCount = useMemo(
    () => reports.reduce((sum, r) => sum + (r.people_requiring_assistance || 0), 0),
    [reports]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={tFieldReports("title", "Field Ground Reports & Ground Truth Telemetry")}
        description={tFieldReports(
          "subtitle",
          "Mobile-first ingress for on-site field observations logged by Talathis, Junior Engineers, and Ward Officers. Direct ground evidence with verified depth and passability."
        )}
        breadcrumbs={[
          { label: locale === "hi" ? "परिचालन" : "Operations", href: "/dashboard" },
          { label: tFieldReports("title", "Field Ground Reports") },
        ]}
        sourceMeta={FIELD_SOURCE_META}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReports(true)}
              disabled={isRefreshing}
              className="text-xs gap-1.5 min-h-[40px] px-3"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{tCommon("refresh", "Refresh")}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  latitude: location.latitude,
                  longitude: location.longitude,
                }));
                setIsCreateOpen(true);
              }}
              className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs gap-1.5 min-h-[40px] px-3.5 shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{tFieldReports("submitReport", "Log Ground Inspection")}</span>
            </Button>
          </div>
        }
      />

      {/* Ground Truth Banner: Model vs Ground Distinction */}
      <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950 dark:text-blue-200">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0" />
          <div>
            <strong className="font-bold text-blue-900 dark:text-blue-100">
              {locale === "hi" ? "जमीनी सत्य बनाम गणितीय मॉडल टेलीमेट्री:" : "Ground Truth vs. Mathematical Model Telemetry:"}
            </strong>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              {locale === "hi"
                ? "इस कंसोल के रिकॉर्ड प्रत्यक्ष ऑन-साइट निरीक्षण दर्शाते हैं। पूर्वानुमान ग्रिड के विपरीत, ये रिपोर्ट वास्तविक जलभराव, अवरुद्ध मार्गों व संकट स्थिति को प्रमाणित करती हैं।"
                : "Records on this console represent eye-witness on-site inspections. Unlike multi-factor predictive grids, field reports reflect actual on-ground water depth, blocked causeways, and civilian distress."}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-[#0F3D66] text-white font-mono font-bold text-[10px] shrink-0">
          {locale === "hi" ? "मैदानी इनपुट सक्रिय" : "FIELD INGRESS ACTIVE"}
        </span>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "कुल मैदानी रिपोर्ट" : "Total Ground Reports"}
          value={reports.length.toString()}
          unit={locale === "hi" ? "प्रविष्टियाँ" : "Entries"}
          subtext={locale === "hi" ? "राजस्व व नगर पालिका कर्मियों द्वारा दर्ज" : "Logged by field revenue & municipal staff"}
          icon={FileSpreadsheet}
          severity="NORMAL"
          sourceLabel={locale === "hi" ? "तलाठी इनपुट" : "Talathi Ingress"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "सत्यापित अवलोकन" : "Verified Observations"}
          value={`${verifiedCount}/${reports.length}`}
          unit={locale === "hi" ? "निरीक्षित" : "Inspected"}
          subtext={locale === "hi" ? `${unverifiedCount} सत्यापन प्रतीक्षारत` : `${unverifiedCount} awaiting verification`}
          icon={ShieldCheck}
          severity={unverifiedCount > 0 ? "ADVISORY" : "NORMAL"}
          sourceLabel={locale === "hi" ? "ईओसी डेस्क" : "EOC Desk"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "गंभीर जलभराव (≥50 सेमी)" : "Severe Waterlogging (>=50cm)"}
          value={highDepthCount.toString()}
          unit={locale === "hi" ? "स्थान" : "Sites"}
          subtext={locale === "hi" ? "सामान्य वाहनों हेतु अगम्य" : "Impassable to standard transport"}
          icon={AlertOctagon}
          severity={highDepthCount > 0 ? "ALERT" : "NORMAL"}
          sourceLabel={locale === "hi" ? "मैदानी गेज" : "Field Gauges"}
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "नागरिक सहायता आवश्यक" : "Civilian Assistance Needed"}
          value={assistanceNeededCount.toString()}
          unit={locale === "hi" ? "व्यक्ति" : "Persons"}
          subtext={locale === "hi" ? "एसडीआरएफ / नाव दल हेतु चिन्हित" : "Flagged for SDRF / boat rescue squad"}
          icon={Users}
          severity={assistanceNeededCount > 0 ? "CRITICAL" : "NORMAL"}
          sourceLabel={locale === "hi" ? "जमीनी एसओएस" : "Ground SOS"}
          isLoading={isLoading}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={tCommon("search", "Search...")}
            placeholder={locale === "hi" ? "रिपोर्ट संख्या, स्थान या अधिकारी खोजें..." : "Search report number, location, or officer..."}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <select
            aria-label="Filter reports by verification status"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 min-h-[40px] text-slate-700 dark:text-slate-200 flex-1 sm:flex-none"
          >
            <option value="ALL">
              {locale === "hi" ? `सभी सत्यापन स्थितियाँ (${reports.length})` : `All Verification Statuses (${reports.length})`}
            </option>
            {VERIFICATION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {formatStatus(st, locale)} ({reports.filter((r) => r.verification_status === st).length})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter reports by observation type"
            value={typeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 min-h-[40px] text-slate-700 dark:text-slate-200 flex-1 sm:flex-none"
          >
            <option value="ALL">
              {locale === "hi" ? `सभी अवलोकन प्रकार (${reports.length})` : `All Observation Types (${reports.length})`}
            </option>
            {FIELD_REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatIncidentType(t, locale)} ({reports.filter((r) => r.report_type === t).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Feed */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchReports(true)}
        errorMessage={errorMsg || (locale === "hi" ? "मैदानी रिपोर्टिंग सेवा से संपर्क नहीं हो सका।" : "Unable to reach field reporting sync service.")}
        emptyTitle={locale === "hi" ? "कोई मैदानी निरीक्षण दर्ज नहीं" : "No Field Inspections Logged"}
        emptyDescription={locale === "hi" ? "राजस्व मैदानी कर्मियों द्वारा इस फ़िल्टर में कोई अवलोकन दर्ज नहीं किया गया है।" : "Revenue field staff have not filed any observations matching this filter."}
      >
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 border-slate-200 dark:border-slate-800">
              {locale === "hi" ? "आपकी खोज से मेल खाता कोई जमीनी अवलोकन नहीं मिला।" : "No ground observations found matching your search."}
            </Card>
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                className="border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-slate-900 shadow-xs space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={report.severity} size="sm" />
                    <span className="font-mono text-xs font-bold text-[#0F3D66] dark:text-blue-400">
                      {report.report_number}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {report.report_type}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        report.verification_status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : report.verification_status === "REJECTED"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {report.verification_status === "VERIFIED" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                      ) : report.verification_status === "REJECTED" ? (
                        <XCircle className="w-3 h-3 text-red-700 dark:text-red-400" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                      )}
                      <span>{formatStatus(report.verification_status, locale)}</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-bold">
                      {locale === "hi" ? "जमीनी सत्य" : "GROUND TRUTH"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDateTime(report.created_at, locale)}</span>
                    </div>
                  </div>
                </div>

                {/* Content & Evidence Body */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Left 3 cols: Description & Telemetry Attributes */}
                  <div className="md:col-span-3 space-y-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400 shrink-0" />
                        <span>{report.location_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono font-normal">
                          ({report.latitude.toFixed(4)}° N, {report.longitude.toFixed(4)}° E)
                        </span>
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    {/* Measured On-Site Metrics */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                      {report.observed_water_depth_cm !== null && report.observed_water_depth_cm !== undefined && (
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                          {tFieldReports("observedDepth", "Water Depth")}: <strong>{report.observed_water_depth_cm} cm</strong>
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {tFieldReports("roadPassability", "Road Condition")}: <strong>{report.road_status.replace(/_/g, " ")}</strong>
                      </span>

                      {report.people_requiring_assistance ? (
                        <span className="px-2.5 py-1 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {locale === "hi"
                              ? `${report.people_requiring_assistance} नागरिकों को बचाव आवश्यक`
                              : `${report.people_requiring_assistance} Civilians Need Evacuation`}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    {/* Officer Attribution & Verification Rationale */}
                    <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap items-center gap-3">
                      <span>
                        {locale === "hi" ? "द्वारा दर्ज:" : "Reported by:"} <strong>{report.observer_name}</strong> {report.observer_role && `(${report.observer_role})`}
                      </span>
                      {report.observer_contact && (
                        <>
                          <span>•</span>
                          <span>{locale === "hi" ? "फोन:" : "Phone:"} <strong>{report.observer_contact}</strong></span>
                        </>
                      )}
                      {report.verified_by && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            {locale === "hi" ? "द्वारा सत्यापित:" : "Verified by:"} {report.verified_by} {report.verification_notes && `("${report.verification_notes}")`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right 1 col: Photo Evidence Card */}
                  <div className="md:col-span-1">
                    {report.photo_url ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-28 sm:h-32 bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.photo_thumbnail_url || report.photo_url}
                          alt={report.location_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <button
                          onClick={() => {
                            setLightboxPhotoUrl(report.photo_url || null);
                            setIsPhotoLightboxOpen(true);
                          }}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{locale === "hi" ? "बड़ा करें" : "Enlarge"}</span>
                        </button>
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                          {locale === "hi" ? "फोटो साक्ष्य" : "Photo Evidence"}
                        </span>
                      </div>
                    ) : (
                      <div className="h-28 sm:h-32 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-3 text-center text-slate-400">
                        <Camera className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px]">{locale === "hi" ? "कोई फोटो संलग्न नहीं" : "No Photo Attached"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReport(report);
                      setVerifyForm({
                        verification_status: report.verification_status === "VERIFIED" ? "UNVERIFIED" : "VERIFIED",
                        verified_by: "District EOC Duty Officer",
                        verification_notes: report.verification_notes || "",
                      });
                      setIsVerifyOpen(true);
                    }}
                    className="min-h-[38px] px-3.5 text-xs font-semibold gap-1.5 w-full sm:w-auto"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                    <span>{locale === "hi" ? "सत्यापित करें" : "Verify"}</span>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </StateContainer>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBMIT GROUND INSPECTION */}
      {/* ------------------------------------------------------------- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                  {tFieldReports("submitReport", "Submit Ground Field Observation")}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === "hi"
                    ? "आपदा क्षेत्र मोबाइल इनपुट: प्रमाणित जमीनी सत्य के रूप में सीधे दर्ज।"
                    : "Mobile-first disaster field ingress: certified ground truth observation."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label={locale === "hi" ? "संवाद बंद करें" : "Close dialog"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <StructuredFieldReportForm
              initialData={form}
              geoStatus={geoStatus}
              geoAccuracy={geoAccuracy}
              onAcquireLocation={handleAcquireLocation}
              onSubmit={handleSubmitReport}
              onCancel={() => setIsCreateOpen(false)}
              onPhotoSelect={handlePhotoSelect}
              isUploadingPhoto={isUploadingPhoto}
              uploadError={uploadError}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VERIFICATION & TRIAGE */}
      {/* ------------------------------------------------------------- */}
      {isVerifyOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                  {locale === "hi"
                    ? `रिपोर्ट ${selectedReport.report_number} का सत्यापन व वर्गीकरण`
                    : `Triage & Verify Report ${selectedReport.report_number}`}
                </h3>
                <p className="text-[11px] text-slate-500">{selectedReport.location_name}</p>
              </div>
              <button onClick={() => setIsVerifyOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyReport} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  {tFieldReports("verificationStatus", "Target Verification Status")} *
                </label>
                <select
                  value={verifyForm.verification_status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setVerifyForm({ ...verifyForm, verification_status: e.target.value as VerificationStatus })
                  }
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2 min-h-[40px]"
                >
                  <option value="VERIFIED">
                    {locale === "hi" ? "VERIFIED (प्रमाणित जमीनी सत्य)" : "VERIFIED (Certified Ground Truth)"}
                  </option>
                  <option value="REJECTED">
                    {locale === "hi" ? "REJECTED (अमान्य / डुप्लिकेट / पुराना)" : "REJECTED (False / Outdated / Duplicate)"}
                  </option>
                  <option value="UNVERIFIED">
                    {locale === "hi" ? "UNVERIFIED (प्रतीक्षारत ऑन-साइट जांच)" : "UNVERIFIED (Pending On-Site Check)"}
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {tFieldReports("verifiedBy", "Verifying Officer / EOC Console")} *
                </label>
                <input
                  required
                  value={verifyForm.verified_by}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVerifyForm({ ...verifyForm, verified_by: e.target.value })
                  }
                  className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {locale === "hi" ? "सत्यापन ऑडिट टिप्पणियाँ" : "Verification Audit Notes"}
                </label>
                <textarea
                  rows={2}
                  placeholder={locale === "hi" ? "उदा. वायरलेस पर तलाठी से पुष्टि की गई। प्रतिक्रिया दल रवाना किया गया।" : "e.g., Verified on VHF wireless with Talathi. Incident response crew dispatched."}
                  value={verifyForm.verification_notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setVerifyForm({ ...verifyForm, verification_notes: e.target.value })
                  }
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2 min-h-[60px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsVerifyOpen(false)} className="min-h-[44px] px-4 font-semibold text-xs sm:text-sm">
                  {tCommon("cancel", "Cancel")}
                </Button>
                <Button type="submit" size="sm" className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold min-h-[44px] px-5 text-xs sm:text-sm shadow-xs">
                  {locale === "hi" ? "सत्यापन स्थिति अद्यतन करें" : "Update Verification State"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PHOTO LIGHTBOX */}
      {/* ------------------------------------------------------------- */}
      {isPhotoLightboxOpen && lightboxPhotoUrl && (
        <div
          onClick={() => setIsPhotoLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhotoUrl}
              alt="High-resolution ground evidence"
              className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setIsPhotoLightboxOpen(false)}
              className="mt-3 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs"
            >
              {locale === "hi" ? "दर्शक विंडो बंद करें" : "Close Viewer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
