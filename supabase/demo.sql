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

-- Sunman's coaching data for the coach portal demo (C02–C07): Emma's program v1, workouts, daily
-- check-ins (no check-in on Mon 5 Oct), Sarah's quiet week, and Kate, a lead from the desk.
do $$
declare
  sunman uuid := (select id from public.coaches where slug = 'sunman');
  emma uuid := 'd0000000-0000-4000-8000-000000001043';
  sarah uuid := 'd0000000-0000-4000-8000-000000001103';
  prog uuid;
  w uuid;
  ex jsonb := (select jsonb_object_agg(slug, jsonb_build_object('exercise_id', id, 'name', name, 'muscle', muscle, 'equipment', equipment, 'log_type', log_type))
               from public.exercises where coach_id is null);
begin
  if sunman is null or exists (select 1 from public.programs where member_id = emma) then return; end if;

  insert into public.programs (member_id, coach_id, name) values (emma, sunman, 'Program') returning id into prog;
  insert into public.program_versions (program_id, version, body, sent_at) values (prog, 1, jsonb_build_object('days', jsonb_build_array(
    jsonb_build_object('name', 'Day A · Push', 'items', jsonb_build_array(
      ex->'barbell-bench-press' || '{"sets":4,"reps":8,"rest_s":120,"cue":"Shoulder blades back, pause on the chest."}',
      ex->'incline-dumbbell-press' || '{"sets":3,"reps":10,"rest_s":90}',
      ex->'cable-fly' || '{"sets":3,"reps":12,"rest_s":60}',
      ex->'arnold-press' || '{"sets":3,"reps":10,"rest_s":90}',
      ex->'rope-pushdown' || '{"sets":3,"reps":12,"rest_s":60}')),
    jsonb_build_object('name', 'Day B · Pull', 'items', jsonb_build_array(
      ex->'lat-pulldown' || '{"sets":4,"reps":10,"rest_s":90}',
      ex->'barbell-row' || '{"sets":4,"reps":8,"rest_s":120}')),
    jsonb_build_object('name', 'Day C · Legs', 'items', jsonb_build_array(
      ex->'back-squat' || '{"sets":4,"reps":8,"rest_s":150}',
      ex->'leg-press' || '{"sets":3,"reps":12,"rest_s":90}',
      ex->'romanian-deadlift' || '{"sets":3,"reps":10,"rest_s":120}'))
  )), '2026-10-11 18:00+07');

  insert into public.workout_logs (member_id, day_name, started_at, finished_at, sets_done) values
    (emma, 'Day B · Pull', '2026-10-08 19:30+07', '2026-10-08 20:14+07', 16) returning id into w;
  insert into public.set_logs (workout_log_id, exercise_id, exercise_name, set_no, kg, reps) values
    (w, (ex->'lat-pulldown'->>'exercise_id')::uuid, 'Lat pulldown', 1, 35, 10);
  insert into public.workout_logs (member_id, day_name, started_at, finished_at, sets_done) values
    (emma, 'Day C · Legs', '2026-10-10 10:00+07', '2026-10-10 10:52+07', 22);
  insert into public.workout_logs (member_id, day_name, started_at, finished_at, sets_done, volume_kg) values
    (emma, 'Day A · Push', '2026-10-12 19:40+07', '2026-10-12 20:26+07', 16, 2860) returning id into w;
  insert into public.set_logs (workout_log_id, exercise_id, exercise_name, set_no, kg, reps, is_pr) values
    (w, (ex->'barbell-bench-press'->>'exercise_id')::uuid, 'Barbell bench press', 1, 40, 8, false),
    (w, (ex->'barbell-bench-press'->>'exercise_id')::uuid, 'Barbell bench press', 2, 42.5, 8, true),
    (w, (ex->'incline-dumbbell-press'->>'exercise_id')::uuid, 'Incline dumbbell press', 1, 14, 10, false),
    (w, (ex->'cable-fly'->>'exercise_id')::uuid, 'Cable fly', 1, 10, 12, false),
    (w, (ex->'arnold-press'->>'exercise_id')::uuid, 'Arnold press', 1, 12, 9, false),
    (w, (ex->'rope-pushdown'->>'exercise_id')::uuid, 'Rope pushdown', 1, 15, 12, false);
  insert into public.workout_logs (member_id, day_name, started_at, finished_at, sets_done) values
    (sarah, 'Day B', '2026-10-10 08:00+07', '2026-10-10 08:50+07', 18);

  insert into public.daily_checkins (member_id, date, sleep_h, energy, digestion, water_l, steps, weight_kg, note) values
    (emma, '2026-10-12', 7.5, 4, 4, 3, 9840, 64.1, 'Bench PR today'),
    (emma, '2026-10-11', 8, 4, 4, 2.5, 6210, null, null),
    (emma, '2026-10-10', 7, 3, 4, 2.5, 11430, 64.3, 'Legs were heavy'),
    (emma, '2026-10-09', 6.5, 3, 3, 2, 7950, null, 'Late night'),
    (emma, '2026-10-08', 7.5, 4, 4, 3, 8600, 64.4, null),
    (emma, '2026-10-07', 7, 4, 4, 2.5, 7120, null, null),
    (emma, '2026-10-06', 7.5, 5, 5, 3, 9010, 64.6, 'Felt great'),
    (emma, '2026-10-04', 7, 4, 4, 2.5, 8100, 64.8, null),
    (emma, '2026-10-03', 7.5, 4, 4, 2.5, 7600, 64.8, null),
    (sarah, '2026-10-09', 7, 3, 4, 2, 6400, 58.2, null)
  on conflict (member_id, date) do nothing;

  insert into public.nutrition_targets (member_id, coach_id, goal, protein_g, carbs_g, fat_g, water_l, steps, sent_at)
  values (emma, sunman, 'lose', 120, 170, 55, 3, 8000, '2026-10-11 18:05+07');

  insert into public.leads (coach_id, name, phone, email, lang, source, stage, note, created_at) values
    (sunman, 'Kate Morgan', '+44 7700 900812', 'kate.morgan@icloud.com', 'en', 'desk', 'trial', 'free intro Sat 17 Oct 09:00 · glutes and core', '2026-10-09 17:00+07');
end $$;
