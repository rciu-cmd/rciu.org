"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type NewsRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  title_ja: string | null;
  title_zh: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  facebook_url: string | null;
  published_at: string | null;
};

declare global {
  interface Window {
    FB?: { XFBML: { parse: () => void } };
  }
}

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

  // Facebook embeds (task item 1: "put only link, must show whole
  // post with photo/video") render via Facebook's public Post Plugin,
  // which needs its JS SDK loaded once. Items load after the SDK's
  // own initial auto-parse would have run, so re-parse whenever the
  // list changes.
  useEffect(() => {
    if (!items?.some((n) => n.facebook_url)) return;
    if (window.FB) {
      window.FB.XFBML.parse();
      return;
    }
    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [items]);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Мэдээ", "News", "ニュース", "新聞")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t("Клубын сүүлийн үеийн мэдээ, үйл явдал.", "The latest news and updates from the club.", "クラブの最新ニュースと活動報告。", "俱樂部最新新聞與動態。")}
      </p>

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t(
            "Мэдээ удахгүй нэмэгдэнэ. Admin самбараас нийтэлж болно.",
            "No news posted yet — admins can publish updates from the admin dashboard.",
            "まだニュースはありません。管理者ダッシュボードから投稿できます。",
            "暫無新聞。管理員可從後臺發佈動態。"
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((n) =>
            n.facebook_url ? (
              <article key={n.id} className="rounded-2xl border border-slate-200 p-3 shadow-sm hover:shadow-lg transition overflow-hidden flex justify-center">
                <div className="fb-post" data-href={/^https?:\/\//i.test(n.facebook_url) ? n.facebook_url : `https://${n.facebook_url}`} data-width="500" data-show-text="true" />
              </article>
            ) : (
              // Written posts: now show the cover photo (was text-only
              // before) and open the full story on its own page instead
              // of doing nothing when clicked.
              <Link key={n.id} href={`/news/view/?id=${n.id}`}>
                <article className="h-full rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden bg-white flex flex-col">
                  <div className="relative aspect-video bg-slate-100">
                    {n.cover_image_url ? (
                      <Image src={n.cover_image_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={48} height={48} />
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="font-bold text-slate-900 mb-2">{t(n.title_mn ?? "", n.title_en ?? "")}</h2>
                    <p className="text-slate-600 text-sm line-clamp-4 flex-1">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                  </div>
                </article>
              </Link>
            )
          )}
        </div>
      )}
      <div id="fb-root" />
    </div>
  );
}
