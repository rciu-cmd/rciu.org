-- ============================================================
-- RCIU migration 12 — dedup key for the Facebook auto-sync workflow.
--
-- The new .github/workflows/sync-facebook-news.yml job upserts each
-- Facebook post into `news` keyed on facebook_url, so the same post
-- is never inserted twice across runs. That requires a unique
-- constraint on the column (a plain UNIQUE constraint in Postgres
-- already allows any number of NULL rows — written posts, which have
-- no facebook_url — so this doesn't affect them).
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'news_facebook_url_unique'
  ) then
    alter table public.news
      add constraint news_facebook_url_unique unique (facebook_url);
  end if;
end $$;
