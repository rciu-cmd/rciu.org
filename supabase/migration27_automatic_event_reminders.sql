-- ============================================================
-- RCIU migration 27 — automatic event reminders.
--
-- Every day at 09:00 Ulaanbaatar time (01:00 UTC), Supabase calls the
-- send-event-reminder Edge Function in its "auto" mode, which emails
-- active members about every event happening TOMORROW (public holidays
-- excluded, and skipped if an admin already sent a manual reminder for
-- it in the last 24 hours). The "Send Reminder" button in
-- Admin → Calendar keeps working as before.
--
-- Needs the updated Edge Function code
-- (supabase/functions/send-event-reminder/index.ts) — until that is
-- deployed, the daily call is simply refused by the old code and
-- nothing is sent.
--
-- Safe to re-run.
-- ============================================================

-- 1. Tell manual and automatic reminders apart. Existing rows were all
--    sent by the button, hence the default.
alter table public.event_reminders
  add column if not exists kind text not null default 'manual'
  check (kind in ('manual', 'auto'));

-- At most ONE automatic reminder per event. The Edge Function inserts
-- this row before emailing anyone, so a second run (or two at the same
-- moment) fails here and sends nothing.
create unique index if not exists event_reminders_one_auto_per_event
  on public.event_reminders (event_id)
  where kind = 'auto';

-- 2. The daily schedule. pg_cron runs the job; pg_net makes the HTTP
--    call to the Edge Function. Both are standard Supabase extensions.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- cron.schedule with an existing job name replaces that job, so
-- re-running this just updates the schedule.
select cron.schedule(
  'rciu-event-reminders',
  '0 1 * * *', -- 01:00 UTC = 09:00 Ulaanbaatar, every day
  $job$
    select net.http_post(
      url := 'https://mdfexlubrbvkdtyqvvtc.supabase.co/functions/v1/send-event-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- The site's public (publishable) key — not a secret; it's in
        -- every page of rciu.org.
        'apikey', 'sb_publishable_NZzjfPA3P5vKeIAtXOxekg_EgzYLCId'
      ),
      body := '{"mode": "auto"}'::jsonb
    );
  $job$
);
