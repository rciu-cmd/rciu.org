-- Migration 20 — security hardening, from a full review of every RLS
-- policy, storage policy, and public-facing form in the app. Four
-- independent fixes, none destructive, all safe to re-run.
--
-- 1. Closes a real self-escalation gap: members_update_self (RLS) let
--    a signed-in member change ANY column on their own row except
--    admin_level — including status, phf_level, major_donor, and
--    honor_roll_priority. In practice that meant a member could open
--    their browser's dev console and, with nothing but their own
--    normal login session, run something like:
--      supabase.from('members').update({status: 'active'}).eq('id', theirOwnId)
--    to self-approve a still-'pending' account, or set phf_level to
--    'PHF+3' to put a fake Paul Harris Fellow badge on the public
--    Honor Roll. This was never reachable through the site's own UI —
--    the Dashboard's self-edit form only ever sends phone/city/
--    classification — but RLS doesn't know or care what UI sent the
--    request; only a database-level check does.
--
-- 2. The 'rciu-photos' Storage bucket accepted any file type/size from
--    any active member — the image/PDF + size checks only lived in
--    the browser's JS, which anyone can bypass with a direct API call.
--
-- 3. join_inquiries / project_inquiries (both public, no-login-required
--    insert) had no cap on text field length — a scripted flood could
--    grow the table with arbitrarily large rows.
--
-- 4. Old, now-superseded protect_own_admin_level() function is dropped
--    (replaced by protect_member_self_service_columns(), already
--    installed by the CREATE OR REPLACE in schema.sql above this
--    migration — this just cleans up the orphaned old name on a
--    database that already has it).
--
-- Safe to re-run.

-- ------------------------------------------------------------
-- 1. Broaden the self-service column protection (see schema.sql for
--    the full function body / comment — this migration just installs
--    it on an existing database).
-- ------------------------------------------------------------
create or replace function public.protect_member_self_service_columns()
returns trigger language plpgsql as $$
declare
  protected_cols text[] := array[
    'admin_level', 'status', 'phf_level', 'phf_date', 'major_donor',
    'major_donor_level', 'honor_roll_priority', 'member_no', 'rotary_id'
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

drop trigger if exists members_protect_own_admin_level on public.members;
drop trigger if exists members_protect_self_service_columns on public.members;
create trigger members_protect_self_service_columns
  before update on public.members
  for each row execute function public.protect_member_self_service_columns();

drop function if exists public.protect_own_admin_level();

-- ------------------------------------------------------------
-- 2. Storage bucket: cap file size and restrict to actual photo/PDF
--    types, enforced by Supabase Storage itself — not just the app's
--    client-side file.type check.
-- ------------------------------------------------------------
update storage.buckets
set file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
where id = 'rciu-photos';

-- ------------------------------------------------------------
-- 3. Length caps on the two public, no-login-required insert tables —
--    stops a scripted flood from growing either table without bound.
--    Limits are generous (well above any real inquiry) so no genuine
--    submission is ever rejected.
-- ------------------------------------------------------------
alter table public.join_inquiries drop constraint if exists join_inquiries_name_len;
alter table public.join_inquiries add constraint join_inquiries_name_len check (char_length(name) <= 200);
alter table public.join_inquiries drop constraint if exists join_inquiries_email_len;
alter table public.join_inquiries add constraint join_inquiries_email_len check (char_length(email) <= 320);
alter table public.join_inquiries drop constraint if exists join_inquiries_phone_len;
alter table public.join_inquiries add constraint join_inquiries_phone_len check (phone is null or char_length(phone) <= 50);
alter table public.join_inquiries drop constraint if exists join_inquiries_message_len;
alter table public.join_inquiries add constraint join_inquiries_message_len check (message is null or char_length(message) <= 5000);

alter table public.project_inquiries drop constraint if exists project_inquiries_club_name_len;
alter table public.project_inquiries add constraint project_inquiries_club_name_len check (char_length(club_name) <= 200);
alter table public.project_inquiries drop constraint if exists project_inquiries_contact_name_len;
alter table public.project_inquiries add constraint project_inquiries_contact_name_len check (contact_name is null or char_length(contact_name) <= 200);
alter table public.project_inquiries drop constraint if exists project_inquiries_email_len;
alter table public.project_inquiries add constraint project_inquiries_email_len check (char_length(email) <= 320);
alter table public.project_inquiries drop constraint if exists project_inquiries_message_len;
alter table public.project_inquiries add constraint project_inquiries_message_len check (message is null or char_length(message) <= 5000);
