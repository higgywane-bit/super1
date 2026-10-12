-- Scenario tests for 0001_init.sql, using the people from the mock-up. Run with scripts/db-test.sh.
-- Every check raises an exception on failure, so psql stops with ON_ERROR_STOP=1.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
\pset footer off
set super1.test_today = '2026-10-12';

create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;

create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
end $$;

-- ------------------------------------------------------------------ seed (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'higgywane@gmail.com'),
  ('00000000-0000-0000-0000-00000000a002', 'andy@superfitphuket.com'),
  ('00000000-0000-0000-0000-00000000a003', 'desk@superfitphuket.com'),
  ('00000000-0000-0000-0000-00000000a004', 'sunman@superfitphuket.com'),
  ('00000000-0000-0000-0000-00000000a005', 'emma.wilson@gmail.com'),
  ('00000000-0000-0000-0000-00000000a006', 'aun@superfitphuket.com');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'admin', 'Pete'),
  ('00000000-0000-0000-0000-00000000a002', 'owner', 'Andy'),
  ('00000000-0000-0000-0000-00000000a003', 'desk', 'Front desk'),
  ('00000000-0000-0000-0000-00000000a004', 'coach', 'Sunman Fitness'),
  ('00000000-0000-0000-0000-00000000a005', 'member', 'Emma Wilson'),
  ('00000000-0000-0000-0000-00000000a006', 'coach', 'Aun');
insert into public.staff (id, name, qashier_name) values
  ('00000000-0000-0000-0000-0000000000b1', 'Joy', 'joy'), ('00000000-0000-0000-0000-0000000000b2', 'Tee', null), ('00000000-0000-0000-0000-0000000000b3', 'Jeab', null);
insert into public.coaches (id, slug, name, user_id, portal) values
  ('00000000-0000-0000-0000-0000000000c1', 'sunman', 'Sunman', '00000000-0000-0000-0000-00000000a004', 'active'),
  ('00000000-0000-0000-0000-0000000000c2', 'aun', 'Aun', '00000000-0000-0000-0000-00000000a006', 'active');
insert into public.plans (id, name, kind, price_thb, duration_days, duration_months, sessions, qashier_product) values
  ('day', 'Day Pass', 'membership', 250, 1, null, null, 'Day Pass (วันหนึ่ง)'),
  ('1w', '1 Week', 'membership', 1200, 7, null, null, '1 Week (1 สัปดาห์)'),
  ('1m', '1 Month', 'membership', 2200, null, 1, null, '1 Month (1 เดือน)'),
  ('10v', '10 Visits', 'visits', 2000, null, 6, 10, '10 Visit Pack (แพ็กเกจ 10 ครั้ง)'),
  ('pt10', '10 PT sessions', 'pt', 15000, null, 4, 10, 'SUPERCOACH');
insert into public.waiver_versions (version, texts) values (1, '{"en":["I train at my own risk."],"th":["ฉันออกกำลังกายโดยยอมรับความเสี่ยงเอง"],"ru":["Я тренируюсь на свой риск."]}');

-- Emma #1043-ish: 1 Month Thu 1 Oct -> Sat 31 Oct, tag 003909, 10 PT with Sunman, 4 used
insert into public.members (id, first_name, last_name, email, user_id, created_via) values
  ('00000000-0000-0000-0000-0000000000e1', 'Emma', 'Wilson', 'emma.wilson@gmail.com', '00000000-0000-0000-0000-00000000a005', 'qr');
insert into public.credentials (member_id, kind, code) values ('00000000-0000-0000-0000-0000000000e1', 'tag', '003909');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000e1', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'pt10', '10 PT sessions', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, '00000000-0000-0000-0000-0000000000c1');

