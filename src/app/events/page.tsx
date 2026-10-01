"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage, type Label } from "@/lib/language-context";
import { localYmd, MONTH_LABEL, dayMonthLabel, monthYearLabel } from "@/lib/date";
import AddToCalendar from "@/components/AddToCalendar";

type Category = "installation_ceremony" | "district_events" | "projects" | "other" | "public_holiday";

type EventRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  location: string | null;
  event_date: string; // "YYYY-MM-DD"
  event_time: string | null;
  category: Category | null;
  cover_image_url: string | null;
  registration_url: string | null;
};

const CATEGORY_LABELS: Record<Category, Label> = {
  installation_ceremony: { mn: "Албан ёсны ёслол", en: "Installation Ceremony", ja: "就任式", zh: "就職典禮", ko: "이·취임식" },
  district_events: { mn: "Дүүргийн арга хэмжээ", en: "District Event", ja: "地区行事", zh: "地區活動", ko: "지구 행사" },
  projects: { mn: "Төслийн арга хэмжээ", en: "Project Event", ja: "プロジェクト行事", zh: "服務計畫活動", ko: "프로젝트 행사" },
  other: { mn: "Бусад", en: "Other", ja: "その他", zh: "其他", ko: "기타" },
  public_holiday: { mn: "Улсын баяр", en: "Public Holiday", ja: "祝日", zh: "國定假日", ko: "공휴일" },
};

const WEEKDAY_LABEL: [string, string, string, string, string][] = [
  ["Да", "Mo", "月", "一", "월"], ["Мя", "Tu", "火", "二", "화"], ["Лх", "We", "水", "三", "수"],
  ["Пү", "Th", "木", "四", "목"], ["Ба", "Fr", "金", "五", "금"], ["Бя", "Sa", "土", "六", "토"], ["Ня", "Su", "日", "日", "일"],
];

export default function EventsPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title_mn, title_en, description_mn, description_en, location, event_date, event_time, category, cover_image_url, registration_url")
      .order("event_date", { ascending: true })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events ?? []) {
      if (!map.has(ev.event_date)) map.set(ev.event_date, []);
      map.get(ev.event_date)!.push(ev);
    }
    return map;
  }, [events]);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEvents = (events ?? []).filter((ev) => ev.event_date.startsWith(monthPrefix));

  // Calendar grid — Monday-start weeks, padded with the tail end of the
  // previous month and the start of the next so every row is full.
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - leadingBlanks + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(viewYear, viewMonth, dayNum);
  });

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const todayStr = localYmd(today);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Арга хэмжээний хуанли", "Events Calendar", "イベントカレンダー", "活動日曆", "행사 캘린더")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Клубын бүх арга хэмжээ, сар бүрээр.",
          "Every club event, month by month.",
          "クラブのすべてのイベントを月別に表示します。",
          "本社所有活動，依月份顯示。",
          "클럽의 모든 행사를 월별로 보여 줍니다."
        )}
      </p>

      {events === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "載入中…", "불러오는 중…")}</p>}

      {events && (
        <div className="grid gap-8 lg:grid-cols-[1fr_440px] items-start">
          {/* Month grid */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button onClick={goPrevMonth} className="text-slate-500 hover:text-rotary-royal-blue px-2 py-1 rounded-md hover:bg-slate-50" aria-label={t("Өмнөх сар", "Previous month", "前の月", "上個月", "이전 달")}>
                ←
              </button>
              <p className="font-bold text-slate-900">{monthYearLabel(t, viewMonth, viewYear)}</p>
              <button onClick={goNextMonth} className="text-slate-500 hover:text-rotary-royal-blue px-2 py-1 rounded-md hover:bg-slate-50" aria-label={t("Дараагийн сар", "Next month", "次の月", "下個月", "다음 달")}>
                →
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 px-2 pt-3">
              {WEEKDAY_LABEL.map((w, i) => (
                <div key={i} className="py-1">{t(...w)}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 p-2">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const key = localYmd(d);
                const dayEvents = eventsByDate.get(key) ?? [];
                const isToday = key === todayStr;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg p-1.5 text-sm flex flex-col items-center justify-start gap-1 ${
                      isToday ? "bg-rotary-royal-blue/10 ring-1 ring-rotary-royal-blue" : dayEvents.length > 0 ? "bg-rotary-gold/25" : ""
                    }`}
                  >
                    <span className={`font-semibold ${isToday ? "text-rotary-royal-blue" : "text-slate-700"}`}>{d.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${ev.category === "public_holiday" ? "bg-slate-400" : "bg-rotary-gold"}`}
                            title={t(ev.title_mn, ev.title_en)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* This month's events */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-rotary-azure uppercase tracking-wide mb-4">
              {(() => {
                const [mn, en, ja, zh, ko] = MONTH_LABEL[viewMonth];
                return t(
                  `${viewYear} оны ${mn}ын арга хэмжээ`,
                  `${en} ${viewYear} events`,
                  `${viewYear}年${ja}のイベント`,
                  `${viewYear}年${zh}的活動`,
                  `${viewYear}년 ${ko} 행사`
                );
              })()}
            </p>
            {monthEvents.length === 0 ? (
              <p className="text-slate-400 text-sm">{t("Энэ сард төлөвлөсөн арга хэмжээ алга.", "No events scheduled this month.", "今月予定されているイベントはありません。", "本月尚無安排的活動。", "이번 달 예정된 행사가 없습니다.")}</p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {monthEvents.map((ev) => (
                  <div key={ev.id} className="py-4 first:pt-0 last:pb-0">
                    {ev.cover_image_url && (
                      // 4:3, a "tablet width" ratio — wider and less
                      // cropped than the old 16:9 box, closer to how
                      // most club photos are actually shot.
                      <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden mb-2">
                        <Image src={ev.cover_image_url} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-rotary-azure">
                      {dayMonthLabel(t, viewMonth, Number(ev.event_date.slice(8, 10)))}
                      {ev.event_time && ` · ${ev.event_time}`}
                    </p>
                    <p className="font-bold text-slate-900 leading-snug">{t(ev.title_mn, ev.title_en)}</p>
                    {ev.category && (
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">
                        {t(CATEGORY_LABELS[ev.category].mn, CATEGORY_LABELS[ev.category].en, CATEGORY_LABELS[ev.category].ja, CATEGORY_LABELS[ev.category].zh, CATEGORY_LABELS[ev.category].ko)}
                      </span>
                    )}
                    {ev.location && <p className="text-sm text-slate-500 mt-1">{ev.location}</p>}
                    {(ev.description_mn || ev.description_en) && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-3">{t(ev.description_mn ?? "", ev.description_en ?? "")}</p>
                    )}
                    {ev.registration_url && (
                      <a
                        href={ev.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-rotary-gold text-[#5a3d0a] hover:brightness-95 transition"
                      >
                        {t("Бүртгүүлэх →", "Register →", "申し込む →", "報名 →", "신청하기 →")}
                      </a>
                    )}
                    {/* Upcoming club events only — public holidays are
                        already in everyone's calendar. */}
                    {ev.event_date >= todayStr && ev.category !== "public_holiday" && (
                      <AddToCalendar
                        event={{
                          id: ev.id,
                          title: t(ev.title_mn, ev.title_en),
                          description: t(ev.description_mn ?? "", ev.description_en ?? "") || null,
                          location: ev.location,
                          date: ev.event_date,
                          time: ev.event_time,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
