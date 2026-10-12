-- Phase 4 checks: the coach portal. Sunman sees Emma, Aun doesn't; programs are versioned; targets;
-- −1 from the portal with Undo; café picks (max 3); a nudge a day; leads and notes under RLS.
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
  ('00000000-0000-0000-0000-0000000000c1', 'sunman@superfitphuket.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'aun@superfitphuket.com');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'coach', 'Sunman Fitness'),
  ('00000000-0000-0000-0000-0000000000c2', 'coach', 'Aun');
insert into public.coaches (id, slug, name, full_name, user_id, portal) values
  ('00000000-0000-0000-0000-0000000000d1', 'sunman', 'Sunman', 'Sunman Fitness', '00000000-0000-0000-0000-0000000000c1', 'active'),
  ('00000000-0000-0000-0000-0000000000d2', 'aun', 'Aun', 'Aun', '00000000-0000-0000-0000-0000000000c2', 'active');
insert into public.staff (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Joy');
insert into public.plans (id, name, kind, price_thb, duration_months, sessions) values
  ('pt10', '10 PT sessions', 'pt', 15000, 4, 10), ('1m', '1 Month', 'membership', 2200, 1, null);
insert into public.members (id, first_name, last_name, phone, lang) values
  ('00000000-0000-0000-0000-0000000000e1', 'Emma', 'Wilson', '+44 7700 900456', 'en'),
  ('00000000-0000-0000-0000-0000000000e2', 'Ivan', 'Petrov', '+7 916 555 0142', 'ru');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'pt10', '10 PT sessions', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e1', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31', null, 0, null);
insert into public.leads (id, coach_id, member_id, name, phone, lang, source) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e2', 'Ivan Petrov', '+7 916 555 0142', 'ru', 'qr');
insert into public.menu_categories (id, name_en) values ('shakes', 'Shakes');
insert into public.menu_items (id, category_id, name_en, price_thb) values
  ('strong-vibes', 'shakes', 'Strong Vibes', 149), ('berry-hype', 'shakes', 'Berry Hype', 149),
  ('thick', 'shakes', 'Thick', 149), ('cyo-whey', 'shakes', 'Create your own: Whey', 90);
insert into public.workout_logs (id, member_id, day_name, started_at, finished_at, sets_done) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'Day A · Push', '2026-10-12 19:40+07', '2026-10-12 20:26+07', 16);
insert into public.set_logs (workout_log_id, exercise_name, set_no, kg, reps, is_pr) values
  ('00000000-0000-0000-0000-0000000000f1', 'Barbell bench press', 1, 40, 8, false),
  ('00000000-0000-0000-0000-0000000000f1', 'Barbell bench press', 2, 42.5, 8, true);
insert into public.daily_checkins (member_id, date, sleep_h, energy, weight_kg) values
  ('00000000-0000-0000-0000-0000000000e1', '2026-10-12', 7.5, 4, 64.1),
  ('00000000-0000-0000-0000-0000000000e1', '2026-10-11', 8, 4, null),
  ('00000000-0000-0000-0000-0000000000e1', '2026-10-09', 6.5, 3, 64.4);

set role authenticated;

-- Sunman: his home
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$
declare h jsonb := public.coach_home(); c jsonb;
begin
  perform pg_temp.ok(jsonb_array_length(h->'clients') = 1, 'Sunman has one client');
  c := h->'clients'->0;
  perform pg_temp.ok(c->>'name' = 'Emma Wilson' and (c->'pt'->>'left')::int = 6, 'Emma has 6 of 10 PT left');
  perform pg_temp.ok(c->'last_workout'->>'day_name' = 'Day A · Push' and (c->'last_workout'->'pr'->>'kg')::numeric = 42.5, 'her last workout shows the bench PR');
  perform pg_temp.ok((c->'checkin'->>'streak')::int = 2 and c->'checkin'->>'last' = '2026-10-12', 'her check-in streak is 2 days');
  perform pg_temp.ok(jsonb_array_length(h->'leads') = 1 and h->'leads'->0->>'lang' = 'ru', 'Ivan is his lead, in Russian');
end $$;

-- Aun can't see Emma
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.members where id = '00000000-0000-0000-0000-0000000000e1') = 0, 'Aun can''t read Emma');
select pg_temp.ok((select count(*) from public.leads) = 0, 'Aun can''t read Sunman''s leads');
select pg_temp.ok(jsonb_array_length(public.coach_home()->'clients') = 0, 'Aun has no clients');
do $$
begin
  perform public.coach_client('00000000-0000-0000-0000-0000000000e1');
  raise exception 'FAIL: Aun opened Emma';
exception when insufficient_privilege then
  perform pg_temp.ok(true, 'Aun can''t open Emma');
end $$;
do $$
begin
  perform public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'coach_portal');
  raise exception 'FAIL: Aun took Emma''s session';
exception when sqlstate 'P0001' or insufficient_privilege then
  perform pg_temp.ok(true, 'Aun can''t take a session off Sunman''s pack');