-- Natalia #0957 (the real one, active) and #1188 (duplicate made at the desk, 1 Week ended Fri 9 Oct)
insert into public.members (id, first_name, last_name, phone) values
  ('00000000-0000-0000-0000-0000000000f1', 'Natalia', 'Orlova', '+7 999 555 0123'),
  ('00000000-0000-0000-0000-0000000000f2', 'Natalia', 'Orlova', '+7 999 555 0123');
insert into public.credentials (member_id, kind, code) values
  ('00000000-0000-0000-0000-0000000000f1', 'tag', '000957'), ('00000000-0000-0000-0000-0000000000f2', 'tag', '001877');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000f1', '1m', '1 Month', 'membership', 2200, '2026-10-10', '2026-11-09'),
  ('00000000-0000-0000-0000-0000000000f2', '1w', '1 Week', 'membership', 1200, '2026-10-03', '2026-10-09');

-- Somchai: 10 Visits with 4 left
insert into public.members (id, first_name, last_name) values ('00000000-0000-0000-0000-0000000000d1', 'Somchai', 'Kittisak');
insert into public.credentials (member_id, kind, code) values ('00000000-0000-0000-0000-0000000000d1', 'tag', '004102');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used) values
  ('00000000-0000-0000-0000-0000000000d1', '10v', '10 Visits', 'visits', 2000, '2026-09-01', '2027-02-28', 10, 6);

-- ------------------------------------------------------------------ pure rules
select pg_temp.ok(public.plan_end_date('2026-10-01', null, 1) = '2026-10-31', 'plan_end_date: 1 Month from Thu 1 Oct ends Sat 31 Oct');
select pg_temp.ok(public.plan_end_date('2026-01-31', null, 1) = '2026-02-28', 'plan_end_date: 31 Jan + 1 month ends 28 Feb');
select pg_temp.ok(public.plan_end_date('2026-01-28', null, 1) = '2026-02-27', 'plan_end_date: 28 Jan + 1 month ends 27 Feb');
select pg_temp.ok(public.plan_end_date('2026-10-03', 7, null) = '2026-10-09', 'plan_end_date: 1 Week from Sat 3 Oct ends Fri 9 Oct');
select pg_temp.ok(public.normalize_code(' k7m2-q9pX ') = 'K7M2Q9PX' and public.normalize_code('OIL') = '011', 'normalize_code');

-- ------------------------------------------------------------------ the desk
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a003');

select pg_temp.ok((public.desk_check_in('003909')->>'allowed')::boolean, 'Emma scans in');
select pg_temp.ok((public.member_card('00000000-0000-0000-0000-0000000000e1')->>'days_left')::int = 19, 'Emma has 19 days left');
select pg_temp.ok((public.member_card('00000000-0000-0000-0000-0000000000e1')->>'pt_left')::int = 6, 'Emma has 6 PT sessions left');
select pg_temp.ok((public.desk_check_in('003909')->>'duplicate')::boolean, 'second scan within 120 s is the same visit');
select pg_temp.ok((select count(*) from public.checkins where code = '003909') = 1, 'only one check-in row for the double scan');

select pg_temp.ok(public.desk_check_in('001877')->>'reason' = 'expired', 'Natalia #1188 is declined: expired');
select pg_temp.ok(public.desk_check_in('999999')->>'reason' = 'unknown-code', 'unknown tag is declined');

select pg_temp.ok((public.desk_check_in('004102')->>'consumed_visit')::boolean, 'Somchai uses a visit');
select pg_temp.ok((select sessions_used from public.memberships where plan_id = '10v') = 7, '10 Visits: 4 left -> 3 left');

