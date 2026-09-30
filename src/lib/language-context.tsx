"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "mn" | "en" | "ja" | "zh" | "ko";

// Flags, not text labels — a text label's width varies a lot between
// languages ("EN" vs "日本語"), which shifted every button next to it
// in the navbar each time the language changed. A flag glyph is a
// fixed visual size in every language, so the layout stays put.
// EN uses the UK flag (not the US flag) and ZH uses the Taiwan flag
// (not the PRC flag) — the club's own choice of flag per language,
// not a claim about which country's dialect the text follows.
export const LANGUAGES: { code: Lang; label: string; flag: string; name: string }[] = [
  { code: "mn", label: "MN", flag: "🇲🇳", name: "Монгол" },
  { code: "en", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "ja", label: "JA", flag: "🇯🇵", name: "日本語" },
  { code: "zh", label: "ZH", flag: "🇹🇼", name: "中文" },
  { code: "ko", label: "KO", flag: "🇰🇷", name: "한국어" },
];

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /**
   * Translate a string. Pass Mongolian and English always (the site's
   * two fully-written languages); ja/zh/ko are optional — until the
   * club supplies real Japanese/Mandarin/Korean copy for a given
   * string, those fall back to English rather than showing blank or
   * Mongolian text to a reader in that language.
   */
  t: (mn: string, en: string, ja?: string, zh?: string, ko?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "rciu-lang";

function isLang(value: string | null | undefined): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

// First visit (no saved choice): the browser's primary language if the
// site has it, otherwise Mongolian. Only the *primary* language counts
// on purpose — a Russian-first browser in Mongolia that also lists
// English is far more likely a Mongolian reader than an English one.
// "zh-CN", "ja-JP", etc. match on their first part.
function detectBrowserLang(): Lang {
  const primary = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase().split("-")[0];
  return isLang(primary) ? primary : "mn";
}

// Value for <html lang>, so screen readers, Google, and the browser's
// CJK font choice all know which language the page is in. The Chinese
// copy is written in Traditional characters.
const HTML_LANG: Record<Lang, string> = { mn: "mn", en: "en", ja: "ja", zh: "zh-Hant", ko: "ko" };

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on both server and first client render so
  // hydration output always matches (avoids a hydration mismatch).
  // Once mounted, switch to the visitor's saved choice, or else their
  // browser language — this is a deliberate one-time sync from
  // external systems (browser storage/settings) on mount, not app
  // state ping-ponging, so we intentionally opt out of the
  // set-state-in-effect lint rule here. The detected language isn't
  // saved; only an explicit flag click is (setLang below).
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage/browser on mount, see comment above
    setLangState(isLang(stored) ? stored : detectBrowserLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (mn: string, en: string, ja?: string, zh?: string, ko?: string) => {
    switch (lang) {
      case "mn":
        return mn;
      case "ja":
        return ja || en;
      case "zh":
        return zh || en;
      case "ko":
        return ko || en;
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
