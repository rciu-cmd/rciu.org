-- ============================================================
-- RCIU migration 5 — events calendar + general photo library.
-- Safe to run on the live database: only creates new tables/policies,
-- never touches existing data. Paste into Supabase SQL Editor and Run.
-- ============================================================

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title_mn text not null,
  title_en text not null,
  description_mn text,
  description_en text,
  location text,
  event_date date not null,
  event_time text,
  category text check (category in ('installation_ceremony','district_events','projects','other')),
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

drop policy if exists events_select_members on public.events;
create policy events_select_members on public.events
  for select using (auth.uid() is not null);

drop policy if exists events_write_admin on public.events;
create policy events_write_admin on public.events
  for all using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- club_photos (general/year+category photo library)
-- ------------------------------------------------------------
create table if not exists public.club_photos (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  category text not null check (category in ('installation_ceremony','district_events','other')),
  storage_path text not null,
  caption text,
  uploaded_by uuid references public.members(id),
  created_at timestamptz not null default now()
);

alter table public.club_photos enable row level security;

drop policy if exists club_photos_select_public on public.club_photos;
create policy club_photos_select_public on public.club_photos for select using (true);

drop policy if exists club_photos_insert_member on public.club_photos;
create policy club_photos_insert_member on public.club_photos
  for insert with check (
    exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

drop policy if exists club_photos_delete_own_or_admin on public.club_photos;
create policy club_photos_delete_own_or_admin on public.club_photos
  for delete using (
    uploaded_by = auth.uid()
    or public.is_admin()
  );