-- Sell a renewal to Emma: queues after Sat 31 Oct
do $$
declare r jsonb;
begin
  r := public.desk_sell('00000000-0000-0000-0000-0000000000e1', '1m', 'card', '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.ok(r->>'starts_on' = '2026-11-01' and r->>'ends_on' = '2026-11-30' and (r->>'queued')::boolean, 'renewal queues Sun 1 Nov -> Mon 30 Nov');
end $$;
select pg_temp.ok((public.member_card('00000000-0000-0000-0000-0000000000e1')->>'days_left')::int = 49, 'cover now runs to 30 Nov: 49 days left');

do $$
begin
  perform public.desk_sell('00000000-0000-0000-0000-0000000000e1', '1m', 'card', null);
  raise exception 'FAIL: sold without staff';
exception when others then
  perform pg_temp.ok(sqlerrm like 'Pick who is on shift%', 'selling needs the staff on shift');
end $$;

-- Pause Thu 15 -> Wed 21 Oct (7 days): running plan extends, queued renewal moves back
do $$
declare v_pause uuid; a date; b date; c date;
begin
  v_pause := public.pause_member('00000000-0000-0000-0000-0000000000e1', '2026-10-15', '2026-10-21', '00000000-0000-0000-0000-0000000000b1', 'Travel');
  select ends_on into a from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1' and kind = 'membership' and starts_on = '2026-10-01';
  select starts_on, ends_on into b, c from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1' and kind = 'membership' and starts_on > '2026-10-01';
  perform pg_temp.ok(a = '2026-11-07' and b = '2026-11-08' and c = '2026-12-07', 'pause: 31 Oct -> 7 Nov, renewal 8 Nov -> 7 Dec, no overlap');
  perform set_config('super1.test_today', '2026-10-16', false);
  perform pg_temp.ok(public.desk_check_in('003909')->>'reason' = 'paused', 'declined at the door while paused');
  perform set_config('super1.test_today', '2026-10-12', false);
  perform public.end_pause(v_pause, '2026-10-18', '00000000-0000-0000-0000-0000000000b1');
  select ends_on into a from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1' and kind = 'membership' and starts_on = '2026-10-01';
  select starts_on, ends_on into b, c from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1' and kind = 'membership' and starts_on > '2026-10-01';
  perform pg_temp.ok(a = '2026-11-03' and b = '2026-11-04' and c = '2026-12-03', 'back 4 days early: 4 days given back to both plans');
  perform pg_temp.ok((select until_date from public.member_pauses where id = v_pause) = '2026-10-17', 'pause now ends Sat 17 Oct');
end $$;

-- PT at the desk
do $$
declare r jsonb;
begin
  r := public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'desk', '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.ok((r->>'left')::int = 5, 'desk logs a PT session: 6 -> 5');
  perform public.undo_pt_session((r->>'session_id')::uuid, '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.ok((public.member_card('00000000-0000-0000-0000-0000000000e1')->>'pt_left')::int = 6, 'undo puts it back to 6, the row stays');
  perform pg_temp.ok((select count(*) from public.pt_sessions where undone_at is not null) = 1, 'undone session is kept, marked undone');
end $$;

-- Merge request from the desk
select pg_temp.ok(public.request_merge('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b2', 'Same phone') is not null, 'Tee asks Pete to merge Natalia');
do $$
begin
  perform public.merge_members((select id from public.merge_requests limit 1));
  raise exception 'FAIL: desk merged';
exception when others then
  perform pg_temp.ok(sqlerrm = 'Only Pete can merge.', 'the desk cannot merge');
end $$;

-- Nothing is deleted, history is not rewritten
do $$
begin
  delete from public.checkins;
  raise exception 'FAIL: delete worked';
exception when others then
  perform pg_temp.ok(sqlerrm like '%permission denied%' or sqlerrm like 'SUPER1 never deletes%', 'desk cannot delete check-ins');
end $$;
reset role;
do $$
begin
  delete from public.members where first_name = 'Natalia';
  raise exception 'FAIL: delete worked';
exception when others then
  perform pg_temp.ok(sqlerrm like 'SUPER1 never deletes%', 'even the database owner cannot delete a member');
end $$;
do $$
begin
  update public.checkins set result = 'allowed' where code = '001877';
  raise exception 'FAIL: update worked';
exception when others then
  perform pg_temp.ok(sqlerrm like 'SUPER1 history rows are written once%', 'a check-in can never be rewritten');
end $$;
do $$
begin
  update public.memberships set price_thb = 0 where plan_id = '1w';
  raise exception 'FAIL: update worked';
exception when others then
  perform pg_temp.ok(sqlerrm like 'A sold membership keeps%', 'a sold membership keeps its price');
end $$;

-- ------------------------------------------------------------------ the counter QR (no login)
set role anon;
select pg_temp.as_user(null);
select pg_temp.ok(jsonb_array_length(public.join_options()->'coaches') = 2, 'join page lists the coaches on the QR');
do $$
declare r jsonb;
begin
  r := public.create_signup('{"first_name":"Ivan","last_name":"Petrov","phone":"+7 916 555 0142","email":"Ivan.Petrov@mail.ru","lang":"ru","coach_id":"00000000-0000-0000-0000-0000000000c1","agreed":true,"signature_path":"signatures/ivan.png"}');
  perform pg_temp.ok(r->>'coach' = 'Sunman', 'Ivan signs up and picks Sunman');
end $$;
select pg_temp.ok((select count(*) from public.members) = 0, 'anon cannot read members');
select pg_temp.ok((select count(*) from public.signups) = 0, 'anon cannot read sign-ups');
reset role;

-- ------------------------------------------------------------------ the desk finishes Ivan's sign-up
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a003');
select pg_temp.ok((select count(*) from public.signups where status = 'waiting') = 1, 'Ivan is waiting at the counter');
do $$
declare r jsonb; v_member uuid;
begin
  r := public.desk_complete_signup((select id from public.signups where first_name = 'Ivan'), '004417', '1m', 'card', '00000000-0000-0000-0000-0000000000b1');
  v_member := (r->>'member_id')::uuid;
  perform pg_temp.ok(r->'sale'->>'starts_on' = '2026-10-12' and r->'sale'->>'ends_on' = '2026-11-11', 'Ivan: 1 Month Mon 12 Oct -> Wed 11 Nov');
  perform pg_temp.ok((select count(*) from public.leads where member_id = v_member and stage = 'new') = 1, 'Sunman gets Ivan as a new lead');
  perform pg_temp.ok((select email from public.invites where member_id = v_member) = 'ivan.petrov@mail.ru', 'app invite queued to his email');
  perform pg_temp.ok((select count(*) from public.activity where member_id = v_member and staff_id is not null) >= 2, 'every desk change on Ivan names Joy');
end $$;
select pg_temp.ok((public.desk_check_in('004417')->>'allowed')::boolean, 'Ivan scans in with his new tag');
reset role;

-- ------------------------------------------------------------------ an existing member links the app at the counter
set role anon;
select pg_temp.as_user(null);
select pg_temp.ok((public.create_signup('{"kind":"link","first_name":"Mark","last_name":"Hughes","email":"mark.h@example.com","lang":"en","link_tag":"002231","agreed":true,"signature_path":"signatures/mark.png"}')->>'id') is not null, 'Mark asks to link tag 002231');
reset role;
insert into public.members (id, first_name, last_name) values ('00000000-0000-0000-0000-0000000000a9', 'Mark', 'Hughes');
insert into public.credentials (member_id, kind, code) values ('00000000-0000-0000-0000-0000000000a9', 'tag', '002231');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a003');
select pg_temp.ok(public.desk_complete_link((select id from public.signups where first_name = 'Mark'), '00000000-0000-0000-0000-0000000000b3')->>'email' = 'mark.h@example.com', 'Jeab confirms it''s Mark: email saved, invite queued');
reset role;

-- ------------------------------------------------------------------ Pete merges Natalia
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.ok((public.merge_members((select id from public.merge_requests limit 1))->>'kept')::uuid = '00000000-0000-0000-0000-0000000000f1', 'Pete merges #1188 into #0957');
select pg_temp.as_user('00000000-0000-0000-0000-00000000a003');
select pg_temp.ok((public.desk_check_in('001877')->>'allowed')::boolean, 'her old tag 001877 now scans her in as #0957');
select pg_temp.ok((select count(*) from public.memberships where member_id = '00000000-0000-0000-0000-0000000000f2') = 1, 'the duplicate''s plan was not moved or rewritten');
reset role;

-- ------------------------------------------------------------------ coaches see only their people
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a004');
select pg_temp.ok((select count(*) from public.members) = 2, 'Sunman sees Emma (client) and Ivan (lead), nobody else');
select pg_temp.ok((select count(*) from public.sales) = 0, 'coaches never see sales');
do $$
declare r jsonb;
begin
  r := public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'coach_counter');
  perform pg_temp.ok((r->>'left')::int = 5, 'Sunman takes a session in counter mode: 6 -> 5');
  r := public.coach_send_program('00000000-0000-0000-0000-0000000000e1', '{"days":[{"name":"Day A · Push","items":[]}]}');
  perform pg_temp.ok((r->>'version')::int = 1, 'Sunman sends Emma a program, version 1');
  r := public.coach_set_targets('00000000-0000-0000-0000-0000000000e1', 'lose', 130, 180, 55, 3, 8000);
  perform pg_temp.ok((r->>'kcal')::int = 1735, 'macro targets: 130 P / 180 C / 55 F = 1,735 kcal');
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a006');
select pg_temp.ok((select count(*) from public.members) = 0, 'Aun sees none of Sunman''s people');
do $$
begin
  perform public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'coach_counter');
  raise exception 'FAIL: Aun used Sunman''s pack';
