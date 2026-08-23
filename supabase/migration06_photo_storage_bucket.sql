-- ============================================================
-- RCIU migration 6 — photo Storage bucket + folder-convention RLS.
--
-- Folder convention inside this bucket (per the club's instruction):
--   {year}/{category}/{filename}
-- e.g.  2026/installation_ceremony/2026-07-12-handover.jpg
--       2026/district_events/...
--       2026/projects/{project title or id}/...
--       2026/other/...
-- The dashboard upload form builds this path automatically — nobody
-- needs to create folders by hand; Supabase Storage creates folders
-- implicitly the first time a file is uploaded to that path.
--
-- Safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('rciu-photos', 'rciu-photos', true)
on conflict (id) do nothing;

-- Public read — photos need to display on the public website.
drop policy if exists rciu_photos_select_public on storage.objects;
create policy rciu_photos_select_public on storage.objects
  for select using (bucket_id = 'rciu-photos');

-- Only active, signed-in members can upload.
drop policy if exists rciu_photos_insert_member on storage.objects;
create policy rciu_photos_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rciu-photos'
    and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active')
  );

-- A member can delete their own uploads; admins can delete anything.
drop policy if exists rciu_photos_delete_own_or_admin on storage.objects;
create policy rciu_photos_delete_own_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rciu-photos'
    and (owner = auth.uid() or public.is_admin())
  );
