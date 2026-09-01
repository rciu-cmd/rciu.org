-- migration24: project photos are always public again.
--
-- migration23 restricted project_media's select policy the same way
-- as club_photos (featured_home / visible_to_members+active member /
-- own upload / super admin only). That broke every PUBLIC project
-- photo gallery on the site — the home page's Projects row, /projects,
-- and each project's own /projects/view page all read straight from
-- project_media with no login required, so an anonymous visitor (and
-- most logged-in members too, for photos nobody had explicitly
-- switched on) suddenly saw no photos, or only a few.
--
-- Project photos need to stay open to everyone, same as before
-- migration23 — that was always the point of a public project photo
-- gallery. The member-only "Photo Library" concept from migration23
-- stays in place on club_photos (general club photos, not tied to any
-- public project page), which this migration does NOT touch.

drop policy if exists project_media_select_public on public.project_media;
create policy project_media_select_public on public.project_media
  for select using (true);
