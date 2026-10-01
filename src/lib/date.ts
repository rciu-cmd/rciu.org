import type { Translate } from "./language-context";

// Local-calendar-day "YYYY-MM-DD" for a Date — deliberately NOT
// `d.toISOString().slice(0, 10)`. toISOString() converts through UTC
// first, which shifts the date whenever the viewer's timezone isn't
// UTC: Ulaanbaatar is UTC+8, so local midnight on e.g. Sept 19 is
// 2026-09-18T16:00:00Z — toISOString().slice(0,10) would read
// "2026-09-18", one day earlier than the actual local day. Since
// event_date is stored as a plain "YYYY-MM-DD" string with no time
// component, comparing it against a UTC-shifted key silently moves
// every event to the next day's cell on the /events calendar grid,
// and shifts the "upcoming events" cutoff by up to 8 hours on the
// Dashboard and Admin → Events. Reading the Date object's own local
// year/month/day fields instead keeps everything in the viewer's own
// calendar day, matching how event_date was entered in the first place.
export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Month names for t(...MONTH_LABEL[month]) — month is 0-11.
export const MONTH_LABEL: [string, string, string, string, string][] = [
  ["1-р сар", "January", "1月", "1月", "1월"], ["2-р сар", "February", "2月", "2月", "2월"],
  ["3-р сар", "March", "3月", "3月", "3월"], ["4-р сар", "April", "4月", "4月", "4월"],
  ["5-р сар", "May", "5月", "5月", "5월"], ["6-р сар", "June", "6月", "6月", "6월"],
  ["7-р сар", "July", "7月", "7月", "7월"], ["8-р сар", "August", "8月", "8月", "8월"],
  ["9-р сар", "September", "9月", "9月", "9월"], ["10-р сар", "October", "10月", "10月", "10월"],
  ["11-р сар", "November", "11月", "11月", "11월"], ["12-р сар", "December", "12月", "12月", "12월"],
];

// Month + year and day + month in each language's own order:
// "2026 оны 10-р сар" / "October 2026" / "2026年10月" / "2026년 10월",
// "10-р сарын 14" / "14 October" / "10月14日" / "10월 14일".
export function monthYearLabel(t: Translate, month: number, year: number): string {
  const [mn, en, ja, zh, ko] = MONTH_LABEL[month];
  return t(`${year} оны ${mn}`, `${en} ${year}`, `${year}年${ja}`, `${year}年${zh}`, `${year}년 ${ko}`);
}

export function dayMonthLabel(t: Translate, month: number, day: number): string {
  const [mn, en, ja, zh, ko] = MONTH_LABEL[month];
  return t(`${mn}ын ${day}`, `${day} ${en}`, `${ja}${day}日`, `${zh}${day}日`, `${ko} ${day}일`);
}
