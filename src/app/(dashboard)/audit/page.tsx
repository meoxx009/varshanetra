"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  Activity,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Radio,
  Package,
  FileCheck2,
  Lock,
  Eye,
  FileText,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { AuditLogItem, AuditEntityType, AuditAction } from "@/types/audit-logs";
import { useLocale } from "@/lib/i18n/context";

function getEntityBadge(type: AuditEntityType, locale: "en" | "hi") {
  switch (type) {
    case "alert":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" /> {locale === "hi" ? "अलर्ट" : "Alert"}
        </span>
      );
    case "incident":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
          <ShieldAlert className="h-3 w-3" /> {locale === "hi" ? "घटना" : "Incident"}
        </span>
      );
    case "response_team":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          <Radio className="h-3 w-3" /> {locale === "hi" ? "दल" : "Team"}
        </span>
      );
    case "resource":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          <Package className="h-3 w-3" /> {locale === "hi" ? "संसाधन" : "Resource"}
        </span>
      );
    case "field_report":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
          <FileCheck2 className="h-3 w-3" /> {locale === "hi" ? "फ़ील्ड रिपोर्ट" : "Field Report"}
        </span>
      );
    case "auth":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-purple-300 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
          <Lock className="h-3 w-3" /> {locale === "hi" ? "प्रमाणीकरण" : "Auth"}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Activity className="h-3 w-3" /> {locale === "hi" ? "सिस्टम" : "System"}
        </span>
      );
  }
}

