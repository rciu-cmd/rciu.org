-- Two-tier admin, per the club's request: a "super" admin (the club
-- officer running the site) can do everything, including appointing
-- other members as admins; an "editor" admin can only add/edit News
-- and Projects — nothing else in /admin.
--
-- Design notes:
--   * `is_admin` (boolean) is kept and now auto-derived from
--     admin_level via a trigger, so every existing `is_admin()` check
--     (News, Projects, and the admin/layout.tsx entry gate) keeps
--     working unchanged — those are meant to allow ANY admin level.
--   * A new `is_super_admin()` function gates everything else
--     (Members, Board, History, Partners, Settings, Events, the home
--     Gallery curation, and Join Inquiries).
--   * A trigger blocks anyone — even a super admin — from changing
--     their OWN admin_level. members_update_self (below) deliberately
--     doesn't restrict which columns a member can touch on their own
--     row, so without this guard a plain member could otherwise grant
--     themselves admin access via a direct API call. Promotions must
--     always come from a different account (super-only, via
--     /admin/members) or the SQL Editor.

alter table public.members add column if not exists admin_level text not null default 'none'
  check (admin_level in ('none','editor','super'));

comment on column public.members.admin_level is
  'none = not an admin. editor = can manage News + Projects only. super = full admin access, including appointing other admins.';

-- Nobody already flagged is_admin loses access — they become 'super'.
update public.members set admin_level = 'super' where is_admin = true and admin_level = 'none';

create or replace function public.sync_is_admin_from_level()
returns trigger language plpgsql as $$
begin
  new.is_admin := (new.admin_level <> 'none');
  return new;
end;
$$;

drop trigger if exists members_sync_is_admin on public.members;
create trigger members_sync_is_admin
  before insert or update on public.members
  for each row execute function public.sync_is_admin_from_level();

-- Re-sync existing rows directly too (the trigger only fires on
-- future writes).
update public.members set is_admin = (admin_level <> 'none');

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select admin_level = 'super' from public.members where id = auth.uid()), false);
$$;

create or replace function public.protect_own_admin_level()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.id and new.admin_level is distinct from old.admin_level then
    raise exception 'cannot change your own admin level — ask another super admin, or use the SQL Editor';
  end if;
  return new;
end;
$$;

drop trigger if exists members_protect_own_admin_level on public.members;
create trigger members_protect_own_admin_level
  before update on public.members
  for each row execute function public.protect_own_admin_level();

-- ------------------------------------------------------------
-- Tighten to super-admin-only. News and Projects are untouched —
-- they intentionally still allow any admin level (that's the whole
-- point of the "editor" tier).
-- ------------------------------------------------------------

drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select using (public.is_super_admin());

drop policy if exists members_update_admin on public.members;
create policy members_update_admin on public.members
  for update using (public.is_super_admin());

drop policy if exists board_write_admin on public.board_positions;
create policy board_write_admin on public.board_positions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists past_presidents_write_admin on public.club_past_presidents;
create policy past_presidents_write_admin on public.club_past_presidents
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists links_write_admin on public.links_partners;
create policy links_write_admin on public.links_partners
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists affiliate_write_admin on public.affiliate_clubs;
create policy affiliate_write_admin on public.affiliate_clubs
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists stock_items_admin_only on public.stock_items;
create policy stock_items_admin_only on public.stock_items
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists stock_history_admin_only on public.stock_item_history;
create policy stock_history_admin_only on public.stock_item_history
  for select using (public.is_super_admin());

drop policy if exists settings_write_admin on public.site_settings;
create policy settings_write_admin on public.site_settings
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists events_write_admin on public.events;
create policy events_write_admin on public.events
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists club_photos_delete_own_or_admin on public.club_photos;
create policy club_photos_delete_own_or_admin on public.club_photos
  for delete using (
    uploaded_by = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists join_inquiries_select_admin on public.join_inquiries;
create policy join_inquiries_select_admin on public.join_inquiries
  for select using (public.is_super_admin());

drop policy if exists join_inquiries_update_admin on public.join_inquiries;
create policy join_inquiries_update_admin on public.join_inquiries
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists join_inquiries_delete_admin on public.join_inquiries;
create policy join_inquiries_delete_admin on public.join_inquiries
  for delete using (public.is_super_admin());

-- club_photos/project_media never had an UPDATE policy at all, so the
-- "feature on home page" toggle added in migration14 was silently
-- blocked by RLS for everyone, admin or not. Fixing that here.
drop policy if exists club_photos_update_admin on public.club_photos;
create policy club_photos_update_admin on public.club_photos
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists project_media_update_admin on public.project_media;
create policy project_media_update_admin on public.project_media
  for update using (public.is_super_admin()) with check (public.is_super_admin());