end $$;
do $$
begin
  insert into public.coach_notes (member_id, coach_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2', 'hi');
  raise exception 'FAIL: Aun wrote to Emma';
exception when insufficient_privilege then
  perform pg_temp.ok(true, 'Aun can''t write Emma a note');
end $$;

-- Sunman: program versions, targets, picks, nudge, notes, −1 and Undo
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$
declare a jsonb; b jsonb; t jsonb; u jsonb; c jsonb;
begin
  a := public.coach_send_program('00000000-0000-0000-0000-0000000000e1', '{"days":[{"name":"Day A · Push","items":[{"name":"Barbell bench press","sets":4,"reps":8}]}]}');
  b := public.coach_send_program('00000000-0000-0000-0000-0000000000e1', '{"days":[{"name":"Day A · Push","items":[{"name":"Barbell bench press","sets":4,"reps":8},{"name":"Cable fly","sets":3,"reps":12}]}]}');
  perform pg_temp.ok((a->>'version')::int = 1 and (b->>'version')::int = 2, 'each send is a new version');
  perform pg_temp.ok(jsonb_array_length((select body->'days'->0->'items' from public.program_versions where version = 1)) = 1, 'version 1 stays as it was sent');
  c := public.coach_client('00000000-0000-0000-0000-0000000000e1');
  perform pg_temp.ok((c->'program'->>'version')::int = 2, 'the workspace shows version 2');
  perform pg_temp.ok((c->'last'->'barbell bench press'->>'kg')::numeric = 42.5 and (c->'last'->'barbell bench press'->>'pr')::boolean, 'last time for the bench is 42.5 × 8, a PR');

  t := public.coach_set_targets('00000000-0000-0000-0000-0000000000e1', 'lose', 130, 180, 55, 3, 8000);
  perform pg_temp.ok((t->>'kcal')::int = 1735, '130 / 180 / 55 = 1,735 kcal');
  perform pg_temp.ok((public.coach_client('00000000-0000-0000-0000-0000000000e1')->'targets'->>'kcal')::int = 1735, 'the workspace shows the new targets');

  perform public.coach_set_picks('00000000-0000-0000-0000-0000000000e1', array['strong-vibes', 'cyo-whey', 'thick']);
  perform public.coach_set_picks('00000000-0000-0000-0000-0000000000e1', array['strong-vibes', 'cyo-whey']);
  perform pg_temp.ok(jsonb_array_length(public.coach_client('00000000-0000-0000-0000-0000000000e1')->'picks') = 2, 'two café picks pinned');
  begin
    perform public.coach_set_picks('00000000-0000-0000-0000-0000000000e1', array['strong-vibes', 'cyo-whey', 'thick', 'berry-hype']);
    raise exception 'FAIL: four picks';
  exception when sqlstate 'P0001' then
    perform pg_temp.ok(sqlerrm = 'Pin up to 3 café items.', 'no more than 3 café picks');
  end;

  perform pg_temp.ok((public.coach_nudge('00000000-0000-0000-0000-0000000000e1')->>'sent')::boolean, 'a nudge goes out');
  perform pg_temp.ok(not (public.coach_nudge('00000000-0000-0000-0000-0000000000e1')->>'sent')::boolean, 'one nudge a day');

  insert into public.coach_notes (member_id, coach_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Great week, keep the sleep up.');
  perform pg_temp.ok(jsonb_array_length(public.coach_client('00000000-0000-0000-0000-0000000000e1')->'notes') = 1, 'Sunman''s note is saved');

  u := public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'coach_portal');
  perform pg_temp.ok((u->>'left')::int = 5, '−1 from the portal: 6 → 5');
  perform public.undo_pt_session((u->>'session_id')::uuid);
  perform pg_temp.ok((public.coach_home()->'clients'->0->'pt'->>'left')::int = 6, 'Undo puts it back to 6');
  u := public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'coach_portal');
  perform pg_temp.ok((u->>'left')::int = 5, '−1 again: 5 left');
end $$;

-- Leads: stage changes only; own exercises
update public.leads set stage = 'contacted' where id = '00000000-0000-0000-0000-0000000000a9';
select pg_temp.ok((select stage from public.leads where id = '00000000-0000-0000-0000-0000000000a9') = 'contacted', 'Sunman moves Ivan to Contacted');
do $$
begin
  update public.leads set coach_id = '00000000-0000-0000-0000-0000000000d2' where id = '00000000-0000-0000-0000-0000000000a9';
  raise exception 'FAIL: lead moved to another coach';
exception when insufficient_privilege then
  perform pg_temp.ok(true, 'a coach can''t hand a lead to someone else');
end $$;
insert into public.exercises (name, muscle_group, equipment, log_type, coach_id) values ('Landmine press', 'shoulders', 'Barbell', 'weight_reps', '00000000-0000-0000-0000-0000000000d1');
select pg_temp.ok((select count(*) from public.exercises where name = 'Landmine press') = 1, 'Sunman adds his own exercise');
do $$
begin
  insert into public.exercises (name, muscle_group, equipment, log_type, coach_id) values ('Fake', 'core', 'None', 'reps', null);
  raise exception 'FAIL: coach added to the SUPER1 library';
exception when insufficient_privilege then
  perform pg_temp.ok(true, 'only Pete adds to the SUPER1 library');
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.exercises where name = 'Landmine press') = 0, 'Aun doesn''t see Sunman''s own exercises');

reset role;
select pg_temp.ok((select message from public.activity where kind = 'pt.used' order by id desc limit 1) like 'PT session with Sunman%', 'the desk feed says "PT session with Sunman"');
select pg_temp.ok((select count(*) from public.outbox where kind = 'program_push') = 2, 'each program send tells the member');
