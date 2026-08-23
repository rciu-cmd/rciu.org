-- ============================================================
-- RCIU migration 3 — real 2026-2027 board positions, from My Rotary.
-- Public data (names + titles are meant to appear on the Board page),
-- safe to commit to this public repo — unlike the roster import, this
-- has no phone numbers, addresses, or financial data in it.
--
-- Safe to re-run: it clears this Rotary year's rows first, then
-- re-inserts, so running it twice won't create duplicates.
-- ============================================================

delete from public.board_positions where rotary_year = '2026-2027';

insert into public.board_positions (member_id, role_mn, role_en, rotary_year, sort_order)
select id, role_mn, role_en, '2026-2027', sort_order
from (
  values
    ('h.mark.newby@gmail.com',        'Клубын Ерөнхийлөгч',            'Club President',                    1),
    ('dulmaa4040@gmail.com',          'Клубын Дэд Ерөнхийлөгч',        'Club Vice President',               2),
    ('g.munkhbaatar0419@gmail.com',   'Клубын Нарийн Бичгийн Дарга',   'Club Secretary',                    3),
    ('ochirbat.mng@gmail.com',        'Клубын Санхүүч',                'Club Treasurer',                    4),
    ('g.munkhbaatar0419@gmail.com',   'Гүйцэтгэх Нарийн Бичгийн Дарга/Захирал', 'Club Executive Secretary/Director', 5),
    ('baagiidy@hanmail.net',          'Сангийн Дарга (01.07.2026 хүртэл)', 'Club Foundation Chair (through 11 Jul 2026)', 6),
    ('sondorerdenebayar@gmail.com',   'Сангийн Дарга (12.07.2026-с)',  'Club Foundation Chair (from 12 Jul 2026)', 7),
    ('harrypoter.batbold@gmail.com',  'Гишүүнчлэлийн Дарга',           'Club Membership Chair',             8),
    ('uyangaa.gon@gmail.com',         'Олон Нийттэй Харилцах Дарга',   'Club Public Image Chair',           9),
    ('m-ootu@kamishigen.jp',          'Үйлчилгээний Төслийн Дарга',    'Club Service Projects Chair',      10),
    ('zuvch.ctm@gmail.com',           'Сургалтын Зохицуулагч',         'Club Learning Facilitator',        11),
    ('ewpk7x@gmail.com',              'Залуу Манлайлагчдын Холбогч',   'Club Young Leaders Contact',       12)
) as v(email, role_mn, role_en, sort_order)
join public.members m on lower(m.email) = lower(v.email);

select role_en, first_name, last_name, rotary_year from public.board_positions b
join public.members m on m.id = b.member_id
order by b.sort_order;
