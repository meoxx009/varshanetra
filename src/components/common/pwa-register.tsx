"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local");

    // On localhost, service workers cause stale CSS/JS chunk caching between rebuilds.
    // Unregister any active service workers and clear cache storage so the browser
    // always downloads fresh, properly styled assets.
    if (isLocalhost) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().then(() => {
              console.log("[VarshaNetra:SW] Unregistered localhost service worker:", reg.scope);
            });
          }
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key).then(() => {
              console.log("[VarshaNetra:SW] Cleared localhost cache:", key);
            });
          }
        });
      }
      return;
    }

    // In production on public domains (e.g. Vercel), register sw.js
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[VarshaNetra:PWA] ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[VarshaNetra:PWA] ServiceWorker registration skipped or failed:", error);
          });
      });
    }
  }, []);

  return null;
}