exception when others then
  perform pg_temp.ok(sqlerrm = 'No PT sessions left on a valid pack.', 'Aun cannot take a session off Sunman''s client');
end $$;
reset role;

-- ------------------------------------------------------------------ members see only themselves
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a005');
select pg_temp.ok((select count(*) from public.members) = 1, 'Emma sees only herself');
select pg_temp.ok((select count(*) from public.memberships) = 3, 'Emma sees her 1 Month, her renewal and her PT pack');
select pg_temp.ok((select count(*) from public.program_versions) = 1, 'Emma sees the program Sunman sent');
select pg_temp.ok((select kcal from public.nutrition_targets limit 1) = 1735, 'Emma sees her targets');
insert into public.daily_checkins (member_id, date, sleep_h, energy, digestion, water_l, steps, weight_kg) values ('00000000-0000-0000-0000-0000000000e1', '2026-10-12', 7.5, 4, 4, 3, 9840, 64.1);
select pg_temp.ok((select count(*) from public.daily_checkins) = 1, 'Emma logs her daily check-in');
do $$
begin
  insert into public.daily_checkins (member_id, date, sleep_h) values ('00000000-0000-0000-0000-0000000000d1', '2026-10-12', 8);
  raise exception 'FAIL: wrote for someone else';
exception when others then
  perform pg_temp.ok(sqlerrm like '%row-level security%', 'Emma cannot write someone else''s check-in');
end $$;
reset role;

-- ------------------------------------------------------------------ Andy reads, never writes
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a002');
select pg_temp.ok((select count(*) from public.sales) = 2, 'Andy sees the 2 sales the desk logged (Emma''s renewal, Ivan)');
do $$
begin
  update public.plans set price_thb = 1 where id = '1m';
  perform pg_temp.ok((select price_thb from public.plans where id = '1m') = 2200, 'Andy cannot change prices');
end $$;
do $$
begin
  perform public.desk_sell('00000000-0000-0000-0000-0000000000e1', '1m', 'card', '00000000-0000-0000-0000-0000000000b1');
  raise exception 'FAIL: owner sold';
exception when others then
  perform pg_temp.ok(sqlerrm = 'not allowed', 'Andy cannot sell at the desk');
end $$;
reset role;

select 'all scenario checks passed' as result;
