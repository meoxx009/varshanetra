"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BellRing,
  Plus,
  Radio,
  Clock,
  ShieldCheck,
  Send,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  History,
  Edit3,
  Trash2,
  RefreshCw,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  X,
  MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { SeverityBadge } from "@/components/common/severity-badge";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  NdmaCompliantAlertForm,
  NdmaAlertFormPayload,
  SmsBroadcastModal,
  SmsDeliveryLogModal,
  CapXmlExportButton,
} from "@/components/alerts";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import { formatSeverity, formatStatus, formatDateTime } from "@/lib/i18n/formatters";
import {
  AlertItem,
  AlertStatus,
  AlertAuditLog,
  SeverityLevel,
  DataSourceMeta,
} from "@/types";

const ALERTS_PAGE_SOURCE_META: DataSourceMeta = {
  provider: "VarshaNetra Emergency Early Warning, Twilio SMS & Supabase PostgREST",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Statutory district emergency alerts. Twilio SMS trial broadcast active. OASIS CAP v1.2 interoperable.",
};

const STATUS_ORDER: Record<AlertStatus, number> = {
  ISSUED: 0,
  APPROVED: 1,
  PENDING: 2,
  DRAFT: 3,
  CANCELLED: 4,
};

export default function AlertsPage() {
  const { location } = useDistrictLocation();
  const locale = useLocale();
  const tAlerts = useTranslations("alerts");
  const tNav = useTranslations("navigation");

  // View state and telemetry
  const [viewState, setViewState] = useState<ComponentViewState>("success");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingAlert, setEditingAlert] = useState<AlertItem | null>(null);
  const [selectedAlertAudit, setSelectedAlertAudit] = useState<{
    alert: AlertItem;
    logs: AlertAuditLog[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // SMS Broadcast and Delivery Log Modals (ROAD-004)
  const [selectedSmsAlert, setSelectedSmsAlert] = useState<AlertItem | null>(null);
  const [selectedSmsLogsAlert, setSelectedSmsLogsAlert] = useState<AlertItem | null>(null);

  // Accessible Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    variant: "destructive" | "warning" | "default";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    variant: "destructive",
    action: async () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch Alerts from API
  const fetchAlerts = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/alerts");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load alerts from Supabase.");
      }

      setAlerts(json.data || []);
      setViewState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching alerts";
      setErrorMessage(msg);
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Filtered and Sorted Alerts
  const filteredAlerts = useMemo(() => {
    let list = [...alerts];

    if (statusFilter !== "ALL") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (severityFilter !== "ALL") {
      list = list.filter((a) => a.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.area_name.toLowerCase().includes(q) ||
          a.recommended_action.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [alerts, statusFilter, severityFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const issued = alerts.filter((a) => a.status === "ISSUED");
    const approved = alerts.filter((a) => a.status === "APPROVED");
    const pending = alerts.filter((a) => a.status === "PENDING");
    const drafts = alerts.filter((a) => a.status === "DRAFT");
    return {
      issuedCount: issued.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      draftCount: drafts.length,
    };
  }, [alerts]);

  // Create Alert Handler via NDMA Form
  const handleCreateAlertFromNdma = async (
    payload: NdmaAlertFormPayload,
    immediateSubmit = false
  ) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          severity: payload.severity,
          area_name: payload.area_name,
          description: payload.description,
          recommended_action: payload.recommended_action,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create alert draft.");
      }

      const createdAlert: AlertItem = json.data;

      // If officer clicked "Save & Submit for Review", immediately advance to PENDING
      if (immediateSubmit && createdAlert?.id) {
        await fetch(`/api/alerts/${createdAlert.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "PENDING",
            notes: "Submitted directly during creation for executive review.",
          }),
        });
      }

      setIsCreateModalOpen(false);
      await fetchAlerts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating alert";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Alert Handler
  const handleUpdateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlert) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/alerts/${editingAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingAlert.title,
          severity: editingAlert.severity,
          area_name: editingAlert.area_name,
          description: editingAlert.description,
          recommended_action: editingAlert.recommended_action,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update draft alert.");
      }

      setEditingAlert(null);
      await fetchAlerts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating alert";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Transition Action
  const executeTransitionStatus = async (
    alertId: string,
    newStatus: AlertStatus,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: notes?.trim() || `Status transitioned to ${newStatus}.`,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedbackToast({ type: "error", message: json.error || `Failed to transition status to ${newStatus}.` });
        return;
      }

      setFeedbackToast({ type: "success", message: `Alert status updated to ${newStatus}.` });
      setTimeout(() => setFeedbackToast(null), 4000);
      await fetchAlerts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setFeedbackToast({ type: "error", message: `Action failed: ${msg}` });
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  // Delete Draft Handler
  const executeDeleteDraft = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedbackToast({ type: "error", message: json.error || "Failed to delete draft alert." });
        return;
      }

      setFeedbackToast({ type: "success", message: "Draft alert permanently removed." });
      setTimeout(() => setFeedbackToast(null), 4000);
      await fetchAlerts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setFeedbackToast({ type: "error", message: `Delete failed: ${msg}` });
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  const requestDeleteDraft = (alertItem: AlertItem) => {
    setConfirmDialog({
      isOpen: true,
      title: locale === "hi" ? "प्रारूप चेतावनी स्थायी रूप से हटाएं" : "Permanently Delete Draft Alert",
      description: locale === "hi" ? (
        <span>
          क्या आप वाकई प्रारूप चेतावनी <strong>&quot;{alertItem.title}&quot;</strong> को स्थायी रूप से हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।
        </span>
      ) : (
        <span>
          Are you sure you want to permanently delete draft warning <strong>&quot;{alertItem.title}&quot;</strong>? This action cannot be undone.
        </span>
      ),
      confirmLabel: locale === "hi" ? "प्रारूप हटाएं" : "Delete Draft",
      variant: "destructive",
      action: async () => {
        await executeDeleteDraft(alertItem.id);
      },
    });
  };

  const requestBroadcastAlert = (alertItem: AlertItem) => {
    setConfirmDialog({
      isOpen: true,
      title: locale === "hi" ? "जिला वैधानिक चेतावनी प्रसारित करें" : "Broadcast District Statutory Warning",
      description: locale === "hi" ? (
        <span>
          <strong>&quot;{alertItem.title}&quot;</strong> प्रसारित करने से जिला कमान केंद्र और सभी जुड़े ईओसी कंसोल पर आपातकालीन संकेतक सक्रिय हो जाएंगे।
        </span>
      ) : (
        <span>
          Broadcasting <strong>&quot;{alertItem.title}&quot;</strong> will activate emergency indicators across the District Command Center and all connected EOC consoles.
        </span>
      ),
      confirmLabel: locale === "hi" ? "जारी एवं प्रसारित करें" : "Issue & Broadcast",
      variant: "warning",
      action: async () => {
        await executeTransitionStatus(alertItem.id, "ISSUED", "Broadcast triggered across District Command Center & Emergency EOC.");
      },
    });
  };

  const requestRevokeAlert = (alertItem: AlertItem) => {
    setConfirmDialog({
      isOpen: true,
      title: locale === "hi" ? "आपातकालीन चेतावनी वापस लें / समाप्त करें" : "Revoke / Stand-Down Emergency Warning",
      description: locale === "hi" ? (
        <span>
          क्या आप <strong>&quot;{alertItem.title}&quot;</strong> के लिए चेतावनी समाप्त करने का आदेश देना चाहते हैं? यह दर्शाता है कि आपदा की स्थिति शांत हो गई है।
        </span>
      ) : (
        <span>
          Are you sure you want to order a stand-down for <strong>&quot;{alertItem.title}&quot;</strong>? This indicates the hazard condition has subsided.
        </span>
      ),
      confirmLabel: locale === "hi" ? "समाप्ति की पुष्टि करें" : "Confirm Stand-Down",
      variant: "destructive",
      action: async () => {
        await executeTransitionStatus(alertItem.id, "CANCELLED", "Hazard condition subsided. Alert stand-down ordered.");
      },
    });
  };

  // View Audit Logs
  const handleViewAudit = async (alertItem: AlertItem) => {
    try {
      const res = await fetch(`/api/alerts/${alertItem.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedAlertAudit({
          alert: json.data,
          logs: json.auditLogs || [],
        });
      }
    } catch {
      // fallback to basic
      setSelectedAlertAudit({
        alert: alertItem,
        logs: [],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={locale === "hi" ? "प्रारंभिक चेतावनी एवं प्रसारण केंद्र" : "Early Warning & Broadcast Center"}
        description={locale === "hi" ? "वैधानिक आपदा चेतावनियाँ, सीएपी प्रारंभिक अलर्ट प्रेषण एवं सुपाबेस द्वारा समर्थित आपातकालीन नागरिक सुरक्षा सूचनाएं।" : "Statutory disaster warnings, CAP early alert dispatches, and emergency civil defense notifications backed by Supabase."}
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: tAlerts("title") || "Early Warnings" },
        ]}
        sourceMeta={ALERTS_PAGE_SOURCE_META}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => fetchAlerts(true)}
              variant="outline"
              size="sm"
              disabled={isRefreshing || isLoading}
              className="text-xs font-semibold gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{locale === "hi" ? "रीफ्रेश करें" : "Refresh"}</span>
            </Button>

            <Button
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              size="sm"
              className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{locale === "hi" ? "नई चेतावनी का प्रारूप बनाएं" : "Draft New Warning"}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={locale === "hi" ? "सक्रिय जारी चेतावनियाँ" : "Active Issued Warnings"}
          value={String(metrics.issuedCount)}
          unit={locale === "hi" ? "प्रसारण" : "Broadcasts"}
          subtext={locale === "hi" ? "कमांड नेटवर्क पर प्रसारित लाइव परिचालन चेतावनियाँ" : "Live operational warnings broadcast to command network"}
          icon={BellRing}
          severity={metrics.issuedCount > 0 ? "CRITICAL" : "NORMAL"}
          sourceLabel="Supabase Alerts"
          isLoading={isLoading}
        />

        <MetricCard
          title={locale === "hi" ? "लंबित जिला समीक्षा" : "Pending District Review"}
          value={String(metrics.pendingCount)}
          unit={locale === "hi" ? "कतारबद्ध समीक्षा" : "Review Queued"}
          subtext={locale === "hi" ? "इंसिडेंट कमांडर के अंतिम अनुमोदन की प्रतीक्षा में प्रारूप" : "Drafts awaiting Incident Commander executive sign-off"}
          icon={Clock}
          severity={metrics.pendingCount > 0 ? "ALERT" : "NORMAL"}
          sourceLabel="DDMA Review"
          isLoading={isLoading}
        />

        <MetricCard
          title={locale === "hi" ? "तैयारी में प्रारूप" : "Drafts in Preparation"}
          value={String(metrics.draftCount)}
          unit={locale === "hi" ? "प्रारूप" : "Drafts"}
          subtext={locale === "hi" ? "ईओसी लाइन अधिकारियों द्वारा तैयार किए जा रहे प्रारूप" : "Formulations being authored by EOC line officers"}
          icon={Edit3}
          severity="NORMAL"
          sourceLabel="EOC Authoring"
          isLoading={isLoading}
        />

        <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Radio className="w-4 h-4 text-slate-500" />
              {locale === "hi" ? "एसएमएस / सीएपी गेटवे" : "SMS / CAP Gateway"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              {locale === "hi" ? "कॉन्फ़िगर नहीं" : "Not Configured"}
            </span>
          </div>
          <div className="my-1.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {locale === "hi" ? "कमांड सेंटर स्थानीय फीड" : "Command Center Local Feed"}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {locale === "hi" ? "इन-ऐप अधिसूचना सक्रिय। सार्वजनिक टेलीकॉम सेल प्रसारण कनेक्ट नहीं है।" : "In-app notification active. Public telecom cell broadcast not connected."}
            </p>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between">
            <span>{locale === "hi" ? "निर्देश #18 अनुपालन" : "Directive #18 Compliance"}</span>
            <span>{locale === "hi" ? "शून्य फर्जी एसएमएस दावा" : "Zero Fake SMS Claims"}</span>
          </div>
        </Card>
      </div>

      {/* Action Feedback Toast Banner */}
      {feedbackToast && (
        <div
          role="status"
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedbackToast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="p-1 hover:bg-black/10 rounded" aria-label="Dismiss feedback">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container with 4 States */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchAlerts(false)}
        errorMessage={errorMessage || (locale === "hi" ? "सुपाबेस डेटाबेस से अलर्ट लोड करने में विफल।" : "Failed to load alerts from Supabase database.")}
        emptyTitle={locale === "hi" ? "कोई अलर्ट कॉन्फ़िगर नहीं" : "No Alerts Configured"}
        emptyDescription={locale === "hi" ? "इस जिले के लिए कोई प्रारंभिक चेतावनी अधिसूचना नहीं बनाई गई है।" : "No early warning notifications have been authored for this district."}
      >
        <div className="space-y-6">
          {/* Filter and Search Controls */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div
                  role="tablist"
                  aria-label="Filter alerts by status"
                  className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"
                >
                  <span className="text-slate-500 mr-1 flex items-center gap-1" aria-hidden="true">
                    <Filter className="w-3.5 h-3.5" /> {locale === "hi" ? "स्थिति:" : "Status:"}
                  </span>
                  {[
                    { id: "ALL" as const, label: locale === "hi" ? "सभी अलर्ट" : "All Alerts", count: alerts.length },
                    { id: "ISSUED" as const, label: formatStatus("ISSUED", locale), count: metrics.issuedCount },
                    { id: "APPROVED" as const, label: formatStatus("APPROVED", locale), count: metrics.approvedCount },
                    { id: "PENDING" as const, label: formatStatus("PENDING", locale), count: metrics.pendingCount },
                    { id: "DRAFT" as const, label: formatStatus("DRAFT", locale), count: metrics.draftCount },
                    {
                      id: "CANCELLED" as const,
                      label: formatStatus("CANCELLED", locale),
                      count: alerts.filter((a) => a.status === "CANCELLED").length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={statusFilter === tab.id}
                      aria-label={`${tab.label} (${tab.count})`}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                        statusFilter === tab.id
                          ? "bg-[#0F3D66] border-[#0F3D66] text-white shadow-xs font-bold"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          statusFilter === tab.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Severity Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">{locale === "hi" ? "गंभीरता:" : "Severity:"}</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | "ALL")}
                    aria-label="Filter alerts by severity"
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  >
                    <option value="ALL">{locale === "hi" ? "सभी गंभीरता स्तर" : "All Severities"}</option>
                    <option value="CRITICAL">{formatSeverity("CRITICAL", locale)}</option>
                    <option value="ALERT">{formatSeverity("ALERT", locale)}</option>
                    <option value="ADVISORY">{formatSeverity("ADVISORY", locale)}</option>
                    <option value="NORMAL">{formatSeverity("NORMAL", locale)}</option>
                  </select>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label={locale === "hi" ? "शीर्षक, विवरण या क्षेत्र द्वारा अलर्ट खोजें" : "Search early warnings by title, narrative, area, or action directive"}
                    placeholder={locale === "hi" ? "शीर्षक, विवरण, क्षेत्र या निर्देश द्वारा खोजें..." : "Search by title, narrative, area, or action directive..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <span className="text-xs text-slate-500 font-mono">
                  {locale === "hi" ? `${alerts.length} में से ${filteredAlerts.length} अलर्ट प्रदर्शित` : `Showing ${filteredAlerts.length} of ${alerts.length} alerts`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Cards List */}
          {filteredAlerts.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Alerts Matching Selection
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try switching the status filter, clearing your search query, or creating a new alert draft.
              </p>
              <Button
                onClick={() => {
                  setStatusFilter("ALL");
                  setSeverityFilter("ALL");
                  setSearchQuery("");
                }}
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
              >
                Reset All Filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAlerts.map((alert) => {
                const isIssued = alert.status === "ISSUED";
                const isApproved = alert.status === "APPROVED";
                const isPending = alert.status === "PENDING";
                const isDraft = alert.status === "DRAFT";
                const isCancelled = alert.status === "CANCELLED";

                let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-300";
                if (isIssued) statusBadgeColor = "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300";
                else if (isApproved) statusBadgeColor = "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
                else if (isPending) statusBadgeColor = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
                else if (isCancelled) statusBadgeColor = "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400";

                return (
                  <Card
                    key={alert.id}
                    className={`border transition ${
                      isIssued
                        ? "border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusBadgeColor}`}
                          >
                            {formatStatus(alert.status, locale)}
                          </span>
                          <SeverityBadge severity={alert.severity} size="sm" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                            {alert.area_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(alert.created_at, locale)}</span>
                          <button
                            onClick={() => handleViewAudit(alert)}
                            className="ml-2 text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>{locale === "hi" ? "ऑडिट लॉग" : "Audit Logs"}</span>
                          </button>
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 pt-2">
                        {alert.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="py-3.5 space-y-3 text-xs">
                      {/* Narrative Description */}
                      <div>
                        <span className="font-semibold text-slate-500 text-[11px] block uppercase tracking-wider">
                          Situation Briefing
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                          {alert.description}
                        </p>
                      </div>

                      {/* Civil Protection Directive */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-[#0F3D66] dark:text-blue-300 flex items-center gap-1.5 text-xs">
                          <ShieldAlert className="w-4 h-4 text-[#EA580C]" />
                          Mandatory Public Action Directive
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed font-medium">
                          {alert.recommended_action}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <div>
                          <span>Authored by: </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {alert.creator_name || "District Duty Officer"}
                          </span>
                        </div>
                        <div>
                          <span>Alert ID: </span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            {alert.id.slice(0, 18)}...
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    {/* Operational Lifecycle Actions */}
                    <CardFooter className="pt-2 pb-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500">
                        {isIssued && (
                          <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            Broadcasting on Command Dashboard
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Approved by Executive. Ready to broadcast.
                          </span>
                        )}
                        {isPending && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Submitted for Incident Commander review.
                          </span>
                        )}
                        {isDraft && (
                          <span className="text-slate-500 font-medium">
                            Draft format editable by author.
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-slate-400 italic">
                            Cancelled / Stand-Down completed.
                          </span>
                        )}
                      </div>

                      {/* Transition Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* DRAFT ACTIONS */}
                        {isDraft && (
                          <>
                            <Button
                              onClick={() => {
                                setEditingAlert(alert);
                                setFormError(null);
                              }}
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Draft</span>
                            </Button>
                            <Button
                              onClick={() => requestDeleteDraft(alert)}
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Delete</span>
                            </Button>
                            <Button
                              onClick={() =>
                                executeTransitionStatus(
                                  alert.id,
                                  "PENDING",
                                  "Submitted draft to Incident Commander for formal review."
                                )
                              }
                              size="sm"
                              className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold gap-1 shadow-xs cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{locale === "hi" ? "समीक्षा हेतु भेजें" : "Submit for Review"}</span>
                            </Button>
                          </>
                        )}

                        {/* PENDING ACTIONS */}
                        {isPending && (
                          <>
                            <Button
                              onClick={() =>
                                executeTransitionStatus(
                                  alert.id,
                                  "DRAFT",
                                  "Returned to draft for revision."
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <span>{locale === "hi" ? "ड्राफ्ट पर वापस लाएं" : "Return to Draft"}</span>
                            </Button>
                            <Button
                              onClick={() =>
                                executeTransitionStatus(
                                  alert.id,
                                  "APPROVED",
                                  "Verified against district telemetry. Approved for operational dispatch."
                                )
                              }
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1 shadow-xs cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{locale === "hi" ? "चेतावनी स्वीकृत करें" : "Approve Warning"}</span>
                            </Button>
                            <Button
                              onClick={() =>
                                executeTransitionStatus(
                                  alert.id,
                                  "CANCELLED",
                                  "Rejected and cancelled during executive review."
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                              <span>{locale === "hi" ? "रद्द करें" : "Cancel"}</span>
                            </Button>
                          </>
                        )}

                        {/* APPROVED ACTIONS */}
                        {isApproved && (
                          <>
                            <Button
                              onClick={() => requestBroadcastAlert(alert)}
                              size="sm"
                              className="bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{locale === "hi" ? "अलर्ट जारी व प्रसारित करें" : "Issue & Broadcast Alert"}</span>
                            </Button>
                            <Button
                              onClick={() =>
                                executeTransitionStatus(
                                  alert.id,
                                  "CANCELLED",
                                  "Withdrawn before broadcast."
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                              <span>{locale === "hi" ? "रद्द करें" : "Cancel"}</span>
                            </Button>
                          </>
                        )}

                        {/* ISSUED ACTIONS */}
                        {isIssued && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              onClick={() => setSelectedSmsAlert(alert)}
                              size="sm"
                              className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white text-xs font-bold gap-1.5 shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{locale === "hi" ? "एसएमएस प्रसारण" : "SMS Broadcast"}</span>
                            </Button>

                            <Button
                              onClick={() => setSelectedSmsLogsAlert(alert)}
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 border-slate-300 dark:border-slate-700 dark:text-slate-200"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                              <span>{locale === "hi" ? "एसएमएस लॉग" : "SMS Logs"}</span>
                            </Button>

                            <CapXmlExportButton alert={alert} />

                            <Button
                              onClick={() => requestRevokeAlert(alert)}
                              variant="outline"
                              size="sm"
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-300"
                            >
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Revoke / Stand-Down Warning</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </StateContainer>

      {/* CREATE ALERT MODAL */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-alert-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 sm:my-6 max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle id="create-alert-modal-title" className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" aria-hidden="true" />
                  <span>{locale === "hi" ? "नई जिला प्रारंभिक चेतावनी का प्रारूप तैयार करें" : "Draft New District Early Warning"}</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  aria-label={locale === "hi" ? "संवाद बंद करें" : "Close dialog"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "सुपाबेस में एक नया वैधानिक चेतावनी रिकॉर्ड बनाता है। प्रारूपण मसौदा (DRAFT) स्थिति में प्रारंभ होता है।"
                  : "Creates a new statutory alert record in Supabase. Authoring starts in DRAFT status."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 overflow-y-auto flex-1">
              <NdmaCompliantAlertForm
                initialArea={location.displayName}
                initialSeverity="ALERT"
                isSubmitting={isSubmitting}
                formError={formError}
                onCancel={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateAlertFromNdma}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT ALERT MODAL */}
      {editingAlert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-alert-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle id="edit-alert-modal-title" className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#0F3D66]" aria-hidden="true" />
                  <span>{locale === "hi" ? "प्रारूप चेतावनी संपादित करें" : "Edit Draft Warning"}</span>
                </CardTitle>
                <button
                  onClick={() => setEditingAlert(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={locale === "hi" ? "संवाद बंद करें" : "Close edit dialog"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "प्रारूप चेतावनी फ़ील्ड संशोधित किए जा रहे हैं। जारी चेतावनियों को वापस लिए बिना संपादित नहीं किया जा सकता।"
                  : "Modifying draft alert fields. Advanced alerts cannot be edited without revoking."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpdateAlert}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <div role="alert" className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-200 text-xs">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="edit-alert-title" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "चेतावनी शीर्षक *" : "Title *"}
                  </label>
                  <input
                    id="edit-alert-title"
                    type="text"
                    required
                    value={editingAlert.title}
                    onChange={(e) => setEditingAlert({ ...editingAlert, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-alert-severity" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "गंभीरता *" : "Severity *"}
                    </label>
                    <select
                      id="edit-alert-severity"
                      value={editingAlert.severity}
                      onChange={(e) =>
                        setEditingAlert({
                          ...editingAlert,
                          severity: e.target.value as SeverityLevel,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    >
                      <option value="CRITICAL">{locale === "hi" ? "गंभीर (निकासी / लाल)" : "CRITICAL (Evacuation / Red)"}</option>
                      <option value="ALERT">{locale === "hi" ? "अलर्ट (गंभीर खतरा / नारंगी)" : "ALERT (Severe Threat / Orange)"}</option>
                      <option value="ADVISORY">{locale === "hi" ? "सलाह (सावधानी / पीला)" : "ADVISORY (Precaution / Yellow)"}</option>
                      <option value="NORMAL">{locale === "hi" ? "सामान्य (सूचनात्मक / हरा)" : "NORMAL (Informational / Green)"}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-alert-area" className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "लक्षित क्षेत्र *" : "Target Area *"}
                    </label>
                    <input
                      id="edit-alert-area"
                      type="text"
                      required
                      value={editingAlert.area_name}
                      onChange={(e) => setEditingAlert({ ...editingAlert, area_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-alert-desc" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "परिस्थिति विवरण *" : "Situation Narrative *"}
                  </label>
                  <textarea
                    id="edit-alert-desc"
                    rows={3}
                    required
                    value={editingAlert.description}
                    onChange={(e) =>
                      setEditingAlert({ ...editingAlert, description: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-alert-action" className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "अनुशंसित कार्रवाई निर्देश *" : "Recommended Action Directive *"}
                  </label>
                  <textarea
                    id="edit-alert-action"
                    rows={2}
                    required
                    value={editingAlert.recommended_action}
                    onChange={(e) =>
                      setEditingAlert({ ...editingAlert, recommended_action: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAlert(null)}
                  className="text-xs"
                >
                  {locale === "hi" ? "रद्द करें" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-bold text-xs"
                >
                  {locale === "hi" ? "परिवर्तन सहेजें" : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* AUDIT LOGS MODAL */}
      {selectedAlertAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 my-8">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-[#0F3D66]" />
                  <span>{locale === "hi" ? "चेतावनी ऑडिट एवं जीवन चक्र इतिहास" : "Alert Audit & Lifecycle History"}</span>
                </CardTitle>
                <button
                  onClick={() => setSelectedAlertAudit(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs truncate">
                {selectedAlertAudit.alert.title} ({selectedAlertAudit.alert.area_name})
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 max-h-96 overflow-y-auto space-y-3">
              {selectedAlertAudit.logs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {locale === "hi" ? "इस चेतावनी के लिए अभी तक कोई पूर्व स्थिति परिवर्तन दर्ज नहीं किया गया है।" : "No previous state transitions recorded yet for this alert."}
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-4 pl-4 text-xs">
                  {selectedAlertAudit.logs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#0F3D66] ring-4 ring-white dark:ring-slate-900" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {log.from_status ? `${log.from_status} → ${log.to_status}` : log.to_status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px]">
                        {log.notes || (locale === "hi" ? "स्थिति अद्यतन की गई।" : "Status updated.")}
                      </p>
                      <span className="text-[10px] text-slate-400 italic block mt-0.5">
                        {locale === "hi" ? "द्वारा:" : "By:"} {log.changer_name || (locale === "hi" ? "जिला अधिकारी" : "District Officer")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlertAudit(null)}
                className="text-xs"
              >
                {locale === "hi" ? "इतिहास बंद करें" : "Close History"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* SMS Broadcast Modal (ROAD-004) */}
      {selectedSmsAlert && (
        <SmsBroadcastModal
          isOpen={Boolean(selectedSmsAlert)}
          onClose={() => setSelectedSmsAlert(null)}
          alert={selectedSmsAlert}
          onBroadcastSuccess={() => {
            fetchAlerts(true);
          }}
        />
      )}

      {/* SMS Delivery Log Modal (ROAD-004) */}
      {selectedSmsLogsAlert && (
        <SmsDeliveryLogModal
          isOpen={Boolean(selectedSmsLogsAlert)}
          onClose={() => setSelectedSmsLogsAlert(null)}
          alert={selectedSmsLogsAlert}
        />
      )}

      {/* Unified Action Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          setIsConfirming(true);
          try {
            await confirmDialog.action();
          } finally {
            setIsConfirming(false);
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        isLoading={isConfirming}
        variant={confirmDialog.variant}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
      />
    </div>
  );
}
