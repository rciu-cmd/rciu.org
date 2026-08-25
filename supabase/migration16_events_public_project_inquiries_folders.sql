-- Migration 16 — several independent additions from the same round of
-- requests:
--
--   1. Events become publicly readable (were members-only) so the home
--      page can show a "next event" widget, plus a cover_image_url
--      column so admins can attach a photo to an event.
--   2. project_inquiries — like join_inquiries, but for outside clubs
--      or individuals who want to get involved in a specific project
--      (or the club in general) via the new "Join the Project" form.
--   3. An UPDATE policy on storage.objects for the rciu-photos bucket,
--      scoped to super admins — needed for the new admin folder
--      rename/merge tool (Supabase Storage's move() operation checks
--      for update permission on the source object).
--
-- Safe to re-run.

-- ------------------------------------------------------------
-- 1. Events: public read + optional cover photo
-- ------------------------------------------------------------
alter table public.events add column if not exists cover_image_url text;

drop policy if exists events_select_members on public.events;
drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (true);

-- events_write_admin (super-admin only) already exists from migration15 — unchanged.

-- ------------------------------------------------------------
-- 2. project_inquiries — public "Join the Project" form submissions
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
-- 3. Storage: let super admins move/rename files in rciu-photos
--    (needed for the admin folder rename/merge tool — .move() reads
--    this as an update on the source object).
-- ------------------------------------------------------------
drop policy if exists rciu_photos_update_admin on storage.objects;
create policy rciu_photos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'rciu-photos' and public.is_super_admin())
  with check (bucket_id = 'rciu-photos' and public.is_super_admin());
