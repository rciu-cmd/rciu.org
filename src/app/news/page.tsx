"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type NewsRow = {
  id: string;
  title_mn: string;
  title_en: string;
  title_ja: string | null;
  title_zh: string | null;
  body_mn: string;
  body_en: string;
  cover_image_url: string | null;
  published_at: string | null;
};

export default function NewsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("news")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => setItems((data as NewsRow[]) ?? []));
  }, []);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Мэдээ", "News", "ニュース", "新闻")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t("Клубын сүүлийн үеийн мэдээ, үйл явдал.", "The latest news and updates from the club.", "クラブの最新ニュースと活動報告。", "俱乐部最新新闻与动态。")}
      </p>

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t(
            "Мэдээ удахгүй нэмэгдэнэ. Admin самбараас нийтэлж болно.",
            "No news posted yet — admins can publish updates from the admin dashboard.",
            "まだニュースはありません。管理者ダッシュボードから投稿できます。",
            "暂无新闻。管理员可从后台发布动态。"
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((n) => (
            <article key={n.id} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-2">{t(n.title_mn, n.title_en)}</h2>
              <p className="text-slate-600 text-sm line-clamp-4">{t(n.body_mn, n.body_en)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
