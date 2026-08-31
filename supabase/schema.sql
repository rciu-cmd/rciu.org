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
  is_admin boolean not null default false, -- auto-derived from admin_level, see trigger below — don't set directly
  admin_level text not null default 'none'
    check (admin_level in ('none','editor','super')), -- none | editor (News + Projects only) | super (everything, incl. appointing admins)

  -- Paul Harris Fellow / Major Donor recognition — tier only, no
  -- dollar figures live here (those stay in Rotary's own systems).
  phf_level text not null default 'none'
    check (phf_level in ('none','PHF','PHF+1','PHF+2','PHF+3','PHF+4','PHF+5','PHF+6','PHF+7','PHF+8')),
  phf_date date,
  major_donor boolean not null default false,
  major_donor_level int,                 -- 1-4, per Rotary Foundation levels, admin-set
  honor_roll_visible boolean not null default true,  -- member can opt out of public honor roll
  password_set boolean not null default false, -- true once the member has set a password (skips needing a fresh email link every time)
  highest_position text,                 -- highest Rotary leadership role held (e.g. "Club President 2020-21", "District Governor") — free text, admin-set
  honor_roll_priority int,               -- optional manual pin: lower number shows first on /members honor roll, above the normal PHF-tier sort; null = normal sort order

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

-- "Is the current user an admin?" — used by every admin-gated policy
-- below. This MUST be its own SECURITY DEFINER function rather than an
-- inline `exists (select 1 from public.members ...)` subquery repeated
-- in each policy: a policy on public.members that queries public.members
-- itself triggers "infinite recursion detected in policy" in Postgres,
-- which fails the ENTIRE query — including unrelated, otherwise-valid
-- rows a plain member should be able to read. SECURITY DEFINER runs
-- this lookup with the function owner's privileges, so it bypasses
-- members' own RLS instead of re-triggering it, breaking the loop.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.members where id = auth.uid()), false);
$$;

-- "Is the current user a SUPER admin?" — the finer-grained tier on
-- top of is_admin(). is_admin() stays true for both 'editor' and
-- 'super' (News + Projects intentionally accept either); this one
-- gates everything else in /admin (Members, Board, History, Partners,
-- Settings, Events, the home Gallery curation, Join Inquiries).
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select admin_level = 'super' from public.members where id = auth.uid()), false);
$$;

-- is_admin (boolean) is a derived mirror of admin_level, kept in sync
-- automatically so every existing is_admin() check above keeps
-- working without changes — set admin_level, never is_admin directly.
create or replace function public.sync_is_admin_from_level()
returns trigger language plpgsql as $$
begin
  new.is_admin := (new.admin_level <> 'none');
  return new;
end;
$$;

drop trigger if exists members_sync_is_admin on public.members;
create trigger members_sync_is_admin
  before insert or update on public.members
  for each row execute function public.sync_is_admin_from_level();

-- Public: only a safe subset of fields, via a view (see below) — the
-- base table itself is never selectable by anon.
drop policy if exists members_select_self on public.members;
create policy members_select_self on public.members
  for select using (auth.uid() = id);

drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select using (
    public.is_super_admin()
  );

-- Note: this intentionally does NOT restrict which columns a member
-- can touch on their own row (that would need column-level grants,
-- which don't compose with RLS the way you'd want here) — instead,
-- the trigger just below specifically blocks changing your OWN
-- admin_level, which is the one column self-service editing must
-- never be allowed to touch. Promoting/demoting always has to come
-- from a different (super-admin) account, or the SQL Editor.
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists members_update_admin on public.members;
create policy members_update_admin on public.members
  for update using (
    public.is_super_admin()
  );

