-- ============================================================
-- RCIU migration 27 — automatic event reminders.
--
-- Every day at 09:00 Ulaanbaatar time (01:00 UTC), Supabase calls the
-- send-event-reminder Edge Function in its "auto" mode, which emails
-- active members about every event happening ONE WEEK from now and
-- every event happening TOMORROW — two reminders per event. Public
-- holidays are excluded, and a reminder is skipped if an admin already
-- sent a manual one for that event in the last 24 hours. The
-- "Send Reminder" button in Admin → Calendar keeps working as before.
--
-- Needs the updated Edge Function code
-- (supabase/functions/send-event-reminder/index.ts) — until that is
-- deployed, the daily call is simply refused by the old code and
-- nothing is sent.
--
-- Safe to re-run, and also upgrades the first version of this
-- migration (one 'auto' reminder the day before) if that was run.
-- ============================================================

-- 1. Tell reminders apart: 'manual' (the button), 'week_before' and
--    'day_before' (the daily job). Existing rows were all sent by the
--    button, hence the default.
alter table public.event_reminders
  add column if not exists kind text not null default 'manual';

-- (Re)create the allowed values by name — the first version of this
-- migration only allowed 'manual' and 'auto'; any 'auto' row it may
-- have recorded was a day-before reminder.
alter table public.event_reminders drop constraint if exists event_reminders_kind_check;
update public.event_reminders set kind = 'day_before' where kind = 'auto';
alter table public.event_reminders add constraint event_reminders_kind_check
  check (kind in ('manual', 'week_before', 'day_before'));

-- At most ONE week-before and ONE day-before reminder per event. The
-- Edge Function inserts this row before emailing anyone, so a second
-- run (or two at the same moment) fails here and sends nothing.
drop index if exists public.event_reminders_one_auto_per_event; -- first version's index
create unique index if not exists event_reminders_one_per_auto_kind
  on public.event_reminders (event_id, kind)
  where kind <> 'manual';

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
