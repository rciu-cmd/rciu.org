// Supabase Edge Function: send-event-reminder
//
// Emails every active member a reminder about an event. Two ways in:
//
//   1. MANUAL — the admin calendar's "Send Reminder" button
//      (src/app/admin/events/page.tsx) posts { event_id }. Requires a
//      signed-in super admin (checked via their JWT).
//
//   2. AUTOMATIC — a daily pg_cron job inside Supabase (migration27)
//      posts { mode: "auto" } at 09:00 Ulaanbaatar time. That sends two
//      reminders per event (AUTO_REMINDERS below): one WEEK before and
//      one DAY before — except for public holidays, and skipping a
//      reminder if an admin already sent a manual one for that event in
//      the last 24 hours.
//
//      This mode needs no login (a database cron job has none), so
//      anyone could call it — that's safe because it can only ever do
//      what the daily job does: before emailing, it records an
//      event_reminders row with kind = 'week_before' / 'day_before', and
//      a unique index allows just one row per event and kind. A second
//      call (or two at once) finds the row and sends nothing.
//
// What gets sent: one email per active member (each address stays
// private), via Resend, plus an event_reminders row that the member
// Dashboard shows in its "Reminders" box.
//
// Required secrets (set these in Supabase Dashboard → Edge Functions
// → send-event-reminder → Secrets, or via `supabase secrets set`):
//   RESEND_API_KEY   — from resend.com, after verifying the rciu.org domain
//   RESEND_FROM_EMAIL — e.g. "Rotary Club of Ikh Urgoo <events@rciu.org>"
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already provided
// automatically by the Supabase Edge Functions runtime — no need to
// set those yourself.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The automatic reminders, in the order the daily run handles them.
// To change the timing, edit this list (and the check constraint on
// event_reminders.kind in migration27/schema.sql if adding a new kind).
const AUTO_REMINDERS = [
  { kind: "week_before", daysAhead: 7, subjectPrefix: "Next week", intro: "A reminder that this Rotary Club of Ikh Urgoo event is one week away:" },
  { kind: "day_before", daysAhead: 1, subjectPrefix: "Tomorrow", intro: "A reminder that this Rotary Club of Ikh Urgoo event is tomorrow:" },
] as const;

type AutoReminder = (typeof AUTO_REMINDERS)[number];

const EVENT_COLUMNS = "id, title_mn, title_en, description_mn, description_en, location, event_date, event_time, category";

type EventRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  category: string | null;
};

