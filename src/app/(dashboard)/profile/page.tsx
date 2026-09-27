"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  Lock,
  Save,
  Building,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateProfile } from "@/lib/auth/actions";
import { validateIndianMobileNumber } from "@/lib/auth/utils";
import { useLocale } from "@/lib/i18n/context";
import { OfficerOperationalGuide } from "@/components/profile/officer-operational-guide";

const DEPARTMENT_OPTIONS = [
  "District Administration",
  "DDMA",
  "EOC",
  "SDRF/NDRF Coordination",
  "Police",
  "Fire",
  "PWD",
  "Health",
  "Irrigation/Water Resources",
  "Municipal Administration",
  "Other",
];

export default function ProfilePage() {
  const locale = useLocale();
  const { profile, refresh } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("DDMA");
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("Pune");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync profile into state once loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setDesignation(profile.designation || "District Incident Commander");
      setDepartment(profile.department || "District Administration");
      setState(profile.state || "Maharashtra");
      setDistrict(profile.district || "Pune");
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!fullName || fullName.trim().length < 2) {
      setErrorMessage(
        locale === "hi"
          ? "पूरा नाम कम से कम 2 अक्षरों का होना चाहिए।"
          : "Full Name must be at least 2 characters."
      );
      return;
    }

    const phoneCheck = validateIndianMobileNumber(phone);
    if (!phoneCheck.valid) {
      setErrorMessage(
        phoneCheck.error ||
          (locale === "hi"
            ? "कृपया एक मान्य 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें।"
            : "Please enter a valid 10-digit Indian mobile number.")
      );
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        phone: phoneCheck.normalized || phone,
        designation: designation.trim(),
        department,
        state,
        district,
      });

      if (!res.success) {
        setErrorMessage(
          res.error ||
            (locale === "hi"
              ? "प्रोफ़ाइल परिवर्तन सहेजने में विफल।"
              : "Failed to save profile changes.")
        );
        setIsSaving(false);
        return;
      }

      await refresh();
      setSuccessMessage(
        locale === "hi"
          ? "अधिकारी प्रोफ़ाइल सफलतापूर्वक अद्यतित और सुरक्षित हो गई।"
          : "Officer profile successfully updated and persisted."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save error";
      setErrorMessage(
        locale === "hi"
          ? `प्रोफ़ाइल अद्यतन करने में विफल: ${msg}`
          : `Failed to update profile: ${msg}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const governmentId = profile?.government_id || "MH-REV-2024-889";

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={locale === "hi" ? "अधिकारी प्रोफ़ाइल एवं परिचालन क्रेडेंशियल्स" : "Officer Profile & Operational Credentials"}
        description={
          locale === "hi"
            ? "वैधानिक आपदा कमान क्रेडेंशियल्स, नामित परिचालन विभाग, और पूर्व चेतावनियों के लिए अधिकार क्षेत्र।"
            : "Statutory disaster command credentials, designated operational department, and jurisdictional jurisdiction for early warnings."
        }
        breadcrumbs={[
          { label: locale === "hi" ? "डैशबोर्ड" : "Dashboard", href: "/dashboard" },
          { label: locale === "hi" ? "प्रोफ़ाइल" : "Profile" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Officer ID Card Summary */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center space-y-3 shadow-xs">
            <div className="w-20 h-20 rounded-full bg-[#0F3D66] text-white font-black text-2xl flex items-center justify-center shadow-md">
              {getInitials(fullName || "District Officer")}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {fullName || "Officer Name"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {designation || "Officer"}
              </p>
            </div>

            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-left">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[11px]">
                  {locale === "hi" ? "सरकारी आईडी" : "Government ID"}
                </span>
                <span className="font-mono font-bold text-[#0F3D66] dark:text-blue-400">
                  {governmentId}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 pt-1">
                <Building className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>{department}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>
                  {district} {locale === "hi" ? "ज़िला" : "District"}, {state}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{phone || (locale === "hi" ? "कॉन्फ़िगर नहीं" : "Not configured")}</span>
              </div>
            </div>
          </Card>

          {/* Rule 17 Compliance Alert */}
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-[11px] text-sky-800 dark:text-sky-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{locale === "hi" ? "सरकारी आईडी नीति (नियम 17)" : "Government ID Policy (Rule 17)"}</span>
            </div>
            <p className="leading-snug">
              {locale === "hi"
                ? `आपकी सरकारी आईडी (${governmentId}) एक असत्यापित खाता पहचानकर्ता है। टिकट श्रृंखला और ऑडिट लॉग की सुरक्षा के लिए, यह स्थायी रूप से लॉक और गैर-संपादन योग्य है।`
                : `Your Government ID (${governmentId}) is an unverified account identifier. To safeguard ticket chains and audit logs, it is permanently locked and non-editable.`}
            </p>
          </div>
        </div>

        {/* Right Column: Profile Edit Form */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {locale === "hi" ? "परिचालन प्रोफ़ाइल संपादित करें" : "Edit Operational Profile"}
              </CardTitle>
              <CardDescription className="text-xs">
                {locale === "hi"
                  ? "अधिकारी पद, विभाग, संपर्क फोन और आवंटित ज़िला अद्यतन करें।"
                  : "Update officer designation, department, contact phone, and assigned district."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                {/* Feedback Alerts */}
                {successMessage && (
                  <div
                    className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
                    role="status"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300 flex items-center gap-2"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 1. Full Name & Government ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "पूरा नाम एवं पदवी" : "Full Name & Title"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={locale === "hi" ? "उदा. डॉ. राजेश शर्मा, आईएएस" : "e.g. Dr. Rajesh Sharma, IAS"}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {locale === "hi" ? "सरकारी आईडी (केवल पठनीय)" : "Government ID (Read-Only)"}
                        </span>
                      </label>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-medium">
                        {locale === "hi" ? "लॉक किया गया" : "Locked"}
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={governmentId}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono text-xs cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* 2. Designation (Free Text) & Department (11 Options) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "पद (मुक्त पाठ)" : "Designation (Free Text)"}
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder={
                        locale === "hi"
                          ? "उदा. उप-विभागीय दंडाधिकारी / तहसीलदार"
                          : "e.g. Sub-Divisional Magistrate / Tahsildar"
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "परिचालन विभाग" : "Operational Department"}
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                    >
                      {DEPARTMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Mobile Number & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        {locale === "hi" ? "आधिकारिक मोबाइल नंबर" : "Official Mobile Number"}
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {locale === "hi" ? "10-अंकीय भारतीय मोबाइल" : "10-Digit Indian Mobile"}
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 98220 12345 or +91 9822012345"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" ? "आवंटित ज़िला" : "Assigned District"}
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Pune"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                    />
                  </div>
                </div>

                {/* 4. State */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "hi" ? "राज्य / केंद्र शासित प्रदेश" : "State / Union Territory"}
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs px-5 py-2.5 gap-2 shadow-xs"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          {locale === "hi" ? "सुरक्षित किया जा रहा है..." : "Saving to Supabase..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>
                          {locale === "hi" ? "प्रोफ़ाइल परिवर्तन सहेजें" : "Save Profile Changes"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operational User Guide for Officers */}
      <OfficerOperationalGuide />
    </div>
  );
}
