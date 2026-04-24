"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "en" | "vi";

interface Translations {
  [key: string]: string | { [key: string]: string };
}

interface LocaleContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Translations;
}

import enTranslations from "./en.json" with { type: "json" };
import viTranslations from "./vi.json" with { type: "json" };

const translations: Record<Language, Translations> = {
  en: enTranslations,
  vi: viTranslations,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split(".").reduce((current, key) => current?.[key], obj) || path;
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
