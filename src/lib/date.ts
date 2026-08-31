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
