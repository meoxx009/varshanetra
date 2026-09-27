"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  UserPlus,
  Info,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signUpWithGovernmentId } from "@/lib/auth/actions";
import {
  normalizeGovernmentId,
  validateIndianMobileNumber,
  evaluatePasswordStrength,
} from "@/lib/auth/utils";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTranslations } from "@/lib/i18n/context";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [formData, setFormData] = useState({
    fullName: "",
    governmentId: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
    role: "OFFICER",
    department: "DDMA",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordStrength = evaluatePasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side pre-validations
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setErrorMessage("Please enter your full official name.");
      return;
    }

    const normalizedId = normalizeGovernmentId(formData.governmentId);
    if (!normalizedId || normalizedId.length < 3) {
      setErrorMessage(
        "Government ID must be at least 3 alphanumeric characters (e.g. MH-REV-2024-889)."
      );
      return;
    }

    const phoneCheck = validateIndianMobileNumber(formData.mobileNumber);
    if (!phoneCheck.valid) {
      setErrorMessage(phoneCheck.error || "Invalid mobile number format.");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and re-enter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUpWithGovernmentId({
        fullName: formData.fullName,
        governmentId: normalizedId,
        phone: formData.mobileNumber,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        department: formData.department,
        district: "Pune",
      });

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to register account. Please verify your details."
        );
        setIsSubmitting(false);
        return;
      }

      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setErrorMessage(`Registration failure: ${msg}`);
      setIsSubmitting(false);
    }
  };

  const getStrengthBarColor = () => {
    switch (passwordStrength.score) {
      case 0:
      case 1:
        return "bg-red-500 w-1/4";
      case 2:
        return "bg-amber-500 w-2/4";
      case 3:
        return "bg-sky-500 w-3/4";
      case 4:
        return "bg-emerald-500 w-full";
      default:
        return "bg-slate-200 w-0";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header with Language Switcher */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#0F3D66] dark:text-white">
              VARSHA<span className="text-[#2563EB]">NETRA</span>
            </span>
          </Link>
          <LanguageSwitcher compact />
        </div>

        {/* Registration Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-bold">{tAuth("signUpTitle")}</CardTitle>
            <CardDescription className="text-xs">
              {tAuth("signUpSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Error Alert */}
              {errorMessage && (
                <div
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300 flex items-start gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* 1. Full Name */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {tAuth("fullName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={tAuth("fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                />
              </div>

              {/* 2. Government ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {tAuth("governmentId")} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">ID Code</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder={tAuth("governmentIdPlaceholder")}
                  value={formData.governmentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      governmentId: normalizeGovernmentId(e.target.value),
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                />
              </div>

              {/* 3. Mobile Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {tAuth("mobileNumber")} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">10-Digit Mobile</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder={tAuth("mobileNumberPlaceholder")}
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                />
              </div>

              {/* 4. Password with Show/Hide & Strength Guidance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {tAuth("password")} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Strength: {passwordStrength.label}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={tAuth("passwordPlaceholder")}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter Bar */}
                {formData.password.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${getStrengthBarColor()}`} />
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Suggestion: {passwordStrength.feedback.join(" ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Confirm Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {tAuth("confirmPassword")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder={tAuth("confirmPasswordPlaceholder")}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="w-full p-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mandatory Rule 17 & Government ID Identification Banner */}
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-[11px] text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                <div className="space-y-0.5">
                  <span className="font-bold">Government ID Notice (Rule 17):</span>
                  <p className="leading-snug">
                    Government ID in this system serves solely as a user-entered account identifier. It is strictly badged as <em>Self-Declared / Pending EOC Verification</em> and is never claimed as officially verified without government directory linkage.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <span>{tAuth("signingUp")}</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{tAuth("signUpButton")}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              ← {tCommon("overview")}
            </Link>
            <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
              {tAuth("haveAccount")} {tAuth("signInButton")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
