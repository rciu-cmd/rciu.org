// Supabase Edge Function: send-event-reminder
//
// Called from the admin calendar's "Send Reminder" button
// (src/app/admin/events/page.tsx). Deliberately a MANUAL trigger, not
// a scheduled job — the site is a static export with no server, so
// there's nothing to run a cron on the club's side. An admin just
// clicks the button whenever they want members reminded of an event.
//
// What it does:
//   1. Checks the caller is a signed-in admin (via their JWT).
//   2. Loads the event by id.
//   3. Loads every active member's email.
//   4. Sends a reminder email to each, via Resend.
//
// Required secrets (set these in Supabase Dashboard → Edge Functions
// → send-event-reminder → Secrets, or via `supabase secrets set`):
//   RESEND_API_KEY   — from resend.com, after verifying the rciu.org domain
//   RESEND_FROM_EMAIL — e.g. "Rotary Club of Ikh Urgoo <events@rciu.org>"
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already provided
// automatically by the Supabase Edge Functions runtime — no need to
// set those yourself.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Rotary Club of Ikh Urgoo <onboarding@resend.dev>";

    if (!resendApiKey) {
      return json({ error: "RESEND_API_KEY is not configured for this function yet — see the setup instructions." }, 500);
    }

    // Service-role client: bypasses RLS so we can look up the caller's
    // own admin flag and every active member's email in one place.
    const admin = createClient(supabaseUrl, serviceRoleKey);

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

    const { event_id } = await req.json();
    if (!event_id) return json({ error: "event_id is required" }, 400);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("title_mn, title_en, description_mn, description_en, location, event_date, event_time")
      .eq("id", event_id)
      .single();
    if (eventError || !event) return json({ error: "Event not found" }, 404);

    const { data: members, error: membersError } = await admin
      .from("members")
      .select("email, first_name")
      .eq("status", "active");
    if (membersError) return json({ error: membersError.message }, 500);

    const recipients = (members ?? []).filter((m) => m.email);
    if (recipients.length === 0) return json({ sent: 0, note: "No active members with an email on file." });

    const subject = `Reminder: ${event.title_en} — ${event.event_date}`;
    const bodyHtml = `
      <p>Hi there,</p>
      <p>This is a reminder about an upcoming Rotary Club of Ikh Urgoo event:</p>
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
    for (const member of recipients) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: member.email,
          subject,
          html: bodyHtml,
        }),
      });
      if (res.ok) {
        sent++;
      } else {
        failures.push(member.email);
      }
    }

    return json({ sent, total: recipients.length, failures: failures.length > 0 ? failures : undefined });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
