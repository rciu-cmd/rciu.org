"use client";

import { useLanguage } from "@/lib/language-context";
import { type CalendarEvent, googleCalendarUrl, icsDataUrl, icsFileName } from "@/lib/calendar";

// "Add to calendar: Google · Apple / Outlook" for an upcoming club
// event — on the Events page and the home page's Next event card.
export default function AddToCalendar({ event, className = "mt-2" }: { event: CalendarEvent; className?: string }) {
  const { t } = useLanguage();
  return (
    <div className={`${className} flex flex-wrap items-center gap-x-3 gap-y-1 text-xs`}>
      <span className="font-semibold text-slate-500">
        📅 {t("Хуанлид нэмэх:", "Add to calendar:", "カレンダーに追加:", "加入日曆:", "캘린더에 추가:")}
      </span>
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-rotary-royal-blue hover:underline"
      >
        Google
      </a>
      <a href={icsDataUrl(event)} download={icsFileName(event)} className="font-semibold text-rotary-royal-blue hover:underline">
        Apple / Outlook
      </a>
    </div>
  );
}
