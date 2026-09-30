-- ============================================================
-- RCIU migration 26 — (1) stop anonymous listing of the photo
-- bucket, (2) spam guard on the two public inquiry forms.
--
-- Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. rciu-photos: no more "list every file" for anonymous visitors.
--
-- migration06 gave storage.objects a SELECT policy of just
-- `bucket_id = 'rciu-photos'` for everyone, signed in or not. That
-- policy isn't what makes photos show on the website (the bucket is
-- public, and public-bucket URLs are served without checking any
-- policy) — what it *does* allow is the Storage "list" API, so anyone
-- holding the site's public key (it's in the page source) could list
-- every file in the bucket, including member-only Photo Library
-- uploads that club_photos' RLS deliberately hides.
--
-- Replaced with the same scope as the existing delete policy: you can
-- see your own uploads, admins can see everything. The website never
-- lists the bucket; the SELECT rights it does need are for admins
-- removing/moving files (Admin → Gallery / Projects — Storage's
-- remove() and move() both read the object first), which admins keep.
-- Every photo URL on the site keeps working exactly as before,
-- project_media galleries included.
-- ------------------------------------------------------------
drop policy if exists rciu_photos_select_public on storage.objects;
drop policy if exists rciu_photos_select_own_or_admin on storage.objects;
create policy rciu_photos_select_own_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rciu-photos'
    and (owner = auth.uid() or public.is_admin())
  );

-- ------------------------------------------------------------
-- 2. Spam guard for join_inquiries (/join) and project_inquiries
--    (the "Join the Project" form on /projects).
--
-- Both accept inserts from anyone, no login, and every insert emails
-- three officers via the notify-inquiry webhook — so a bot could fill
-- those inboxes (and use up the Resend quota) without limit. The
-- forms now carry a hidden bot-trap field too, but a bot can post
-- straight to the database and skip the page, so the real limit lives
-- here. A rejected insert never fires the webhook, so no email goes out.
-- ------------------------------------------------------------

-- Size limits. The forms stop people typing past these (maxLength);
-- this catches anything posted directly. NOT VALID = only checked on
-- new rows, so existing inquiries can never make this fail to apply.
alter table public.join_inquiries drop constraint if exists join_inquiries_field_lengths;
alter table public.join_inquiries add constraint join_inquiries_field_lengths check (
  length(name) <= 200
  and length(email) <= 320
  and length(coalesce(phone, '')) <= 50
  and length(coalesce(message, '')) <= 5000
) not valid;

alter table public.project_inquiries drop constraint if exists project_inquiries_field_lengths;
alter table public.project_inquiries add constraint project_inquiries_field_lengths check (
  length(club_name) <= 200
  and length(coalesce(contact_name, '')) <= 200
  and length(email) <= 320
  and length(coalesce(message, '')) <= 5000
) not valid;

-- Rate limit, per form: the same email once per 10 minutes, and at
-- most 10 submissions per hour / 30 per day in total. A small club
-- gets a handful of these a month, so real visitors never hit it; if
-- they do, the form shows a friendly "please try again later".
--
-- Also pins created_at and status server-side: both are insertable by
-- anyone, so a bot could otherwise backdate its rows to dodge the
-- counts below, or file them as 'closed' so admins never see them.
--
-- security definer: anonymous visitors can't read these tables (RLS
-- is admin-only), so the counts must run as the function's owner.
create or replace function public.limit_public_inquiries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  same_email_recent int;
  last_hour int;
  last_day int;
begin
  new.created_at := now();
  new.status := 'new';

  execute format(
    'select count(*) filter (where lower(email) = lower($1) and created_at > now() - interval ''10 minutes''),
            count(*) filter (where created_at > now() - interval ''1 hour''),
            count(*)
       from %I.%I
      where created_at > now() - interval ''1 day''',
    tg_table_schema, tg_table_name
  )
  into same_email_recent, last_hour, last_day
  using new.email;

  -- The site matches on these "already_sent" / "rate_limited" prefixes
  -- (src/lib/spam-guard.tsx) to show its own translated message.
  if same_email_recent > 0 then
    raise exception 'already_sent: a request from this email was received a few minutes ago';
  end if;
  if last_hour >= 10 or last_day >= 30 then
    raise exception 'rate_limited: too many submissions, please try again later';
  end if;

  return new;
end;
$$;

drop trigger if exists join_inquiries_rate_limit on public.join_inquiries;
create trigger join_inquiries_rate_limit
  before insert on public.join_inquiries
  for each row execute function public.limit_public_inquiries();

drop trigger if exists project_inquiries_rate_limit on public.project_inquiries;
create trigger project_inquiries_rate_limit
  before insert on public.project_inquiries
  for each row execute function public.limit_public_inquiries();
