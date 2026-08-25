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

const CLUB_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100086308363177";

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

    // Photo gallery — admin-curated (see /admin/gallery), merging
    // whichever club_photos + project_media rows an admin switched on
    // (featured_home = true), newest-first, for one combined strip.
    Promise.all([
      supabase.from("club_photos").select("id,storage_path,caption,created_at").eq("featured_home", true).order("created_at", { ascending: false }).limit(12),
      supabase.from("project_media").select("id,storage_path,caption,created_at").eq("featured_home", true).order("created_at", { ascending: false }).limit(12),
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
    <div className="min-h-full flex flex-col">
      {/* Hero — bold gradient using the official Rotary palette, with a
          large slow-spinning gear watermark for visual energy (purely
          decorative, never behind readable text). The 3 quick-stat tiles
          now live here too, under the heading — Donate was pulled out
          for now (per the club's request, it'll get its own home on
          another page later) so the stats take that spot instead. */}
      <section className="last:flex-1 relative overflow-hidden bg-gradient-to-br from-rotary-royal-blue via-[#123a75] to-rotary-azure text-white">
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
            {/* max-w-md caps both the heading and the stats row at the
                same width, so the 3 tiles below line up with the text
                above instead of stretching the full column. */}
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6 max-w-md">
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}
            </h1>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <HeroStat
                value={stats.phfPercent === null ? "—" : `${stats.phfPercent}%`}
                label={t("Paul Harris Fellow", "Paul Harris Fellows", "ポール・ハリス・フェロー", "保罗·哈里斯会员")}
              />
              <HeroStat
                value={stats.affiliateCount === null ? "—" : String(stats.affiliateCount)}
                label={t("Дэмждэг клуб", "Sponsored Clubs", "スポンサークラブ", "赞助俱乐部")}
              />
              <HeroStat
                value={stats.projectCount === null ? "—" : String(stats.projectCount)}
                label={t("Хэрэгжүүлсэн төсөл", "Community Projects", "コミュニティ・プロジェクト", "社区项目")}
              />
            </div>
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

      {/* Content zone — News, Projects, and the Photo Gallery now share
          one continuous gradient background (light Rotary-blue at the
          top, fading through white, into a soft gold tint at the
          bottom) instead of each having its own flat white/gray block.
          This is "zone 2" of the page's 3-gradient flow: zone 1 is the
          Hero above, zone 3 is Sponsored/Links + Footer below. */}
      <div className="last:flex-1 bg-gradient-to-b from-[#eaf1fb] via-white to-[#fdf3e2]">

      {/* News — moved above Projects per the club's request, and given
          a bigger, more prominent treatment (was a small 3-up preview
          at the very bottom of the page). Cards now use the exact same
          structure as the Project cards below (image on top, same
          padding) so the two rows line up at the same height. */}
      <section className="py-16">
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
            <div className="grid gap-6 lg:grid-cols-2">
              {news.map((n) => {
                const cardBody = (
                  <>
                    <div className="relative aspect-video bg-slate-100">
                      {n.cover_image_url ? (
                        <Image src={n.cover_image_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50">
                          <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={56} height={56} />
                        </div>
                      )}
                      {n.facebook_url && (
                        <span className="absolute top-3 left-3 text-xs font-semibold uppercase tracking-wide bg-white/90 text-blue-700 px-3 py-1 rounded-full">
                          Facebook
                        </span>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                        {t(n.title_mn ?? "", n.title_en ?? "") || t("Facebook дээрх пост", "Facebook post", "Facebookの投稿", "Facebook 帖子")}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-3 flex-1">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                      {n.facebook_url && (
                        <span className="text-rotary-royal-blue font-semibold mt-3 text-sm">{t("Үзэх →", "View post →", "見る →", "查看 →")}</span>
                      )}
                    </div>
                  </>
                );
                const cardClass =
                  "rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden bg-white flex flex-col";
                return n.facebook_url ? (
                  <a key={n.id} href={n.facebook_url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                    {cardBody}
                  </a>
                ) : (
                  <article key={n.id} className={cardClass}>
                    {cardBody}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Projects — the club's main work, so this gets the biggest,
          most prominent treatment on the page. */}
      <section className="py-16">
        <div className="container-page">
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
        </div>
      </section>

      {/* Photo gallery — admin-curated (see /admin/gallery), not just
          "whatever was uploaded most recently". Only shows once an
          admin has switched at least one photo on. */}
      {photos.length > 0 && (
        <section className="py-16">
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

      </div>

      {/* Sponsored clubs + Links & Partners — deliberately small and
          at the very bottom of the page now (was a full-width section
          higher up); this is reference info, not the main event.
          "Zone 3" of the gradient flow: fades from the gold tint above
          into a soft blue that leads into the Footer's own blue
          gradient right below, instead of a flat gray box. */}
      <section className="last:flex-1 bg-gradient-to-b from-[#fdf3e2] to-[#eaf1fb] py-10">
          <div className="container-page">
            {affiliates.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {t("Дэмждэг клубууд", "Sponsored Clubs", "スポンサークラブ", "赞助俱乐部")}
                </h2>
                <div className="flex flex-wrap items-center gap-8">
                  {affiliates.map((a) => {
                    const logo = a.logo_url ?? KNOWN_LOGOS[a.name];
                    return logo ? (
                      <Image key={a.id} src={logo.startsWith("http") ? logo : asset(logo)} alt={a.name} title={a.name} width={160} height={80} className="object-contain h-14 w-auto shrink-0" />
                    ) : (
                      <span key={a.id} title={a.name} className="text-xs font-bold text-slate-400 uppercase">{a.club_type}</span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "链接与伙伴")}
              </h2>
              <div className="flex flex-wrap items-center gap-8">
                <a
                  href={CLUB_FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="shrink-0 hover:opacity-80 transition"
                >
                  <Image src={asset("/logos/facebook-icon.svg")} alt="Facebook" width={40} height={40} className="w-10 h-10" />
                </a>
                {links.map((l) => {
                  const logo = l.logo_url ?? KNOWN_LOGOS[l.name];
                  return logo ? (
                    <a
                      key={l.id}
                      href={l.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={l.name}
                      className="shrink-0 hover:opacity-80 transition"
                    >
                      <Image src={logo.startsWith("http") ? logo : asset(logo)} alt={l.name} width={160} height={80} className="object-contain h-14 w-auto" />
                    </a>
                  ) : (
                    <a key={l.id} href={l.url ?? undefined} target="_blank" rel="noopener noreferrer" title={l.name} className="text-xs font-bold text-slate-400 uppercase">
                      {l.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
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

// Compact stat tile for the Hero (dark background) — a smaller, glassy
// variant of the old full-size white StatCard, sized to sit 3-up under
// the heading rather than as its own full-width section.
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm p-3 text-center">
      <div className="text-xl sm:text-2xl font-extrabold text-rotary-gold">{value}</div>
      <div className="text-white/70 text-[10px] sm:text-[11px] leading-tight mt-1">{label}</div>
    </div>
  );
}
