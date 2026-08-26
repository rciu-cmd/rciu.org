-- Migration 19 — two small fixes on top of migration18:
--
-- 1. club_awards.award_date — a date field for the award itself (when
--    it was received), separate from created_at (when the row was
--    submitted to the site). Nullable so existing rows are unaffected.
--
-- 2. No new SQL needed for the "Could not embed because more than one
--    relationship was found for 'club_awards' and 'members'" error —
--    that was a query-side bug (the app's admin/awards page didn't
--    say which of club_awards' two FKs to members — submitted_by vs
--    reviewed_by — to embed), fixed in the code, not the database.
--    Noted here for the record.
--
-- Safe to re-run.

alter table public.club_awards add column if not exists award_date date;
