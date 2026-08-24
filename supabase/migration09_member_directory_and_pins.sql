-- ============================================================
-- RCIU migration 9 — members-only directory (email/phone/Rotary ID/
-- highest position) for the honor roll + roster on /members, and a
-- new highest_position field. Safe to run on the live database.
--
-- Privacy note: members_directory is granted to "authenticated" only
-- (never "anon") — a guest cannot read it even by calling the REST
-- API directly, only a logged-in member can, matching the /members
-- page's own login gate.
-- ============================================================

alter table public.members
  add column if not exists highest_position text;

create or replace view public.members_directory as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city, email, phone, rotary_id, highest_position,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor
from public.members
where status = 'active';

revoke all on public.members_directory from anon, public;
grant select on public.members_directory to authenticated;
