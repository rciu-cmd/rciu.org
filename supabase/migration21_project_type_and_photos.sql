-- Migration 21 — project funding type, for the admin "New Project"
-- form's Local Project / District Grant (DG) / Global Grant (GG)
-- picker. (Photo uploads themselves don't need a migration — they
-- just use the project_media table that already exists in schema.sql,
-- via the same rciu-photos storage bucket every other upload uses.)
--
-- Local Project = no outside grant at all (self-funded by the club).
-- District Grant and Global Grant are both Rotary Foundation grant
-- programs and both get an official grant number assigned (by the
-- district for DG, by TRF for GG) — that's why the admin form shows
-- the "Grant number" field for both DG and GG, and hides it for Local
-- Project.
--
-- Safe to re-run.

alter table public.projects add column if not exists project_type text not null default 'local_project';

alter table public.projects drop constraint if exists projects_project_type_check;
alter table public.projects add constraint projects_project_type_check
  check (project_type in ('local_project','district_grant','global_grant'));
