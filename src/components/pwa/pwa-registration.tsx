"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

export function PWARegistration() {
  const locale = useLocale();
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 1. Service Worker Registration
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[VarshaNetra:PWA] Service Worker registered with scope:", registration.scope);

        // Check if an updated worker is already waiting
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        // Listen for when an update is found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });
      } catch (err) {
        console.warn("[VarshaNetra:PWA] Service Worker registration failed:", err);
      }
    };

    // Delay registration until window is loaded for optimal FCP
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    // 2. Network Online / Offline Event Listeners
    const handleOnline = () => {
      console.log("[VarshaNetra:PWA] Network online detected.");
      window.dispatchEvent(new CustomEvent("varshanetra:network-status", { detail: { isOffline: false } }));
      window.dispatchEvent(new CustomEvent("varshanetra:trigger-sync"));
    };

    const handleOffline = () => {
      console.warn("[VarshaNetra:PWA] Network offline detected.");
      window.dispatchEvent(new CustomEvent("varshanetra:network-status", { detail: { isOffline: true } }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4. Automatic Chunk Loading Desync Self-Healing (handles build-to-build cache mismatches)
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || "";
      if (
        msg.includes("Loading chunk") ||
        msg.includes("ChunkLoadError") ||
        msg.includes("Failed to fetch dynamically imported module")
      ) {
        console.warn("[VarshaNetra:PWA] Chunk load desync detected. Purging stale caches and refreshing...");
        const reloaded = sessionStorage.getItem("varshanetra_chunk_reloaded");
        if (!reloaded) {
          sessionStorage.setItem("varshanetra_chunk_reloaded", "true");
          if (typeof window !== "undefined") {
            const w = window as Window;
            if ("caches" in w && w.caches) {
              w.caches.keys().then((keys) => {
                Promise.all(keys.map((k) => w.caches.delete(k))).then(() => {
                  w.location.reload();
                });
              });
            } else {
              w.location.reload();
            }
          }
        }
      }
    };

    window.addEventListener("error", handleGlobalError);

    return () => {
      window.removeEventListener("load", registerSW);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ action: "skipWaiting" });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-xs">
              {locale === "hi" ? "नया अपडेट उपलब्ध है" : "New Update Available"}
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              {locale === "hi"
                ? "वर्षानेत्र का नया संस्करण उपलब्ध है। क्या आप ताज़ा करना चाहते हैं?"
                : "A new version of VarshaNetra is ready. Refresh now to apply updates?"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setUpdateAvailable(false)}
          className="text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUpdateAvailable(false)}
          className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
        >
          {locale === "hi" ? "बाद में" : "Later"}
        </Button>
        <Button
          size="sm"
          onClick={handleRefresh}
          className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{locale === "hi" ? "ताज़ा करें" : "Refresh"}</span>
        </Button>
      </div>
    </div>
  );
}
