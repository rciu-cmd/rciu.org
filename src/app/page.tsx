"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type LinkRow = { id: string; name: string; url: string | null; logo_url: string | null };
type AffiliateRow = { id: string; name: string; club_type: "interact" | "rotaract"; logo_url: string | null; url?: string | null };

export default function Home() {
  const { t } = useLanguage();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);

  useEffect(() => {
    supabase.from("links_partners").select("id,name,url,logo_url").order("sort_order").then(({ data }) => setLinks((data as LinkRow[]) ?? []));
    supabase.from("affiliate_clubs").select("id,name,club_type,logo_url").order("sort_order").then(({ data }) => setAffiliates((data as AffiliateRow[]) ?? []));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-rotary-royal-blue to-[#0d2c5c] text-white">
        <div className="container-page py-16 sm:py-24 grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <p className="text-rotary-gold font-semibold tracking-wide uppercase text-sm mb-3">
              {t("Rotary олон улсын гишүүн клуб", "A member club of Rotary International", "ロータリー・インターナショナル会員クラブ", "国际扶轮会员俱乐部")}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5">
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}
            </h1>
            <div className="flex flex-wrap gap-3">
              <Link href="/about" className="bg-rotary-gold text-[#5a3d0a] font-bold px-6 py-3 rounded-full hover:brightness-105 transition">
                {t("Бидний тухай", "Learn About Us", "詳細はこちら", "了解我们")}
              </Link>
              <Link href="/contact" className="border border-white/40 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition">
                {t("Хуралд оролцох", "Join a Meeting", "例会に参加する", "参加例会")}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src={asset("/logos/rciu-logo-transparent.png")}
              alt="Rotary Club of Ikh Urgoo"
              width={340}
              height={155}
              className="drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* This Rotary year's theme */}
      <section>
        <Image
          src={asset("/theme/create-lasting-impact-blue-wide.png")}
          alt="Create Lasting Impact — Rotary International theme"
          width={1600}
          height={400}
          className="w-full h-auto"
        />
      </section>

      {/* Meeting info */}
      <section className="container-page py-14 grid gap-6 sm:grid-cols-2">
        <InfoCard
          title={t("Ирж уулзацгаая", "Come to a Meeting", "例会にお越しください", "欢迎参加例会")}
          body={t(
            "Мягмар гараг бүр 20:00 цагт, Red Rock Castle рестораны танхимд.",
            "Every Tuesday at 20:00, at Red Rock Castle Restaurant.",
            "毎週火曜日 20:00、Red Rock Castle レストランにて。",
            "每周二 20:00,在 Red Rock Castle 餐厅举行。"
          )}
        />
        <InfoCard
          title={t("Онлайнаар нэгдэх", "Join Online", "オンラインで参加", "在线参加")}
          body={t(
            "Google Meet-ээр хол байгаа гишүүд, зочид нэгдэх боломжтой.",
            "Distant members and guests can join via Google Meet.",
            "遠方の会員やゲストはGoogle Meetでご参加いただけます。",
            "远方会员及嘉宾可通过 Google Meet 参加。"
          )}
        />
      </section>

      {/* Affiliate clubs + Links & Partners — compact, on the home page */}
      {(affiliates.length > 0 || links.length > 0) && (
        <section className="bg-slate-50 py-14">
          <div className="container-page">
            {affiliates.length > 0 && (
              <div className="mb-10">
                <h2 className="font-bold text-rotary-royal-blue mb-4">
                  {t("Дэмждэг клубууд", "Affiliate Clubs", "スポンサークラブ", "赞助俱乐部")}
                </h2>
                <div className="flex flex-wrap gap-4">
                  {affiliates.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 bg-white rounded-full pl-2 pr-5 py-2 border border-slate-200">
                      {a.logo_url && <Image src={a.logo_url} alt={a.name} width={36} height={36} className="rounded-full" />}
                      <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {links.length > 0 && (
              <div>
                <h2 className="font-bold text-rotary-royal-blue mb-4">
                  {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "链接与伙伴")}
                </h2>
                <div className="flex flex-wrap gap-4">
                  {links.map((l) => (
                    <a
                      key={l.id}
                      href={l.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white rounded-full pl-2 pr-5 py-2 border border-slate-200 hover:shadow-md transition"
                    >
                      {l.logo_url && <Image src={l.logo_url} alt={l.name} width={36} height={36} className="rounded-full" />}
                      <span className="text-sm font-semibold text-slate-800">{l.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-rotary-royal-blue mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{body}</p>
    </div>
  );
}
