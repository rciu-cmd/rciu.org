"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type LinkRow = { id: string; name: string; url: string | null; logo_url: string | null };
type AffiliateRow = {
  id: string;
  name: string;
  club_type: "interact" | "rotaract";
  logo_url: string | null;
  president_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  member_count: number | null;
};
type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  cause_icon: "basic_education_literacy" | "maternal_child_health" | "disease_prevention" | "other" | null;
  status: "ongoing" | "completed" | "planned";
};
type NewsRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  facebook_url: string | null;
};
type Stats = { phfPercent: number | null; affiliateCount: number | null; projectCount: number | null };

const CAUSE_ICONS: Record<string, string> = {
  basic_education_literacy: "/causes/basic-education-literacy.png",
  maternal_child_health: "/causes/maternal-child-health.png",
  disease_prevention: "/causes/disease-prevention-treatment.png",
};

const STATUS_LABEL: Record<ProjectRow["status"], { mn: string; en: string }> = {
  ongoing: { mn: "Хэрэгжиж буй", en: "Ongoing" },
  completed: { mn: "Дууссан", en: "Completed" },
  planned: { mn: "Төлөвлөж буй", en: "Planned" },
};

export default function Home() {
  const { t } = useLanguage();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [stats, setStats] = useState<Stats>({ phfPercent: null, affiliateCount: null, projectCount: null });

  useEffect(() => {
    supabase.from("links_partners").select("id,name,url,logo_url").order("sort_order").then(({ data }) => setLinks((data as LinkRow[]) ?? []));
    supabase
      .from("affiliate_clubs")
      .select("id,name,club_type,logo_url,president_name,contact_phone,contact_email,member_count")
      .order("sort_order")
      .then(({ data }) => setAffiliates((data as AffiliateRow[]) ?? []));
    supabase
      .from("projects")
      .select("id,title_mn,title_en,description_mn,description_en,cover_image_url,cause_icon,status")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setProjects((data as ProjectRow[]) ?? []));
    supabase
      .from("news")
      .select("id,title_mn,title_en,body_mn,body_en,cover_image_url,facebook_url")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setNews((data as NewsRow[]) ?? []));

    // Every number here is read live from the database — the PHF %
    // and project count especially, so both update on their own as
    // members earn recognition and admins add new projects, with no
    // hand-edited number to forget to update.
    async function loadStats() {
      const [membersRes, affiliatesRes, projectsRes] = await Promise.all([
        supabase.from("members_public").select("phf_level"),
        supabase.from("affiliate_clubs").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
      ]);
      const memberRows = membersRes.data as { phf_level: string }[] | null;
      const phfPercent =
        memberRows && memberRows.length > 0
          ? Math.round((memberRows.filter((m) => m.phf_level !== "none").length / memberRows.length) * 100)
          : null;
      setStats({
        phfPercent,
        affiliateCount: affiliatesRes.count ?? null,
        projectCount: projectsRes.count ?? null,
      });
    }
    loadStats();
  }, []);

  return (
    <div>
      {/* Hero — light background so the (blue) logo actually shows up,
          instead of the old blue-on-blue gradient that hid it. */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container-page py-16 sm:py-24 grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5 text-slate-900">
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}
            </h1>
            <div className="flex flex-wrap gap-3">
              <Link href="/about" className="bg-rotary-gold text-[#5a3d0a] font-bold px-6 py-3 rounded-full hover:brightness-105 transition">
                {t("Бидний тухай", "Learn About Us", "詳細はこちら", "了解我们")}
              </Link>
              <Link href="/contact" className="border border-rotary-royal-blue text-rotary-royal-blue font-semibold px-6 py-3 rounded-full hover:bg-rotary-royal-blue hover:text-white transition">
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
              className="drop-shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* Quick stats — all three pulled live from the database */}
      <section className="container-page py-14 grid gap-6 sm:grid-cols-3">
        <StatCard
          value={stats.phfPercent === null ? "—" : `${stats.phfPercent}%`}
          label={t("Paul Harris Fellow", "Paul Harris Fellows", "ポール・ハリス・フェロー", "保罗·哈里斯会员")}
        />
        <StatCard
          value={stats.affiliateCount === null ? "—" : String(stats.affiliateCount)}
          label={t("Дэмждэг клуб (Interact, Rotaract)", "Sponsored clubs (Interact & Rotaract)", "スポンサークラブ", "赞助俱乐部")}
        />
        <StatCard
          value={stats.projectCount === null ? "—" : String(stats.projectCount)}
          label={t("Хэрэгжүүлсэн төсөл", "Community projects", "コミュニティ・プロジェクト", "社区项目")}
        />
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

      {/* Projects — the club's main work, so this gets the biggest,
          most prominent treatment on the page. */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-rotary-royal-blue mb-2">
              {t("Манай төслүүд", "Our Projects", "私たちのプロジェクト", "我们的项目")}
            </h2>
            <p className="text-slate-500 max-w-xl">
              {t(
                "Боловсрол, эх хүүхдийн эрүүл мэнд, өвчнөөс сэргийлэх чиглэлээр хэрэгжүүлж буй бодит ажлууд.",
                "Real work in progress — education, maternal and child health, and disease prevention.",
                "教育、母子保健、疾病予防の分野での実際の活動。",
                "在教育、母婴健康和疾病预防领域开展的实际工作。"
              )}
            </p>
          </div>
          <Link href="/projects" className="hidden sm:inline-block text-rotary-royal-blue font-semibold hover:underline shrink-0">
            {t("Бүх төсөл →", "View All Projects →", "すべて見る →", "查看全部 →")}
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            {t("Төслийн мэдээлэл удахгүй нэмэгдэнэ.", "Project details will appear here once added by an admin.", "プロジェクト情報は追加され次第表示されます。", "项目信息将在添加后显示。")}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {projects.map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
                <div className="relative aspect-video bg-slate-100">
                  {p.cover_image_url ? (
                    <Image src={p.cover_image_url} alt="" fill className="object-cover" />
                  ) : p.cause_icon && CAUSE_ICONS[p.cause_icon] ? (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                      <Image src={asset(CAUSE_ICONS[p.cause_icon])} alt="" width={72} height={72} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">{t("Зураг алга", "No photo yet", "写真なし", "暂无照片")}</div>
                  )}
                  <span className="absolute top-3 left-3 text-xs font-semibold uppercase tracking-wide bg-white/90 text-rotary-azure px-3 py-1 rounded-full">
                    {t(STATUS_LABEL[p.status].mn, STATUS_LABEL[p.status].en)}
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t(p.title_mn, p.title_en)}</h3>
                  {(p.description_mn || p.description_en) && (
                    <p className="text-slate-600 text-sm line-clamp-3">{t(p.description_mn ?? "", p.description_en ?? "")}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <Link href="/projects" className="sm:hidden mt-6 inline-block text-rotary-royal-blue font-semibold hover:underline">
          {t("Бүх төсөл →", "View All Projects →", "すべて見る →", "查看全部 →")}
        </Link>
      </section>

      {/* Affiliate clubs — Interact & Rotaract, with real contact info
          so a visitor can reach their leadership directly. */}
      {affiliates.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-rotary-royal-blue mb-8">
              {t("Дэмждэг клубууд", "Sponsored Clubs", "スポンサークラブ", "赞助俱乐部")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {affiliates.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {a.logo_url ? <Image src={a.logo_url} alt={a.name} width={56} height={56} className="object-cover" /> : <span className="text-xs font-bold text-slate-400 uppercase">{a.club_type}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{a.name}</p>
                    {a.member_count != null && (
                      <p className="text-sm text-rotary-azure font-semibold">{a.member_count} {t("гишүүн", "members", "名の会員", "名会员")}</p>
                    )}
                    {a.president_name && <p className="text-sm text-slate-600 mt-1">{a.president_name}</p>}
                    <p className="text-xs text-slate-500">
                      {[a.contact_phone, a.contact_email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {links.length > 0 && (
              <div className="mt-12">
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

      {/* News — small preview at the bottom, full list on /news */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl font-bold text-rotary-royal-blue">
            {t("Мэдээ", "Latest News", "最新ニュース", "最新新闻")}
          </h2>
          <Link href="/news" className="text-rotary-royal-blue font-semibold hover:underline shrink-0">
            {t("Бүх мэдээ →", "View All News →", "すべて見る →", "查看全部 →")}
          </Link>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            {t("Мэдээ удахгүй нэмэгдэнэ.", "News posts will appear here once published.", "ニュースは公開され次第表示されます。", "新闻发布后将显示在此处。")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {news.map((n) =>
              n.facebook_url ? (
                <a
                  key={n.id}
                  href={n.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-2 w-fit">Facebook</span>
                  <p className="text-slate-600 text-sm flex-1">{t("Facebook хуудсан дээрх постыг үзэх", "View the full post on our Facebook Page", "Facebookページの投稿を見る", "查看 Facebook 页面完整帖子")}</p>
                  <span className="text-rotary-royal-blue text-sm font-semibold mt-3">{t("Үзэх →", "View post →", "見る →", "查看 →")}</span>
                </a>
              ) : (
                <article key={n.id} className="rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{t(n.title_mn ?? "", n.title_en ?? "")}</h3>
                  <p className="text-slate-600 text-sm line-clamp-3">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6 text-center shadow-sm">
      <div className="text-4xl font-extrabold text-rotary-royal-blue mb-1">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}
