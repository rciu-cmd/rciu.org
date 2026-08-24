-- ============================================================
-- RCIU migration 10 — manual pin/priority ordering for the
-- Paul Harris Fellow honor roll on /members.
--
-- honor_roll_priority is optional: null = normal sort (by PHF tier,
-- highest first, then last name). Any member with a number set jumps
-- to the very top of the table, in ascending priority-number order,
-- ahead of everyone else — regardless of their PHF tier.
--
-- This migration also pins RAVDANDORJ SHAGDAR (RCIU012) to the very
-- top of the honor roll, per admin request.
-- ============================================================

alter table public.members
  add column if not exists honor_roll_priority int;

create or replace view public.members_directory as
select
  member_id, first_name, last_name, name_local, classification, position,
  photo_url, city, email, phone, rotary_id, highest_position, honor_roll_priority,
  case when honor_roll_visible then phf_level else 'none' end as phf_level,
  case when honor_roll_visible then major_donor else false end as major_donor
from public.members
where status = 'active';

revoke all on public.members_directory from anon, public;
grant select on public.members_directory to authenticated;

-- Pin Ravdandorj Shagdar to #1 on the honor roll.
update public.members
set honor_roll_priority = 1
where member_id = 'RCIU012';
