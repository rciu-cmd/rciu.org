"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

export default function Navbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = not checked yet

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // No separate "Home" link — the logo + club name (below) already
  // links to "/", so a dedicated Home button would just be a duplicate.
  // No "Admin" link here even for admins — too many buttons once
  // logged in, and Admin is already one click away from the Dashboard
  // page (the "Go to Admin Dashboard" button on /dashboard).
  // Board and Members moved onto the About page as buttons (Members
  // only shows there once logged in); Join Us moved onto the Contact
  // page as its own CTA — keeps this bar down to 5 links.
  const links = [
    { href: "/about", label: t("Бидний тухай", "About", "私たちについて", "關於我們", "소개") },
    { href: "/news", label: t("Мэдээ", "News", "ニュース", "新聞", "소식") },
    { href: "/projects", label: t("Төслүүд", "Projects", "プロジェクト", "項目", "프로젝트") },
    { href: "/events", label: t("Арга хэмжээ", "Events", "イベント", "活動", "행사") },
    { href: "/contact", label: t("Холбоо барих", "Contact", "お問い合わせ", "聯繫我們", "문의") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="container-page flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src={asset("/logos/district-3450.png")} alt="Rotary District 3450" width={160} height={80} className="object-contain hidden sm:block" />
          <Image src={asset("/logos/rciu-emblem.jpg")} alt="RCIU" width={40} height={40} className="rounded-full" />
          <span className="font-bold text-rotary-royal-blue leading-tight hidden sm:block">
            {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶輪伊赫烏爾古俱樂部")}
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
          {/* Donate lives once, prominently, in the home page hero —
              not duplicated here in the nav. */}
          <Link
            href={authed ? "/dashboard" : "/login"}
            className="hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white transition-colors"
          >
            {authed
              ? t("Хувийн профайл", "My Dashboard", "マイページ", "我的主頁", "마이페이지")
              : t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "會員登錄", "회원 로그인")}
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
          <Link href={authed ? "/dashboard" : "/login"} onClick={() => setOpen(false)} className="font-semibold text-rotary-royal-blue">
            {authed ? t("Хувийн профайл", "My Dashboard", "マイページ", "我的主頁", "마이페이지") : t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "會員登錄", "회원 로그인")}
          </Link>
        </nav>
      )}
    </header>
  );
}
