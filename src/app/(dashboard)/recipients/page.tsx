"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Upload,
  Search,
  RefreshCw,
  Phone,
  Building,
  MapPin,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StateContainer, ComponentViewState } from "@/components/common/state-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLocale, useTranslations } from "@/lib/i18n/context";
import {
  AlertRecipient,
  RecipientCategory,
  RecipientsCountByCategory,
  DataSourceMeta,
} from "@/types";

const RECIPIENTS_PAGE_SOURCE_META: DataSourceMeta = {
  provider: "VarshaNetra DDMA Directory & Supabase PostgREST",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "Official disaster response recipient directory. Twilio trial enabled. NIC SMS Gateway ready.",
};

const CATEGORIES: Array<{
  key: RecipientCategory;
  labelEn: string;
  labelHi: string;
  badgeClass: string;
}> = [
  {
    key: "OFFICER",
    labelEn: "District Officers",
    labelHi: "जिला अधिकारी",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    key: "PRADHAN",
    labelEn: "Gram Pradhans",
    labelHi: "ग्राम प्रधान",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    key: "SCHOOL_PRINCIPAL",
    labelEn: "School Principals",
    labelHi: "स्कूल प्रधानाचार्य",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    key: "HOSPITAL_ADMIN",
    labelEn: "Hospital Admins",
    labelHi: "अस्पताल अधीक्षक",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300",
  },
  {
    key: "MEDIA",
    labelEn: "Media Liaisons",
    labelHi: "मीडिया संपर्क",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300",
  },
  {
    key: "OTHER",
    labelEn: "Other Stakeholders",
    labelHi: "अन्य हितधारक",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
];

export default function RecipientsPage() {
  const locale = useLocale();
  const tNav = useTranslations("navigation");

  const [viewState, setViewState] = useState<ComponentViewState>("loading");
  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [counts, setCounts] = useState<RecipientsCountByCategory>({
    OFFICER: 0,
    PRADHAN: 0,
    SCHOOL_PRINCIPAL: 0,
    HOSPITAL_ADMIN: 0,
    MEDIA: 0,
    OTHER: 0,
    TOTAL: 0,
    ACTIVE: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<RecipientCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertRecipient | null>(null);

  // Add form fields
  const [addForm, setAddForm] = useState<{
    name: string;
    phone: string;
    category: RecipientCategory;
    district: string;
  }>({
    name: "",
    phone: "+91",
    category: "OFFICER",
    district: "Pune District",
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // CSV Import fields
  const [csvContent, setCsvContent] = useState<string>(
    `Name, Phone, Category, District\nShri Ramesh Kumar, +919822112233, OFFICER, Pune District\nSmt. Geeta Patil, +919823445566, PRADHAN, Haveli Taluka\nDr. Vijay Deshmukh, +919824778899, HOSPITAL_ADMIN, Sassoon General Hospital`
  );
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Fetch recipients and counts
  const fetchRecipients = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/recipients");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load recipient directory.");
      }

      setRecipients(json.data || []);
      if (json.counts) setCounts(json.counts);

      if (json.data && json.data.length > 0) {
        setViewState("success");
      } else {
        setViewState("empty");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching recipients.");
      setViewState("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone.includes(searchQuery.trim()) ||
        r.district.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [recipients, categoryFilter, searchQuery]);

  // Handle Add Recipient
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);
    setIsAdding(true);

    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add recipient.");
      }

      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        phone: "+91",
        category: "OFFICER",
        district: "Pune District",
      });
      fetchRecipients(true);
    } catch (err: unknown) {
      setAddFormError(err instanceof Error ? err.message : "Error creating recipient.");
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (recipient: AlertRecipient) => {
    try {
      const res = await fetch(`/api/recipients/${recipient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !recipient.is_active }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update recipient.");
      }
      fetchRecipients(true);
    } catch (err) {
      console.error("Toggle active failed:", err);
    }
  };

  // Handle Delete Recipient
  const handleDeleteRecipient = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/recipients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete recipient.");
      }
      setDeleteTarget(null);
      fetchRecipients(true);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Handle Bulk Import
  const handleBulkImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/recipients/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: csvContent }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk import failed.");
      }

      setImportResult({
        imported: data.imported,
        failed: data.failed,
        errors: data.errors || [],
      });
      fetchRecipients(true);
    } catch (err: unknown) {
      setImportResult({
        imported: 0,
        failed: 0,
        errors: [err instanceof Error ? err.message : "Bulk import processing failed."],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={locale === "hi" ? "आपातकालीन एसएमएस प्राप्तकर्ता प्रबंधन" : "Emergency SMS Recipient Management"}
        description={
          locale === "hi"
            ? "जिला अधिकारी, ग्राम प्रधान, स्कूल और अस्पताल आपातकालीन संपर्क निर्देशिका। सीएपी एवं एसएमएस अधिसूचना नेटवर्क।"
            : "District officials, Gram Pradhans, schools and hospital emergency directory for verified CAP & SMS broadcasts."
        }
        breadcrumbs={[
          { label: tNav("dashboard") || "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "प्राप्तकर्ता" : "Recipients" },
        ]}
        sourceMeta={RECIPIENTS_PAGE_SOURCE_META}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => fetchRecipients(true)}
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
                setImportResult(null);
                setIsCsvModalOpen(true);
              }}
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1 text-[#0F3D66] dark:text-blue-300 border-slate-300"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? "CSV बल्क अपलोड" : "Bulk CSV Import"}</span>
            </Button>

            <Button
              onClick={() => {
                setAddFormError(null);
                setIsAddModalOpen(true);
              }}
              size="sm"
              className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{locale === "hi" ? "नया प्राप्तकर्ता जोड़ें" : "Add Recipient"}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title={locale === "hi" ? "कुल प्राप्तकर्ता" : "Total Recipients"}
          value={String(counts.TOTAL)}
          unit={locale === "hi" ? "संपर्क" : "Contacts"}
          icon={Users}
          severity="NORMAL"
          sourceLabel="DDMA Directory"
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "जिला अधिकारी" : "District Officers"}
          value={String(counts.OFFICER)}
          unit={locale === "hi" ? "अधिकारी" : "Officers"}
          icon={ShieldCheck}
          severity="NORMAL"
          sourceLabel="Administrative"
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "ग्राम प्रधान" : "Gram Pradhans"}
          value={String(counts.PRADHAN)}
          unit={locale === "hi" ? "प्रधान" : "Pradhans"}
          icon={Building}
          severity="NORMAL"
          sourceLabel="Panchayati Raj"
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "स्कूल प्रधानाचार्य" : "School Principals"}
          value={String(counts.SCHOOL_PRINCIPAL)}
          unit={locale === "hi" ? "विद्यालय" : "Schools"}
          icon={Building}
          severity="NORMAL"
          sourceLabel="Education Dept"
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "अस्पताल अधीक्षक" : "Hospital Admins"}
          value={String(counts.HOSPITAL_ADMIN)}
          unit={locale === "hi" ? "अस्पताल" : "Hospitals"}
          icon={Building}
          severity="NORMAL"
          sourceLabel="Health Dept"
          isLoading={isLoading}
        />
        <MetricCard
          title={locale === "hi" ? "सक्रिय प्रसारण" : "Active Delivery"}
          value={String(counts.ACTIVE)}
          unit={locale === "hi" ? "सक्रिय" : "Active"}
          icon={CheckCircle2}
          severity="NORMAL"
          sourceLabel="Ready to Receive"
          isLoading={isLoading}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={locale === "hi" ? "नाम, फोन नंबर या ब्लॉक खोजें..." : "Search name, phone, district..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                categoryFilter === "ALL"
                  ? "bg-[#0F3D66] text-white border-[#0F3D66]"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {locale === "hi" ? "सभी श्रेणियां" : "All Categories"} ({recipients.length})
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategoryFilter(c.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                  categoryFilter === c.key
                    ? "bg-[#0F3D66] text-white border-[#0F3D66]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {locale === "hi" ? c.labelHi : c.labelEn} ({counts[c.key] || 0})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Directory Table View Container (4 View States) */}
      <StateContainer
        state={viewState}
        onRetry={() => fetchRecipients()}
        errorMessage={errorMessage}
        loadingMessage={locale === "hi" ? "प्राप्तकर्ता सूची लोड हो रही है..." : "Loading recipient directory..."}
        emptyTitle={locale === "hi" ? "कोई प्राप्तकर्ता पंजीकृत नहीं है" : "No Emergency Recipients Registered"}
        emptyDescription={
          locale === "hi"
            ? "प्रारंभिक चेतावनी संदेश भेजने के लिए नए प्राप्तकर्ता जोड़ें या CSV फ़ाइल अपलोड करें।"
            : "Add official contacts or upload a CSV file to begin broadcasting early warnings."
        }
      >
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">{locale === "hi" ? "नाम एवं पद" : "Name & Title"}</th>
                  <th className="py-3 px-4 font-semibold">{locale === "hi" ? "श्रेणी" : "Category"}</th>
                  <th className="py-3 px-4 font-semibold">{locale === "hi" ? "मोबाइल नंबर" : "Phone (+91)"}</th>
                  <th className="py-3 px-4 font-semibold">{locale === "hi" ? "क्षेत्र / ब्लॉक" : "District / Block"}</th>
                  <th className="py-3 px-4 font-semibold">{locale === "hi" ? "प्रसारण स्थिति" : "Status"}</th>
                  <th className="py-3 px-4 font-semibold text-right">{locale === "hi" ? "कार्रवाई" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecipients.map((recipient) => {
                  const catConfig = CATEGORIES.find((c) => c.key === recipient.category);
                  return (
                    <tr
                      key={recipient.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
                          <span>{recipient.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          ID: {recipient.id.slice(0, 10)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            catConfig?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {locale === "hi" ? catConfig?.labelHi : catConfig?.labelEn}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{recipient.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#2563EB]" />
                          <span>{recipient.district}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(recipient)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            recipient.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                          title="Click to toggle broadcast status"
                        >
                          {recipient.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{locale === "hi" ? "सक्रिय (Active)" : "Active"}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>{locale === "hi" ? "निष्क्रिय (Muted)" : "Inactive"}</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(recipient)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-7 px-2"
                          title="Remove recipient"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </StateContainer>

      {/* Mandatory Notice: Twilio Free Trial vs NIC SMS Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <h5 className="font-bold text-[11px] uppercase tracking-wide">
              {locale === "hi" ? "परीक्षण खाता सूचना" : "Twilio Trial Account Notice"}
            </h5>
            <p className="text-[11px] leading-relaxed">
              वर्तमान में Twilio परीक्षण खाते का उपयोग हो रहा है। उत्पादन में NIC SMS गेटवे या राज्य SMS सेवा का उपयोग किया जाएगा।
            </p>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
              Currently using Twilio trial account. Production will use NIC SMS Gateway or State SMS service.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-1 flex-1">
            <h5 className="font-bold text-[11px] uppercase tracking-wide">
              {locale === "hi" ? "एनआईसी सरकारी गेटवे" : "NIC Government SMS Gateway"}
            </h5>
            <p className="text-[11px] leading-relaxed">
              NIC SMS Gateway सरकारी विभागों के लिए निःशुल्क उपलब्ध है। अधिक जानकारी:{" "}
              <a
                href="https://nicgw.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-0.5"
              >
                nicgw.gov.in <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
              NIC SMS Gateway is free for government departments. More info: nicgw.gov.in
            </p>
          </div>
        </div>
      </div>

      {/* ADD RECIPIENT MODAL */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-recipient-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle id="add-recipient-title" className="text-base font-bold flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0F3D66] dark:text-blue-400" />
                  <span>{locale === "hi" ? "नया आपातकालीन प्राप्तकर्ता जोड़ें" : "Add Emergency Recipient"}</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleAddRecipient}>
              <CardContent className="p-4 space-y-3 text-xs">
                {addFormError && (
                  <div className="p-2.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{addFormError}</span>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {locale === "hi" ? "नाम एवं पदवी *" : "Full Name & Designation *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Patil, SDM Haveli"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {locale === "hi" ? "मोबाइल नंबर (+91 आवश्यक) *" : "Mobile Phone (+91 mandatory) *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+919822012345"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full p-2 font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Format: +91 followed by 10 digits (e.g. +919822012345)
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {locale === "hi" ? "श्रेणी *" : "Recipient Category *"}
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm({ ...addForm, category: e.target.value as RecipientCategory })
                    }
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#2563EB]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {locale === "hi" ? c.labelHi : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {locale === "hi" ? "जिला / ब्लॉक *" : "District / Block *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune District"
                    value={addForm.district}
                    onChange={(e) => setAddForm({ ...addForm, district: e.target.value })}
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAdding}
                  className="text-xs"
                >
                  {locale === "hi" ? "रद्द करें" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAdding}
                  className="bg-[#0F3D66] hover:bg-[#0F3D66]/90 text-white font-bold text-xs"
                >
                  {isAdding
                    ? (locale === "hi" ? "जोड़ रहे हैं..." : "Adding...")
                    : (locale === "hi" ? "सुरक्षित करें" : "Save Recipient")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* CSV BULK IMPORT MODAL */}
      {isCsvModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 my-4 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle id="csv-modal-title" className="text-base font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{locale === "hi" ? "CSV बल्क संपर्क आयात" : "Bulk CSV Recipient Import"}</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                Format: <code>Name, Phone (+91...), Category, District</code>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              {importResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    importResult.imported > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <p className="font-bold">
                    {importResult.imported} recipients imported, {importResult.failed} failed.
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 text-[11px] space-y-0.5">
                      {importResult.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {locale === "hi" ? "CSV डेटा पेस्ट करें:" : "Paste CSV Records:"}
                </label>
                <textarea
                  rows={7}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-2 font-mono text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-bold block text-slate-700 dark:text-slate-300 mb-0.5">
                  Valid Categories:
                </span>
                <code>OFFICER, PRADHAN, SCHOOL_PRINCIPAL, HOSPITAL_ADMIN, MEDIA, OTHER</code>
              </div>
            </CardContent>

            <CardFooter className="pt-3 pb-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCsvModalOpen(false)}
                disabled={isImporting}
                className="text-xs"
              >
                {locale === "hi" ? "बंद करें" : "Close"}
              </Button>
              <Button
                size="sm"
                onClick={handleBulkImport}
                disabled={isImporting || !csvContent.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                {isImporting
                  ? (locale === "hi" ? "आयात कर रहे हैं..." : "Importing...")
                  : (locale === "hi" ? "आयात निष्पादित करें" : "Execute Import")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={locale === "hi" ? "प्राप्तकर्ता हटाएं?" : "Delete Recipient?"}
        description={
          <p className="text-xs">
            {locale === "hi"
              ? `क्या आप वास्तव में ${deleteTarget?.name} (${deleteTarget?.phone}) को आपातकालीन प्रसारण सूची से हटाना चाहते हैं?`
              : `Are you sure you want to remove ${deleteTarget?.name} (${deleteTarget?.phone}) from the emergency SMS broadcast directory?`}
          </p>
        }
        confirmLabel={locale === "hi" ? "हाँ, हटाएं" : "Yes, Delete"}
        variant="destructive"
        onConfirm={handleDeleteRecipient}
      />
    </div>
  );
}
