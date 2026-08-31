-- migration23: homepage curation, member-only photo visibility, and
-- in-app event reminders.
--
-- Bundles several related schema changes from one round of feedback:
--
-- 1. news.featured_home / projects.featured_home — lets an admin pick
--    exactly which posts/projects show on the home page (Admin → News
--    / Admin → Projects each get a "Show on Home" toggle), instead of
--    the home page always just grabbing "whatever's newest". The home
--    page falls back to newest-first if nothing's been picked yet, so
--    an existing site never suddenly shows an empty section.
--
-- 2. news.link_url — an optional external link (donation page,
--    registration form, etc.) an admin can attach to a written post,
--    shown as a button on that post's own detail page.
--
-- 3. club_photos.visible_to_members / project_media.visible_to_members
--    — a SEPARATE admin toggle from featured_home. Previously every
--    signed-in member's Photo Library (/gallery) could see every photo
--    anyone had ever uploaded. Now the select policy on both tables
--    only returns a photo if: it's featured on the home page (public),
--    OR an admin has explicitly marked it visible_to_members, OR the
--    viewer is the member who uploaded it, OR the viewer is a super
--    admin (who still sees everything, from /admin/gallery).
--
-- 4. event_reminders — a row is inserted here every time an admin uses
--    the "Send Reminder" button (alongside the email that button always
--    sent); the member Dashboard reads this table to also show the
--    reminder in-app, not just by email. No insert/update/delete policy
--    is defined on purpose — only the send-event-reminder Edge Function
--    (using its service-role key, which bypasses RLS entirely) is
--    meant to write rows here.

alter table public.news add column if not exists featured_home boolean not null default false;
alter table public.news add column if not exists link_url text;

alter table public.projects add column if not exists featured_home boolean not null default false;

alter table public.club_photos add column if not exists visible_to_members boolean not null default false;
alter table public.project_media add column if not exists visible_to_members boolean not null default false;

drop policy if exists club_photos_select_public on public.club_photos;
create policy club_photos_select_public on public.club_photos
  for select using (
    featured_home = true
    or (visible_to_members = true and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active'))
    or uploaded_by = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists project_media_select_public on public.project_media;
create policy project_media_select_public on public.project_media
  for select using (
    featured_home = true
    or (visible_to_members = true and exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'active'))
    or uploaded_by = auth.uid()
    or public.is_super_admin()
  );

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
