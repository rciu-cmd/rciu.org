"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  const [counts, setCounts] = useState<{
    pending: number;
    active: number;
    draftNews: number;
    projects: number;
    newJoinInquiries: number;
    newProjectInquiries: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [pending, active, draftNews, projects, newJoinInquiries, newProjectInquiries] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("join_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("project_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      setCounts({
        pending: pending.count ?? 0,
        active: active.count ?? 0,
        draftNews: draftNews.count ?? 0,
        projects: projects.count ?? 0,
        newJoinInquiries: newJoinInquiries.count ?? 0,
        newProjectInquiries: newProjectInquiries.count ?? 0,
      });
    }
    load();
    // Inquiries don't email anyone (no notification system is wired
    // up), so this Overview page is the only place an admin finds out
    // about a new one — refresh periodically while the tab stays open,
    // not just once on page load.
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      href: "/admin/members",
      label: t("Хүлээгдэж буй гишүүд", "Pending members", "承認待ちの会員", "待審核會員"),
      value: counts?.pending,
      accent: counts && counts.pending > 0 ? "border-rotary-gold" : "border-slate-200",
    },
    {
      href: "/admin/members",
      label: t("Идэвхтэй гишүүд", "Active members", "現役会員", "活躍會員"),
      value: counts?.active,
      accent: "border-slate-200",
    },
    {
      href: "/admin/news",
      label: t("Ноорог мэдээ", "Draft news posts", "下書きのニュース", "新聞草稿"),
      value: counts?.draftNews,
      accent: "border-slate-200",
    },
    {
      href: "/admin/projects",
      label: t("Нийт төсөл", "Total projects", "プロジェクト総数", "項目總數"),
      value: counts?.projects,
      accent: "border-slate-200",
    },
    {
      href: "/admin/join-inquiries",
      label: t("Шинэ элсэх хүсэлт", "New join inquiries", "新規入会問合せ", "新入會申請"),
      value: counts?.newJoinInquiries,
      accent: counts && counts.newJoinInquiries > 0 ? "border-rotary-gold" : "border-slate-200",
    },
    {
      href: "/admin/project-inquiries",
      label: t("Шинэ төслийн хүсэлт", "New project inquiries", "新規プロジェクト問合せ", "新項目申請"),
      value: counts?.newProjectInquiries,
      accent: counts && counts.newProjectInquiries > 0 ? "border-rotary-gold" : "border-slate-200",
    },
  ];

  return (
    <div>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {t(
          "Энд мэдээ, төсөл нийтлэх, шинэ гишүүдийг зөвшөөрөх зэрэг вебсайтын агуулгыг удирдана.",
          "Manage the website's content here — publish news, add projects, and approve new member signups.",
          "ここでウェブサイトのコンテンツを管理します — ニュースの公開、プロジェクトの追加、新規会員の承認ができます。",
          "在此管理網站內容——發佈新聞、添加項目、審核新會員。"
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`rounded-xl border-2 ${c.accent} p-5 hover:shadow-sm transition-shadow`}>
            <p className="text-3xl font-bold text-slate-900">{c.value ?? "…"}</p>
            <p className="text-sm text-slate-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        <Link href="/admin/news" className="rounded-xl bg-rotary-royal-blue text-white p-6 font-semibold hover:opacity-90">
          {t("+ Мэдээ нэмэх", "+ New News Post", "+ ニュースを追加", "+ 添加新聞")}
        </Link>
        <Link href="/admin/projects" className="rounded-xl bg-rotary-azure text-white p-6 font-semibold hover:opacity-90">
          {t("+ Төсөл нэмэх", "+ New Project", "+ プロジェクトを追加", "+ 添加項目")}
        </Link>
        <Link href="/admin/events" className="rounded-xl bg-rotary-gold text-[#5a3d0a] p-6 font-semibold hover:opacity-90">
          {t("+ Үйл явдал нэмэх", "+ New Event", "+ イベントを追加", "+ 添加活動")}
        </Link>
        <Link href="/admin/members" className="rounded-xl bg-slate-800 text-white p-6 font-semibold hover:opacity-90">
          {t("Гишүүд зөвшөөрөх", "Review Members", "会員を確認", "審核會員")}
        </Link>
      </div>
    </div>
  );
}
