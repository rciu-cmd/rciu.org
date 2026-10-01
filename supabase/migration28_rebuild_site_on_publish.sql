-- ============================================================
-- RCIU migration 28 — rebuild the website when content is published.
--
-- Link previews (Facebook etc.) come from per-post pages that are
-- built when the site is deployed (src/lib/share-data.ts). GitHub's
-- hourly rebuild runs hours late in practice, so a new post often had
-- no preview page when someone shared it. Now the database asks GitHub
-- to rebuild the moment something preview-worthy changes:
--   - news: a post is published, edited while published, unpublished
--     or deleted (draft-only edits don't trigger anything)
--   - projects: any change
--   - project_media: a project photo added, changed or removed
-- The rebuild takes about a minute. If several things change at once,
-- GitHub keeps only the newest rebuild (the deploy workflow cancels the
-- one in progress), so the final result always includes everything.
--
-- The GitHub token lives in Supabase Vault under the name
-- 'github_rebuild_token' — stored separately (see the chat / README),
-- never in this file. Without it, nothing is sent and nothing breaks.
--
-- Safe to re-run.
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- security definer: admins saving a post can't read Vault themselves.
-- Errors are swallowed on purpose — a rebuild problem (expired token,
-- GitHub down) must never stop an admin from saving a post. pg_net
-- sends the request in the background, so saving isn't slowed either.
create or replace function public.request_site_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
begin
  -- News drafts aren't on the site, so editing one changes nothing.
  -- (Nested, not "tg_table_name = 'news' and ...": Postgres doesn't
  -- promise to skip the second half, and projects has no status column.)
  if tg_table_name = 'news' then
    if not (
      (tg_op in ('INSERT', 'UPDATE') and new.status = 'published')
      or (tg_op in ('UPDATE', 'DELETE') and old.status = 'published')
    ) then
      return null;
    end if;
  end if;

  select decrypted_secret into token
    from vault.decrypted_secrets
   where name = 'github_rebuild_token';
  if coalesce(token, '') = '' then
    return null; -- not set up yet: the hourly rebuild still covers it
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/rciu-cmd/rciu.org/actions/workflows/deploy.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'rciu-supabase-rebuild',
      'Content-Type', 'application/json'
    ),
    body := '{"ref": "main"}'::jsonb
  );
  return null;
exception when others then
  raise warning 'request_site_rebuild: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists news_request_rebuild on public.news;
create trigger news_request_rebuild
  after insert or update or delete on public.news
  for each row execute function public.request_site_rebuild();

drop trigger if exists projects_request_rebuild on public.projects;
create trigger projects_request_rebuild
  after insert or update or delete on public.projects
  for each row execute function public.request_site_rebuild();

drop trigger if exists project_media_request_rebuild on public.project_media;
create trigger project_media_request_rebuild
  after insert or update or delete on public.project_media
  for each row execute function public.request_site_rebuild();
