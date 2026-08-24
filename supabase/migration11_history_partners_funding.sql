-- ============================================================
-- RCIU migration 11 — club history, past presidents, sister clubs,
-- and project funding-figure fields, sourced from rotarymongolia.org
-- (the district site's own RCIU profile page) and made admin-editable.
--
-- Everything here is additive and safe to re-run:
--   - new tables use "create table if not exists"
--   - new columns use "add column if not exists"
--   - seed rows use a "where not exists" guard keyed by name, so
--     re-running this migration will not create duplicates
--
-- NOTE on the "planned Urgoo Club" mentioned on rotarymongolia.org for
-- 2025: not seeded here since it's unconfirmed and its club_type
-- (Interact vs Rotaract) is unclear from the source page — add it
-- later via Admin -> Sponsored Clubs once confirmed.
--
-- NOTE on project funding figures: this migration only adds the
-- COLUMNS (funding_amount, funding_currency, grant_number) to
-- projects so they're admin-editable. It does NOT insert the named
-- grants/dollar figures found on rotarymongolia.org as live project
-- rows — those numbers should be confirmed by the club before they
-- go on the public site. See the separate reference note delivered
-- alongside this migration.
-- ============================================================

-- ------------------------------------------------------------
-- Past presidents (historical list, not tied to member accounts —
-- some past presidents may no longer have a login/member record).
-- ------------------------------------------------------------
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
  for all using (public.is_admin())
  with check (public.is_admin());

-- Seed the past-presidents list as published on rotarymongolia.org's
-- RCIU profile page (product/546057), most recent first. Ganzorig.B
-- served two non-consecutive terms, per the source page.
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
-- Club history text (founding story), admin-editable like the
-- theme-banner setting already in site_settings.
-- ------------------------------------------------------------
insert into public.site_settings (key, value_mn, value_en) values
  (
    'club_history_mn',
    'Rotary Club of Ikh Urgoo 2009 онд "Lexus Rotary Club" нэртэй ТББ хэлбэрээр хүмүүнлэгийн үйл ажиллагаагаар анх үүсч, 2012 оны 6-р сард Улаанбаатар Rotary клубын дэмжлэгтэйгээр Rotary International-д албан ёсоор элссэн.',
    'Rotary Club of Ikh Urgoo began in 2009 as a humanitarian NGO called "Lexus Rotary Club," and was officially chartered into Rotary International in June 2012, sponsored by the Rotary Club of Ulaanbaatar.'
  )
on conflict (key) do update set value_mn = excluded.value_mn, value_en = excluded.value_en;

-- ------------------------------------------------------------
-- Sister clubs, via the existing links_partners table (category =
-- 'sister_club'). No logo on file for either yet — admin can add one
-- later from /admin/partners.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Sponsored clubs (Interact/Rotaract), via the existing
-- affiliate_clubs table — already has a full admin UI, just seeding
-- data here. Chartered dates below use Jan 1 of the founding year
-- since only the year is confirmed on the source page.
-- ------------------------------------------------------------
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
-- Project funding-figure fields — columns only, no seed data (see
-- note at top of file). Lets admin optionally record a project's
-- funding amount and, for global grants, the grant number.
-- ------------------------------------------------------------
alter table public.projects
  add column if not exists funding_amount numeric,
  add column if not exists funding_currency text not null default 'USD',
  add column if not exists grant_number text;
