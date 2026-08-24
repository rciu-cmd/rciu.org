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
type PhotoItem = { id: string; storage_path: string; caption: string | null; created_at: string };

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
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

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

    // Photo gallery — merges the general club_photos library with
    // project photos (project_media), newest first, for one combined
    // strip on the home page.
    Promise.all([
      supabase.from("club_photos").select("id,storage_path,caption,created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("project_media").select("id,storage_path,caption,created_at").order("created_at", { ascending: false }).limit(10),
    ]).then(([clubRes, projectRes]) => {
      const merged = [...((clubRes.data as PhotoItem[]) ?? []), ...((projectRes.data as PhotoItem[]) ?? [])]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 12);
      setPhotos(merged);
    });

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
      {/* Hero — bold gradient using the official Rotary palette, with a
          large slow-spinning gear watermark for visual energy (purely
          decorative, never behind readable text). Single CTA: Donate —
          this is the only Donate button on the whole site. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rotary-royal-blue via-[#123a75] to-rotary-azure text-white">
        <Image
          src={asset("/logos/ri-gear-gold.png")}
          alt=""
          width={620}
          height={620}
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-32 -top-32 opacity-10 animate-spin-slow"
        />
        <div className="container-page py-20 sm:py-28 relative grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}
            </h1>
            <a
              href="https://www.rotary.org/en/get-involved/ways-to-give"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-rotary-gold text-[#5a3d0a] font-bold px-8 py-3.5 rounded-full shadow-lg shadow-black/10 hover:brightness-105 hover:-translate-y-0.5 transition"
            >
              {t("Хандив өргөх", "Donate", "寄付する", "捐赠")}
            </a>
          </div>
          <div className="flex justify-center relative">
            <Image
              src={asset("/logos/rotary-wordmark-white.png")}
              alt="Rotary Club of Ikh Urgoo"
              width={420}
              height={191}
              className="drop-shadow-xl relative z-10"
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

      {/* News — moved above Projects per the club's request, and given
          a bigger, more prominent treatment (was a small 3-up preview
          at the very bottom of the page). */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-amber-50 py-16">
        <div className="container-page">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-bold text-rotary-royal-blue">
              {t("Мэдээ", "Latest News", "最新ニュース", "最新新闻")}
            </h2>
            <Link href="/news" className="text-rotary-royal-blue font-semibold hover:underline shrink-0">
              {t("Бүх мэдээ →", "View All News →", "すべて見る →", "查看全部 →")}
            </Link>
          </div>

          {news.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400">
              {t("Мэдээ удахгүй нэмэгдэнэ.", "News posts will appear here once published.", "ニュースは公開され次第表示されます。", "新闻发布后将显示在此处。")}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {news.map((n) =>
                n.facebook_url ? (
                  <a
                    key={n.id}
                    href={n.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-white border border-slate-200 p-8 min-h-[220px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition flex flex-col"
                  >
                    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 mb-3 w-fit">Facebook</span>
                    <p className="text-slate-600 flex-1">{t("Facebook хуудсан дээрх постыг үзэх", "View the full post on our Facebook Page", "Facebookページの投稿を見る", "查看 Facebook 页面完整帖子")}</p>
                    <span className="text-rotary-royal-blue font-semibold mt-4">{t("Үзэх →", "View post →", "見る →", "查看 →")}</span>
                  </a>
                ) : (
                  <article key={n.id} className="rounded-2xl bg-white border border-slate-200 p-8 min-h-[220px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">{t(n.title_mn ?? "", n.title_en ?? "")}</h3>
                    <p className="text-slate-600 line-clamp-4 flex-1">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                  </article>
                )
              )}
            </div>
          )}
        </div>
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
              <article key={p.id} className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden bg-white flex flex-col">
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

      {/* Photo gallery — a horizontal scroll strip of the most recent
          club + project photos. Fills in on its own as members upload
          via their dashboard; nothing to show until they do. */}
      {photos.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-rotary-royal-blue mb-8">
              {t("Зургийн цомог", "Photo Gallery", "フォトギャラリー", "照片集")}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              {photos.map((p) => {
                const url = supabase.storage.from("rciu-photos").getPublicUrl(p.storage_path).data.publicUrl;
                return (
                  <div key={p.id} className="relative shrink-0 w-64 h-44 rounded-xl overflow-hidden snap-start bg-slate-200">
                    <Image src={url} alt={p.caption ?? ""} fill className="object-cover" />
                    {p.caption && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-1.5 line-clamp-1">
                        {p.caption}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sponsored clubs + Links & Partners — deliberately small and
          at the very bottom of the page now (was a full-width section
          higher up); this is reference info, not the main event. */}
      {(affiliates.length > 0 || links.length > 0) && (
        <section className="bg-slate-50 py-10 border-t border-slate-200">
          <div className="container-page">
            {affiliates.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {t("Дэмждэг клубууд", "Sponsored Clubs", "スポンサークラブ", "赞助俱乐部")}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {affiliates.map((a) => {
                    const logo = a.logo_url ?? KNOWN_LOGOS[a.name];
                    return (
                      <span key={a.id} title={a.name} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {logo ? <Image src={logo.startsWith("http") ? logo : asset(logo)} alt={a.name} width={40} height={40} className="object-contain" /> : <span className="text-[9px] font-bold text-slate-400 uppercase">{a.club_type}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "链接与伙伴")}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {links.map((l) => {
                    const logo = l.logo_url ?? KNOWN_LOGOS[l.name];
                    return (
                      <a
                        key={l.id}
                        href={l.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={l.name}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden hover:shadow-sm transition"
                      >
                        {logo ? <Image src={logo.startsWith("http") ? logo : asset(logo)} alt={l.name} width={40} height={40} className="object-contain" /> : <span className="text-[9px] font-bold text-slate-400 uppercase">{l.name[0]}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// Fallback logos for known sponsored/partner clubs that don't have a
// logo_url set in the database yet — keeps the small bottom strip
// from showing blank circles for clubs we already have real logos for.
const KNOWN_LOGOS: Record<string, string> = {
  "Urgoo Rotaract Club": "/logos/urgoo-rotaract.png",
  "Urgoo Interact Club": "/logos/urgoo-interact.png",
  "Makati Legazpi Rotary Club": "/logos/makati-legazpi.png",
};

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6 text-center shadow-sm">
      <div className="text-4xl font-extrabold text-rotary-royal-blue mb-1">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}
