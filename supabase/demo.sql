-- Demo people from the mock-up (docs/00-START-HERE.md), for local development, previews and the
-- Playwright demos. NEVER run against production: production data comes from the migration (phase 2).
-- Safe to run more than once. Dates are those of the mock-up (today = Mon 12 Oct 2026).
--   bash scripts/demo-setup.sh

do $$
declare
  sunman uuid := (select id from public.coaches where slug = 'sunman');
  aun uuid := (select id from public.coaches where slug = 'aun');
  joy uuid := (select id from public.staff where name = 'Joy');
  tee uuid := (select id from public.staff where name = 'Tee');
begin
  insert into public.members (id, member_no, first_name, last_name, phone, email, lang, created_via, created_by_staff, created_at)
  overriding system value values
    ('d0000000-0000-4000-8000-000000001043', 1043, 'Emma', 'Wilson', '+44 7700 900456', 'emma.wilson@gmail.com', 'en', 'qr', joy, '2026-10-01 09:10+07'),
    ('d0000000-0000-4000-8000-000000000957', 957, 'Natalia', 'Orlova', '+7 999 555 0123', null, 'ru', 'import', null, '2025-03-14 10:00+07'),
    ('d0000000-0000-4000-8000-000000001188', 1188, 'Natalia', 'Orlova', '+7 999 555 0123', null, 'ru', 'desk', tee, '2026-10-03 10:01+07'),
    ('d0000000-0000-4000-8000-000000001101', 1101, 'Somchai', 'Kittisak', '081 555 0101', null, 'th', 'desk', joy, '2026-09-01 08:00+07'),
    ('d0000000-0000-4000-8000-000000001102', 1102, 'Mark', 'Hughes', '+44 7700 900123', 'mark.hughes@gmail.com', 'en', 'desk', joy, '2026-09-30 08:00+07'),
    ('d0000000-0000-4000-8000-000000001103', 1103, 'Sarah', 'Kim', '+82 10 5555 0199', 'sarah.kim@gmail.com', 'en', 'desk', joy, '2026-09-20 08:00+07'),
    ('d0000000-0000-4000-8000-000000001104', 1104, 'Arthit', 'Phrom', '089 555 0144', null, 'th', 'desk', tee, '2026-04-15 08:00+07')
  on conflict (id) do nothing;

  insert into public.credentials (member_id, kind, code) values
    ('d0000000-0000-4000-8000-000000001043', 'tag', '003909'),
    ('d0000000-0000-4000-8000-000000000957', 'tag', '000957'),
    ('d0000000-0000-4000-8000-000000001188', 'tag', '001877'),
    ('d0000000-0000-4000-8000-000000001101', 'tag', '004102'),
    ('d0000000-0000-4000-8000-000000001102', 'tag', '002231'),
    ('d0000000-0000-4000-8000-000000001103', 'tag', '003355'),
    ('d0000000-0000-4000-8000-000000001104', 'tag', '000871')
  on conflict (code) do nothing;

  if not exists (select 1 from public.memberships where member_id = 'd0000000-0000-4000-8000-000000001043') then
    insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id, created_by_staff) values
      ('d0000000-0000-4000-8000-000000001043', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31', null, 0, null, joy),
      ('d0000000-0000-4000-8000-000000001043', 'pt10', '10 PT sessions', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, sunman, joy),
      ('d0000000-0000-4000-8000-000000000957', '1m', '1 Month', 'membership', 2200, '2026-10-10', '2026-11-09', null, 0, null, null),
      ('d0000000-0000-4000-8000-000000001188', '1w', '1 Week', 'membership', 1200, '2026-10-03', '2026-10-09', null, 0, null, tee),
      ('d0000000-0000-4000-8000-000000001101', '10v', '10 Visits', 'visits', 2000, '2026-09-01', '2027-02-28', 10, 6, null, joy),
      ('d0000000-0000-4000-8000-000000001102', '1m', '1 Month', 'membership', 2200, '2026-09-30', '2026-10-29', null, 0, null, joy),
      ('d0000000-0000-4000-8000-000000001103', '3m', '3 Months', 'membership', 5400, '2026-09-23', '2026-11-22', null, 0, null, joy),
      ('d0000000-0000-4000-8000-000000001103', 'pt20', '20 PT sessions', 'pt', 27000, '2026-09-23', '2027-03-22', 20, 11, sunman, joy),
      ('d0000000-0000-4000-8000-000000001104', 'th6m', 'Thai 6 Months', 'membership', 6000, '2026-04-15', '2026-10-15', null, 0, null, tee),
      ('d0000000-0000-4000-8000-000000001104', 'pt10', '10 PT sessions', 'pt', 15000, '2026-08-01', '2026-11-30', 10, 8, aun, tee);
  end if;

  -- Two customers waiting at the counter (Ivan signs up live in the demo)
  if not exists (select 1 from public.signups where first_name in ('Ploy', 'Liam')) then
    insert into public.signups (first_name, last_name, phone, email, lang, waiver_version_id, signature_path, created_at) values
      ('Ploy', 'Srisuk', '081 234 5678', 'ploy.s@gmail.com', 'th', (select id from public.waiver_versions order by version desc limit 1), 'signatures/demo.png', now() - interval '6 minutes'),
      ('Liam', 'Carter', '+61 412 555 019', 'liam.c@outlook.com', 'en', (select id from public.waiver_versions order by version desc limit 1), 'signatures/demo.png', now() - interval '11 minutes');
  end if;
end $$;