function getActionBadgeStyle(action: AuditAction): string {
  if (action.includes("FAILURE") || action.includes("CANCEL")) {
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300";
  }
  if (action.includes("SUCCESS") || action.includes("VERIFIED") || action.includes("CREATED")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
}

export default function AuditLogsPage() {
  const locale = useLocale();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/audit?limit=250";
      if (entityFilter !== "ALL") url += `&entity_type=${entityFilter}`;
      if (actionFilter !== "ALL") url += `&action=${actionFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else {
        setError(data.error || "Failed to load audit records.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error fetching audit trail";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCSV = () => {
    let url = "/api/audit?format=csv";
    if (entityFilter !== "ALL") url += `&entity_type=${entityFilter}`;
    if (actionFilter !== "ALL") url += `&action=${actionFilter}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    window.open(url, "_blank");
  };

  // Grouping / stats
  const stats = useMemo(() => {
    const total = logs.length;
    const byEntity: Record<string, number> = {};
    for (const log of logs) {
      byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
    }
    return { total, byEntity };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title={locale === "hi" ? "एप्लिकेशन ऑडिट लॉग" : "Application Audit Log"}
        description={
          locale === "hi"
            ? "सभी अलर्ट प्रसारण, घटना प्रेषण, सामरिक कार्यभार और सत्यापित फ़ील्ड कार्रवाइयों का प्रमाणित परिचालन रिकॉर्ड। केवल-जोड़ अपरिवर्तनीयता की गारंटी।"
            : "Certified operational record of all alert broadcasts, incident dispatches, tactical assignments, and verified field actions. Append-only immutability guaranteed."
        }
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "ऑडिट ट्रेल" : "Audit Trail" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {locale === "hi" ? "ताज़ा करें" : "Refresh"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="h-9 gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              {locale === "hi" ? "सीएसवी निर्यात" : "Export CSV"}
            </Button>
          </div>
        }
      />

      {/* Operational Activity Summary Bar */}
      <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {locale === "hi" ? "ऑडिट गतिविधि सारांश:" : "Activity Summary:"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold font-mono text-slate-800 dark:text-slate-200">
              {stats.total} {locale === "hi" ? "दर्ज प्रविष्टियाँ" : "total records"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              <span>{locale === "hi" ? "अलर्ट:" : "Alerts:"} {stats.byEntity["alert"] || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-semibold">
              <ShieldAlert className="h-3 w-3" />
              <span>{locale === "hi" ? "घटनाएँ:" : "Incidents:"} {stats.byEntity["incident"] || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-semibold">
              <Radio className="h-3 w-3" />
              <span>{locale === "hi" ? "दल:" : "Teams:"} {stats.byEntity["response_team"] || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
              <Package className="h-3 w-3" />
              <span>{locale === "hi" ? "संसाधन:" : "Resources:"} {stats.byEntity["resource"] || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold">
              <FileCheck2 className="h-3 w-3" />
              <span>{locale === "hi" ? "रिपोर्ट्स:" : "Reports:"} {stats.byEntity["field_report"] || 0}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              aria-label={locale === "hi" ? "ऑडिट रिकॉर्ड खोजें" : "Search audit records"}
              placeholder={
                locale === "hi"
                  ? "विवरण, एंटिटी आईडी, या अधिकारी नाम से खोजें..."
                  : "Search narrative, entity ID, or officer name..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={entityFilter}
              aria-label={locale === "hi" ? "एंटिटी प्रकार द्वारा फ़िल्टर करें" : "Filter by entity type"}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
            >
              <option value="ALL">{locale === "hi" ? "सभी एंटिटीज़" : "All Entities"}</option>
              <option value="alert">{locale === "hi" ? "अलर्ट" : "Alerts"}</option>
              <option value="incident">{locale === "hi" ? "घटनाएँ" : "Incidents"}</option>
              <option value="response_team">{locale === "hi" ? "प्रतिक्रिया दल" : "Response Teams"}</option>
              <option value="resource">{locale === "hi" ? "संसाधन" : "Resources"}</option>
              <option value="field_report">{locale === "hi" ? "फ़ील्ड रिपोर्ट" : "Field Reports"}</option>
              <option value="auth">{locale === "hi" ? "प्रमाणीकरण" : "Authentication"}</option>
            </select>

            <select
              value={actionFilter}
              aria-label={locale === "hi" ? "कार्रवाई द्वारा फ़िल्टर करें" : "Filter by operational action"}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F3D66]"
            >
              <option value="ALL">{locale === "hi" ? "सभी कार्रवाइयाँ" : "All Actions"}</option>
              <option value="ALERT_STATUS_CHANGED">{locale === "hi" ? "अलर्ट स्थिति परिवर्तित" : "Alert Status Changed"}</option>
              <option value="ALERT_CREATED">{locale === "hi" ? "अलर्ट सृजित" : "Alert Created"}</option>
              <option value="INCIDENT_CREATED">{locale === "hi" ? "घटना दर्ज" : "Incident Created"}</option>
              <option value="INCIDENT_STATUS_CHANGED">{locale === "hi" ? "घटना स्थिति परिवर्तित" : "Incident Status Changed"}</option>
              <option value="TEAM_ASSIGNED">{locale === "hi" ? "दल आवंटित" : "Team Assigned"}</option>
              <option value="ASSIGNMENT_STATUS_CHANGED">{locale === "hi" ? "आवंटन स्थिति" : "Assignment Status"}</option>
              <option value="RESOURCE_DEPLOYED">{locale === "hi" ? "संसाधन तैनात" : "Resource Deployed"}</option>
              <option value="RESOURCE_RETURNED">{locale === "hi" ? "संसाधन वापस" : "Resource Returned"}</option>
              <option value="FIELD_REPORT_CREATED">{locale === "hi" ? "फ़ील्ड रिपोर्ट दर्ज" : "Field Report Logged"}</option>
              <option value="FIELD_REPORT_VERIFIED">{locale === "hi" ? "फ़ील्ड रिपोर्ट सत्यापित" : "Field Report Verified"}</option>
              <option value="LOGIN_SUCCESS">{locale === "hi" ? "लॉगिन सफल" : "Login Success"}</option>
              <option value="LOGOUT">{locale === "hi" ? "लॉगआउट" : "Logout"}</option>
            </select>

            <Button type="submit" size="sm" className="h-8 text-xs px-3">
              {locale === "hi" ? "खोजें" : "Search"}
            </Button>
            {(entityFilter !== "ALL" || actionFilter !== "ALL" || searchQuery.trim()) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEntityFilter("ALL");
                  setActionFilter("ALL");
                  setSearchQuery("");
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-900"
              >
                {locale === "hi" ? "रीसेट" : "Reset"}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Main Audit Log Table / Feed */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
        {/* State 1: Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
            <p className="text-sm font-medium">
              {locale === "hi" ? "अपरिवर्तनीय ऑडिट लॉग की जाँच की जा रही है..." : "Querying immutable audit logs..."}
            </p>
          </div>
        )}

        {/* State 2: Error */}
        {!loading && error && (
          <div className="py-12 px-4 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "ऑडिट लॉग पुनर्प्राप्ति विफलता" : "Audit Log Retrieval Failure"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="text-xs">
              {locale === "hi" ? "पुनः प्रयास करें" : "Retry Query"}
            </Button>
          </div>
        )}

        {/* State 3: Empty */}
        {!loading && !error && logs.length === 0 && (
          <div className="py-16 px-4 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "कोई ऑडिट रिकॉर्ड नहीं मिला" : "No Audit Records Found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {locale === "hi"
                ? "चयनित फ़िल्टर मापदंडों से कोई दर्ज परिचालन कार्रवाई मेल नहीं खाती।"
                : "No recorded operational actions match the selected filter criteria."}
            </p>
          </div>
        )}

        {/* State 4: Success */}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">{locale === "hi" ? "समय" : "Timestamp"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "कार्रवाई" : "Action"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "एंटिटी" : "Entity"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "कर्ता" : "Actor"}</th>
                  <th className="py-3 px-4">{locale === "hi" ? "परिचालन विवरण" : "Operational Narrative"}</th>
                  <th className="py-3 px-4 text-right">{locale === "hi" ? "विवरण" : "Details"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${getActionBadgeStyle(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getEntityBadge(log.entity_type, locale)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {log.actor_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-sm">
                      <p className="line-clamp-1 leading-snug" title={log.description}>
                        {log.description}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLogForDetail(log)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {locale === "hi" ? "निरीक्षण" : "Inspect"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail & Metadata Inspection Modal */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-xl w-full shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {locale === "hi" ? "ऑडिट रिकॉर्ड विवरण" : "Audit Record Details"}
                </h3>
                <p className="text-[11px] font-mono text-slate-400">Log ID: {selectedLogForDetail.id}</p>
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    {locale === "hi" ? "कार्रवाई" : "Action"}
                  </p>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{selectedLogForDetail.action}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    {locale === "hi" ? "एंटिटी प्रकार / आईडी" : "Entity Type / ID"}
                  </p>
                  <p className="font-mono text-slate-800 dark:text-slate-200">{selectedLogForDetail.entity_type} ({selectedLogForDetail.entity_id})</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    {locale === "hi" ? "कर्ता" : "Actor"}
                  </p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLogForDetail.actor_name} {selectedLogForDetail.actor_id ? `(${selectedLogForDetail.actor_id})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    {locale === "hi" ? "दर्ज समय (UTC)" : "Recorded At (UTC)"}
                  </p>
                  <p className="font-mono text-slate-800 dark:text-slate-200">{selectedLogForDetail.created_at}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {locale === "hi" ? "विवरण सारांश" : "Narrative Summary"}
                </p>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedLogForDetail.description}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "सॉफ़्टवेयर इवेंट मेटाडेटा" : "Sanitized Event Metadata"}
                  </p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {locale === "hi" ? "क्रेडेंशियल्स सुरक्षित" : "Credentials Scrubbed"}
                  </span>
                </div>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedLogForDetail.metadata, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <Button size="sm" onClick={() => setSelectedLogForDetail(null)} className="h-8 text-xs">
                  {locale === "hi" ? "विवरण बंद करें" : "Close Details"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
