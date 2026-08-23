"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "mn" | "en" | "ja" | "zh";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "mn", label: "MN" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /**
   * Translate a string. Pass Mongolian and English always (the site's
   * two fully-written languages); ja/zh are optional — until the club
   * supplies real Japanese/Mandarin copy, those fall back to English
   * rather than showing blank or Mongolian text to a ja/zh reader.
   */
  t: (mn: string, en: string, ja?: string, zh?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "rciu-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on both server and first client render so
  // hydration output always matches (avoids a hydration mismatch).
  // Once mounted, read the visitor's saved preference from
  // localStorage and switch — this is a deliberate one-time sync from
  // an external system (browser storage) on mount, not app state
  // ping-ponging, so we intentionally opt out of the
  // set-state-in-effect lint rule here.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "mn" || stored === "en" || stored === "ja" || stored === "zh") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount, see comment above
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (mn: string, en: string, ja?: string, zh?: string) => {
    switch (lang) {
      case "mn":
        return mn;
      case "ja":
        return ja || en;
      case "zh":
        return zh || en;
      default:
        return en;
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
