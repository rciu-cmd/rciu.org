// "Add to calendar" links for club events (Events page): a Google
// Calendar link, and an .ics file for Apple Calendar / Outlook / others.
//
// event_time is free text in the database ("18:00", "18:00–20:00",
// "18.30 цагт"), so this reads the first one or two clock times it can
// find — a single time gets a 2-hour slot. No recognisable time → an
// all-day event, with the original time text kept in the description
// so nothing is lost.
//
// Times are Ulaanbaatar local and converted to UTC on purpose: both
// formats then show the right time in whatever time zone the visitor's
// calendar uses. (This is the one place UTC is wanted — for local
// calendar-day comparisons use localYmd() from ./date instead.)

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string; // "YYYY-MM-DD"
  time: string | null; // free text
};

const UB_UTC_OFFSET_HOURS = 8; // Ulaanbaatar is UTC+8 all year (no DST since 2017)
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const EVENTS_URL = "https://rciu.org/events/";

type Timing = { allDay: true } | { allDay: false; start: Date; end: Date };

function timing(ev: CalendarEvent): Timing {
  const [y, m, d] = ev.date.split("-").map(Number);
  const clock = [...(ev.time ?? "").matchAll(/(^|\D)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/g)];
  if (clock.length === 0) return { allDay: true };
  const at = (match: RegExpMatchArray) =>
    new Date(Date.UTC(y, m - 1, d, Number(match[2]) - UB_UTC_OFFSET_HOURS, Number(match[3])));
  const start = at(clock[0]);
  let end = clock[1] ? at(clock[1]) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  // "22:00–01:00" ends after midnight.
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { allDay: false, start, end };
}

// 20261005T100000Z
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// All-day events use plain dates; the end date is exclusive (next day).
function allDayRange(ymd: string): [string, string] {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
  return [ymd.replace(/-/g, ""), fmt(next)];
}

function details(ev: CalendarEvent, allDay: boolean): string {
  return [ev.description, allDay && ev.time ? ev.time : null, EVENTS_URL].filter(Boolean).join("\n\n");
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const t = timing(ev);
  const dates = t.allDay ? allDayRange(ev.date).join("/") : `${utcStamp(t.start)}/${utcStamp(t.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
    details: details(ev, t.allDay),
  });
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// iCalendar text escaping (RFC 5545 §3.3.11).
function icsText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

// Lines longer than 75 bytes must be folded (RFC 5545 §3.1). Counted in
// UTF-8 bytes, never splitting a character — Mongolian Cyrillic is 2
// bytes a letter, CJK 3.
function fold(line: string): string {
  const encoder = new TextEncoder();
  let out = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 75) {
      out += "\r\n ";
      bytes = 1; // the leading space counts
    }
    out += ch;
    bytes += size;
  }
  return out;
}

export function icsFile(ev: CalendarEvent): string {
  const t = timing(ev);
  const when = t.allDay
    ? (() => {
        const [start, end] = allDayRange(ev.date);
        return [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`];
      })()
    : [`DTSTART:${utcStamp(t.start)}`, `DTEND:${utcStamp(t.end)}`];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rotary Club of Ikh Urgoo//rciu.org//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@rciu.org`,
    `DTSTAMP:${utcStamp(new Date())}`,
    ...when,
    `SUMMARY:${icsText(ev.title)}`,
    `DESCRIPTION:${icsText(details(ev, t.allDay))}`,
    ...(ev.location ? [`LOCATION:${icsText(ev.location)}`] : []),
    `URL:${EVENTS_URL}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// As a link target, so the button is a plain <a download> — no script.
export function icsDataUrl(ev: CalendarEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFile(ev))}`;
}

export function icsFileName(ev: CalendarEvent): string {
  return `rciu-event-${ev.date}.ics`;
}