type Mail = { resendApiKey: string; fromEmail: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Rotary Club of Ikh Urgoo <onboarding@resend.dev>";

    if (!resendApiKey) {
      return json({ error: "RESEND_API_KEY is not configured for this function yet — see the setup instructions." }, 500);
    }
    const mail: Mail = { resendApiKey, fromEmail };

    // Service-role client: bypasses RLS so we can look up the caller's
    // own admin flag and every active member's email in one place.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));

    if (body?.mode === "auto") {
      return json(await sendAutomaticReminders(admin, mail));
    }

    // ---- Manual "Send Reminder" (admin only) ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Identify the caller from their JWT (the anon-key client on the
    // frontend forwards this automatically via functions.invoke).
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Not signed in" }, 401);

    // Events management (see admin/layout.tsx's EDITOR_ALLOWED_PATHS,
    // and events_write_admin's use of is_super_admin() in schema.sql)
    // is super-admin-only site-wide — this check has to match that,
    // not the broader is_admin flag (true for editors too), or an
    // editor-level admin could call this function directly and
    // mass-email every active member even though they can't reach
    // /admin/events or write to the events table at all.
    const { data: caller } = await admin.from("members").select("admin_level").eq("id", userData.user.id).single();
    if (caller?.admin_level !== "super") return json({ error: "Super admin access required" }, 403);

    const { event_id } = body ?? {};
    if (!event_id) return json({ error: "event_id is required" }, 400);

    const { data: event, error: eventError } = await admin.from("events").select(EVENT_COLUMNS).eq("id", event_id).single();
    if (eventError || !event) return json({ error: "Event not found" }, 404);

    const result = await emailActiveMembers(admin, event as EventRow, null, mail);
    if ("error" in result) return json({ error: result.error }, 500);
    if (result.total === 0) return json({ sent: 0, note: "No active members with an email on file." });

    // Record that a reminder went out for this event so the member
    // Dashboard can also show it in-app (event_reminders, migration23)
    // — not just the email. Uses the same service-role client, since
    // there's deliberately no insert policy for regular clients. Best
    // effort: a failure here shouldn't turn an otherwise-successful
    // email send into an error response.
    // (kind defaults to 'manual' — left out so this also works before
    // migration27 has added the column.)
    const { error: reminderError } = await admin.from("event_reminders").insert({ event_id });
    return json({ ...result, reminder_row_error: reminderError?.message });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// "YYYY-MM-DD" in Ulaanbaatar, offsetDays from today. The function runs
// in UTC, and 09:00 Ulaanbaatar is 01:00 UTC — same calendar day — but
// computing it in the club's own time zone keeps that true whenever the
// job runs.
function ulaanbaatarDate(offsetDays: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
}

async function sendAutomaticReminders(admin: SupabaseClient, mail: Mail) {
  const results: Record<string, unknown>[] = [];
  for (const reminder of AUTO_REMINDERS) {
    const date = ulaanbaatarDate(reminder.daysAhead);
    const { data: events, error } = await admin.from("events").select(EVENT_COLUMNS).eq("event_date", date);
    if (error) {
      results.push({ reminder: reminder.kind, date, error: error.message });
      continue;
    }
    for (const event of (events ?? []) as EventRow[]) {
      if (event.category === "public_holiday") continue;
      results.push({ reminder: reminder.kind, date, ...(await sendOneAutomatic(admin, event, reminder, mail)) });
    }
  }
  return { results };
}

async function sendOneAutomatic(admin: SupabaseClient, event: EventRow, reminder: AutoReminder, mail: Mail) {
  const label = { event_id: event.id, title: event.title_en };

  // An admin clicked "Send Reminder" for this event in the last day —
  // members were just emailed, don't email them again.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentManual } = await admin
    .from("event_reminders")
    .select("id")
    .eq("event_id", event.id)
    .eq("kind", "manual")
    .gte("sent_at", since)
    .limit(1);
  if (recentManual && recentManual.length > 0) {
    return { ...label, skipped: "a manual reminder was sent in the last 24 hours" };
  }

  // Claim the event BEFORE emailing: the unique index on
  // (event_id, kind) for automatic kinds lets only one call ever insert
  // this row, so a repeated or simultaneous call can't email members twice.
  const { error: claimError } = await admin.from("event_reminders").insert({ event_id: event.id, kind: reminder.kind });
  if (claimError) {
    return { ...label, skipped: claimError.code === "23505" ? "this reminder was already sent" : claimError.message };
  }

  return { ...label, ...(await emailActiveMembers(admin, event, reminder, mail)) };
}

// reminder = null for the manual "Send Reminder" button.
async function emailActiveMembers(admin: SupabaseClient, event: EventRow, reminder: AutoReminder | null, mail: Mail) {
  const { data: members, error: membersError } = await admin
    .from("members")
    .select("email, first_name")
    .eq("status", "active");
  if (membersError) return { error: membersError.message };

  const recipients = (members ?? []).filter((m: { email: string | null }) => m.email);

  const subject = `${reminder ? reminder.subjectPrefix : "Reminder"}: ${event.title_en} — ${event.event_date}`;
  const intro = reminder ? reminder.intro : "This is a reminder about an upcoming Rotary Club of Ikh Urgoo event:";
  // Absolute URL — email clients can't load site-relative paths, so
  // this has to point at the live, publicly-served logo file.
  const LOGO_URL = "https://rciu.org/logos/rciu-logo-transparent.png";
  const bodyHtml = `
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${LOGO_URL}" alt="Rotary Club of Ikh Urgoo" width="120" style="display:inline-block;max-width:120px;height:auto;" />
      </div>
      <p>${intro}</p>
      <p>
        <strong>${escapeHtml(event.title_en)}</strong><br/>
        ${escapeHtml(event.event_date)}${event.event_time ? " · " + escapeHtml(event.event_time) : ""}<br/>
        ${event.location ? escapeHtml(event.location) + "<br/>" : ""}
      </p>
      ${event.description_en ? `<p>${escapeHtml(event.description_en)}</p>` : ""}
      <p>— Rotary Club of Ikh Urgoo</p>
    `;

  // Resend's free tier is fine for a club this size; send one call
  // per recipient rather than one big BCC, so each member's address
  // stays private from the others.
  let sent = 0;
  const failures: string[] = [];
  // Resend's own rejection reason (invalid/unverified sender domain,
  // bad API key, rate limit, etc.) — captured from the first failure
  // only, so the admin actually finds out WHY every send failed
  // instead of just which addresses. Every recipient fails for the
  // same underlying reason in practice (it's almost never "some
  // emails are bad"), so one sample is enough to diagnose from.
  let firstFailureDetail: string | null = null;
  for (const member of recipients) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mail.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mail.fromEmail,
        to: member.email,
        subject,
        html: bodyHtml,
      }),
    });
    if (res.ok) {
      sent++;
    } else {
      failures.push(member.email);
      if (!firstFailureDetail) {
        const text = await res.text().catch(() => "");
        firstFailureDetail = `Resend ${res.status}: ${text.slice(0, 500)}`;
      }
    }
  }

  return {
    sent,
    total: recipients.length,
    failures: failures.length > 0 ? failures : undefined,
    first_failure_detail: firstFailureDetail ?? undefined,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
