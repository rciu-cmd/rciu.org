-- ============================================================
-- RCIU migration 4 — Facebook post embeds in News.
-- Lets an admin paste just a public Facebook post URL instead of
-- writing a title/body — the site embeds the whole post (photo,
-- video, text) via Facebook's public Post Plugin, no API keys needed.
-- Safe to run on the live database; only relaxes/adds columns.
-- ============================================================

alter table public.news
  add column if not exists facebook_url text;

-- title/body were required before; a Facebook-embed post has neither,
-- so they need to become optional.
alter table public.news alter column title_mn drop not null;
alter table public.news alter column title_en drop not null;
alter table public.news alter column body_mn drop not null;
alter table public.news alter column body_en drop not null;

-- A post must still be ONE of: a Facebook embed, or a fully-written
-- post (both languages' title + body present).
alter table public.news drop constraint if exists news_is_facebook_or_written;
alter table public.news add constraint news_is_facebook_or_written check (
  facebook_url is not null
  or (title_mn is not null and title_en is not null and body_mn is not null and body_en is not null)
);
