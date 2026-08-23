-- ============================================================
-- Rotary Club of Ikh Urgoo (RCIU) — core database schema
-- Paste into Supabase SQL Editor and Run, once, on a fresh project.
--
-- Mirrors the proven MHIDA architecture: Supabase Auth handles login,
-- a trigger auto-creates a profile row on signup, and Row Level
-- Security (RLS) enforces who can see/edit what — no server needed,
-- works with the static Next.js export on GitHub Pages.
--
-- IMPORTANT — privacy: this file defines STRUCTURE ONLY. It contains
-- no real names, phone numbers, addresses, or donation amounts. Those
-- go in a separate script (supabase/private/... — see
-- PRIVATE_DATA_README.md) that you paste directly into the SQL
-- Editor and never commit to this public GitHub repo.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- members
-- ------------------------------------------------------------
create sequence if not exists public.member_no_seq start with 1;

create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  member_no int not null unique default nextval('public.member_no_seq'),
  member_id text generated always as ('RCIU' || lpad(member_no::text, 3, '0')) stored,

  first_name text not null default '',
  last_name text not null default '',
  name_local text,                       -- Cyrillic / local-script name if different
  rotary_id text unique,                 -- official Rotary International member ID, for reconciling with My Rotary reports
  email text not null,
  phone text,
  city text,
  country text,
  address text,                          -- admin/self visible only, never public

  classification text,                   -- profession / workplace
  position text,                         -- role at workplace
  bio_mn text,
  bio_en text,
  photo_url text,

  admitted_date date,                    -- date joined this club
  original_rotary_date date,             -- date first became a Rotarian (any club)

  status text not null default 'pending'
    check (status in ('pending', 'active', 'inactive')),
  is_admin boolean not null default false,

  -- Paul Harris Fellow / Major Donor recognition — tier only, no
  -- dollar figures live here (those stay in Rotary's own systems).
  phf_level text not null default 'none'
    check (phf_level in ('none','PHF','PHF+1','PHF+2','PHF+3','PHF+4','PHF+5','PHF+6','PHF+7','PHF+8')),
  phf_date date,
  major_donor boolean not null default false,
  major_donor_level int,                 -- 1-4, per Rotary Foundation levels, admin-set
  honor_roll_visible boolean not null default true,  -- member can opt out of public honor roll

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_status_idx on public.members(status);
create index if not exists members_phf_idx on public.members(phf_level);

-- Keep updated_at current on any change, without touching it on rows
-- nobody wrote to (mirrors MHIDA's protect_member_columns pattern).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at
  before update on public.members
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when someone signs up via Supabase Auth.
-- New signups start 'pending' — same admin-approval pattern as MHIDA.
create or replace function public.handle_new_member_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.members (id, first_name, last_name, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_rciu on auth.users;
create trigger on_auth_user_created_rciu
  after insert on auth.users
  for each row execute function public.handle_new_member_user();

alter table public.members enable row level security;

-- Public: only a safe subset of fields, via a view (see below) — the
-- base table itself is never selectable by anon.
drop policy if exists members_select_self on public.members;
create policy members_select_self on public.members
  for select using (auth.uid() = id);

drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select using (
    exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select is_admin from public.members where id = auth.uid()));

drop policy if exists members_update_admin on public.members;
create policy members_update_admin on public.members
  for update using (
    exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

-- Public-safe view: name, role, photo, PHF tier, major-donor flag —
-- no email, phone, address, or exact dollar amounts, ever. Respects
-- each member's own honor_roll_visible opt-out.
create or replace view public.members_public as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor
from public.members
where status = 'active';

grant select on public.members_public to anon, authenticated;

-- ------------------------------------------------------------
-- board positions (a member can hold a board role for a given year)
-- ------------------------------------------------------------
create table if not exists public.board_positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  role_mn text not null,
  role_en text not null,
  role_ja text,
  role_zh text,
  rotary_year text not null,             -- e.g. '2026-2027'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.board_positions enable row level security;

drop policy if exists board_select_public on public.board_positions;
create policy board_select_public on public.board_positions for select using (true);

drop policy if exists board_write_admin on public.board_positions;
create policy board_write_admin on public.board_positions
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- ------------------------------------------------------------
-- news
-- ------------------------------------------------------------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title_mn text not null,
  title_en text not null,
  title_ja text,
  title_zh text,
  body_mn text not null,
  body_en text not null,
  body_ja text,
  body_zh text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references public.members(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists news_touch_updated_at on public.news;
create trigger news_touch_updated_at
  before update on public.news
  for each row execute function public.touch_updated_at();

alter table public.news enable row level security;

drop policy if exists news_select_public on public.news;
create policy news_select_public on public.news
  for select using (status = 'published');

drop policy if exists news_select_admin on public.news;
create policy news_select_admin on public.news
  for select using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

drop policy if exists news_write_admin on public.news;
create policy news_write_admin on public.news
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- ------------------------------------------------------------
-- projects (+ media uploaded into project folders)
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title_mn text not null,
  title_en text not null,
  title_ja text,
  title_zh text,
  description_mn text,
  description_en text,
  description_ja text,
  description_zh text,
  cover_image_url text,
  status text not null default 'ongoing' check (status in ('ongoing','completed','planned')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

drop policy if exists projects_select_public on public.projects;
create policy projects_select_public on public.projects for select using (true);

drop policy if exists projects_write_admin on public.projects;
create policy projects_write_admin on public.projects
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- Photos members upload into a project's folder (report/collage source).
-- Photos only — no video, per club decision.
create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid references public.members(id),
  storage_path text not null,            -- path within the storage bucket (Supabase or R2)
  caption text,
  created_at timestamptz not null default now()
);

alter table public.project_media enable row level security;

drop policy if exists project_media_select_public on public.project_media;
create policy project_media_select_public on public.project_media for select using (true);

drop policy if exists project_media_insert_member on public.project_media;
create policy project_media_insert_member on public.project_media
  for insert with check (
    exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

drop policy if exists project_media_delete_own_or_admin on public.project_media;
create policy project_media_delete_own_or_admin on public.project_media
  for delete using (
    uploaded_by = auth.uid()
    or exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

-- ------------------------------------------------------------
-- links & partners (Холбоос ба түншүүд) + affiliate clubs
-- ------------------------------------------------------------
create table if not exists public.links_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('sister_club','friendship_club','district','other')),
  url text,
  logo_url text,
  description_mn text,
  description_en text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.links_partners enable row level security;

drop policy if exists links_select_public on public.links_partners;
create policy links_select_public on public.links_partners for select using (true);

drop policy if exists links_write_admin on public.links_partners;
create policy links_write_admin on public.links_partners
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- Sponsored youth clubs (Interact + Rotaract) shown in one shared section.
create table if not exists public.affiliate_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_type text not null check (club_type in ('interact','rotaract')),
  chartered_date date,
  description_mn text,
  description_en text,
  logo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.affiliate_clubs enable row level security;

drop policy if exists affiliate_select_public on public.affiliate_clubs;
create policy affiliate_select_public on public.affiliate_clubs for select using (true);

drop policy if exists affiliate_write_admin on public.affiliate_clubs;
create policy affiliate_write_admin on public.affiliate_clubs
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- ------------------------------------------------------------
-- stock / inventory — HIDDEN, admin-only page (pins, banners, gifts)
-- ------------------------------------------------------------
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity int not null default 0,
  comments text,
  updated_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists stock_items_touch_updated_at on public.stock_items;
create trigger stock_items_touch_updated_at
  before update on public.stock_items
  for each row execute function public.touch_updated_at();

-- Every quantity change is logged so admins can see who changed what,
-- when — per the club's explicit request ("if someone change numbers
-- to see after").
create table if not exists public.stock_item_history (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  old_quantity int not null,
  new_quantity int not null,
  changed_by uuid references public.members(id),
  note text,
  changed_at timestamptz not null default now()
);

create or replace function public.log_stock_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.quantity is distinct from new.quantity then
    insert into public.stock_item_history (stock_item_id, old_quantity, new_quantity, changed_by)
    values (new.id, old.quantity, new.quantity, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists stock_items_log_change on public.stock_items;
create trigger stock_items_log_change
  after update on public.stock_items
  for each row execute function public.log_stock_change();

alter table public.stock_items enable row level security;
alter table public.stock_item_history enable row level security;

-- Admin-only, full stop — this page is intentionally hidden from
-- regular members, not just unlinked from navigation.
drop policy if exists stock_items_admin_only on public.stock_items;
create policy stock_items_admin_only on public.stock_items
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

drop policy if exists stock_history_admin_only on public.stock_item_history;
create policy stock_history_admin_only on public.stock_item_history
  for select using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- ------------------------------------------------------------
-- site settings (meeting info, contact details — editable by admin)
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value_mn text,
  value_en text,
  value_ja text,
  value_zh text
);

alter table public.site_settings enable row level security;

drop policy if exists settings_select_public on public.site_settings;
create policy settings_select_public on public.site_settings for select using (true);

drop policy if exists settings_write_admin on public.site_settings;
create policy settings_write_admin on public.site_settings
  for all using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- Seed the meeting/contact details already confirmed by the club.
-- Safe to re-run (upsert).
insert into public.site_settings (key, value_en, value_mn) values
  ('meeting_day_time', 'Tuesday at 20:00', 'Мягмар гараг 20:00 цаг'),
  ('meeting_place_in_person', 'Red Rock Castle Restaurant, 1 khoroo, Sukhbaatar District, Ulaanbaatar, 46, Mongolia', 'Ред Рок Кастл ресторан, 1-р хороо, Сүхбаатар дүүрэг, Улаанбаатар 46, Монгол улс'),
  ('meeting_place_online', 'https://meet.google.com/?pli=1', 'https://meet.google.com/?pli=1'),
  ('contact_email', 'rciu.mng@gmail.com', 'rciu.mng@gmail.com'),
  ('contact_phone', '+976 99031147', '+976 99031147'),
  ('mailing_address', 'Rotary Club of Ikh Urgoo, 100-5, 15 khoroo, Bayanzurkh District, Ulaanbaatar, 13370, Mongolia', 'Рotary Club of Ikh Urgoo, 100-5, 15-р хороо, Баянзүрх дүүрэг, Улаанбаатар 13370, Монгол улс')
on conflict (key) do update set value_en = excluded.value_en, value_mn = excluded.value_mn;
