-- ============================================================
-- RCIU migration 8 — "Join Us" inquiry pipeline.
-- Anyone can submit the /join form (no login required); only admins
-- can read submissions (Admin → Join Inquiries). Safe to run on the
-- live database.
-- ============================================================

create table if not exists public.join_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.join_inquiries enable row level security;

drop policy if exists join_inquiries_insert_anyone on public.join_inquiries;
create policy join_inquiries_insert_anyone on public.join_inquiries
  for insert with check (true);

drop policy if exists join_inquiries_select_admin on public.join_inquiries;
create policy join_inquiries_select_admin on public.join_inquiries
  for select using (public.is_admin());

drop policy if exists join_inquiries_update_admin on public.join_inquiries;
create policy join_inquiries_update_admin on public.join_inquiries
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists join_inquiries_delete_admin on public.join_inquiries;
create policy join_inquiries_delete_admin on public.join_inquiries
  for delete using (public.is_admin());
