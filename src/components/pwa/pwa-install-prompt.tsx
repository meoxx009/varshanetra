"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const locale = useLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem("varshanetra_pwa_dismissed");
    if (dismissed) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setTimeout(() => setIsVisible(false), 3000);
    } else {
      setIsVisible(false);
      sessionStorage.setItem("varshanetra_pwa_dismissed", "true");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("varshanetra_pwa_dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div
      role="banner"
      aria-label="Install VarshaNetra PWA"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-md p-3.5 sm:p-4 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5 duration-300"
    >
      {isInstalled ? (
        <div className="flex items-center gap-2.5 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">
            {locale === "hi"
              ? "वर्षानेत्र सफलतापूर्वक इंस्टॉल हो गया!"
              : "VarshaNetra successfully installed!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                  {locale === "hi"
                    ? "VarshaNetra को अपने फोन में इंस्टॉल करें"
                    : "Install VarshaNetra on your phone"}
                </h4>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {locale === "hi"
                    ? "आपदा के दौरान बेहतर ऑफ़लाइन पहुंच और तेज़ लोडिंग के लिए इंस्टॉल करें।"
                    : "Install for full offline emergency access and faster loading during disasters."}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 h-8"
            >
              {locale === "hi" ? "बाद में (Later)" : "Later"}
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs gap-1.5 h-8 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{locale === "hi" ? "इंस्टॉल करें" : "Install"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