-- members_update_self (above) deliberately doesn't restrict which
-- columns a member can touch on their own row — RLS can't do
-- column-level checks the way you'd want here. This trigger is what
-- actually closes that off: it blocks a member from changing a fixed
-- list of "admin-only" columns on their OWN row, even though the RLS
-- policy alone would otherwise allow it. Originally this only covered
-- admin_level (migration01); security review (migration20) found the
-- same gap open on status, phf_level, phf_date, major_donor,
-- major_donor_level, honor_roll_priority, member_no, and rotary_id —
-- meaning a member could, with nothing more than their own browser's
-- dev console and their own logged-in session, self-approve a
-- 'pending' account straight to 'active', or self-grant a fake Paul
-- Harris Fellow tier that would then show up on the public Honor
-- Roll. Every one of these is intentionally admin-only, and none of
-- them are in the Dashboard's own self-edit form (phone/city/
-- classification/name_local/bio/photo_url stay freely self-editable).
-- Uses to_jsonb() so the check is one generic loop instead of one
-- hand-written `if` per column — new protected columns just get added
-- to the array, not a new branch.
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

-- Public-safe view: name, role, photo, PHF tier, major-donor flag —
-- no email, phone, address, or exact dollar amounts, ever. Respects
-- each member's own honor_roll_visible opt-out. Also carries
-- highest_position + honor_roll_priority (migration18) since the
-- Paul Harris Fellow Honor Roll now lives on the public About page.
create or replace view public.members_public as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor,
  highest_position,
  case when honor_roll_visible then honor_roll_priority else null end as honor_roll_priority
from public.members
where status = 'active';

grant select on public.members_public to anon, authenticated;

-- Members-only directory view — same rows as members_public, PLUS
-- email, phone, rotary_id, and highest_position. This is real contact
-- info, so unlike members_public it is granted to "authenticated"
-- ONLY, never "anon" — a guest hitting the REST API directly (not
-- just the page-level login gate on /members) still can't read it.
create or replace view public.members_directory as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city, email, phone, rotary_id, highest_position,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor,
  honor_roll_priority
from public.members
where status = 'active';

revoke all on public.members_directory from anon, public;
grant select on public.members_directory to authenticated;

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
  sort_order int not null default 0,     -- also doubles as Rotary-protocol display order (President, VP, Secretary, ...) — admin-set
  photo_url text,                        -- optional; falls back to the member's own photo_url if unset
  created_at timestamptz not null default now()
);

alter table public.board_positions enable row level security;

drop policy if exists board_select_public on public.board_positions;
create policy board_select_public on public.board_positions for select using (true);

drop policy if exists board_write_admin on public.board_positions;
create policy board_write_admin on public.board_positions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Past presidents (historical list, not tied to member accounts —
-- some past presidents may no longer have a login/member record).
-- Sourced from the club's own profile page on rotarymongolia.org.
create table if not exists public.club_past_presidents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year_range text not null,   -- free text, e.g. "2020-2021" or "2016-2017, 2018-2019"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.club_past_presidents enable row level security;

drop policy if exists past_presidents_select_public on public.club_past_presidents;
create policy past_presidents_select_public on public.club_past_presidents for select using (true);

drop policy if exists past_presidents_write_admin on public.club_past_presidents;
create policy past_presidents_write_admin on public.club_past_presidents
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

insert into public.club_past_presidents (name, year_range, sort_order)
select v.name, v.year_range, v.sort_order
from (values
  ('Batbold.B',        '2024-2025', 10),
  ('Uyanga.G',         '2023-2024', 20),
  ('Ochirbat.B',       '2022-2023', 30),
  ('Myagmarsuren.B',   '2021-2022', 40),
  ('Enkhtaiwan.T',     '2020-2021', 50),
  ('Boldmaa.S',        '2019-2020', 60),
  ('Ganzorig.B',       '2017-2018, 2018-2019', 70),
  ('Battogtokh.M',     '2016-2017', 80),
  ('Baldandorj.Z',     '2014-2015', 90),
  ('Erdenebayar.B',    '2013-2014', 100),
  ('Nasanbat.Ts',      '2011-2012, 2012-2013', 110)
) as v(name, year_range, sort_order)
where not exists (
  select 1 from public.club_past_presidents p where p.name = v.name
);

