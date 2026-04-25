"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "en" | "vi";

type TranslationValue = string | number | boolean | null | TranslationValue[] | { [key: string]: TranslationValue };

interface LocaleContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Record<Language, Record<string, TranslationValue>>;
}

import enTranslations from "../locales/en.json" with { type: "json" };
import viTranslations from "../locales/vi.json" with { type: "json" };

// Cast JSON imports to the proper type with nested support
const enTyped = enTranslations as unknown as Record<string, TranslationValue>;
const viTyped = viTranslations as unknown as Record<string, TranslationValue>;

const translations: Record<Language, Record<string, TranslationValue>> = {
  en: enTyped,
  vi: viTyped,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined || path;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("aivo-language") as Language;
    if (saved && (saved === "en" || saved === "vi")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("aivo-language", lang);
  };

  const t = (key: string): string => {
    const translated = getNestedValue(translations[language], key);
    if (typeof translated === "string") {
      return translated;
    }
    // Fallback to English
    const fallback = getNestedValue(translations.en, key);
    return typeof fallback === "string" ? fallback : key;
  };

  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
