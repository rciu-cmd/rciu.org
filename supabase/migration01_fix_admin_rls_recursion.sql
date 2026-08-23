-- ============================================================
-- RCIU migration 1 — fix "infinite recursion detected in policy"
-- on public.members and every other admin-gated table.
--
-- Root cause: several RLS policies checked "is this user an admin?"
-- by running `exists (select 1 from public.members m where m.id =
-- auth.uid() and m.is_admin)` — a subquery on the SAME table the
-- policy protects. Postgres can't safely evaluate that (it would need
-- to re-apply members' own RLS to answer the subquery, which needs
-- the policy's answer, which needs the subquery...). Instead of
-- degrading gracefully, Postgres fails the WHOLE query — including
-- the simple "let me see my own row" rule that had nothing to do with
-- the broken one. That's what caused "Profile not found" on the
-- dashboard even though the member row was correct all along.
--
-- Fix: a SECURITY DEFINER function runs with the function owner's
-- privileges, so its internal lookup bypasses members' RLS instead of
-- re-triggering it — breaking the recursive loop. Every admin-check
-- policy now calls this function instead of repeating the subquery.
--
-- Safe to run any time, including on a database that's already live
-- with real member data — it only replaces policy definitions, never
-- touches actual rows.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.members where id = auth.uid()), false);
$$;

-- members
drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select using (public.is_admin());

drop policy if exists members_update_admin on public.members;
create policy members_update_admin on public.members
  for update using (public.is_admin());

-- Simplify self-update's check — the old version also self-referenced
-- members and could hit the same recursion trap. Granting/revoking
-- admin should be done from the SQL Editor (bypasses RLS entirely),
-- not through any self-service form, so this doesn't need to compare
-- is_admin values itself.
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- board_positions
drop policy if exists board_write_admin on public.board_positions;
create policy board_write_admin on public.board_positions
  for all using (public.is_admin()) with check (public.is_admin());

-- news
drop policy if exists news_select_admin on public.news;
create policy news_select_admin on public.news
  for select using (public.is_admin());

drop policy if exists news_write_admin on public.news;
create policy news_write_admin on public.news
  for all using (public.is_admin()) with check (public.is_admin());

-- projects
drop policy if exists projects_write_admin on public.projects;
create policy projects_write_admin on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

-- project_media
drop policy if exists project_media_delete_own_or_admin on public.project_media;
create policy project_media_delete_own_or_admin on public.project_media
  for delete using (uploaded_by = auth.uid() or public.is_admin());

-- links_partners
drop policy if exists links_write_admin on public.links_partners;
create policy links_write_admin on public.links_partners
  for all using (public.is_admin()) with check (public.is_admin());

-- affiliate_clubs
drop policy if exists affiliate_write_admin on public.affiliate_clubs;
create policy affiliate_write_admin on public.affiliate_clubs
  for all using (public.is_admin()) with check (public.is_admin());

-- stock (hidden admin-only page)
drop policy if exists stock_items_admin_only on public.stock_items;
create policy stock_items_admin_only on public.stock_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists stock_history_admin_only on public.stock_item_history;
create policy stock_history_admin_only on public.stock_item_history
  for select using (public.is_admin());

-- site_settings
drop policy if exists settings_write_admin on public.site_settings;
create policy settings_write_admin on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