-- ------------------------------------------------------------
-- news
-- ------------------------------------------------------------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  -- A post is EITHER a Facebook embed (facebook_url set, everything
  -- else optional) OR a written post (title_mn/en + body_mn/en set,
  -- facebook_url null) — enforced by news_is_facebook_or_written below.
  title_mn text,
  title_en text,
  title_ja text,
  title_zh text,
  body_mn text,
  body_en text,
  body_ja text,
  body_zh text,
  cover_image_url text,
  link_url text,              -- optional external link (donation page, registration form, etc.) shown as a button on the post's detail page (migration23)
  facebook_url text unique,   -- lets the Facebook auto-sync workflow upsert without duplicating a post it's already synced (NULL is fine — a plain UNIQUE constraint allows any number of NULL rows, i.e. written posts)
  status text not null default 'draft' check (status in ('draft','published')),
  featured_home boolean not null default false, -- admin-selected: show in the home page News strip (migration23); home page falls back to newest-first if none are picked yet
  author_id uuid references public.members(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_is_facebook_or_written check (
    facebook_url is not null
    or (title_mn is not null and title_en is not null and body_mn is not null and body_en is not null)
  )
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
  for select using (public.is_admin());

drop policy if exists news_write_admin on public.news;
create policy news_write_admin on public.news
  for all using (public.is_admin())
  with check (public.is_admin());

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
  cause_icon text check (cause_icon in ('basic_education_literacy','maternal_child_health','disease_prevention','other')),
  status text not null default 'ongoing' check (status in ('ongoing','completed','planned')),
  featured_home boolean not null default false, -- admin-selected: show in the home page Projects strip (migration23); home page falls back to newest-first if none are picked yet
  start_date date,
  end_date date,
  -- How the project is funded: a club-run Local Project has no outside
  -- grant at all; a District Grant (DG) and a Global Grant (GG) are
  -- both Rotary Foundation grant programs and both get an official
  -- grant number assigned (by the district for DG, by TRF for GG) —
  -- only Local Project has no grant_number to enter.
  project_type text not null default 'local_project'
    check (project_type in ('local_project','district_grant','global_grant')),
  -- Funding figures — optional, admin-entered per project (e.g. for a
  -- Rotary Foundation global grant). No dollar amounts are assumed;
  -- these stay null until an admin fills them in and confirms them.
  funding_amount numeric,
  funding_currency text not null default 'USD',
  grant_number text,
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
  for all using (public.is_admin())
  with check (public.is_admin());

-- Photos members upload into a project's folder (report/collage source).
-- Photos only — no video, per club decision.
create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid references public.members(id),
  storage_path text not null,            -- path within the storage bucket (Supabase or R2)
  caption text,
  featured_home boolean not null default false, -- admin-selected: show in the home page gallery
  visible_to_members boolean not null default false, -- admin-selected: show in every member's Photo Library (/gallery), not just the uploader's own (migration23)
  created_at timestamptz not null default now()
);

alter table public.project_media enable row level security;

