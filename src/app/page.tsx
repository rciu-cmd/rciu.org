"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import ProjectPhotoCollage from "@/components/ProjectPhotoCollage";

type LinkRow = { id: string; name: string; url: string | null; logo_url: string | null; category: string | null };
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

// Stored Facebook post links should always be absolute (the admin form
// requires it), but normalize defensively — a link missing "https://"
// silently resolves as a path on rciu.org itself instead of opening
// Facebook, which looks like "the link doesn't do anything".
function fbHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

declare global {
  interface Window {
    FB?: { XFBML: { parse: () => void } };
  }
}

const CAUSE_ICONS: Record<string, string> = {
  basic_education_literacy: "/causes/basic-education-literacy.png",
  maternal_child_health: "/causes/maternal-child-health.png",
  disease_prevention: "/causes/disease-prevention-treatment.png",
};

const STATUS_LABEL: Record<ProjectRow["status"], { mn: string; en: string }> = {
  ongoing: { mn: "Хэрэгжиж буй", en: "Ongoing" },
  completed: { mn: "Хаагдсан", en: "Completed" },
  planned: { mn: "Төлөвлөж буй", en: "Planned" },
};

export default function Home() {
  const { t } = useLanguage();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const districtLinks = links.filter((l) => l.category === "district");
  const clubLinks = links.filter((l) => l.category !== "district");
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectPhotos, setProjectPhotos] = useState<Record<string, string[]>>({});
  const [news, setNews] = useState<NewsRow[]>([]);
  const [stats, setStats] = useState<Stats>({ phfPercent: null, affiliateCount: null, projectCount: null });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    supabase.from("links_partners").select("id,name,url,logo_url,category").order("sort_order").then(({ data }) => setLinks((data as LinkRow[]) ?? []));
    supabase
      .from("affiliate_clubs")
      .select("id,name,club_type,logo_url,president_name,contact_phone,contact_email,member_count")
      .order("sort_order")
      .then(({ data }) => setAffiliates((data as AffiliateRow[]) ?? []));
    // Projects — same curated-with-fallback pattern as News above.
    async function loadProjects() {
      const cols = "id,title_mn,title_en,description_mn,description_en,cover_image_url,cause_icon,status";
      const featured = await supabase.from("projects").select(cols).eq("featured_home", true).order("created_at", { ascending: false });
      if ((featured.data?.length ?? 0) > 0) {
        setProjects(featured.data as ProjectRow[]);
        return;
      }
      const fallback = await supabase.from("projects").select(cols).order("created_at", { ascending: false }).limit(8);
      setProjects((fallback.data as ProjectRow[]) ?? []);
    }
    loadProjects();
    // Up to 3 photos per project, for the same auto-collage the full
    // /projects page uses — keeps the homepage preview in sync with it
    // instead of only ever showing the single cover_image_url.
    supabase
      .from("project_media")
      .select("project_id,storage_path,created_at")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const grouped: Record<string, string[]> = {};
        for (const row of (data as { project_id: string; storage_path: string }[]) ?? []) {
          const url = supabase.storage.from("rciu-photos").getPublicUrl(row.storage_path).data.publicUrl;
          (grouped[row.project_id] ??= []).push(url);
        }
        for (const id in grouped) grouped[id] = grouped[id].slice(0, 3);
        setProjectPhotos(grouped);
      });
    // News — prefers whatever an admin picked with the "Show on Home"
    // toggle (featured_home, migration23); falls back to newest-first
    // so a site with nothing curated yet never shows an empty section.
    async function loadNews() {
      const cols = "id,title_mn,title_en,body_mn,body_en,cover_image_url,facebook_url";
      const featured = await supabase
        .from("news")
        .select(cols)
        .eq("status", "published")
        .eq("featured_home", true)
        .order("published_at", { ascending: false });
      if ((featured.data?.length ?? 0) > 0) {
        setNews(featured.data as NewsRow[]);
        return;
      }
      const fallback = await supabase
        .from("news")
        .select(cols)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(8);
      setNews((fallback.data as NewsRow[]) ?? []);
    }
    loadNews();

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

  // Facebook-linked news cards render the real embedded post (photo,
  // video, full text) via Facebook's Post Plugin, same as the /news
  // page — a plain link-styled card here was showing a generic
  // "Facebook post" placeholder instead of the actual content, which
  // read as "the post doesn't show up" on the home page.
  useEffect(() => {
    if (!news.some((n) => n.facebook_url)) return;
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
  }, [news]);

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
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶輪伊赫烏爾古俱樂部")}
            </h1>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <HeroStat
                value={stats.phfPercent === null ? "—" : `${stats.phfPercent}%`}
                label={t("Paul Harris Fellow", "Paul Harris Fellows", "ポール・ハリス・フェロー", "保羅·哈里斯會員")}
              />
              <HeroStat
                value={stats.affiliateCount === null ? "—" : String(stats.affiliateCount)}
                label={t("Дэмждэг клуб", "Sponsored Clubs", "スポンサークラブ", "贊助俱樂部")}
              />
              <HeroStat
                value={stats.projectCount === null ? "—" : String(stats.projectCount)}
                label={t("Хэрэгжүүлсэн төсөл", "Community Projects", "コミュニティ・プロジェクト", "社區項目")}
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
              {t("Мэдээ", "Latest News", "最新ニュース", "最新新聞")}
            </h2>
            <Link href="/news" className="text-rotary-royal-blue font-semibold hover:underline shrink-0">
              {t("Бүх мэдээ →", "View All News →", "すべて見る →", "查看全部 →")}
            </Link>
          </div>

          {news.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400">
              {t("Мэдээ удахгүй нэмэгдэнэ.", "News posts will appear here once published.", "ニュースは公開され次第表示されます。", "新聞發佈後將顯示在此處。")}
            </div>
          ) : (
            <ScrollRow>
              {news.map((n) =>
                n.facebook_url ? (
                  // Real embedded post (photo/video/full text) via
                  // Facebook's Post Plugin — not just a link to it.
                  <article key={n.id} className="shrink-0 w-96 snap-start rounded-2xl border border-slate-200 p-3 shadow-sm hover:shadow-lg transition overflow-hidden bg-white flex justify-center">
                    <div className="fb-post" data-href={fbHref(n.facebook_url)} data-width="340" data-show-text="true" />
                  </article>
                ) : (
                  // Written posts open the full detail page (item: cards
                  // weren't clickable before, and only showed a partial
                  // preview here) — /news/view/?id= mirrors the
                  // /projects/view/ query-string pattern.
                  <Link key={n.id} href={`/news/view/?id=${n.id}`} className="shrink-0 w-96 snap-start">
                    <article className="h-full rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden bg-white flex flex-col">
                      {/* Fixed height (not aspect-video) — News cards
                          are wider than Projects cards (w-96 vs w-80),
                          so scaling the image by aspect ratio alone
                          would make it taller too. Pinning it to the
                          same 180px Projects' own image renders at
                          (320px wide, 16:9) keeps both card types the
                          same overall height; the wider News image
                          just crops more horizontally instead of
                          growing vertically. */}
                      <div className="relative w-full h-[180px] bg-slate-100">
                        {n.cover_image_url ? (
                          <Image src={n.cover_image_url} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={56} height={56} />
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">{t(n.title_mn ?? "", n.title_en ?? "")}</h3>
                        <p className="text-slate-600 text-sm line-clamp-3 flex-1">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                      </div>
                    </article>
                  </Link>
                )
              )}
            </ScrollRow>
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
              {t("Манай төслүүд", "Our Projects", "私たちのプロジェクト", "我們的項目")}
            </h2>
            <p className="text-slate-500 max-w-xl">
              {t(
                "Боловсрол, эх хүүхдийн эрүүл мэнд, өвчнөөс сэргийлэх чиглэлээр хэрэгжүүлж буй бодит ажлууд.",
                "Real work in progress — education, maternal and child health, and disease prevention.",
                "教育、母子保健、疾病予防の分野での実際の活動。",
                "在教育、母嬰健康和疾病預防領域開展的實際工作。"
              )}
            </p>
          </div>
          <Link href="/projects" className="hidden sm:inline-block text-rotary-royal-blue font-semibold hover:underline shrink-0">
            {t("Бүх төсөл →", "View All Projects →", "すべて見る →", "查看全部 →")}
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            {t("Төслийн мэдээлэл удахгүй нэмэгдэнэ.", "Project details will appear here once added by an admin.", "プロジェクト情報は追加され次第表示されます。", "項目信息將在添加後顯示。")}
          </div>
        ) : (
          <ScrollRow>
            {projects.map((p) => {
              const photos = projectPhotos[p.id] ?? (p.cover_image_url ? [p.cover_image_url] : []);
              return (
                <Link key={p.id} href={`/projects/view/?id=${p.id}`} className="shrink-0 w-80 snap-start">
                  <article className="h-full rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden bg-white flex flex-col">
                    <div className="relative">
                      {photos.length > 0 ? (
                        <ProjectPhotoCollage photos={photos} />
                      ) : p.cause_icon && CAUSE_ICONS[p.cause_icon] ? (
                        <div className="w-full aspect-video flex items-center justify-center bg-blue-50">
                          <Image src={asset(CAUSE_ICONS[p.cause_icon])} alt="" width={72} height={72} />
                        </div>
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center text-slate-300 text-sm bg-slate-100">{t("Зураг алга", "No photo yet", "写真なし", "暫無照片")}</div>
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
                </Link>
              );
            })}
          </ScrollRow>
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
                  {t("Дэмждэг клубууд", "Sponsored Clubs", "スポンサークラブ", "贊助俱樂部")}
                </h2>
                <div className="flex flex-wrap items-center gap-8">
                  {affiliates.map((a) => {
                    const logo = a.logo_url ?? KNOWN_LOGOS[a.name];
                    return logo ? (
                      <Image key={a.id} src={logo.startsWith("http") ? logo : asset(logo)} alt={a.name} title={a.name} width={160} height={80} className="object-contain h-20 w-auto shrink-0" />
                    ) : (
                      <span key={a.id} title={a.name} className="text-xs font-bold text-slate-400 uppercase">{a.club_type}</span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "鏈接與夥伴")}
              </h2>
              {/* Districts and clubs each get their own single-line row
                  (was one big wrapping grid) — logos are shrunk to fit
                  more per row, and each row scrolls horizontally on
                  narrow screens / once a row grows past what fits
                  rather than ever wrapping to a second line. */}
              {districtLinks.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    {t("Дүүргүүд", "Districts", "地区", "地區")}
                  </p>
                  <div className="flex flex-nowrap items-center gap-4 overflow-x-auto pb-1">
                    {districtLinks.map((l) => (
                      <PartnerLogo key={l.id} link={l} />
                    ))}
                  </div>
                </div>
              )}
              {clubLinks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    {t("Клубууд", "Clubs", "クラブ", "俱樂部")}
                  </p>
                  <div className="flex flex-nowrap items-center gap-4 overflow-x-auto pb-1">
                    {clubLinks.map((l) => (
                      <PartnerLogo key={l.id} link={l} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      <div id="fb-root" />
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

// One logo (or text fallback) in the Districts/Clubs strips below —
// sized smaller than the old h-20 grid so a full row fits on one line
// instead of wrapping.
function PartnerLogo({ link }: { link: LinkRow }) {
  const logo = link.logo_url ?? KNOWN_LOGOS[link.name];
  return logo ? (
    <a
      href={link.url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={link.name}
      className="shrink-0 hover:opacity-80 transition"
    >
      <Image src={logo.startsWith("http") ? logo : asset(logo)} alt={link.name} width={120} height={48} className="object-contain h-12 w-auto" />
    </a>
  ) : (
    <a href={link.url ?? undefined} target="_blank" rel="noopener noreferrer" title={link.name} className="shrink-0 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
      {link.name}
    </a>
  );
}

// Horizontal-scrolling row used for News and Projects — shows about
// 4-5 fixed-width cards at once (more on wide screens), with a left/
// right arrow to reveal the rest, instead of a 2-up grid that hid
// everything past the first couple of items.
function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(dir: 1 | -1) {
    ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center text-rotary-royal-blue hover:bg-slate-50 text-lg"
      >
        ‹
      </button>
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center text-rotary-royal-blue hover:bg-slate-50 text-lg"
      >
        ›
      </button>
    </div>
  );
}

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
