# Deploying the "Send Reminder" email function

This is what actually sends the email when you click **Send Reminder**
next to an event in `/admin/events`. It has two setup steps: get a
Resend account (free), then deploy this function to Supabase. Neither
step can be done for you automatically — Resend needs your own
sign-up, and Supabase Edge Function deploys need either your Supabase
login (in the dashboard) or the Supabase CLI running on your own
machine, both of which are outside what can be done for you here.

## Step 1 — Resend account (free, ~5 minutes)

1. Go to https://resend.com and sign up (your personal or club email — same call as the Cloudflare/Supabase accounts you already made).
2. In Resend, go to **Domains → Add Domain** and add `rciu.org`.
3. Resend will show you 2-3 DNS records (usually TXT + MX or CNAME) to add. Add those in **Cloudflare → DNS** for `rciu.org` (same place you added the GitHub Pages A records). Leave them as "DNS only" (grey cloud), same as before.
4. Wait for Resend to show the domain as "Verified" (usually a few minutes, sometimes longer).
5. Go to **API Keys → Create API Key**. Copy it — you'll paste it into Supabase in Step 2, not here.

If you'd rather skip domain verification for now and just test things, you can leave `RESEND_FROM_EMAIL` unset — it'll fall back to Resend's own test sender, which works immediately but looks less official in members' inboxes. Best to verify `rciu.org` when you have a few minutes.

## Step 2 — Deploy the function in Supabase (no coding needed)

1. Go to your Supabase project → **Edge Functions** (left sidebar).
2. Click **Deploy a new function** (or **Create a function**).
3. Name it exactly: `send-event-reminder`
4. When it opens the code editor, delete whatever placeholder code is there and paste in the entire contents of `index.ts` from this folder.
5. Click **Deploy**.
6. Still on the function's page, go to its **Secrets** tab (or Project Settings → Edge Functions → Secrets — the exact location has moved around in different Supabase versions) and add:
   - `RESEND_API_KEY` = the key you copied from Resend in Step 1
   - `RESEND_FROM_EMAIL` = `Rotary Club of Ikh Urgoo <events@rciu.org>` (once the domain is verified — otherwise skip this one for now)

That's it — no redeploy needed after adding secrets, they apply on the next call.

## Step 3 — Test it

1. Go to your site's `/admin/events`, add a test event dated today or later.
2. Click **Send Reminder**.
3. It should show `sent: <number>` — that's how many active members got the email. If it shows an error instead, the message will say what's missing (usually a secret not set yet, or the Resend domain not verified yet).

## If the Dashboard doesn't have a "Deploy a new function" option

Some Supabase plans/versions only let you deploy Edge Functions via the command-line tool. If that's the case:

1. On your Windows machine, install the Supabase CLI: `npm install -g supabase`
2. Open a terminal in your `rciu.org` project folder (the one GitHub Desktop manages).
3. Run `supabase login` (opens a browser to authorize).
4. Run `supabase link --project-ref mdfexlubrbvkdtyqvvtc`
5. Run `supabase functions deploy send-event-reminder`
6. Run `supabase secrets set RESEND_API_KEY=your_key_here RESEND_FROM_EMAIL="Rotary Club of Ikh Urgoo <events@rciu.org>"`

Let me know which path you hit and I can walk through it step by step.
