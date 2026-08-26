"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

// Gates every /admin/* page behind admin_level. RLS also enforces
// this server-side on every table (super-only policies call
// public.is_super_admin(); News/Projects stay open to any admin
// level via public.is_admin()), so this client check is about UX
// (redirect + which nav tabs show), not security — an editor-level
// admin who somehow loads a super-only page still can't read/write
// those tables; their requests just come back empty/blocked.
const EDITOR_ALLOWED_PATHS = ["/admin/news", "/admin/projects"];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [adminLevel, setAdminLevel] = useState<"none" | "editor" | "super">("none");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login/");
        return;
      }
      const { data } = await supabase.from("members").select("admin_level").eq("id", session.user.id).single();
      const level = (data?.admin_level as "none" | "editor" | "super" | undefined) ?? "none";
      setAdminLevel(level);
      setStatus(level === "none" ? "denied" : "ok");
    });
  }, [router]);

  const isSuper = adminLevel === "super";
  const isEditorOnlyPath = pathname != null && !EDITOR_ALLOWED_PATHS.some((p) => pathname.startsWith(p));

  // Editors land on a bare "/admin" (there's no Overview page for
  // them — it surfaces member/event data they can't see) — send them
  // straight to News instead.
  useEffect(() => {
    if (status === "ok" && !isSuper && (pathname === "/admin" || pathname === "/admin/")) {
      router.replace("/admin/news/");
    }
  }, [status, isSuper, pathname, router]);

  if (status === "checking") {
    return <div className="container-page py-20 text-center text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</div>;
  }

  if (status === "denied") {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-slate-500 mb-4">
          {t("Танд админ эрх байхгүй байна.", "You don't have admin access.", "管理者権限がありません。", "您沒有管理員權限。")}
        </p>
        <Link href="/dashboard" className="text-rotary-royal-blue font-semibold underline">
          {t("Хувийн профайл руу буцах", "Back to My Dashboard", "マイページに戻る", "返回我的主頁")}
        </Link>
      </div>
    );
  }

  const allTabs = [
    { href: "/admin", label: t("Хураангуй", "Overview", "概要", "概覽") },
    { href: "/admin/news", label: t("Мэдээ", "News", "ニュース", "新聞") },
    { href: "/admin/projects", label: t("Төслүүд", "Projects", "プロジェクト", "項目") },
    { href: "/admin/events", label: t("Хуанли", "Calendar", "カレンダー", "日曆") },
    { href: "/admin/travel", label: t("Аяллын зураг", "Travel Map", "旅行マップ", "旅行地圖") },
    { href: "/admin/awards", label: t("Шагнал", "Awards", "受賞", "獎項") },
    { href: "/admin/board", label: t("Удирдлага", "Board", "役員", "理事會") },
    { href: "/admin/affiliates", label: t("Дэмждэг клуб", "Sponsored Clubs", "スポンサークラブ", "贊助俱樂部") },
    { href: "/admin/partners", label: t("Түншүүд", "Partners", "パートナー", "夥伴") },
    { href: "/admin/gallery", label: t("Зургийн цомог", "Gallery", "ギャラリー", "相冊") },
    { href: "/admin/history", label: t("Түүх", "History", "歴史", "歷史") },
    { href: "/admin/join-inquiries", label: t("Элсэх хүсэлт", "Join Inquiries", "入会問合せ", "入會申請") },
    { href: "/admin/project-inquiries", label: t("Төслийн хүсэлт", "Project Inquiries", "プロジェクト問合せ", "項目申請") },
    { href: "/admin/members", label: t("Гишүүд", "Members", "会員", "會員") },
    { href: "/admin/settings", label: t("Тохиргоо", "Settings", "設定", "設置") },
  ];
  // Editors only ever see News + Projects — everything else in
  // /admin is super-admin territory (member management, appointing
  // other admins, board, history, partners, settings, etc.).
  const tabs = isSuper ? allTabs : allTabs.filter((tab) => EDITOR_ALLOWED_PATHS.includes(tab.href));

  return (
    <div>
      <div className="bg-slate-900 text-white">
        <div className="container-page flex items-center justify-between py-4">
          <h1 className="font-bold text-lg">
            {t("Админ самбар", "Admin Dashboard", "管理者ダッシュボード", "管理後臺")}
            {!isSuper && <span className="ml-2 text-xs font-normal text-slate-400">({t("редактор", "editor", "編集者", "編輯")})</span>}
          </h1>
          <Link href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white">
            {t("← Хувийн профайл руу", "← Back to My Dashboard", "← マイページへ", "← 返回我的主頁")}
          </Link>
        </div>
        <div className="container-page flex gap-1 pb-2 overflow-x-auto text-sm font-medium">
          {tabs.map((tab) => {
            const active = tab.href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-t-md whitespace-nowrap ${active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="container-page py-10">
        {!isSuper && isEditorOnlyPath ? (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">
              {t(
                "Энэ хэсэг зөвхөн ерөнхий админд нээлттэй.",
                "This section is only available to super admins.",
                "このセクションはスーパー管理者のみ利用できます。",
                "此部分僅限超級管理員使用。"
              )}
            </p>
            <Link href="/admin/news" className="text-rotary-royal-blue font-semibold underline">
              {t("Мэдээ рүү буцах", "Back to News", "ニュースに戻る", "返回新聞")}
            </Link>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