-- A photo is visible if: it's featured on the home page (public), an
-- admin has explicitly opened it up to every member, the viewer
-- uploaded it themselves, or the viewer is a super admin (who sees
-- everything from /admin/gallery). Otherwise a member's own Photo
-- Library only ever shows their own uploads (migration23) — previously
-- this was `using (true)`, i.e. every signed-in member (and even the
-- public) could see every photo anyone had ever uploaded.
drop policy if exists project_media_select_public on public.project_media;
create policy project_media_select_public on public.project_media
  for select using (
    featured_home = true
    or (visible_to_members = true and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active'))
    or uploaded_by = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists project_media_insert_member on public.project_media;
create policy project_media_insert_member on public.project_media
  for insert with check (
    exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

drop policy if exists project_media_delete_own_or_admin on public.project_media;
create policy project_media_delete_own_or_admin on public.project_media
  for delete using (
    uploaded_by = auth.uid()
    or public.is_admin()
  );

drop policy if exists project_media_update_admin on public.project_media;
create policy project_media_update_admin on public.project_media
  for update using (public.is_super_admin()) with check (public.is_super_admin());

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
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Sister clubs, sourced from rotarymongolia.org's RCIU profile page.
-- No logos on file yet — add via /admin/partners once available.
insert into public.links_partners (name, category, description_mn, description_en, sort_order)
select v.name, 'sister_club', v.description_mn, v.description_en, v.sort_order
from (values
  (
    'Melawati Rotary Club',
    'Хамтын Rotary клуб — 2023 оноос хойш (District 3300).',
    'Sister club since 2023 (District 3300).',
    10
  ),
  (
    'Makati Legazpi Rotary Club',
    'Хамтын Rotary клуб — 2024 оноос хойш (District 3830/3840).',
    'Sister club since 2024 (District 3830/3840).',
    20
  )
) as v(name, description_mn, description_en, sort_order)
where not exists (
  select 1 from public.links_partners l where l.name = v.name
);

-- Sponsored youth clubs (Interact + Rotaract) shown in one shared section.
create table if not exists public.affiliate_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_type text not null check (club_type in ('interact','rotaract')),
  chartered_date date,
  description_mn text,
  description_en text,
  logo_url text,
  -- Contact info for the sponsored club's own leadership, so a
  -- visitor can reach them directly (item 8: "president telephone
  -- and email so everyone can contact with them").
  president_name text,
  contact_phone text,
  contact_email text,
  member_count int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.affiliate_clubs enable row level security;

drop policy if exists affiliate_select_public on public.affiliate_clubs;
create policy affiliate_select_public on public.affiliate_clubs for select using (true);

drop policy if exists affiliate_write_admin on public.affiliate_clubs;
create policy affiliate_write_admin on public.affiliate_clubs
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Sourced from rotarymongolia.org's RCIU profile page. Chartered
-- dates use Jan 1 of the founding year since only the year is
-- confirmed on the source page. A third club ("Urgoo Club", planned
-- 2025 per the source page) is deliberately not seeded — unconfirmed
-- and its Interact/Rotaract type is unclear; add via /admin once known.
insert into public.affiliate_clubs (name, club_type, chartered_date, sort_order)
select v.name, v.club_type, v.chartered_date, v.sort_order
from (values
  ('Urgoo Rotaract Club', 'rotaract', date '2013-01-01', 10),
  ('Urgoo Interact Club',  'interact',  date '2022-01-01', 20)
) as v(name, club_type, chartered_date, sort_order)
where not exists (
  select 1 from public.affiliate_clubs a where a.name = v.name
);

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
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists stock_history_admin_only on public.stock_item_history;
create policy stock_history_admin_only on public.stock_item_history
  for select using (public.is_super_admin());

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
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Seed the meeting/contact details already confirmed by the club.
-- Safe to re-run (upsert).
insert into public.site_settings (key, value_en, value_mn) values
  ('meeting_day_time', 'Tuesday at 20:00', 'Мягмар гараг 20:00 цаг'),
  ('meeting_place_in_person', 'Red Rock Castle Restaurant, 1 khoroo, Sukhbaatar District, Ulaanbaatar, 46, Mongolia', 'Ред Рок Кастл ресторан, 1-р хороо, Сүхбаатар дүүрэг, Улаанбаатар 46, Монгол улс'),
  ('meeting_place_online', 'https://meet.google.com/?pli=1', 'https://meet.google.com/?pli=1'),
  ('contact_email', 'rciu.mng@gmail.com', 'rciu.mng@gmail.com'),
  ('contact_phone', '+976 99031147', '+976 99031147'),
  ('mailing_address', 'Rotary Club of Ikh Urgoo, 100-5, 15 khoroo, Bayanzurkh District, Ulaanbaatar, 13370, Mongolia', 'Рotary Club of Ikh Urgoo, 100-5, 15-р хороо, Баянзүрх дүүрэг, Улаанбаатар 13370, Монгол улс'),
  -- The sitewide theme strip below the navbar (repeating banner for
  -- this Rotary year's motto/theme). Admin can change this from
  -- /admin/settings each year without touching code.
  ('rotary_theme_banner_url', '/theme/create-lasting-impact-pink-wide.png', '/theme/create-lasting-impact-pink-wide.png')
on conflict (key) do update set value_en = excluded.value_en, value_mn = excluded.value_mn;

-- Club history (founding story), sourced from rotarymongolia.org's
-- RCIU profile page. Editable from /admin/history.
insert into public.site_settings (key, value_mn, value_en) values
  (
    'club_history_mn',
    'Rotary Club of Ikh Urgoo 2009 онд "Lexus Rotary Club" нэртэй ТББ хэлбэрээр хүмүүнлэгийн үйл ажиллагаагаар анх үүсч, 2012 оны 6-р сард Улаанбаатар Rotary клубын дэмжлэгтэйгээр Rotary International-д албан ёсоор элссэн.',
    'Rotary Club of Ikh Urgoo began in 2009 as a humanitarian NGO called "Lexus Rotary Club," and was officially chartered into Rotary International in June 2012, sponsored by the Rotary Club of Ulaanbaatar.'
  )
on conflict (key) do update set value_mn = excluded.value_mn, value_en = excluded.value_en;

-- ------------------------------------------------------------
-- events (club calendar) — admins manage it, members read it on
-- their dashboard. A "send reminder" email is a manual admin action
-- (see the send-event-reminder Edge Function), not an automatic
-- scheduled job — the static site has no server to run a scheduler.
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title_mn text not null,
  title_en text not null,
  description_mn text,
  description_en text,
  location text,
  event_date date not null,
  event_time text,               -- free text, e.g. "18:00" — no timezone math needed for a single-city club
  category text check (category in ('installation_ceremony','district_events','projects','other','public_holiday')),
  project_id uuid references public.projects(id) on delete set null,
  cover_image_url text,          -- optional photo, shown in the home page "next event" widget (migration16)
  registration_url text,         -- optional external signup/RSVP link (migration22) — shown as a "Register" button that opens in a new tab
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mongolia's official public holidays, seeded so they show on the
-- calendar automatically (migration22) — see that file for the actual
-- insert statements and sourcing notes. Kept as category
-- 'public_holiday' so they're visually distinct from club-run events.

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

-- Public read (migration16) — the home page shows the next upcoming
-- event, so this can no longer be members-only. Was: auth.uid() is not null.
drop policy if exists events_select_members on public.events;
drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (true);

drop policy if exists events_write_admin on public.events;
create policy events_write_admin on public.events
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- A row is inserted here every time an admin uses the "Send Reminder"
-- button, alongside the email that button already sends (migration23) —
-- the member Dashboard reads this table to also show the reminder
-- in-app. No insert/update/delete policy is defined on purpose: only the
-- send-event-reminder Edge Function (service-role key, bypasses RLS) is
-- meant to write rows here.
create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.event_reminders enable row level security;

drop policy if exists event_reminders_select_member on public.event_reminders;
create policy event_reminders_select_member on public.event_reminders
  for select using (
    exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

-- ------------------------------------------------------------
-- club_photos — general (non-project) photo library, organized by
-- the club's requested folder convention: year > category, e.g.
-- storage_path = '2026/installation_ceremony/2026-07-12-handover.jpg'.
-- Project-specific photos still go in project_media (already tied to
-- a project); this table is for everything else in that convention
-- (installation ceremonies, district events, and an "other" bucket).
-- ------------------------------------------------------------
create table if not exists public.club_photos (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  category text not null check (category in ('installation_ceremony','district_events','other')),
  storage_path text not null,     -- path within the Storage bucket
  caption text,
  featured_home boolean not null default false, -- admin-selected: show in the home page gallery
  visible_to_members boolean not null default false, -- admin-selected: show in every member's Photo Library (/gallery), not just the uploader's own (migration23)
  uploaded_by uuid references public.members(id),
  created_at timestamptz not null default now()
);

alter table public.club_photos enable row level security;

-- A photo is visible if: it's featured on the home page (public), OR an
-- admin has explicitly opened it up to all members, OR the viewer is the
-- member who uploaded it, OR the viewer is a super admin (who still sees
-- everything from /admin/gallery). This replaces the old fully-public
-- `using (true)` policy (migration23) — previously every signed-in
-- member's Photo Library could see every photo anyone had ever uploaded.
drop policy if exists club_photos_select_public on public.club_photos;
create policy club_photos_select_public on public.club_photos
  for select using (
    featured_home = true
    or (visible_to_members = true and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active'))
    or uploaded_by = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists club_photos_insert_member on public.club_photos;
create policy club_photos_insert_member on public.club_photos
  for insert with check (
    exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

drop policy if exists club_photos_delete_own_or_admin on public.club_photos;
create policy club_photos_delete_own_or_admin on public.club_photos
  for delete using (
    uploaded_by = auth.uid()
    or public.is_super_admin()
  );

-- club_photos/project_media never had an UPDATE policy at all, so the
-- "feature on home page" toggle (see migration14) was silently
-- blocked by RLS for everyone, admin or not, until this was added.
drop policy if exists club_photos_update_admin on public.club_photos;
create policy club_photos_update_admin on public.club_photos
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- join_inquiries — submissions from the public "/join" page.
-- Anyone (not signed in) can submit one; only admins can read them.
-- ------------------------------------------------------------
create table if not exists public.join_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.join_inquiries enable row level security;

drop policy if exists join_inquiries_insert_anyone on public.join_inquiries;
create policy join_inquiries_insert_anyone on public.join_inquiries
  for insert with check (true);

drop policy if exists join_inquiries_select_admin on public.join_inquiries;
create policy join_inquiries_select_admin on public.join_inquiries
  for select using (public.is_super_admin());

drop policy if exists join_inquiries_update_admin on public.join_inquiries;
create policy join_inquiries_update_admin on public.join_inquiries
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists join_inquiries_delete_admin on public.join_inquiries;
create policy join_inquiries_delete_admin on public.join_inquiries
  for delete using (public.is_super_admin());

-- ------------------------------------------------------------
-- project_inquiries (migration16) — submissions from the public
-- "Join the Project" form on /projects. Like join_inquiries, but tied
-- to a specific project (optional) instead of general club membership.
-- ------------------------------------------------------------
create table if not exists public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  club_name text not null,
  contact_name text,
  email text not null,
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.project_inquiries enable row level security;

drop policy if exists project_inquiries_insert_anyone on public.project_inquiries;
create policy project_inquiries_insert_anyone on public.project_inquiries
  for insert with check (true);

drop policy if exists project_inquiries_select_admin on public.project_inquiries;
create policy project_inquiries_select_admin on public.project_inquiries
  for select using (public.is_super_admin());

drop policy if exists project_inquiries_update_admin on public.project_inquiries;
create policy project_inquiries_update_admin on public.project_inquiries
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists project_inquiries_delete_admin on public.project_inquiries;
create policy project_inquiries_delete_admin on public.project_inquiries
  for delete using (public.is_super_admin());

-- ------------------------------------------------------------
-- member_travels (migration17) — data behind the "Where We've
-- Traveled" world map on the About page. Admin-entered only.
-- ------------------------------------------------------------
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

drop policy if exists member_travels_select_public on public.member_travels;
create policy member_travels_select_public on public.member_travels
  for select using (true);

drop policy if exists member_travels_write_admin on public.member_travels;
create policy member_travels_write_admin on public.member_travels
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- member_travel_participants (migration18) — lets one trip list more
-- than one member; member_travels.member_id is left in place but
-- unused going forward.
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

-- ------------------------------------------------------------
-- club_awards (migration18) — member-submitted award/recognition
-- entries, reviewed by an admin before showing on the public About
-- page. Submitted from the member Dashboard.
-- ------------------------------------------------------------
create table if not exists public.club_awards (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.members(id) on delete set null,
  title text not null,
  comment text,
  award_date date,
  file_url text,
  file_type text check (file_type in ('image', 'pdf')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.members(id) on delete set null
);

alter table public.club_awards enable row level security;

drop policy if exists club_awards_select_approved on public.club_awards;
create policy club_awards_select_approved on public.club_awards
  for select using (status = 'approved');

drop policy if exists club_awards_select_own on public.club_awards;
create policy club_awards_select_own on public.club_awards
  for select using (submitted_by = auth.uid());

drop policy if exists club_awards_select_admin on public.club_awards;
create policy club_awards_select_admin on public.club_awards
  for select using (public.is_super_admin());

drop policy if exists club_awards_insert_member on public.club_awards;
create policy club_awards_insert_member on public.club_awards
  for insert with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

drop policy if exists club_awards_delete_own_pending_or_admin on public.club_awards;
create policy club_awards_delete_own_pending_or_admin on public.club_awards
  for delete using (
    (submitted_by = auth.uid() and status = 'pending')
    or public.is_super_admin()
  );

drop policy if exists club_awards_update_admin on public.club_awards;
create policy club_awards_update_admin on public.club_awards
  for update using (public.is_super_admin()) with check (public.is_super_admin());
