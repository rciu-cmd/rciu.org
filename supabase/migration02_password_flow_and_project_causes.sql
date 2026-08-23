-- ============================================================
-- RCIU migration 2 — password login support + project cause icons.
-- Safe to run on the live database; only adds columns, never touches
-- existing data (existing rows just get the new columns' defaults).
-- ============================================================

alter table public.members
  add column if not exists password_set boolean not null default false;

alter table public.projects
  add column if not exists cause_icon text
    check (cause_icon in ('basic_education_literacy','maternal_child_health','disease_prevention','other'));
