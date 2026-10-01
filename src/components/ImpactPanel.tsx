"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/lib/language-context";
import { useInView } from "@/lib/use-in-view";
import { iconRow, yearsOfService, type ImpactIcon, type ImpactStat } from "@/lib/impact";
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
//   • Our service: the numbers typed in Admin → Settings, each with a
//     row of icons (person, school, …) that light up one by one.
//   • Since 2012: years of service in a gold ring (not a Rotary wheel —
//     the page keeps one wheel, HomeGear) and a 2009 → 2012 → today
//     timeline.
// No money amounts, on purpose (club's decision). Everything animates
// once, when the panel scrolls into view (globals.css, .impact-*).
export default function ImpactPanel({ impact, trips }: { impact: ImpactStat[]; trips: Trip[] }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const hasTravel = trips.length > 0;
  const hasService = impact.length > 0;
  const layout =
    hasTravel && hasService
      ? "md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]"
      : hasTravel || hasService
        ? "md:grid-cols-[1.6fr_1fr]"
        : "";

  return (
    <div ref={ref} className={`grid gap-4 ${layout} ${seen ? "impact-seen" : ""}`}>
      {hasTravel && <TravelCard trips={trips} wide={hasService} />}
      {hasService && <ServiceCard impact={impact} />}
      <YearsCard />
    </div>
  );
}

const card = "rounded-2xl bg-white/[0.06] border border-white/15 p-5";
const cardTitle = "text-xs font-bold uppercase tracking-wider text-rotary-gold mb-3";

function TravelCard({ trips, wide }: { trips: Trip[]; wide: boolean }) {
  const { t } = useLanguage();
  const { countries, km } = travelTotals(trips);
  const kmText = Math.round(km).toLocaleString("en-US");
  const laps = km / EARTH_KM;
  const pct = Math.round(laps * 100);
  const lapsText = laps.toFixed(1);
  return (
    <div className={`${card} ${wide ? "md:col-span-2 lg:col-span-1" : ""}`}>
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

function ServiceCard({ impact }: { impact: ImpactStat[] }) {
  const { t } = useLanguage();
  return (
    <div className={card}>
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
                    <p className="text-[11px] text-blue-200/80 mt-1">
                      {t(
                        `Нэг дүрс = ${row.unit.toLocaleString("en-US")}`,
                        `Each icon = ${row.unit.toLocaleString("en-US")}`,
                        `1アイコン = ${row.unit.toLocaleString("en-US")}`,
                        `每個圖示 = ${row.unit.toLocaleString("en-US")}`,
                        `아이콘 1개 = ${row.unit.toLocaleString("en-US")}`
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearsCard() {
  const { t } = useLanguage();
  const years = yearsOfService(new Date());
  const steps = [
    { year: "2009", label: t("Байгуулагдсан", "Founded", "設立", "成立", "설립") },
    { year: "2012", label: t("Ротарид элссэн", "Chartered", "ロータリー加盟", "加入扶輪", "로타리 가입") },
    { year: String(new Date().getFullYear()), label: t("Өнөөдөр", "Today", "現在", "今天", "오늘") },
  ];
  return (
    <div className={`${card} flex flex-col`}>
      <p className={cardTitle}>⚙ {t("2012 оноос хойш", "Since 2012", "2012年から", "自2012年", "2012년부터")}</p>
      <div className="mx-auto my-2 rounded-full border-2 border-dashed border-rotary-gold/40 p-1.5">
        <div className="w-32 h-32 rounded-full border-[6px] border-rotary-gold bg-[#123a75] flex flex-col items-center justify-center leading-none">
          <span className="text-5xl font-extrabold text-white">{years}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rotary-gold mt-1">{t("жил", "years", "年", "年", "년")}</span>
        </div>
      </div>
      <p className="text-center text-blue-100 text-sm mb-4">
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
