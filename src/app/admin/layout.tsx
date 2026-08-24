"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

// Gates every /admin/* page behind is_admin. RLS also enforces this
// server-side on every table (admin policies call public.is_admin()),
// so this client check is about UX (redirect + nav), not security —
// a non-admin who somehow loaded this UI still can't read/write
// admin-only rows.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login/");
        return;
      }
      const { data } = await supabase.from("members").select("is_admin").eq("id", session.user.id).single();
      if (data?.is_admin) {
        setStatus("ok");
      } else {
        setStatus("denied");
      }
    });
  }, [router]);

  if (status === "checking") {
    return <div className="container-page py-20 text-center text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</div>;
  }

  if (status === "denied") {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-slate-500 mb-4">
          {t("Танд админ эрх байхгүй байна.", "You don't have admin access.", "管理者権限がありません。", "您没有管理员权限。")}
        </p>
        <Link href="/dashboard" className="text-rotary-royal-blue font-semibold underline">
          {t("Хувийн профайл руу буцах", "Back to My Dashboard", "マイページに戻る", "返回我的主页")}
        </Link>
      </div>
    );
  }

  const tabs = [
    { href: "/admin", label: t("Хураангуй", "Overview", "概要", "概览") },
    { href: "/admin/news", label: t("Мэдээ", "News", "ニュース", "新闻") },
    { href: "/admin/projects", label: t("Төслүүд", "Projects", "プロジェクト", "项目") },
    { href: "/admin/events", label: t("Хуанли", "Calendar", "カレンダー", "日历") },
    { href: "/admin/affiliates", label: t("Дэмждэг клуб", "Sponsored Clubs", "スポンサークラブ", "赞助俱乐部") },
    { href: "/admin/partners", label: t("Түншүүд", "Partners", "パートナー", "伙伴") },
    { href: "/admin/history", label: t("Түүх", "History", "歴史", "历史") },
    { href: "/admin/join-inquiries", label: t("Элсэх хүсэлт", "Join Inquiries", "入会問合せ", "入会申请") },
    { href: "/admin/members", label: t("Гишүүд", "Members", "会員", "会员") },
    { href: "/admin/settings", label: t("Тохиргоо", "Settings", "設定", "设置") },
  ];

  return (
    <div>
      <div className="bg-slate-900 text-white">
        <div className="container-page flex items-center justify-between py-4">
          <h1 className="font-bold text-lg">{t("Админ самбар", "Admin Dashboard", "管理者ダッシュボード", "管理后台")}</h1>
          <Link href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white">
            {t("← Хувийн профайл руу", "← Back to My Dashboard", "← マイページへ", "← 返回我的主页")}
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
      <div className="container-page py-10">{children}</div>
    </div>
  );
}
