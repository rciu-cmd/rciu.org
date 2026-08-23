-- ============================================================
-- RCIU migration 7 — Interact/Rotaract contact info + sitewide
-- theme-banner setting (the "Create Lasting Impact" strip under the
-- navbar, admin-editable from /admin/settings).
-- Safe to run on the live database.
-- ============================================================

alter table public.affiliate_clubs
  add column if not exists president_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists member_count int;

insert into public.site_settings (key, value_en, value_mn)
values ('rotary_theme_banner_url', '/theme/create-lasting-impact-pink-wide.png', '/theme/create-lasting-impact-pink-wide.png')
on conflict (key) do nothing;
