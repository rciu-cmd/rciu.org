-- Lets an admin pick which photos show in the home page gallery,
-- instead of it always just showing the most recently uploaded ones.
alter table public.club_photos add column if not exists featured_home boolean not null default false;
alter table public.project_media add column if not exists featured_home boolean not null default false;

comment on column public.club_photos.featured_home is 'Admin-selected: show this photo in the home page gallery strip.';
comment on column public.project_media.featured_home is 'Admin-selected: show this photo in the home page gallery strip.';
