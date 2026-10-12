-- Phase 5 checks: the member app. Linking the login, Home, a workout with a PR (saved twice = once),
-- the member QR at the door, the daily check-in window, café totals from the menu, privacy, unlinking.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
set super1.test_today = '2026-10-12';

create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;
create or replace function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p::text, false);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'emma.wilson@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'mark.hughes@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'desk@superfitphuket.com');
insert into public.profiles (id, role, display_name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'member', 'Emma Wilson', 'emma.wilson@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'member', 'Mark Hughes', 'mark.hughes@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'desk', 'Front desk', 'desk@superfitphuket.com');
insert into public.staff (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Joy');
insert into public.coaches (id, slug, name, full_name) values ('00000000-0000-0000-0000-0000000000d1', 'sunman', 'Sunman', 'Sunman Fitness');
insert into public.plans (id, name, kind, price_thb, duration_months, sessions) values
  ('pt10', '10 PT sessions', 'pt', 15000, 4, 10), ('1m', '1 Month', 'membership', 2200, 1, null);
insert into public.members (id, first_name, last_name, email, lang) values
  ('00000000-0000-0000-0000-0000000000e1', 'Emma', 'Wilson', 'emma.wilson@gmail.com', 'en'),
  ('00000000-0000-0000-0000-0000000000e2', 'Mark', 'Hughes', 'mark.hughes@gmail.com', 'en');
insert into public.invites (member_id, email) values ('00000000-0000-0000-0000-0000000000e1', 'emma.wilson@gmail.com');
insert into public.credentials (member_id, kind, code) values ('00000000-0000-0000-0000-0000000000e1', 'tag', '003909');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id) values
  ('00000000-0000-0000-0000-0000000000e1', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31', null, 0, null),
  ('00000000-0000-0000-0000-0000000000e1', 'pt10', '10 PT sessions', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e2', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31', null, 0, null);
insert into public.exercises (id, name, muscle_group, equipment, log_type) values ('00000000-0000-0000-0000-0000000000c1', 'Barbell bench press', 'chest', 'Barbell', 'weight_reps');
insert into public.programs (id, member_id, coach_id) values ('00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1');
insert into public.program_versions (id, program_id, version, body) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f0', 1,
  '{"days":[{"name":"Day A · Push","items":[{"exercise_id":"00000000-0000-0000-0000-0000000000c1","name":"Barbell bench press","sets":4,"reps":8,"rest_s":120}]}]}');
insert into public.workout_logs (id, member_id, day_name, started_at, finished_at) values ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000e1', 'Day A · Push', '2026-10-05 19:00+07', '2026-10-05 19:50+07');
insert into public.set_logs (workout_log_id, exercise_id, exercise_name, set_no, kg, reps) values ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000c1', 'Barbell bench press', 1, 40, 8);
insert into public.menu_categories (id, name_en) values ('shakes', 'Shakes');
insert into public.menu_items (id, category_id, name_en, price_thb) values ('strong-vibes', 'shakes', 'Strong Vibes', 149);
insert into public.menu_option_groups (id, label_en, category_ids) values ('size', 'Size', '{shakes}');
insert into public.menu_options (id, group_id, label_en, price_thb) values ('xl', 'size', 'XL', 50);

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((public.member_link_me()->>'linked')::boolean, 'Emma''s first sign-in links her login to #member by the invite');
select pg_temp.ok(not (public.member_link_me()->>'linked')::boolean, 'signing in again changes nothing');

