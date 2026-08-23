"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  const [counts, setCounts] = useState<{ pending: number; active: number; draftNews: number; projects: number } | null>(null);

  useEffect(() => {
    async function load() {
      const [pending, active, draftNews, projects] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("projects").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        pending: pending.count ?? 0,
        active: active.count ?? 0,
        draftNews: draftNews.count ?? 0,
        projects: projects.count ?? 0,
      });
    }
    load();
  }, []);

  const cards = [
    {
      href: "/admin/members",
      label: t("Хүлээгдэж буй гишүүд", "Pending members", "承認待ちの会員", "待审核会员"),
      value: counts?.pending,
      accent: counts && counts.pending > 0 ? "border-rotary-gold" : "border-slate-200",
    },
    {
      href: "/admin/members",
      label: t("Идэвхтэй гишүүд", "Active members", "現役会員", "活跃会员"),
      value: counts?.active,
      accent: "border-slate-200",
    },
    {
      href: "/admin/news",
      label: t("Ноорог мэдээ", "Draft news posts", "下書きのニュース", "新闻草稿"),
      value: counts?.draftNews,
      accent: "border-slate-200",
    },
    {
      href: "/admin/projects",
      label: t("Нийт төсөл", "Total projects", "プロジェクト総数", "项目总数"),
      value: counts?.projects,
      accent: "border-slate-200",
    },
  ];

  return (
    <div>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {t(
          "Энд мэдээ, төсөл нийтлэх, шинэ гишүүдийг зөвшөөрөх зэрэг вебсайтын агуулгыг удирдана.",
          "Manage the website's content here — publish news, add projects, and approve new member signups.",
          "ここでウェブサイトのコンテンツを管理します — ニュースの公開、プロジェクトの追加、新規会員の承認ができます。",
          "在此管理网站内容——发布新闻、添加项目、审核新会员。"
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

      <div className="grid gap-4 sm:grid-cols-3 mt-10">
        <Link href="/admin/news" className="rounded-xl bg-rotary-royal-blue text-white p-6 font-semibold hover:opacity-90">
          {t("+ Мэдээ нэмэх", "+ New News Post", "+ ニュースを追加", "+ 添加新闻")}
        </Link>
        <Link href="/admin/projects" className="rounded-xl bg-rotary-azure text-white p-6 font-semibold hover:opacity-90">
          {t("+ Төсөл нэмэх", "+ New Project", "+ プロジェクトを追加", "+ 添加项目")}
        </Link>
        <Link href="/admin/members" className="rounded-xl bg-slate-800 text-white p-6 font-semibold hover:opacity-90">
          {t("Гишүүд зөвшөөрөх", "Review Members", "会員を確認", "审核会员")}
        </Link>
      </div>
    </div>
  );
}
