-- migration22: event registration links + Mongolia public holidays
--
-- Two independent changes bundled together since both touch the
-- `events` table:
--
-- 1. registration_url — optional external link (Google Form, Eventbrite,
--    etc.) shown as a "Register" button on the public Events page and
--    the member Dashboard's Upcoming Events list, opening in a new tab.
--
-- 2. A new 'public_holiday' category, plus a seed of Mongolia's
--    official public holidays for 2026-2027 so they show on the club
--    calendar automatically instead of admins having to enter them by
--    hand. Sourced and cross-checked (Aug 2026) against 11holidays.com,
--    qppstudio.net, and gobicashmere.com's Tsagaan Sar guide — fixed
--    calendar-date holidays (New Year, Women's Day, Children's Day,
--    Genghis Khan's Birthday, Republic Day, Independence Day) agreed
--    exactly across sources; the lunar-calendar ones (Tsagaan Sar,
--    Buddha Day) were cross-verified between two independent sources
--    for 2026 specifically. Only 2026-2027 are seeded because Tsagaan
--    Sar and Buddha Day shift every year with the lunar calendar and
--    reliable dates aren't published far in advance — an admin will
--    need to add 2028+ by hand once those dates are announced (or ask
--    for another research pass closer to the time).

alter table public.events add column if not exists registration_url text;

alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check
  check (category in ('installation_ceremony','district_events','projects','other','public_holiday'));

-- Lets the seed inserts below be re-run safely (e.g. if this file gets
-- executed twice) without creating duplicate holiday rows.
create unique index if not exists events_public_holiday_unique
  on public.events (event_date, title_en)
  where (category = 'public_holiday');

insert into public.events (title_mn, title_en, event_date, category) values
  -- 2026
  ('Шинэ жил', 'New Year''s Day', '2026-01-01', 'public_holiday'),
  ('Цагаан сар (нэгдүгээр өдөр)', 'Tsagaan Sar (Lunar New Year), Day 1', '2026-02-18', 'public_holiday'),
  ('Цагаан сар (хоёрдугаар өдөр)', 'Tsagaan Sar (Lunar New Year), Day 2', '2026-02-19', 'public_holiday'),
  ('Цагаан сар (гуравдугаар өдөр)', 'Tsagaan Sar (Lunar New Year), Day 3', '2026-02-20', 'public_holiday'),
  ('Олон улсын эмэгтэйчүүдийн өдөр', 'International Women''s Day', '2026-03-08', 'public_holiday'),
  ('Бурхан багшийн Их дүйчин өдөр', 'Buddha Day', '2026-05-31', 'public_holiday'),
  ('Эх, хүүхдийн өдөр', 'Mothers'' and Children''s Day', '2026-06-01', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2026-07-11', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2026-07-12', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2026-07-13', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2026-07-14', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2026-07-15', 'public_holiday'),
  ('Чингис хааны төрсөн өдөр', 'Genghis Khan''s Birthday (National Pride Day)', '2026-11-10', 'public_holiday'),
  ('Бүгд Найрамдах Улс тунхагласан өдөр', 'Republic Day', '2026-11-26', 'public_holiday'),
  ('Тусгаар тогтнолоо сэргээсэн өдөр', 'Independence Day', '2026-12-29', 'public_holiday'),
  -- 2027
  ('Шинэ жил', 'New Year''s Day', '2027-01-01', 'public_holiday'),
  ('Цагаан сар (нэгдүгээр өдөр)', 'Tsagaan Sar (Lunar New Year), Day 1', '2027-02-07', 'public_holiday'),
  ('Цагаан сар (хоёрдугаар өдөр)', 'Tsagaan Sar (Lunar New Year), Day 2', '2027-02-08', 'public_holiday'),
  ('Цагаан сар (гуравдугаар өдөр)', 'Tsagaan Sar (Lunar New Year), Day 3', '2027-02-09', 'public_holiday'),
  ('Олон улсын эмэгтэйчүүдийн өдөр', 'International Women''s Day', '2027-03-08', 'public_holiday'),
  ('Бурхан багшийн Их дүйчин өдөр', 'Buddha Day', '2027-05-20', 'public_holiday'),
  ('Эх, хүүхдийн өдөр', 'Mothers'' and Children''s Day', '2027-06-01', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2027-07-11', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2027-07-12', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2027-07-13', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2027-07-14', 'public_holiday'),
  ('Үндэсний их баяр наадам', 'Naadam Festival (National Day)', '2027-07-15', 'public_holiday'),
  ('Чингис хааны төрсөн өдөр', 'Genghis Khan''s Birthday (National Pride Day)', '2027-11-10', 'public_holiday'),
  ('Бүгд Найрамдах Улс тунхагласан өдөр', 'Republic Day', '2027-11-26', 'public_holiday'),
  ('Тусгаар тогтнолоо сэргээсэн өдөр', 'Independence Day', '2027-12-29', 'public_holiday')
on conflict (event_date, title_en) where (category = 'public_holiday') do nothing;
