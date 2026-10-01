"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toHongKong } from "./zh-hk";

export type Lang = "mn" | "en" | "ja" | "zh" | "hk" | "ko";

// Flags, not text labels — a text label's width varies a lot between
// languages ("EN" vs "日本語"), which shifted every button next to it
// in the navbar each time the language changed. A flag glyph is a
// fixed visual size in every language, so the layout stays put.
// EN uses the UK flag (not the US flag) — the club's own choice.
// Chinese comes twice, both in Traditional characters: 🇹🇼 written the
// Taiwan way (the zh text passed to t()), and 🇭🇰 for Hong Kong (District
// 3450 is Hong Kong, Macau and Mongolia) — the same text with Hong Kong
// wording swapped in by toHongKong() (src/lib/zh-hk.ts).
export const LANGUAGES: { code: Lang; label: string; flag: string; name: string }[] = [
  { code: "mn", label: "MN", flag: "🇲🇳", name: "Монгол" },
  { code: "en", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "ja", label: "JA", flag: "🇯🇵", name: "日本語" },
  { code: "zh", label: "ZH", flag: "🇹🇼", name: "繁體中文（台灣）" },
  { code: "hk", label: "HK", flag: "🇭🇰", name: "繁體中文（香港）" },
  { code: "ko", label: "KO", flag: "🇰🇷", name: "한국어" },
];

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /**
   * Translate a string. Pass Mongolian and English always (the site's
   * two fully-written languages); ja/zh/ko are optional — until the
   * club supplies real Japanese/Chinese/Korean copy for a given
   * string, those fall back to English rather than showing blank or
   * Mongolian text to a reader in that language. Hong Kong (hk) has no
   * argument of its own: it shows zh through toHongKong().
   *
   * Never returns blank while any version has text: an empty Mongolian
   * falls back to English and vice versa. That matters for database
   * content (event/project descriptions, news bodies), where an admin
   * may fill in only one language — better the other language than
   * nothing.
   */
  t: (mn: string, en: string, ja?: string, zh?: string, ko?: string) => string;
}

// t()'s type, for components that are handed t as a prop.
export type Translate = LanguageContextValue["t"];

// One text in all five written languages (Hong Kong comes from zh) — for
// lists of labels (project status, event category, …). Pass to t() as
// t(l.mn, l.en, l.ja, l.zh, l.ko).
export type Label = { mn: string; en: string; ja: string; zh: string; ko: string };

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "rciu-lang";

function isLang(value: string | null | undefined): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

// First visit (no saved choice): the browser's primary language if the
// site has it, otherwise Mongolian. Only the *primary* language counts
// on purpose — a Russian-first browser in Mongolia that also lists
// English is far more likely a Mongolian reader than an English one.
// "zh-CN", "ja-JP", etc. match on their first part, except Hong Kong /
// Macau Chinese ("zh-HK", "zh-Hant-MO", …) and Cantonese ("yue"), which
// get the Hong Kong version.
function detectBrowserLang(): Lang {
  const tag = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  const primary = tag.split("-")[0];
  if (primary === "yue" || (primary === "zh" && /-(hk|mo)(-|$)/.test(tag))) return "hk";
  return isLang(primary) ? primary : "mn";
}

// Value for <html lang>, so screen readers, Google, and the browser's
// CJK font choice all know which language the page is in. Both Chinese
// versions are written in Traditional characters.
const HTML_LANG: Record<Lang, string> = { mn: "mn", en: "en", ja: "ja", zh: "zh-Hant", hk: "zh-HK", ko: "ko" };

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
        return mn || en;
      case "ja":
        return ja || en || mn;
      case "zh":
        return zh || en || mn;
      case "hk":
        return (zh && toHongKong(zh)) || en || mn;
      case "ko":
        return ko || en || mn;
      default:
        return en || mn;
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
