// Supabase Edge Function: notify-inquiry
//
// Fires automatically whenever someone submits the "Join Our Club"
// form (join_inquiries) or the "Propose a Project" partnership form
// (project_inquiries) — both are public, no-login-required inserts.
// Before this function existed, those submissions only ever showed up
// if an admin happened to check Admin → Join Inquiries / Project
// Inquiries; nothing notified anyone in real time. This emails all
// three club officer addresses the moment a new one lands.
//
// This is NOT called from the website's own JS (unlike
// send-event-reminder, which the admin dashboard calls directly) — it's
// wired up as a Supabase Database Webhook that fires on INSERT into
// either table. See the setup steps that came with this file for how
// to create those two webhooks in the Supabase Dashboard.
//
// Because Database Webhooks don't carry a real user's login session,
// this function does NOT use Supabase's normal "is the caller a signed
// -in admin" JWT check (there is no caller in that sense) — "Enforce
// JWT Verification" must be turned OFF for this function in its
// Dashboard settings. Instead, it checks a shared secret header that
// only the webhook config and this function's secrets know, so a
// stranger can't hit this URL directly and spam three inboxes.
//
// Required secrets (Supabase Dashboard → Edge Functions →
// notify-inquiry → Secrets, or via `supabase secrets set` — these are
// project-wide, so RESEND_API_KEY / RESEND_FROM_EMAIL are almost
// certainly already set from the send-event-reminder function; only
// INQUIRY_WEBHOOK_SECRET is new):
//   RESEND_API_KEY        — from resend.com
//   RESEND_FROM_EMAIL     — e.g. "Rotary Club of Ikh Urgoo <notify@rciu.org>"
//   INQUIRY_WEBHOOK_SECRET — a random string; must match the
//                            "x-webhook-secret" header set on both
//                            Database Webhooks

const NOTIFY_TO = ["contact@rciu.org", "secretary@rciu.org", "president@rciu.org"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

type JoinInquiry = { name: string; email: string; phone: string | null; message: string | null };
type ProjectInquiry = { club_name: string; contact_name: string | null; email: string; message: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const expectedSecret = Deno.env.get("INQUIRY_WEBHOOK_SECRET");
    const gotSecret = req.headers.get("x-webhook-secret");
    if (!expectedSecret || gotSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json();
    const { type, table, record } = payload as { type: string; table: string; record: unknown };

    // Only new rows matter here — updates/deletes on these tables
    // (e.g. an admin editing a submission) shouldn't re-notify anyone.
    if (type !== "INSERT") {
      return json({ skipped: true, reason: "not an insert" });
    }

    let subject: string;
    let bodyHtml: string;

    if (table === "join_inquiries") {
      const r = record as JoinInquiry;
      subject = `New membership inquiry — ${r.name}`;
      bodyHtml = `
        <p>Someone submitted the "Join Our Club" form on rciu.org:</p>
        <p>
          <strong>${escapeHtml(r.name)}</strong><br/>
          ${escapeHtml(r.email)}${r.phone ? " · " + escapeHtml(r.phone) : ""}
        </p>
        ${r.message ? `<p>${escapeHtml(r.message)}</p>` : ""}
        <p style="color:#888;font-size:12px">See Admin → Join Inquiries for the full list.</p>
      `;
    } else if (table === "project_inquiries") {
      const r = record as ProjectInquiry;
      subject = `New project partnership inquiry — ${r.club_name}`;
      bodyHtml = `
        <p>Someone submitted the "Propose a Project" partnership form on rciu.org:</p>
        <p>
          <strong>${escapeHtml(r.club_name)}</strong><br/>
          ${r.contact_name ? escapeHtml(r.contact_name) + "<br/>" : ""}
          ${escapeHtml(r.email)}
        </p>
        ${r.message ? `<p>${escapeHtml(r.message)}</p>` : ""}
        <p style="color:#888;font-size:12px">See Admin → Project Inquiries for the full list.</p>
      `;
    } else {
      return json({ skipped: true, reason: `unrecognized table: ${table}` });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Rotary Club of Ikh Urgoo <onboarding@resend.dev>";
    if (!resendApiKey) {
      return json({ error: "RESEND_API_KEY is not configured for this function yet." }, 500);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: NOTIFY_TO,
        subject,
        html: bodyHtml,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Resend send failed: ${detail}` }, 500);
    }

    return json({ sent: true, to: NOTIFY_TO });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
