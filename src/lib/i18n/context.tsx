"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import enMessages from "../../../messages/en.json";
import hiMessages from "../../../messages/hi.json";

export type Locale = "en" | "hi";

export interface LocaleOption {
  code: Locale;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

export const DEFAULT_LOCALE: Locale = "en";
const STORAGE_KEY = "varshanetra_locale";
const COOKIE_NAME = "NEXT_LOCALE";

type TranslationDictionary = typeof enMessages;

const dictionaries: Record<Locale, TranslationDictionary> = {
  en: enMessages,
  hi: hiMessages as unknown as TranslationDictionary,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  messages: TranslationDictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveNestedKey(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Initialize locale from storage / cookies / browser
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === "en" || stored === "hi")) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
        return;
      }

      // Check cookie
      const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
      if (match && (match[2] === "en" || match[2] === "hi")) {
        setLocaleState(match[2] as Locale);
        document.documentElement.lang = match[2];
        return;
      }

      // Check browser language
      const browserLang = navigator.language?.toLowerCase();
      if (browserLang && browserLang.startsWith("hi")) {
        setLocaleState("hi");
        document.documentElement.lang = "hi";
      } else {
        setLocaleState(DEFAULT_LOCALE);
        document.documentElement.lang = DEFAULT_LOCALE;
      }
    } catch {
      setLocaleState(DEFAULT_LOCALE);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch {
      // ignore storage issues in restricted iframes
    }
  }, []);

  const t = useCallback(
    (
      key: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      const actualFallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
      const actualParams = typeof fallbackOrParams === "object" ? fallbackOrParams : params;

      // 1. Try currently active locale
      const activeDict = dictionaries[locale] || dictionaries.en;
      let text = resolveNestedKey(activeDict, key);

      // 2. Fallback to English dictionary
      if (text === undefined && locale !== "en") {
        text = resolveNestedKey(dictionaries.en, key);
        if (process.env.NODE_ENV === "development") {
          console.warn(`[VarshaNetra:i18n] Missing translation for key: '${key}' in locale '${locale}', falling back to English.`);
        }
      }

      // 3. Fallback to provided fallback string or key itself
      if (text === undefined) {
        if (actualFallback !== undefined) {
          return interpolate(actualFallback, actualParams);
        }
        if (process.env.NODE_ENV === "development") {
          console.warn(`[VarshaNetra:i18n] Untranslated key: '${key}' in both '${locale}' and English.`);
        }
        return key;
      }

      return interpolate(text, actualParams);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages: dictionaries[locale] || dictionaries.en,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback safe dummy context if invoked outside provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (
        key: string,
        fallbackOrParams?: string | Record<string, string | number>,
        params?: Record<string, string | number>
      ) => {
        const actualFallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
        const actualParams = typeof fallbackOrParams === "object" ? fallbackOrParams : params;
        const text = resolveNestedKey(dictionaries.en, key) || actualFallback || key;
        return interpolate(text, actualParams);
      },
      messages: dictionaries.en,
    };
  }
  return context;
}

/**
 * Hook returning current Locale as a primitive string ("en" | "hi").
 */
export function useLocale(): Locale {
  return useI18n().locale;
}

export function useTranslations(namespace?: string) {
  const { t } = useI18n();
  return useCallback(
    (
      subKey: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      const fullKey = namespace ? `${namespace}.${subKey}` : subKey;
      return t(fullKey, fallbackOrParams, params);
    },
    [t, namespace]
  );
}
