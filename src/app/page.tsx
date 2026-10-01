"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage, type Label } from "@/lib/language-context";
import ProjectPhotoCollage from "@/components/ProjectPhotoCollage";
import HomeGear from "@/components/HomeGear";
import AddToCalendar from "@/components/AddToCalendar";
import { localYmd, MONTH_LABEL } from "@/lib/date";
import { useBreakpoint, fullRows, type PerBreakpoint } from "@/lib/use-breakpoint";
import ImpactPanel from "@/components/ImpactPanel";
import { IMPACT_KEY, PROVINCES_KEY, parseImpact, parseProvinces, type ImpactStat } from "@/lib/impact";
import type { Trip } from "@/lib/travel";

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
type EventRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  location: string | null;
  event_date: string; // "YYYY-MM-DD"
  event_time: string | null;
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

// Columns, and the most cards shown, at each breakpoint (phone, sm,
// md, lg, xl) — fullRows() trims to whole rows so no row is left
// half-empty. News needs ~350px per card for Facebook's embed, so
// three across only from xl; projects drop to compact rows on phones.
const NEWS_GRID: { cols: PerBreakpoint; max: PerBreakpoint } = { cols: [1, 1, 2, 2, 3], max: [2, 2, 2, 2, 3] };
const PROJECT_GRID: { cols: PerBreakpoint; max: PerBreakpoint } = { cols: [1, 2, 3, 4, 4], max: [3, 4, 3, 4, 4] };
const PHOTO_GRID: { cols: PerBreakpoint; max: PerBreakpoint } = { cols: [3, 4, 4, 6, 6], max: [9, 12, 12, 12, 12] };

