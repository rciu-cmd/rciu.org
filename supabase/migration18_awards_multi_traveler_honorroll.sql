-- Migration 18 — three independent additions:
--
-- 1. club_awards: member-submitted award/recognition entries (title,
--    comment, a photo or PDF), reviewed by an admin before they show
--    publicly on the About page. Submitted from the member Dashboard.
--
-- 2. member_travel_participants: lets a single travel-map entry list
--    more than one member (previously member_travels.member_id only
--    allowed exactly one). The old member_id column is left in place,
--    unused going forward, so no data is lost — existing single-member
--    rows are backfilled into the new junction table below.
--
-- 3. members_public view: adds highest_position + honor_roll_priority,
--    needed now that the Paul Harris Fellow Honor Roll is moving from
--    the login-gated /members page onto the public About page.
--
-- Safe to re-run.

-- ------------------------------------------------------------
-- 1. club_awards
-- ------------------------------------------------------------
create table if not exists public.club_awards (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.members(id) on delete set null,
  title text not null,
  comment text,
  file_url text,
  file_type text check (file_type in ('image', 'pdf')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.members(id) on delete set null
);

alter table public.club_awards enable row level security;

-- Public can only see approved entries — this is what the About page reads.
drop policy if exists club_awards_select_approved on public.club_awards;
create policy club_awards_select_approved on public.club_awards
  for select using (status = 'approved');

-- A member can always see their own submission too, whatever its
-- status, so the Dashboard can show "pending review" / "rejected".
drop policy if exists club_awards_select_own on public.club_awards;
create policy club_awards_select_own on public.club_awards
  for select using (submitted_by = auth.uid());

drop policy if exists club_awards_select_admin on public.club_awards;
create policy club_awards_select_admin on public.club_awards
  for select using (public.is_super_admin());

-- Any active member can submit — always lands as 'pending', enforced
-- by the check constraint's default plus the with-check below (a
-- member can't insert a row that's already approved).
drop policy if exists club_awards_insert_member on public.club_awards;
create policy club_awards_insert_member on public.club_awards
  for insert with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

-- A member can delete their own still-pending submission (change of
-- mind); admins can delete anything, at any status.
drop policy if exists club_awards_delete_own_pending_or_admin on public.club_awards;
create policy club_awards_delete_own_pending_or_admin on public.club_awards
  for delete using (
    (submitted_by = auth.uid() and status = 'pending')
    or public.is_super_admin()
  );

-- Only admins approve/reject/edit.
drop policy if exists club_awards_update_admin on public.club_awards;
create policy club_awards_update_admin on public.club_awards
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- 2. member_travel_participants — many members per trip
-- ------------------------------------------------------------
create table if not exists public.member_travel_participants (
  travel_id uuid not null references public.member_travels(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (travel_id, member_id)
);

alter table public.member_travel_participants enable row level security;

drop policy if exists member_travel_participants_select_public on public.member_travel_participants;
create policy member_travel_participants_select_public on public.member_travel_participants
  for select using (true);

drop policy if exists member_travel_participants_write_admin on public.member_travel_participants;
create policy member_travel_participants_write_admin on public.member_travel_participants
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Backfill: every existing single-member trip becomes a 1-row entry
-- in the junction table, so nothing already entered disappears from
-- the map once the app switches to reading from this table.
insert into public.member_travel_participants (travel_id, member_id)
select id, member_id from public.member_travels
where member_id is not null
on conflict do nothing;

-- ------------------------------------------------------------
-- 3. members_public — add the 2 columns the public Honor Roll needs
-- ------------------------------------------------------------
create or replace view public.members_public as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city, highest_position,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor,
  case when honor_roll_visible then honor_roll_priority else null end as honor_roll_priority
from public.members
where status = 'active';

grant select on public.members_public to anon, authenticated;
