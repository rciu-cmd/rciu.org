"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/lib/language-context";
import { useInView } from "@/lib/use-in-view";
import { ULAANBAATAR_ID, iconRow, yearsOfService, type ImpactIcon, type ImpactStat } from "@/lib/impact";
import { MONGOLIA_VIEWBOX, PROVINCES } from "@/lib/mongolia-provinces";
import { provinceName } from "@/lib/province-names";
import { EARTH_KM, travelTotals, type Trip } from "@/lib/travel";

const TravelArcs = dynamic(() => import("@/components/TravelArcs"), {
  ssr: false,
  loading: () => <div className="aspect-[96/47]" />,
});

// The home page's "Our impact" band as pictures rather than bare
// numbers — up to three cards:
//   • Where we've traveled: flight lines from Ulaanbaatar to every place
//     on the travel map, countries + km, and how far around the Earth
//     that is.
//   • Our service: the numbers typed in Admin → Settings (people,
//     schools, hospitals, …), each with a row of icons that light up one
//     by one, and under them a map of Mongolia with the provinces ticked
//     in Admin (where the club has run projects) turning gold.
//   • Since 2012: years of service in a gold ring (not a Rotary wheel —
//     the page keeps one wheel, HomeGear) and a 2009 → 2012 → today
//     timeline.
// No money amounts, on purpose (club's decision). Everything animates
// once, when the panel scrolls into view (globals.css, .impact-*).
export default function ImpactPanel({ impact, provinces, trips }: { impact: ImpactStat[]; provinces: string[]; trips: Trip[] }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const hasTravel = trips.length > 0;
  const hasService = impact.length > 0 || provinces.length > 0;
  // All three: travel above a compact years card on the left, the
  // (taller) Our service card on the right, so the columns end level.
  // Otherwise the two cards sit side by side.
  const all = hasTravel && hasService;
  const layout = all ? "md:grid-cols-[1.15fr_1fr]" : hasTravel || hasService ? "md:grid-cols-[1.6fr_1fr]" : "";

  return (
    <div ref={ref} className={`grid gap-4 ${layout} ${seen ? "impact-seen" : ""}`}>
      {hasTravel && <TravelCard trips={trips} className={all ? "md:col-start-1 md:row-start-1" : ""} />}
      {hasService && (
        <ServiceCard impact={impact} provinces={provinces} className={all ? "md:col-start-2 md:row-start-1 md:row-span-2" : ""} />
      )}
      <YearsCard compact={all} className={all ? "md:col-start-1 md:row-start-2" : ""} />
    </div>
  );
}

const card = "rounded-2xl bg-white/[0.06] border border-white/15 p-5";
const cardTitle = "text-xs font-bold uppercase tracking-wider text-rotary-gold mb-3";

function TravelCard({ trips, className }: { trips: Trip[]; className: string }) {
  const { t } = useLanguage();
  const { countries, km } = travelTotals(trips);
  const kmText = Math.round(km).toLocaleString("en-US");
  const laps = km / EARTH_KM;
  const pct = Math.round(laps * 100);
  const lapsText = laps.toFixed(1);
  return (
    <div className={`${card} ${className}`}>
      <p className={cardTitle}>
        ✈ {t("Бидний хүрсэн газрууд", "Where we've traveled", "私たちが訪れた場所", "我們足跡所至", "우리가 다녀온 곳")}
      </p>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {countries > 0 && (
          <p>
            <span className="text-3xl font-extrabold text-rotary-gold">{countries}</span>{" "}
            <span className="text-blue-100 text-sm">{t("улс оронд зочилсон", "countries visited", "か国を訪問", "個國家足跡", "개국 방문")}</span>
          </p>
        )}
        <p>
          <span className="text-3xl font-extrabold text-rotary-gold">{kmText}</span>{" "}
          <span className="text-blue-100 text-sm">{t("км замыг туулсан", "km traveled", "km の移動距離", "公里旅程", "km 이동 거리")}</span>
        </p>
      </div>
      <Link href="/about/#travel" aria-label={t("Аяллын газрын зургийг харах", "See the travel map", "旅行マップを見る", "查看旅行地圖", "여행 지도 보기")} className="block my-3 hover:opacity-90 transition">
        <TravelArcs trips={trips} />
      </Link>
      <div className="flex items-center justify-between text-xs text-blue-100 mb-1.5">
        <span>
          🌍{" "}
          {laps < 1
            ? t(
                `Дэлхийг тойрох замын ${pct}%`,
                `${pct}% of the way around the Earth`,
                `地球一周の${pct}%`,
                `繞地球一圈的${pct}%`,
                `지구 한 바퀴의 ${pct}%`
              )
            : t(
                `Дэлхийг ${lapsText} удаа тойрсонтой тэнцэнэ`,
                `${lapsText} times around the Earth`,
                `地球${lapsText}周分`,
                `相當於繞地球${lapsText}圈`,
                `지구 ${lapsText}바퀴`
              )}
        </span>
        <Link href="/about/#travel" className="font-semibold text-white hover:underline shrink-0">
          {t("Газрын зураг →", "Map →", "地図 →", "地圖 →", "지도 →")}
        </Link>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="impact-bar h-full rounded-full bg-rotary-gold" style={{ "--impact-fill": Math.min(laps, 1) } as React.CSSProperties} />
      </div>
    </div>
  );
}

