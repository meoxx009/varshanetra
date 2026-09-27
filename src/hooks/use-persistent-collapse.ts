"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * usePersistentCollapse
 * Handles collapsible state with localStorage persistence.
 * - Defaults to expanded (true) on first load.
 * - Restores user preference from localStorage once mounted.
 * - Prevents hydration mismatch between SSR and client.
 */
export function usePersistentCollapse(storageKey: string, initialExpanded: boolean = true) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsExpanded(stored === "true" || stored === "expanded");
      }
    } catch {
      // Ignore localStorage errors in private browsing/sandboxes
    }
    setMounted(true);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "expanded" : "collapsed");
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, [storageKey]);

  const expand = useCallback(() => {
    setIsExpanded(true);
    try {
      localStorage.setItem(storageKey, "expanded");
    } catch {
      // Ignore
    }
  }, [storageKey]);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    try {
      localStorage.setItem(storageKey, "collapsed");
    } catch {
      // Ignore
    }
  }, [storageKey]);

  return {
    isExpanded,
    mounted,
    toggle,
    expand,
    collapse,
  };
}