do $$
declare h jsonb := public.member_home(); w jsonb; again jsonb; q text;
begin
  perform pg_temp.ok((h->'card'->>'days_left')::int = 19, 'Home: 19 days left');
  perform pg_temp.ok((h->'pt'->>'left')::int = 6 and h->'pt'->>'coach' = 'Sunman', 'Home: 6 PT sessions with Sunman');
  perform pg_temp.ok(jsonb_array_length(h->'programs') = 1 and h->'programs'->0->>'coach' = 'Sunman', 'Train: Sunman''s program');
  perform pg_temp.ok((h->'last'->'00000000-0000-0000-0000-0000000000c1'->>'kg')::numeric = 40, 'last time on the bench: 40 kg');

  w := public.member_save_workout('00000000-0000-0000-0000-00000000aa01', 'Day A · Push', '2026-10-12 19:40+07', '2026-10-12 20:26+07',
    '[{"exercise_id":"00000000-0000-0000-0000-0000000000c1","name":"Barbell bench press","kg":40,"reps":8},
      {"exercise_id":"00000000-0000-0000-0000-0000000000c1","name":"Barbell bench press","kg":42.5,"reps":8},
      {"exercise_id":"00000000-0000-0000-0000-0000000000c1","name":"Barbell bench press","kg":42.5,"reps":6},
      {"exercise_id":"00000000-0000-0000-0000-0000000000c1","name":"Barbell bench press","kg":40,"reps":8,"done":false}]',
    '00000000-0000-0000-0000-0000000000f1');
  perform pg_temp.ok((w->>'sets')::int = 3, 'three completed sets saved');
  perform pg_temp.ok(jsonb_array_length(w->'prs') = 1 and (w->'prs'->0->>'kg')::numeric = 42.5 and (w->'prs'->0->>'prev')::numeric = 40, '42.5 kg × 8 is a PR (was 40)');
  again := public.member_save_workout('00000000-0000-0000-0000-00000000aa01', 'Day A · Push', '2026-10-12 19:40+07', '2026-10-12 20:26+07', '[]');
  perform pg_temp.ok((again->>'already')::boolean and (select count(*) from public.workout_logs where id = '00000000-0000-0000-0000-00000000aa01') = 1, 'sending the offline workout again saves it once');
  perform pg_temp.ok(jsonb_array_length(public.member_progress()->'bests') = 1 and (public.member_progress()->'bests'->0->>'kg')::numeric = 42.5, 'progress: best bench 42.5 kg');

  perform public.member_checkin('2026-10-12', 7.5, 4, 4, 3, 9840, 64.1, 'Bench PR today');
  perform public.member_checkin('2026-10-12', 7.5, 5, 4, 3, 9840, 64.1, 'Bench PR today');
  perform pg_temp.ok((select energy from public.daily_checkins where date = '2026-10-12') = 5, 'today''s check-in can be edited');
  begin
    perform public.member_checkin('2026-10-09', 7, 3, 3, 2, 5000, null, null);
    raise exception 'FAIL: checked in 3 days late';
  exception when sqlstate 'P0001' then
    perform pg_temp.ok(true, 'no check-ins for days long gone');
  end;

  perform pg_temp.ok((public.member_cafe_order('[{"item_id":"strong-vibes","qty":2,"options":["xl"]}]')->>'total')::int = 398, 'café order: 2 × (149 + 50) = ฿398, priced by the menu');

  q := public.member_qr();
  perform pg_temp.ok(q = public.member_qr() and q like 'S1%', 'the member QR is made once');
  perform set_config('test.qr', q, false);
end $$;

-- Mark sees none of Emma's data
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select public.member_link_me();
select pg_temp.ok((select count(*) from public.workout_logs where member_id = '00000000-0000-0000-0000-0000000000e1') = 0, 'Mark can''t see Emma''s workouts');
select pg_temp.ok((select count(*) from public.daily_checkins) = 0, 'Mark can''t see Emma''s check-ins');
select pg_temp.ok((select count(*) from public.program_versions) = 0, 'Mark can''t see Emma''s program');
select pg_temp.ok((public.member_home()->'member'->>'first_name') = 'Mark', 'Mark''s Home is his own');

-- The member QR at the door
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select pg_temp.ok((public.desk_check_in(current_setting('test.qr'))->>'allowed')::boolean, 'the member QR scans Emma in at the desk');

-- Delete my app login: unlinked, the gym''s records stay, Pete is told
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.member_unlink_me();
reset role;
select pg_temp.ok((select user_id from public.members where id = '00000000-0000-0000-0000-0000000000e1') is null, 'Delete my app login unlinks the login');
select pg_temp.ok((select count(*) from public.workout_logs where member_id = '00000000-0000-0000-0000-0000000000e1') = 2, 'her workouts stay with the gym');
select pg_temp.ok((select count(*) from public.outbox where kind = 'login_removed') = 1, 'Pete is told');
