-- ============================================================
-- RCIU migration 13 — board member photos, so /admin/board can
-- attach a photo per board position (falls back to the member's own
-- profile photo if left blank).
-- ============================================================

alter table public.board_positions
  add column if not exists photo_url text;
