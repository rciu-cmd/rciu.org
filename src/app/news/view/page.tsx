"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type NewsRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  facebook_url: string | null;
  link_url: string | null;
  published_at: string | null;
};

declare global {
  interface Window {
    FB?: { XFBML: { parse: () => void } };
  }
}

function fbHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function NewsDetailPage() {
  return (
    // useSearchParams needs a Suspense boundary during static export —
    // same pattern as /projects/view/page.tsx.
    <Suspense fallback={<div className="container-page py-14" />}>
      <NewsDetail />
    </Suspense>
  );
}

function NewsDetail() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [item, setItem] = useState<NewsRow | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setItem(null);
      return;
    }
    supabase
      .from("news")
      .select("id,title_mn,title_en,body_mn,body_en,cover_image_url,facebook_url,link_url,published_at")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => setItem((data as NewsRow | null) ?? null));
  }, [id]);

  // Same Facebook Post Plugin embed used on the home page and /news —
  // needed here too since a Facebook-linked post's "full text with
  // photos" is the embed itself, not any text stored in our own DB.
  useEffect(() => {
    if (!item?.facebook_url) return;
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
  }, [item]);

  if (item === undefined) {
    return <div className="container-page py-14 text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</div>;
  }

  if (item === null) {
    return (
      <div className="container-page py-14">
        <p className="text-slate-500 mb-4">
          {t("Мэдээ олдсонгүй.", "News post not found.", "ニュースが見つかりません。", "找不到該新聞。")}
        </p>
        <Link href="/news" className="text-rotary-royal-blue font-semibold hover:underline">
          {t("← Бүх мэдээ рүү буцах", "← Back to all News", "← ニュース一覧へ戻る", "← 返回所有新聞")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-14 max-w-3xl">
      <Link href="/news" className="text-sm text-rotary-royal-blue font-semibold hover:underline mb-6 inline-block">
        {t("← Бүх мэдээ рүү буцах", "← Back to all News", "← ニュース一覧へ戻る", "← 返回所有新聞")}
      </Link>

      {item.facebook_url ? (
        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm flex justify-center bg-white">
          <div className="fb-post" data-href={fbHref(item.facebook_url)} data-width="500" data-show-text="true" />
        </div>
      ) : (
        <article className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="relative aspect-video bg-slate-100">
            {item.cover_image_url ? (
              <Image src={item.cover_image_url} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50">
                <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={72} height={72} />
              </div>
            )}
          </div>
          <div className="p-8">
            {item.published_at && (
              <p className="text-xs font-semibold text-rotary-azure uppercase tracking-wide mb-2">
                {new Date(item.published_at).toLocaleDateString()}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{t(item.title_mn ?? "", item.title_en ?? "")}</h1>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{t(item.body_mn ?? "", item.body_en ?? "")}</p>

            {item.link_url && (
              <a
                href={item.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 text-sm font-bold px-6 py-3 rounded-full bg-rotary-gold text-slate-900 shadow-sm hover:brightness-95 transition"
              >
                {t("Дэлгэрэнгүй холбоос →", "Learn More →", "詳しくはこちら →", "了解更多 →")}
              </a>
            )}
          </div>
        </article>
      )}
      <div id="fb-root" />
    </div>
  );
}