function gridColumns(cols: number) {
  return { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
}

const STATUS_LABEL: Record<ProjectRow["status"], Label> = {
  ongoing: { mn: "Хэрэгжиж буй", en: "Ongoing", ja: "実施中", zh: "進行中", ko: "진행 중" },
  completed: { mn: "Дууссан", en: "Completed", ja: "完了", zh: "已完成", ko: "완료" },
  planned: { mn: "Төлөвлөж буй", en: "Planned", ja: "計画中", zh: "規劃中", ko: "계획 중" },
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
  const [nextEvent, setNextEvent] = useState<EventRow | null>(null);
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);
  const [impact, setImpact] = useState<ImpactStat[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const bp = useBreakpoint();
  const newsCols = NEWS_GRID.cols[bp];
  const shownNews = news.slice(0, fullRows(news.length, newsCols, NEWS_GRID.max[bp]));
  const shownFacebookPosts = shownNews.filter((n) => n.facebook_url).length;
  const projectCols = PROJECT_GRID.cols[bp];
  const shownProjects = projects.slice(0, fullRows(projects.length, projectCols, PROJECT_GRID.max[bp]));
  const photoCols = PHOTO_GRID.cols[bp];
  const shownPhotos = photos.slice(0, fullRows(photos.length, photoCols, PHOTO_GRID.max[bp]));

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

    // The next club event (public holidays aside) for the card under
    // the hero — hidden when nothing is scheduled.
    async function loadNextEvent() {
      const { data } = await supabase
        .from("events")
        .select("id,title_mn,title_en,description_mn,description_en,location,event_date,event_time")
        .gte("event_date", localYmd(new Date()))
        .or("category.is.null,category.neq.public_holiday")
        .order("event_date", { ascending: true })
        .limit(1);
      setNextEvent((data as EventRow[] | null)?.[0] ?? null);
    }
    loadNextEvent();

    // "Our impact": the numbers and provinces set in Admin → Settings,
    // plus countries and km counted from the travel map (Admin → Travel Map).
    supabase
      .from("site_settings")
      .select("key,value_en")
      .in("key", [IMPACT_KEY, PROVINCES_KEY])
      .then(({ data }) => {
        const value = (key: string) => (data as { key: string; value_en: string | null }[] | null)?.find((r) => r.key === key)?.value_en;
        setImpact(parseImpact(value(IMPACT_KEY)));
        setProvinces(parseProvinces(value(PROVINCES_KEY)));
      });
    supabase
      .from("member_travels")
      .select("destination_country,latitude,longitude")
      .then(({ data }) => setTrips((data as Trip[] | null) ?? []));
  }, []);

  // Facebook-linked news cards render the real embedded post (photo,
  // video, full text) via Facebook's Post Plugin, same as the /news
  // page — a plain link-styled card here was showing a generic
  // "Facebook post" placeholder instead of the actual content, which
  // read as "the post doesn't show up" on the home page.
  // Re-run when the window is resized enough to show more cards, so
  // newly shown embeds get rendered too.
  useEffect(() => {
    if (shownFacebookPosts === 0) return;
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
  }, [shownFacebookPosts]);

  return (
    <div className="min-h-full flex flex-col">
      <HomeGear />

      {/* Hero — the club name, one line on what the club does, the two
          things a visitor most likely wants to do next, and the three
          live stats. Each section below says which colour the one
          spinning gear (HomeGear) takes over it with data-gear. */}
      <section data-gear="gold" className="bg-gradient-to-br from-rotary-royal-blue via-[#123a75] to-rotary-azure text-white">
        <div
          className={`container-page relative z-10 grid gap-8 sm:grid-cols-[3fr_2fr] items-center pt-10 sm:pt-14 ${
            nextEvent ? "pb-16 sm:pb-20" : "pb-10 sm:pb-14"
          }`}
        >
          <div>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-rotary-gold mb-2">
              {t(
                "Ротари 3450-р дүүрэг · Улаанбаатар",
                "Rotary District 3450 · Ulaanbaatar, Mongolia",
                "国際ロータリー第3450地区 · ウランバートル",
                "國際扶輪3450地區 · 烏蘭巴托",
                "국제로타리 3450지구 · 울란바토르"
              )}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3 max-w-lg">
              {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "伊赫烏爾古扶輪社", "이흐 우르구 로타리클럽")}
            </h1>
            <p className="text-blue-100 sm:text-lg max-w-lg mb-6">
              {t(
                "Бид Монголд боловсрол, эх хүүхдийн эрүүл мэнд, өвчнөөс урьдчилан сэргийлэх чиглэлээр нийгэмдээ бодит өөрчлөлт авчирдаг.",
                "In Mongolia, we bring real change to our community through education, maternal and child health, and disease prevention.",
                "モンゴルで、教育・母子保健・疾病予防を通じて地域社会に確かな変化をもたらしています。",
                "我們在蒙古透過教育、母嬰健康與疾病預防，為社區帶來真正的改變。",
                "몽골에서 교육, 모자 보건, 질병 예방을 통해 지역사회에 실질적인 변화를 만들어 갑니다."
              )}
            </p>
            <div className="flex flex-wrap gap-3 mb-7">
              <Link
                href="/join"
                className="rounded-full bg-rotary-gold text-[#3d2a05] font-bold px-6 py-2.5 shadow-md hover:brightness-105 transition"
              >
                {t("Бидэнтэй нэгдэх", "Join us", "入会する", "加入我們", "가입하기")}
              </Link>
              <Link
                href="/projects"
                className="rounded-full border border-white/60 text-white font-semibold px-6 py-2.5 hover:bg-white/10 transition"
              >
                {t("Манай төслүүд", "Our projects", "私たちのプロジェクト", "我們的服務計畫", "우리의 프로젝트")}
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <HeroStat
                value={stats.phfPercent === null ? "—" : `${stats.phfPercent}%`}
                label={t("Paul Harris Fellow", "Paul Harris Fellows", "ポール・ハリス・フェロー", "保羅·哈里斯之友", "폴 해리스 펠로우")}
              />
              <HeroStat
                value={stats.affiliateCount === null ? "—" : String(stats.affiliateCount)}
                label={t("Дэмждэг клуб", "Sponsored Clubs", "支援クラブ", "輔導社團", "후원 클럽")}
              />
              <HeroStat
                value={stats.projectCount === null ? "—" : String(stats.projectCount)}
                label={t("Хэрэгжүүлсэн төсөл", "Community Projects", "地域奉仕プロジェクト", "社區服務計畫", "지역사회 프로젝트")}
              />
            </div>
          </div>
          <div className="hidden sm:flex justify-center">
            <Image
              src={asset("/logos/rotary-wordmark-white.png")}
              alt="Rotary Club of Ikh Urgoo"
              width={380}
              height={173}
              className="drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* News, with the next event's card overlapping the hero's lower
          edge. flow-root keeps the card's negative margin from pulling
          the whole section (and its background) up over the hero. */}
      <section data-gear="cranberry" className={`flow-root bg-[#eef4fb] pb-10 ${nextEvent ? "" : "pt-10"}`}>
        {nextEvent && <NextEventCard event={nextEvent} />}
        <div className="container-page relative z-10">
          <SectionHeader
            title={t("Мэдээ", "Latest News", "最新ニュース", "最新新聞", "최신 소식")}
            link={{ href: "/news", label: t("Бүх мэдээ →", "View All News →", "すべて見る →", "查看全部 →", "모두 보기 →") }}
          />
          {news.length === 0 ? (
            <EmptyState text={t("Мэдээ удахгүй нэмэгдэнэ.", "News posts will appear here once published.", "ニュースは公開され次第表示されます。", "新聞發布後將顯示在這裡。", "소식이 게시되면 여기에 표시됩니다.")} />
          ) : (
            <div className="grid gap-5" style={gridColumns(newsCols)}>
              {shownNews.map((n) =>
                n.facebook_url ? (
                  // Facebook's Post Plugin renders at its own natural
                  // height, so the card is capped at the same height as
                  // the written-post cards, faded at the bottom, with a
                  // link to the full post (see CLAUDE.md).
                  <article key={n.id} className="h-[380px] rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition flex flex-col overflow-hidden">
                    <div className="relative flex-1 overflow-hidden flex justify-center pt-3">
                      <div className="fb-post" data-href={fbHref(n.facebook_url)} data-width="340" data-show-text="true" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
                    </div>
                    <a
                      href={fbHref(n.facebook_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 border-t border-slate-100 text-center text-sm font-semibold text-rotary-royal-blue hover:bg-slate-50 transition py-3"
                    >
                      {t("Facebook дээр бүтэн унших →", "View full post on Facebook →", "Facebookで全文を見る →", "在 Facebook 查看全文 →", "Facebook에서 전체 게시물 보기 →")}
                    </a>
                  </article>
                ) : (
                  <Link
                    key={n.id}
                    href={`/news/${n.id}/`}
                    className="group h-[380px] rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col overflow-hidden"
                  >
                    <div className="relative h-[190px] shrink-0 bg-blue-50">
                      {n.cover_image_url ? (
                        <Image src={n.cover_image_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={56} height={56} />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 min-h-0 overflow-hidden">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-rotary-royal-blue transition-colors mb-1.5 line-clamp-2">
                        {t(n.title_mn ?? "", n.title_en ?? "")}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-3">{t(n.body_mn ?? "", n.body_en ?? "")}</p>
                    </div>
                    <span className="px-5 pb-4 text-sm font-semibold text-rotary-royal-blue">
                      {t("Дэлгэрэнгүй →", "Read more →", "続きを読む →", "閱讀更多 →", "더 보기 →")}
                    </span>
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* Projects — a row of compact cards (photo collage, status,
          title, two lines of description); on phones each one is a
          slim row with a thumbnail so three fit on one screen. */}
      <section data-gear="royal" className="bg-white py-10">
        <div className="container-page relative z-10">
          <SectionHeader
            title={t("Манай төслүүд", "Our Projects", "私たちのプロジェクト", "我們的服務計畫", "우리의 프로젝트")}
            subtitle={t(
              "Боловсрол, эх хүүхдийн эрүүл мэнд, өвчнөөс сэргийлэх чиглэлээр хэрэгжүүлж буй бодит ажлууд.",
              "Real work in progress — education, maternal and child health, and disease prevention.",
              "教育、母子保健、疾病予防の分野での実際の活動。",
              "在教育、母嬰健康與疾病預防領域推動的實際行動。",
              "교육, 모자 보건, 질병 예방 분야에서 진행 중인 실제 활동입니다."
            )}
            link={{ href: "/projects", label: t("Бүх төсөл →", "View All Projects →", "すべて見る →", "查看全部 →", "모두 보기 →") }}
          />
          {projects.length === 0 ? (
            <EmptyState text={t("Төслийн мэдээлэл удахгүй нэмэгдэнэ.", "Project details will appear here once added by an admin.", "プロジェクト情報は追加され次第表示されます。", "服務計畫新增後將顯示在這裡。", "프로젝트가 추가되면 여기에 표시됩니다.")} />
          ) : (
            <div className="grid gap-3 sm:gap-5" style={gridColumns(projectCols)}>
              {shownProjects.map((p) => {
                const photos = projectPhotos[p.id] ?? (p.cover_image_url ? [p.cover_image_url] : []);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/`}
                    className="group flex sm:flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
                  >
                    <div className="relative w-28 h-28 sm:w-full sm:h-[150px] shrink-0 bg-blue-50">
                      {photos.length > 0 ? (
                        <>
                          <div className="sm:hidden h-full">
                            <ProjectPhotoCollage photos={photos.slice(0, 1)} className="!aspect-auto h-full" />
                          </div>
                          <div className="hidden sm:block h-full">
                            <ProjectPhotoCollage photos={photos} className="!aspect-auto h-full" />
                          </div>
                        </>
                      ) : p.cause_icon && CAUSE_ICONS[p.cause_icon] ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image src={asset(CAUSE_ICONS[p.cause_icon])} alt="" width={64} height={64} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image src={asset("/logos/ri-gear-blue.png")} alt="" width={48} height={48} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-rotary-azure mb-1">
                        {t(STATUS_LABEL[p.status].mn, STATUS_LABEL[p.status].en, STATUS_LABEL[p.status].ja, STATUS_LABEL[p.status].zh, STATUS_LABEL[p.status].ko)}
                      </p>
                      <h3 className="font-bold text-slate-900 group-hover:text-rotary-royal-blue transition-colors leading-snug line-clamp-2 mb-1">
                        {t(p.title_mn, p.title_en)}
                      </h3>
                      {(p.description_mn || p.description_en) && (
                        <p className="text-slate-600 text-sm line-clamp-2">{t(p.description_mn ?? "", p.description_en ?? "")}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Our impact — travel map, typed numbers, project provinces and
          years of service as pictures (ImpactPanel). Shown once there's a
          trip on the travel map, or a number or province set in
          Admin → Settings. */}
      {(impact.length > 0 || provinces.length > 0 || trips.length > 0) && (
        <section data-gear="gold" className="bg-gradient-to-br from-rotary-royal-blue via-[#123a75] to-rotary-azure text-white py-10">
          <div className="container-page relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-5">
              {t("Бидний үр нөлөө", "Our impact", "私たちの歩み", "我們的足跡", "우리의 발자취")}
            </h2>
            <ImpactPanel impact={impact} provinces={provinces} trips={trips} />
          </div>
        </section>
      )}

      {/* Photo gallery — admin-curated (see /admin/gallery). Whole rows
          of tiles; tapping one opens it full size (the original file,
          never a shrunk copy) with next/previous. Only shows once an
          admin has switched at least one photo on. */}
      {photos.length > 0 && (
        <section data-gear="turquoise" className="bg-[#fdf6e9] py-10">
          <div className="container-page relative z-10">
            <SectionHeader title={t("Зургийн цомог", "Photo Gallery", "フォトギャラリー", "相簿", "사진 갤러리")} />
            <div className="grid gap-2 sm:gap-3" style={gridColumns(photoCols)}>
              {shownPhotos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenPhoto(i)}
                  aria-label={p.caption || t("Зургийг томоор харах", "View photo", "写真を拡大", "查看照片", "사진 크게 보기")}
                  className="group relative aspect-square sm:aspect-[4/3] rounded-lg overflow-hidden bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rotary-azure"
                >
                  <Image src={photoUrl(p)} alt={p.caption ?? ""} fill className="object-cover transition duration-300 group-hover:scale-105" />
                  {p.caption && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs text-left px-2.5 pt-6 pb-1.5 line-clamp-1">
                      {p.caption}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {openPhoto !== null && photos[openPhoto] && (
            <Lightbox photos={photos} index={openPhoto} onIndex={setOpenPhoto} onClose={() => setOpenPhoto(null)} />
          )}
        </section>
      )}

      {/* Sponsored clubs + Links & Partners — reference info, kept
          small at the bottom. Logos wrap onto a second line rather
          than scrolling sideways. */}
      {(affiliates.length > 0 || links.length > 0) && (
        <section data-gear="sky" className="bg-white border-t border-slate-200 py-8">
          <div className="container-page relative z-10 flex flex-wrap gap-x-12 gap-y-6">
            {affiliates.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {t("Дэмждэг клубууд", "Sponsored Clubs", "支援しているクラブ", "輔導的社團", "후원 클럽")}
                </h2>
                <div className="flex flex-wrap items-center gap-6">
                  {affiliates.map((a) => {
                    const logo = a.logo_url ?? KNOWN_LOGOS[a.name];
                    return logo ? (
                      <Image key={a.id} src={logo.startsWith("http") ? logo : asset(logo)} alt={a.name} title={a.name} width={140} height={64} className="object-contain h-16 w-auto shrink-0" />
                    ) : (
                      <span key={a.id} title={a.name} className="text-xs font-bold text-slate-400 uppercase">{a.club_type}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {t("Холбоос ба түншүүд", "Links & Partners", "リンクとパートナー", "相關連結與夥伴", "링크 및 파트너")}
                </h2>
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  {districtLinks.length > 0 && <PartnerRow title={t("Дүүргүүд", "Districts", "地区", "地區", "지구")} links={districtLinks} />}
                  {clubLinks.length > 0 && <PartnerRow title={t("Клубууд", "Clubs", "クラブ", "扶輪社", "클럽")} links={clubLinks} />}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      <div id="fb-root" />
    </div>
  );
}

function photoUrl(p: PhotoItem): string {
  return supabase.storage.from("rciu-photos").getPublicUrl(p.storage_path).data.publicUrl;
}

function SectionHeader({ title, subtitle, link }: { title: string; subtitle?: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-bold text-rotary-royal-blue">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm sm:text-base mt-1 max-w-xl">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link.href} className="text-sm sm:text-base text-rotary-royal-blue font-semibold hover:underline shrink-0">
          {link.label}
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">{text}</div>;
}

// The next club event, as a card overlapping the hero's lower edge:
// date, title, time and place, "Add to calendar" and a link to the
// full calendar.
function NextEventCard({ event }: { event: EventRow }) {
  const { t } = useLanguage();
  const month = Number(event.event_date.slice(5, 7)) - 1;
  const title = t(event.title_mn, event.title_en);
  const details = [event.event_time, event.location].filter(Boolean).join(" · ");
  return (
    <div className="container-page relative z-10 -mt-8 sm:-mt-10 mb-8">
      <div className="rounded-2xl bg-white shadow-lg border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="shrink-0 w-[4.5rem] h-[4.5rem] rounded-xl bg-rotary-royal-blue text-white flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-extrabold">{Number(event.event_date.slice(8, 10))}</span>
            <span className="text-[10px] font-semibold uppercase mt-1.5 text-rotary-gold">{t(...MONTH_LABEL[month])}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rotary-azure">
              {t("Дараагийн арга хэмжээ", "Next event", "次のイベント", "下一個活動", "다음 행사")}
            </p>
            <p className="font-bold text-slate-900 line-clamp-2 sm:line-clamp-1">{title}</p>
            {details && <p className="text-sm text-slate-500 line-clamp-1">{details}</p>}
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <AddToCalendar
            className=""
            event={{
              id: event.id,
              title,
              description: t(event.description_mn ?? "", event.description_en ?? "") || null,
              location: event.location,
              date: event.event_date,
              time: event.event_time,
            }}
          />
          <Link href="/events" className="text-sm font-semibold text-rotary-royal-blue hover:underline">
            {t("Бүх арга хэмжээ →", "All events →", "すべてのイベント →", "所有活動 →", "모든 행사 →")}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Full-screen photo viewer for the gallery: the original photo, fitted
// to the screen; ←/→ keys, on-screen arrows or a swipe move between
// photos; Esc, × or a tap outside the photo closes it.
function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: PhotoItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const count = photos.length;
  const photo = photos[index];
  const go = (step: number) => onIndex((index + step + count) % count);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((index + 1) % count);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndex, onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const arrow = "absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-3xl leading-none flex items-center justify-center transition";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || t("Зураг", "Photo", "写真", "照片", "사진")}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-10"
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t("Хаах", "Close", "閉じる", "關閉", "닫기")}
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-3xl leading-none flex items-center justify-center transition"
      >
        ×
      </button>
      <div className="relative w-full max-w-6xl h-[75vh]" onClick={(e) => e.stopPropagation()}>
        <Image src={photoUrl(photo)} alt={photo.caption ?? ""} fill sizes="100vw" className="object-contain" />
      </div>
      <div className="mt-3 text-center" onClick={(e) => e.stopPropagation()}>
        {photo.caption && <p className="text-white/90 text-sm max-w-2xl">{photo.caption}</p>}
        <p className="text-white/50 text-xs mt-1">
          {index + 1} / {count}
        </p>
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t("Өмнөх", "Previous", "前へ", "上一張", "이전")}
            className={`${arrow} left-2 sm:left-5`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t("Дараах", "Next", "次へ", "下一張", "다음")}
            className={`${arrow} right-2 sm:right-5`}
          >
            ›
          </button>
        </>
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

// One labelled row of partner logos (Districts or Clubs).
function PartnerRow({ title, links }: { title: string; links: LinkRow[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {links.map((l) => (
          <PartnerLogo key={l.id} link={l} />
        ))}
      </div>
    </div>
  );
}

// One logo (or text fallback) in a partner row.
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
