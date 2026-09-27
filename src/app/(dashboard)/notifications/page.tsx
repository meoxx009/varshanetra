"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ServerCrash,
  FileText,
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCheck,
  Check,
  Radio,
  Clock,
  Shield,
  Layers,
  Inbox,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/common/data-source-badge";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  NotificationItem,
  NotificationEventType,
} from "@/types/notifications";
import { SeverityLevel, DataSourceMeta } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

const NOTIFICATIONS_META: DataSourceMeta = {
  provider: "VarshaNetra In-App Event Dispatch Bus & Postgres Audit",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Real-time operational alerts dispatched across District EOC desks. Rule 18 & Rule 14 compliant: zero fake SMS claims; browser push activated exclusively via explicit user consent.",
};

export default function NotificationsPage() {
  const locale = useLocale();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Browser Notification Permission State
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [browserSupport, setBrowserSupport] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<NotificationItem | null>(null);
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Check browser Notification API permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
      setBrowserSupport(true);
    } else {
      setBrowserSupport(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (readFilter === "UNREAD") params.append("read", "false");
      if (readFilter === "READ") params.append("read", "true");
      if (eventTypeFilter !== "ALL") params.append("event_type", eventTypeFilter);
      if (severityFilter !== "ALL") params.append("severity", severityFilter);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch operational notifications`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Unknown server error");
      }

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load notifications feed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [readFilter, eventTypeFilter, severityFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Request Browser Notification Permission
  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setActionMessage("Browser Web Notifications are not supported by this browser.");
      setTimeout(() => setActionMessage(null), 4000);
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        setActionMessage("Web Push notifications granted. Critical alarms will alert your desktop.");
        try {
          new Notification("VarshaNetra Emergency Alerts Active", {
            body: "Operational push dispatch is now active for critical disaster events.",
            icon: "/icons/icon-192x192.png",
          });
        } catch {
          // ignore notification trigger errors
        }
      } else if (perm === "denied") {
        setActionMessage("Notification permission was denied in your browser settings.");
      }
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      console.warn("Could not request notification permission:", err);
    }
  };

  // Toggle single read status
  const handleToggleRead = async (item: NotificationItem) => {
    try {
      const res = await fetch(`/api/notifications/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: !item.read }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      if (data.success && data.notification) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? data.notification : n))
        );
        setUnreadCount((prev) => (item.read ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (err) {
      console.error("Error toggling read status:", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        setActionMessage("All operational notifications marked as read.");
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete notification");
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Filtered by Search Client-side
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const q = searchQuery.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.event_type.toLowerCase().includes(q) ||
        (n.related_id && n.related_id.toLowerCase().includes(q))
    );
  }, [notifications, searchQuery]);

  const criticalCount = useMemo(() => {
    return notifications.filter((n) => n.severity === "CRITICAL" || n.severity === "ALERT").length;
  }, [notifications]);

  // Format relative timestamp
  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return locale === "hi" ? "अभी" : "Just now";
    if (diffMins < 60) return locale === "hi" ? `${diffMins} मि पहले` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return locale === "hi" ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return locale === "hi" ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
  };

  // Get icon for event type
  const getEventIcon = (type: NotificationEventType) => {
    switch (type) {
      case "ALERT_ISSUED":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case "INCIDENT_ASSIGNED":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "RESPONSE_TEAM_ASSIGNMENT":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "NEW_FIELD_REPORT":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "CRITICAL_DATA_SOURCE_FAILURE":
        return <ServerCrash className="w-4 h-4 text-rose-700" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  // Dual-channel severity styling
  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertOctagon className="w-3 h-3 text-red-600 dark:text-red-400" />
            {locale === "hi" ? "गंभीर" : "CRITICAL"}
          </span>
        );
      case "ALERT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            {locale === "hi" ? "चेतावनी" : "ALERT"}
          </span>
        );
      case "ADVISORY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            {locale === "hi" ? "सलाह" : "ADVISORY"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {locale === "hi" ? "सामान्य" : "NORMAL"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Standard Page Header */}
      <PageHeader
        title={locale === "hi" ? "परिचालन सूचना केंद्र" : "Operational Notification Center"}
        description={
          locale === "hi"
            ? "वैधानिक अलर्ट, सामरिक कार्यभार, फ़ील्ड अवलोकन और टेलीमेट्री स्थिति के लिए वास्तविक समय सूचना एवं ऑडिट फ़ीड।"
            : "Real-time in-app dispatch and audit feed for statutory alerts, tactical assignments, field truth observations, and telemetry status."
        }
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "सूचना केंद्र" : "Notification Center" },
        ]}
        sourceMeta={NOTIFICATIONS_META}
        actions={
          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {locale === "hi" ? "फ़ीड ताज़ा करें" : "Refresh Feed"}
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMarkAllConfirm(true)}
                className="text-xs h-9 gap-1.5 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                {locale === "hi" ? `सभी पढ़े हुए चिह्नित करें (${unreadCount})` : `Mark All as Read (${unreadCount})`}
              </Button>
            )}

            {browserSupport && pushPermission !== "granted" && (
              <Button
                size="sm"
                onClick={requestBrowserPermission}
                className="text-xs h-9 gap-1.5 bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white"
              >
                <Radio className="w-3.5 h-3.5" />
                {locale === "hi" ? "डेस्कटॉप सूचनाएं सक्षम करें" : "Enable Desktop Alerts"}
              </Button>
            )}
          </div>
        }
      />

      {/* Action toast message */}
      {actionMessage && (
        <div
          role="status"
          className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Unread Count */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "अपठित कार्य मदें" : "Unread Action Items"}
            </span>
            <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {unreadCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {locale === "hi" ? "लंबित कार्रवाई" : "pending desk action"}
            </span>
          </div>
        </div>

        {/* Metric 2: Total Events */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "कुल दर्ज घटनाएँ" : "Total Logged Events"}
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#2563EB]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {locale === "hi" ? "सभी परिचालन घटनाएँ" : "all operational events"}
            </span>
          </div>
        </div>

        {/* Metric 3: Critical & Alert Level */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "गंभीर / चेतावनी स्तर" : "Critical / Alert Severity"}
            </span>
            <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {criticalCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {locale === "hi" ? "उच्च प्राथमिकता" : "high priority"}
            </span>
          </div>
        </div>

        {/* Metric 4: Desktop Web Push Status */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {locale === "hi" ? "डेस्कटॉप पुश स्थिति" : "Desktop Push Status"}
            </span>
            <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {pushPermission === "granted" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {locale === "hi" ? "सक्रिय और स्वीकृत" : "Active & Permitted"}
              </span>
            ) : pushPermission === "denied" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-md border border-red-200 dark:border-red-800">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                {locale === "hi" ? "उपयोगकर्ता द्वारा अवरुद्ध" : "Blocked by User"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {locale === "hi" ? "संकेत उपलब्ध" : "Prompt Available"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              aria-label={locale === "hi" ? "सूचनाएं खोजें" : "Search notifications"}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={
                locale === "hi"
                  ? "शीर्षक, विवरण, संदर्भ आईडी से सूचनाएं खोजें..."
                  : "Search notifications by title, details, ID..."
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 h-9"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Read Status Filter */}
            <div
              role="group"
              aria-label="Filter by read status"
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs"
            >
              <button
                onClick={() => setReadFilter("ALL")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  readFilter === "ALL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {locale === "hi" ? "सभी" : "All"}
              </button>
              <button
                onClick={() => setReadFilter("UNREAD")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  readFilter === "UNREAD"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {locale === "hi" ? `अपठित (${unreadCount})` : `Unread (${unreadCount})`}
              </button>
              <button
                onClick={() => setReadFilter("READ")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  readFilter === "READ"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {locale === "hi" ? "पढ़े हुए" : "Read"}
              </button>
            </div>

            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              aria-label={locale === "hi" ? "घटना प्रकार द्वारा फ़िल्टर करें" : "Filter by event type"}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="text-xs h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{locale === "hi" ? "सभी घटना प्रकार" : "All Event Types"}</option>
              <option value="ALERT_ISSUED">{locale === "hi" ? "वैधानिक अलर्ट" : "Statutory Alerts"}</option>
              <option value="INCIDENT_ASSIGNED">{locale === "hi" ? "आवंटित घटनाएँ" : "Incident Assigned"}</option>
              <option value="RESPONSE_TEAM_ASSIGNMENT">{locale === "hi" ? "दल तैनाती" : "Team Dispatched"}</option>
              <option value="NEW_FIELD_REPORT">{locale === "hi" ? "ज़मीनी अवलोकन रिपोर्ट" : "Field Truth Reports"}</option>
              <option value="CRITICAL_DATA_SOURCE_FAILURE">{locale === "hi" ? "टेलीमेट्री विफलता" : "Telemetry Outages"}</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              aria-label={locale === "hi" ? "गंभीरता स्तर द्वारा फ़िल्टर करें" : "Filter by severity level"}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{locale === "hi" ? "सभी गंभीरताएँ" : "All Severities"}</option>
              <option value="CRITICAL">{locale === "hi" ? "केवल गंभीर" : "Critical Only"}</option>
              <option value="ALERT">{locale === "hi" ? "केवल चेतावनी" : "Alert Only"}</option>
              <option value="ADVISORY">{locale === "hi" ? "केवल सलाह" : "Advisory Only"}</option>
              <option value="NORMAL">{locale === "hi" ? "केवल सामान्य" : "Normal Only"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mandatory State 1: Error Recovery */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900 dark:text-red-200">
                {locale === "hi"
                  ? "परिचालन सूचना फ़ीड लोड करने में विफल"
                  : "Failed to load operational notifications feed"}
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={fetchNotifications} className="text-xs">
            {locale === "hi" ? "पुनः प्रयास करें" : "Retry"}
          </Button>
        </div>
      )}

      {/* Mandatory State 2: Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory State 3: Empty State */}
      {!loading && !error && filteredNotifications.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {locale === "hi" ? "कोई परिचालन सूचना नहीं मिली" : "No Operational Notifications Found"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || readFilter !== "ALL" || eventTypeFilter !== "ALL" || severityFilter !== "ALL"
              ? (locale === "hi"
                  ? "चयनित खोज मापदंडों या फ़िल्टर से कोई मेल नहीं खाता। सभी देखने के लिए फ़िल्टर रीसेट करें।"
                  : "No events match the selected search parameters or filter criteria. Clear filters to see all events.")
              : (locale === "hi"
                  ? "सब सामान्य है। वर्तमान में कोई दर्ज आपदा चेतावनी या सामरिक तैनाती घटना नहीं है।"
                  : "All clear. There are currently no recorded disaster response warnings or tactical dispatch events.")}
          </p>
          {(searchQuery || readFilter !== "ALL" || eventTypeFilter !== "ALL" || severityFilter !== "ALL") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setReadFilter("ALL");
                setEventTypeFilter("ALL");
                setSeverityFilter("ALL");
              }}
              className="mt-4 text-xs"
            >
              {locale === "hi" ? "सभी फ़िल्टर रीसेट करें" : "Reset All Filters"}
            </Button>
          )}
        </div>
      )}

      {/* Mandatory State 4: Success Operational Feed */}
      {!loading && !error && filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-all duration-150 shadow-xs ${
                !item.read
                  ? "bg-white dark:bg-slate-900 border-l-4 border-l-[#2563EB] border-slate-300 dark:border-slate-700"
                  : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Event Icon & Core Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getEventIcon(item.event_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getSeverityBadge(item.severity)}
                      <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.event_type.replace(/_/g, " ")}
                      </span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" title={locale === "hi" ? "अपठित घटना" : "Unread event"} />
                      )}
                    </div>

                    <h4
                      className={`text-sm font-bold tracking-tight leading-snug ${
                        !item.read
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
                      <span suppressHydrationWarning className="flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(item.created_at)}
                      </span>
                      <span>•</span>
                      <span suppressHydrationWarning className="font-mono text-[10px]">{formatDateTime(item.created_at)}</span>
                      {item.related_id && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                            {locale === "hi" ? "संदर्भ:" : "Ref:"} {item.related_id}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons: Deep Link, Mark Read/Unread, Delete */}
                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  {item.deep_link && (
                    <Link
                      href={item.deep_link}
                      onClick={() => {
                        if (!item.read) handleToggleRead(item);
                      }}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1 border-slate-300 dark:border-slate-700 text-[#0F3D66] dark:text-slate-200"
                        title={locale === "hi" ? "संबंधित रिकॉर्ड खोलें" : "Open related record"}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {locale === "hi" ? "रिकॉर्ड देखें" : "View Record"}
                        </span>
                      </Button>
                    </Link>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleRead(item)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    title={
                      item.read
                        ? (locale === "hi" ? "अपठित के रूप में चिह्नित करें" : "Mark as unread")
                        : (locale === "hi" ? "पढ़ा हुआ चिह्नित करें" : "Mark as read")
                    }
                  >
                    {item.read ? <Check className="w-4 h-4 text-slate-400" /> : <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setItemToDelete(item)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`${locale === "hi" ? "सूचना हटाएं:" : "Delete notification:"} ${item.title}`}
                    title={locale === "hi" ? "सूचना हटाएं" : "Delete notification"}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance & Data Provenance Notice */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0F3D66] dark:text-[#2563EB]" />
          <span>
            <strong>{locale === "hi" ? "निर्देश #14 और #18 अनुपालन:" : "Directive #14 & #18 Adherence:"}</strong>{" "}
            {locale === "hi"
              ? "शून्य निर्मित एसएमएस दावे। केवल इन-ऐप ऑडिट लॉग। ब्राउज़र पुश उपयोगकर्ता की सहमति पर W3C वेब सूचनाएं एपीआई का उपयोग करता है।"
              : "Zero fabricated SMS/telephony claims. In-app audit log only. Browser Push utilizes W3C Web Notifications API upon user consent."}
          </span>
        </div>
        <DataSourceBadge metadata={NOTIFICATIONS_META} showAttributionText={false} />
      </div>

      {/* Confirmation Dialog: Delete Single Notification */}
      <ConfirmationDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (!itemToDelete) return;
          setIsDeleting(true);
          await handleDelete(itemToDelete.id);
          setIsDeleting(false);
          setItemToDelete(null);
        }}
        isLoading={isDeleting}
        variant="destructive"
        title={locale === "hi" ? "परिचालन सूचना हटाएं" : "Delete Operational Notification"}
        description={
          itemToDelete ? (
            <span>
              {locale === "hi"
                ? `क्या आप वाकई सूचना "${itemToDelete.title}" को खारिज और हटाना चाहते हैं? यह रिकॉर्ड आपके डेस्क दृश्य से हटा दिया जाएगा।`
                : `Are you sure you want to dismiss and delete notification "${itemToDelete.title}"? This event record will be removed from your desk view.`}
            </span>
          ) : null
        }
        confirmLabel={locale === "hi" ? "सूचना हटाएं" : "Delete Notification"}
      />

      {/* Confirmation Dialog: Mark All as Read */}
      <ConfirmationDialog
        isOpen={showMarkAllConfirm}
        onClose={() => setShowMarkAllConfirm(false)}
        onConfirm={async () => {
          await handleMarkAllRead();
          setShowMarkAllConfirm(false);
        }}
        variant="default"
        title={locale === "hi" ? "सभी सूचनाएं पढ़ी हुई चिह्नित करें" : "Mark All Notifications as Read"}
        description={
          locale === "hi"
            ? "यह आपके कमांड सेंटर डेस्क पर सभी वर्तमान परिचालन सूचनाओं के अपठित बैज को हटा देगा।"
            : "This will clear unread badges for all current operational notifications across your command center desk."
        }
        confirmLabel={locale === "hi" ? "सभी को पढ़ा हुआ चिह्नित करें" : "Mark All Read"}
      />
    </div>
  );
}
