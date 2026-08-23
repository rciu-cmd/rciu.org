"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { asset } from "@/lib/asset";
import { useLanguage, LANGUAGES } from "@/lib/language-context";

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("Нүүр", "Home", "ホーム", "首页") },
    { href: "/about", label: t("Бидний тухай", "About", "私たちについて", "关于我们") },
    { href: "/news", label: t("Мэдээ", "News", "ニュース", "新闻") },
    { href: "/projects", label: t("Төслүүд", "Projects", "プロジェクト", "项目") },
    { href: "/board", label: t("Удирдлага", "Board", "役員", "理事会") },
    { href: "/members", label: t("Гишүүд", "Members", "会員", "会员") },
    { href: "/links", label: t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "链接与伙伴") },
    { href: "/contact", label: t("Холбоо барих", "Contact", "お問い合わせ", "联系我们") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="container-page flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src={asset("/logos/rciu-emblem.jpg")} alt="RCIU" width={40} height={40} className="rounded-full" />
          <span className="font-bold text-rotary-royal-blue leading-tight hidden sm:block">
            Rotary Club<br className="hidden md:block" /> of Ikh Urgoo
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-rotary-royal-blue transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs font-semibold">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-1 rounded ${
                  lang === l.code ? "bg-rotary-royal-blue text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Link
            href="/login"
            className="hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white transition-colors"
          >
            {t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "会员登录")}
          </Link>
          <button
            className="lg:hidden p-2 text-slate-700"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-3 text-sm font-medium text-slate-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  lang === l.code ? "bg-rotary-royal-blue text-white" : "text-slate-500 bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
