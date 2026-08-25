-- Migration 17 — member_travels: the data behind the new "Where We've
-- Traveled" world map on the About page. Each row is one member's
-- attendance at an international Rotary event (convention, district
-- conference abroad, sister-club visit, etc.). Admin-entered only —
-- not a member self-report feature, per the club's decision.
--
-- Distance from Ulaanbaatar is computed client-side (haversine, plain
-- math) from latitude/longitude, so no distance column is stored here.
--
-- Safe to re-run.

create table if not exists public.member_travels (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  event_name text not null,
  destination_city text not null,
  destination_country text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  event_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.member_travels enable row level security;

-- Public read — this is a public "our club's global reach" showcase.
drop policy if exists member_travels_select_public on public.member_travels;
create policy member_travels_select_public on public.member_travels
  for select using (true);

drop policy if exists member_travels_write_admin on public.member_travels;
create policy member_travels_write_admin on public.member_travels
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