function ServiceCard({ impact, provinces, className }: { impact: ImpactStat[]; provinces: string[]; className: string }) {
  const { t } = useLanguage();
  return (
    <div className={`${card} flex flex-col ${className}`}>
      <p className={cardTitle}>♥ {t("Бидний үйлс", "Our service", "私たちの奉仕", "我們的服務", "우리의 봉사")}</p>
      <div className="grid gap-5">
        {impact.map((s, i) => {
          const row = iconRow(s.value);
          return (
            <div key={i}>
              <p className="mb-1.5">
                <span className="text-2xl font-extrabold text-rotary-gold">{s.value}</span>{" "}
                <span className="text-blue-100 text-sm">{t(s.label_mn, s.label_en)}</span>
              </p>
              {row && (
                <>
                  <div className="flex flex-wrap gap-1 text-rotary-gold" aria-hidden="true">
                    {Array.from({ length: row.count }, (_, k) => (
                      <span key={k} className="impact-icon" style={{ transitionDelay: `${0.3 + k * 0.06}s` }}>
                        <Icon name={s.icon} />
                      </span>
                    ))}
                  </div>
                  {row.unit > 1 && (
                    <p className="text-[11px] text-blue-200/80 mt-1">{unitCaption(s.icon, row.unit, t)}</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {provinces.length > 0 && <ProvinceMap provinces={provinces} spaced={impact.length > 0} />}
    </div>
  );
}

// Mongolia with the provinces where the club has run projects (ticked in
// Admin → Settings) in gold, filling in one by one on scroll-in. The
// number counts aimags; Ulaanbaatar, when ticked, is named alongside.
function ProvinceMap({ provinces, spaced }: { provinces: string[]; spaced: boolean }) {
  const { t } = useLanguage();
  const aimags = provinces.filter((id) => id !== ULAANBAATAR_ID).length;
  const withUb = provinces.includes(ULAANBAATAR_ID);
  // Fill order: west to east, one after another.
  const order = PROVINCES.filter((p) => provinces.includes(p.id))
    .sort((a, b) => a.cx - b.cx)
    .map((p) => p.id);
  return (
    <div className={spaced ? "mt-auto pt-5" : ""}>
      <p className="mb-2">
        {aimags > 0 && <span className="text-2xl font-extrabold text-rotary-gold">{aimags}</span>}{" "}
        <span className="text-blue-100 text-sm">
          {aimags > 0
            ? withUb
              ? t("аймаг, Улаанбаатарт төсөл хэрэгжүүлсэн", "provinces and Ulaanbaatar with our projects", "県とウランバートルでプロジェクトを実施", "個省及烏蘭巴托實施服務計畫", "개 아이막과 울란바토르에서 프로젝트 진행")
              : t("аймагт төсөл хэрэгжүүлсэн", "provinces with our projects", "県でプロジェクトを実施", "個省實施服務計畫", "개 아이막에서 프로젝트 진행")
            : t("Улаанбаатарт төсөл хэрэгжүүлсэн", "Projects in Ulaanbaatar", "ウランバートルでプロジェクトを実施", "在烏蘭巴托實施服務計畫", "울란바토르에서 프로젝트 진행")}
        </span>
      </p>
      <svg viewBox={MONGOLIA_VIEWBOX} className="w-full h-auto block" role="img" aria-label={t("Төсөл хэрэгжүүлсэн аймгууд", "Provinces with our projects", "プロジェクト実施県", "實施服務計畫的省份", "프로젝트 진행 아이막")}>
        {PROVINCES.map((p) => {
          const on = provinces.includes(p.id);
          return (
            <path
              key={p.id}
              d={p.d}
              className={on ? "impact-province" : undefined}
              fill={on ? undefined : "rgba(255,255,255,0.12)"}
              stroke="#123a75"
              strokeWidth={1.2}
              strokeLinejoin="round"
              style={on ? { transitionDelay: `${0.4 + order.indexOf(p.id) * 0.12}s` } : undefined}
            >
              <title>{provinceName(t, p)}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}

// compact: ring beside the text (under the travel card); otherwise the
// ring sits above it.
function YearsCard({ compact, className }: { compact: boolean; className: string }) {
  const { t } = useLanguage();
  const years = yearsOfService(new Date());
  const steps = [
    { year: "2009", label: t("Байгуулагдсан", "Founded", "設立", "成立", "설립") },
    { year: "2012", label: t("Ротарид элссэн", "Chartered", "ロータリー加盟", "獲得授證", "로타리 가입") },
    { year: String(new Date().getFullYear()), label: t("Өнөөдөр", "Today", "現在", "今天", "오늘") },
  ];
  const ring = (
    <div className={`shrink-0 rounded-full border-2 border-dashed border-rotary-gold/40 p-1.5 ${compact ? "md:p-1" : "mx-auto my-2"}`}>
      <div
        className={`rounded-full border-[6px] border-rotary-gold bg-[#123a75] flex flex-col items-center justify-center leading-none ${
          compact ? "w-32 h-32 md:w-24 md:h-24 md:border-[5px]" : "w-32 h-32"
        }`}
      >
        <span className={`font-extrabold text-white ${compact ? "text-5xl md:text-4xl" : "text-5xl"}`}>{years}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-rotary-gold mt-1">{t("жил", "years", "年", "年", "년")}</span>
      </div>
    </div>
  );
  return (
    <div className={`${card} flex flex-col ${className}`}>
      <p className={cardTitle}>⚙ {t("2012 оноос хойш", "Since 2012", "2012年から", "2012年起", "2012년부터")}</p>
      <div className={compact ? "flex-1 flex flex-col items-center md:flex-row gap-5" : "flex-1 flex flex-col"}>
        {ring}
        <div className={compact ? "w-full md:flex-1" : "flex-1 flex flex-col"}>
          <p className={`text-center text-blue-100 text-sm mb-4 ${compact ? "md:text-left" : ""}`}>
            {t("олон нийтэд үйлчилж байна", "of service to our community", "地域社会への奉仕", "服務社區", "지역사회 봉사")}
          </p>
          <ol className="relative mt-auto grid grid-cols-3 text-center">
            <span className="absolute left-[16.6%] right-[16.6%] top-[5px] h-px bg-white/30" aria-hidden="true" />
            {steps.map((s, i) => (
              <li key={s.year} className="impact-step relative" style={{ transitionDelay: `${0.4 + i * 0.4}s` }}>
                <span className="block w-[11px] h-[11px] rounded-full bg-rotary-gold mx-auto ring-4 ring-[#123a75]" />
                <span className="block text-sm font-bold text-white mt-1.5">{s.year}</span>
                <span className="block text-[11px] text-blue-100 leading-tight">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// What one icon stands for — "Нэг дүрс = 2 эмнэлэг", "Each icon = 100
// people" — named after the row's icon (the heart has no noun).
const ICON_NOUN: Record<ImpactIcon, [string, string, string, string, string]> = {
  person: ["хүн", "people", "人", "人", "명"],
  school: ["сургууль", "schools", "校", "所學校", "개 학교"],
  hospital: ["эмнэлэг", "hospitals", "病院", "家醫院", "개 병원"],
  clock: ["цаг", "hours", "時間", "小時", "시간"],
  tree: ["мод", "trees", "本の木", "棵樹", "그루"],
  heart: ["", "", "", "", ""],
};

function unitCaption(icon: ImpactIcon, unit: number, t: (mn: string, en: string, ja?: string, zh?: string, ko?: string) => string) {
  const n = unit.toLocaleString("en-US");
  const [mn, en, ja, zh, ko] = ICON_NOUN[icon];
  return t(
    `Нэг дүрс = ${n} ${mn}`.trim(),
    `Each icon = ${n} ${en}`.trim(),
    `1アイコン = ${n}${ja}`,
    `每個圖示 = ${n}${zh}`,
    `아이콘 1개 = ${n}${ko}`
  );
}

// Small icons for the Our service rows (Admin → Settings picks one per
// number).
function Icon({ name }: { name: ImpactIcon }) {
  const paths: Record<ImpactIcon, React.ReactNode> = {
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
      </>
    ),
    school: (
      <>
        <path d="M12 3 1.5 8.5 12 14l10.5-5.5L12 3z" />
        <path d="M5 11.5v4.8c0 1.9 3.1 3.7 7 3.7s7-1.8 7-3.7v-4.8L12 15.2l-7-3.7z" />
      </>
    ),
    hospital: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 7v10M7 12h10" fill="none" stroke="#123a75" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6.5l4 2.3" fill="none" stroke="#123a75" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
    tree: <path d="M12 2 5 12h4l-3.5 5H11v5h2v-5h5.5L15 12h4L12 2z" />,
    heart: <path d="M12 21s-7.6-4.6-9.6-9.4C1 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.6 0 6 3.7 4.6 7.1C19.6 16.4 12 21 12 21z" />,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      {paths[name]}
    </svg>
  );
}
