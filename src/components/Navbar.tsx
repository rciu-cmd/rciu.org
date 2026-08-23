"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage, LANGUAGES } from "@/lib/language-context";

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = not checked yet
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthed(!!session);
      if (session) {
        const { data } = await supabase.from("members").select("is_admin").eq("id", session.user.id).single();
        setIsAdmin(!!data?.is_admin);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // No separate "Home" link — the logo + club name (below) already
  // links to "/", so a dedicated Home button would just be a duplicate.
  // "Members" (roster + honor roll) is for logged-in members only.
  const links = [
    { href: "/about", label: t("Бидний тухай", "About", "私たちについて", "关于我们") },
    { href: "/news", label: t("Мэдээ", "News", "ニュース", "新闻") },
    { href: "/projects", label: t("Төслүүд", "Projects", "プロジェクト", "项目") },
    { href: "/board", label: t("Удирдлага", "Board", "役員", "理事会") },
    ...(authed ? [{ href: "/members", label: t("Гишүүд", "Members", "会員", "会员") }] : []),
    { href: "/contact", label: t("Холбоо барих", "Contact", "お問い合わせ", "联系我们") },
    ...(isAdmin ? [{ href: "/admin", label: t("Админ", "Admin", "管理者", "管理员") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="container-page flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src={asset("/logos/rciu-logo-transparent.png")} alt="RCIU" width={40} height={40} />
          <span className="font-bold text-rotary-royal-blue leading-tight hidden sm:block">
            {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}
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
          <div className="hidden sm:flex items-center gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-label={l.name}
                title={l.name}
                className={`w-8 h-8 flex items-center justify-center rounded text-lg leading-none ${
                  lang === l.code ? "bg-rotary-royal-blue/10 ring-2 ring-rotary-royal-blue" : "hover:bg-slate-100"
                }`}
              >
                {l.flag}
              </button>
            ))}
          </div>
          <Link
            href={authed ? "/dashboard" : "/login"}
            className="hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white transition-colors"
          >
            {authed
              ? t("Хувийн профайл", "My Dashboard", "マイページ", "我的主页")
              : t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "会员登录")}
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
            {authed ? t("Хувийн профайл", "My Dashboard", "マイページ", "我的主页") : t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "会员登录")}
          </Link>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-label={l.name}
                title={l.name}
                className={`w-9 h-9 flex items-center justify-center rounded text-xl leading-none ${
                  lang === l.code ? "bg-rotary-royal-blue/10 ring-2 ring-rotary-royal-blue" : "bg-slate-100"
                }`}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
