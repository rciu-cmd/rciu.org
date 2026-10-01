-- ============================================================
-- RCIU migration 29 — fixes from the October 2026 security check.
--
-- 1. Members directory (emails, phones): only ACTIVE members can read
--    it. Before, any logged-in account could — a pending account, a
--    former member who still has a login, or anyone who made an
--    account directly through Supabase while sign-ups were switched on.
-- 2. highest_position ("District Governor", …) shows on the public
--    honor roll, so members can no longer set their own — same as
--    their Paul Harris level. Super admins still set it in Admin.
-- 3. Photo storage (bucket rciu-photos) accepts only images and PDFs,
--    at most 50 MB each — no web pages or scripts. Photo quality is
--    untouched; files are stored exactly as uploaded.
-- 6. The daily automatic-reminder job proves it's the real job with a
--    secret it reads from Supabase Vault (created here, random — no one
--    has to type or copy it). The send-event-reminder Edge Function
--    turns away "auto" calls without it, so a stranger calling the
--    function's address can't make reminders go out early.
--    ORDER: run this SQL first, then deploy the updated Edge Function.
--
-- Safe to re-run.
-- ============================================================

-- 1. Members directory: active members only ---------------------------
create or replace view public.members_directory as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city, email, phone, rotary_id, highest_position,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor,
  honor_roll_priority
from public.members
where status = 'active'
  and exists (
    select 1 from public.members me
    where me.id = auth.uid() and me.status = 'active'
  );

revoke all on public.members_directory from anon, public;
grant select on public.members_directory to authenticated;

-- 2. highest_position joins the columns members can't change on their own row
create or replace function public.protect_member_self_service_columns()
returns trigger language plpgsql as $$
declare
  protected_cols text[] := array[
    'admin_level', 'status', 'phf_level', 'phf_date', 'major_donor',
    'major_donor_level', 'honor_roll_priority', 'member_no', 'rotary_id',
    'highest_position'
  ];
  col text;
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
begin
  if auth.uid() = old.id then
    foreach col in array protected_cols loop
      if new_json -> col is distinct from old_json -> col then
        raise exception 'cannot change your own % — ask another super admin, or use the SQL Editor', col;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- 3. Photo storage: images and PDFs only, 50 MB per file ---------------
update storage.buckets
   set file_size_limit = 52428800, -- 50 MB
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif',
         'image/heic', 'image/heif', 'image/avif', 'application/pdf'
       ]
 where id = 'rciu-photos';

-- 6. Secret for the daily reminder job ----------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'reminder_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'reminder_cron_secret',
      'Sent by the daily reminder job so send-event-reminder knows the call is real'
    );
  end if;
end $$;

-- The Edge Function asks this (with its service-role key) whether the
-- secret it was sent is right. Nobody else may call it.
create or replace function public.reminder_cron_secret_ok(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
     where name = 'reminder_cron_secret'
       and decrypted_secret = candidate
  );
$$;

revoke all on function public.reminder_cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.reminder_cron_secret_ok(text) to service_role;

-- Same daily job as migration27, now sending the secret (x-cron-secret).
-- cron.schedule replaces the existing job of the same name.
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
        'apikey', 'sb_publishable_NZzjfPA3P5vKeIAtXOxekg_EgzYLCId',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
      ),
      body := '{"mode": "auto"}'::jsonb
    );
  $job$
);

-- ------------------------------------------------------------
-- Check (optional) — should return: true | true | 50 MB | t
-- ------------------------------------------------------------
-- select
--   (select definition like '%me.status = ''active''%' from pg_views where viewname = 'members_directory') as directory_active_only,
--   (select prosrc like '%highest_position%' from pg_proc where proname = 'protect_member_self_service_columns') as title_protected,
--   (select pg_size_pretty(file_size_limit) from storage.buckets where id = 'rciu-photos') as upload_limit,
--   (select command like '%x-cron-secret%' from cron.job where jobname = 'rciu-event-reminders') as job_sends_secret;
