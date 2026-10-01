"use client";

import { useState, useSyncExternalStore } from "react";
import { asset } from "@/lib/asset";
import { useLanguage } from "@/lib/language-context";

// "Share" row for a news post or project page. Always shares the
// per-item page (/news/<id>/, /projects/<id>/) — the one whose link
// preview shows the item's own title and photo (src/lib/share-data.ts)
// — even when it's opened from /news/view/?id=.
//   • Facebook: Facebook's share dialog, in a new tab.
//   • Share…: the phone's own share menu (Messenger, Viber, Telegram,
//     …); only shown where the browser has one, i.e. phones/tablets.
//   • Copy link: for pasting anywhere else.
const noSubscribe = () => () => {};

export default function ShareButtons({ path, title }: { path: string; title: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );
  const url = `https://rciu.org${asset(path)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("Холбоосыг хуулна уу:", "Copy this link:", "このリンクをコピー：", "複製此連結：", "이 링크를 복사하세요:"), url);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // Closed the share menu — nothing to do.
    }
  }

  const button =
    "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-rotary-royal-blue hover:text-rotary-royal-blue transition";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-500 mr-1">{t("Хуваалцах:", "Share:", "シェア：", "分享：", "공유:")}</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
        Facebook
      </a>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={button}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          {t("Messenger ба бусад", "Messenger & more", "Messenger など", "Messenger 等", "Messenger 등")}
        </button>
      )}
      <button type="button" onClick={copy} className={button}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {copied
          ? t("Хуулагдлаа ✓", "Copied ✓", "コピーしました ✓", "已複製 ✓", "복사됨 ✓")
          : t("Холбоос хуулах", "Copy link", "リンクをコピー", "複製連結", "링크 복사")}
      </button>
    </div>
  );
}
