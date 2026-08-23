"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type LinkRow = {
  id: string;
  name: string;
  url: string | null;
  logo_url: string | null;
  description_en: string | null;
};

type AffiliateRow = {
  id: string;
  name: string;
  club_type: "interact" | "rotaract";
  description_en: string | null;
  logo_url: string | null;
};

export default function LinksPage() {
  const { t } = useLanguage();
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [affiliates, setAffiliates] = useState<AffiliateRow[] | null>(null);

  useEffect(() => {
    supabase.from("links_partners").select("*").order("sort_order").then(({ data }) => setLinks((data as LinkRow[]) ?? []));
    supabase.from("affiliate_clubs").select("*").order("sort_order").then(({ data }) => setAffiliates((data as AffiliateRow[]) ?? []));
  }, []);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "链接与伙伴")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t("Ах дүү, найрсаг клубууд болон дэмждэг залуучуудын клубууд.", "Our sister/friendship clubs and the youth clubs we sponsor.", "姉妹クラブ・友好クラブ、そしてスポンサーしている青年クラブ。", "我们的姊妹/友好俱乐部,以及我们赞助的青年俱乐部。")}
      </p>

      <section className="mb-14">
        <h2 className="font-bold text-rotary-royal-blue mb-4">
          {t("Дэмждэг клубууд", "Affiliate Clubs", "スポンサークラブ", "赞助俱乐部")}
        </h2>
        {affiliates === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
        {affiliates && affiliates.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {t(
              "Interact болон Rotaract клубын мэдээлэл удахгүй нэмэгдэнэ.",
              "Interact Club of Urgoo and the sponsored Rotaract club will appear here once added.",
              "アーゴー・インターアクトクラブおよびローターアクトクラブの情報は近日公開予定です。",
              "乌尔古扶青团及所赞助的扶轮青年服务团信息即将公布。"
            )}
          </div>
        )}
        {affiliates && affiliates.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {affiliates.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 p-6 flex gap-4 items-center">
                {a.logo_url && <Image src={a.logo_url} alt={a.name} width={56} height={56} />}
                <div>
                  <p className="font-bold text-slate-900">{a.name}</p>
                  <p className="text-xs uppercase text-rotary-azure font-semibold">{a.club_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-rotary-royal-blue mb-4">
          {t("Ах дүү, найрсаг клубууд", "Sister & Friendship Clubs", "姉妹・友好クラブ", "姊妹与友好俱乐部")}
        </h2>
        {links === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
        {links && links.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {t("Түншлэлийн мэдээлэл удахгүй нэмэгдэнэ.", "Partner club logos and links will appear here once added by an admin.", "パートナークラブのロゴとリンクは近日公開予定です。", "伙伴俱乐部的标志与链接即将公布。")}
          </div>
        )}
        {links && links.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-3">
            {links.map((l) => (
              <a
                key={l.id}
                href={l.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center gap-3 hover:shadow-md transition"
              >
                {l.logo_url && <Image src={l.logo_url} alt={l.name} width={64} height={64} />}
                <p className="font-semibold text-slate-900 text-sm">{l.name}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
