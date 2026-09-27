"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signInWithGovernmentId } from "@/lib/auth/actions";
import { normalizeGovernmentId } from "@/lib/auth/utils";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTranslations } from "@/lib/i18n/context";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get("next") || "/dashboard";
  const { refresh } = useAuth();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [governmentId, setGovernmentId] = useState("MH-REV-2024-889");
  const [password, setPassword] = useState("Passcode@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedId = normalizeGovernmentId(governmentId);
    if (!normalizedId) {
      setErrorMessage(tAuth("invalidCredentials"));
      return;
    }

    if (!password) {
      setErrorMessage(tAuth("passwordPlaceholder"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithGovernmentId({
        governmentId: normalizedId,
        password,
      });

      if (!result.success) {
        setErrorMessage(
          result.error || tAuth("invalidCredentials")
        );
        setIsLoading(false);
        return;
      }

      await refresh();
      router.push(nextRoute);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      setErrorMessage(`${tCommon("failed")}: ${msg}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Top Header with Compact Language Switcher */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0F3D66] text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0F3D66] dark:text-white">
            VARSHA<span className="text-[#2563EB]">NETRA</span>
          </span>
        </Link>
        <LanguageSwitcher compact />
      </div>

      {/* Login Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-bold">{tAuth("signInTitle")}</CardTitle>
          <CardDescription className="text-xs">
            {tAuth("signInSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Error Message Alert */}
            {errorMessage && (
              <div
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Government ID Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {tAuth("governmentId")}
                </label>
                <span className="text-[10px] text-slate-400">ID Code</span>
              </div>
              <input
                type="text"
                required
                value={governmentId}
                onChange={(e) => setGovernmentId(e.target.value)}
                placeholder={tAuth("governmentIdPlaceholder")}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
              />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {tAuth("password")}
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tAuth("passwordPlaceholder")}
                  className="w-full p-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D66]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Rule 17 Compliance & Identification Notice */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="leading-snug">
                <strong>Account Notice:</strong> Government ID in this system is an officer-entered account credential.
              </span>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <span>{tAuth("signingIn")}</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>{tAuth("signInButton")}</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ← {tCommon("overview")}
          </Link>
          <Link href="/signup" className="text-[#2563EB] font-semibold hover:underline">
            {tAuth("signUpButton")}
          </Link>
        </CardFooter>
      </Card>

      {/* Public Information Portal Access Banner (W-011) */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-xs shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[#0F3D66] dark:text-blue-300 flex items-center gap-1.5 text-xs sm:text-sm">
            <span>📢</span>
            <span>नागरिक लोक सूचना पोर्टल • Public Information</span>
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
            बिना लॉगिन • No Login
          </span>
        </div>
        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
          जिले का वर्तमान बाढ़ जोखिम, आपातकालीन हेल्पलाइन नंबर (100, 101, 108, 1077) एवं सुरक्षा सावधानियां सीधे देखें।
        </p>
        <Link
          href="/public"
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[#0F3D66] hover:bg-[#0c3152] text-white font-bold text-xs transition shadow-xs"
        >
          <span>लोक सूचना पोर्टल खोलें • Open Public Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950">
      <Suspense
        fallback={
          <div className="p-6 text-center text-xs text-slate-500 font-medium animate-pulse">
            {tCommon("loading")}
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
