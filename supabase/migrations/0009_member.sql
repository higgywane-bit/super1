-- Phase 5 · Member app (M01–M13). The member reads and writes only their own merge group (is_my_member);
-- these functions add the rules: linking the login on first sign-in, the member QR, saving a workout
-- (idempotent, so an offline workout can be sent twice), PRs, the daily check-in window, café totals.

-- First sign-in: link this login to the member it was invited as (invites.email, else members.email).
create or replace function public.member_link_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text; v_member uuid; v_root uuid;
begin
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  v_root := public.my_member_root();
  if v_root is not null then return jsonb_build_object('member_id', v_root, 'linked', false); end if;
  select lower(email) into v_email from public.profiles where id = auth.uid() and role = 'member';
  if v_email is null then return jsonb_build_object('member_id', null); end if;
  select i.member_id into v_member from public.invites i where lower(i.email) = v_email order by i.created_at desc limit 1;
  if v_member is null then
    select id into v_member from public.members where lower(email) = v_email and archived_at is null order by created_at desc limit 1;
  end if;
  if v_member is null then return jsonb_build_object('member_id', null); end if;
  v_root := public.member_root(v_member);
  if exists (select 1 from public.members where id = v_root and user_id is not null and user_id <> auth.uid()) then
    return jsonb_build_object('member_id', null, 'taken', true);
  end if;
  update public.members set user_id = auth.uid() where id = v_root;
  update public.invites set accepted_at = coalesce(accepted_at, now()) where lower(email) = v_email;
  perform public.log_activity(v_root, 'member.app_linked', 'Signed in to the SUPER1 app', '{}'::jsonb, null);
  return jsonb_build_object('member_id', v_root, 'linked', true);
end $$;

-- M12: the member's own QR credential (kind qr), made once. The desk scans it like a tag.
create or replace function public.member_qr() returns text
language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.my_member_root(); v_code text;
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select c.code into v_code from public.credentials c join public.members g on g.id = c.member_id
  where g.root_id = v_root and c.kind = 'qr' and c.revoked_at is null order by c.created_at desc limit 1;
  if v_code is null then
    v_code := 'S1' || upper(substr(md5(gen_random_uuid()::text), 1, 10));
    insert into public.credentials (member_id, kind, code) values (v_root, 'qr', v_code);
  end if;
  return v_code;
end $$;

-- M03 / M04 / M08 / M12 in one read.
create or replace function public.member_home(p_day date default public.today_bkk()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_root uuid := public.my_member_root(); v_m public.members; v_pt public.memberships;
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.members where id = v_root;
  select m.* into v_pt from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = v_root and m.kind = 'pt' and m.voided_at is null and p_day between m.starts_on and m.ends_on order by m.ends_on limit 1;
  return jsonb_build_object(
    'today', p_day,
    'member', jsonb_build_object('id', v_root, 'member_no', v_m.member_no, 'first_name', v_m.first_name, 'name', trim(v_m.first_name || ' ' || v_m.last_name), 'lang', v_m.lang, 'email', v_m.email),
    'card', public.member_card(v_root, p_day),
    'pt', case when v_pt.id is null then null else jsonb_build_object('total', v_pt.sessions_total, 'used', v_pt.sessions_used, 'left', v_pt.sessions_total - v_pt.sessions_used,
            'ends_on', v_pt.ends_on, 'plan', v_pt.plan_name, 'coach', (select name from public.coaches where id = v_pt.coach_id)) end,
    'tag', (select c.code from public.credentials c join public.members g on g.id = c.member_id where g.root_id = v_root and c.kind = 'tag' and c.revoked_at is null order by c.created_at desc limit 1),
    'programs', coalesce((
      select jsonb_agg(jsonb_build_object('program_id', p.id, 'coach', co.name, 'own', p.coach_id is null, 'version_id', v.id, 'version', v.version, 'sent_at', v.sent_at, 'body', v.body)
        order by p.coach_id is null, v.sent_at desc)
      from public.programs p
      left join public.coaches co on co.id = p.coach_id
      join lateral (select * from public.program_versions v where v.program_id = p.id order by v.version desc limit 1) v on true
      where p.member_id = v_root), '[]'::jsonb),
    'targets', (select jsonb_build_object('goal', t.goal, 'protein_g', t.protein_g, 'carbs_g', t.carbs_g, 'fat_g', t.fat_g, 'kcal', t.kcal, 'water_l', t.water_l, 'steps', t.steps,
                  'sent_at', t.sent_at, 'coach', (select name from public.coaches where id = t.coach_id))
                from public.nutrition_targets t join public.members g on g.id = t.member_id where g.root_id = v_root order by t.sent_at desc limit 1),
    'picks', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.menu_item_id, 'coach', co.name) order by p.sort)
                       from public.coach_picks p join public.coaches co on co.id = p.coach_id where p.member_id = v_root and p.removed_at is null), '[]'::jsonb),
    'note', (select jsonb_build_object('body', n.body, 'at', n.created_at, 'coach', co.name) from public.coach_notes n join public.coaches co on co.id = n.coach_id
             where n.member_id = v_root order by n.created_at desc limit 1),
    'checkin', (select to_jsonb(d) - 'member_id' from public.daily_checkins d join public.members g on g.id = d.member_id where g.root_id = v_root and d.date = p_day),
    'streak', public.member_checkin_streak(v_root, p_day),
    'last_workout', (select jsonb_build_object('day_name', w.day_name, 'at', w.started_at, 'program_version_id', w.program_version_id)
                     from public.workout_logs w join public.members g on g.id = w.member_id where g.root_id = v_root order by w.started_at desc limit 1),
    'last', coalesce((
      select jsonb_object_agg(k, j) from (
        select distinct on (coalesce(s.exercise_id::text, lower(s.exercise_name))) coalesce(s.exercise_id::text, lower(s.exercise_name)) as k,
          jsonb_build_object('kg', s.kg, 'reps', s.reps, 'seconds', s.seconds, 'at', w.started_at) as j
        from public.set_logs s join public.workout_logs w on w.id = s.workout_log_id join public.members g on g.id = w.member_id
        where g.root_id = v_root and s.done
        order by coalesce(s.exercise_id::text, lower(s.exercise_name)), w.started_at desc, s.kg desc nulls last, s.reps desc nulls last
      ) t), '{}'::jsonb)
  );
end $$;

-- M05/M06: save a finished workout. Idempotent on p_id (an offline workout may be sent again).
-- A set is a PR when its weight beats every earlier set of that exercise (first heaviest set only).
create or replace function public.member_save_workout(p_id uuid, p_day_name text, p_started timestamptz, p_finished timestamptz,
  p_sets jsonb, p_program_version uuid default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.my_member_root(); s jsonb; v_best numeric; v_prs jsonb := '[]'::jsonb; v_n int := 0; v_vol numeric := 0; v_no int; v_key text;
  v_seen jsonb := '{}'::jsonb;
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.workout_logs where id = p_id) then
    return jsonb_build_object('id', p_id, 'already', true,
      'prs', coalesce((select jsonb_agg(jsonb_build_object('name', exercise_name, 'kg', kg, 'reps', reps)) from public.set_logs where workout_log_id = p_id and is_pr), '[]'::jsonb),
      'sets', (select sets_done from public.workout_logs where id = p_id), 'volume_kg', (select volume_kg from public.workout_logs where id = p_id));
  end if;
  if jsonb_typeof(p_sets) <> 'array' then raise exception 'A workout needs sets.' using errcode = 'P0001'; end if;
  if p_program_version is not null and not exists (select 1 from public.program_versions v join public.programs p on p.id = v.program_id where v.id = p_program_version and p.member_id = v_root) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.workout_logs (id, member_id, program_version_id, day_name, started_at, finished_at, note)
  values (p_id, v_root, p_program_version, coalesce(nullif(trim(p_day_name), ''), 'Workout'), p_started, p_finished, nullif(trim(p_note), ''));
  v_no := 0;
  for s in select * from jsonb_array_elements(p_sets) loop
    if coalesce((s->>'done')::boolean, true) is not true then continue; end if;
    v_key := coalesce(s->>'exercise_id', lower(s->>'name'));
    v_no := coalesce((v_seen->>v_key)::int, 0) + 1;
    v_seen := v_seen || jsonb_build_object(v_key, v_no);
    v_best := null;
    if (s->>'kg') is not null then
      select max(sl.kg) into v_best from public.set_logs sl join public.workout_logs w on w.id = sl.workout_log_id join public.members g on g.id = w.member_id
      where g.root_id = v_root and sl.done and (sl.exercise_id::text = s->>'exercise_id' or (s->>'exercise_id' is null and lower(sl.exercise_name) = lower(s->>'name')));
    end if;
    insert into public.set_logs (workout_log_id, exercise_id, exercise_name, set_no, kg, reps, seconds, done, is_pr)
    values (p_id, nullif(s->>'exercise_id', '')::uuid, s->>'name', v_no, (s->>'kg')::numeric, (s->>'reps')::int, (s->>'seconds')::int, true,
            (s->>'kg') is not null and v_best is not null and (s->>'kg')::numeric > v_best);
    if (s->>'kg') is not null and v_best is not null and (s->>'kg')::numeric > v_best then
      v_prs := v_prs || jsonb_build_object('name', s->>'name', 'kg', (s->>'kg')::numeric, 'reps', (s->>'reps')::int, 'prev', v_best);
    end if;
    v_n := v_n + 1;
    v_vol := v_vol + coalesce((s->>'kg')::numeric, 0) * coalesce((s->>'reps')::int, 0);
  end loop;
  update public.workout_logs set sets_done = v_n, volume_kg = v_vol where id = p_id;
  return jsonb_build_object('id', p_id, 'prs', v_prs, 'sets', v_n, 'volume_kg', v_vol);
end $$;

-- workout_logs: a member may finish a workout (finished_at, note, counts) but not move it.
create or replace function public.guard_workout_logs() returns trigger language plpgsql as $$
begin
  if new.member_id is distinct from old.member_id or new.started_at is distinct from old.started_at or new.program_version_id is distinct from old.program_version_id then
    raise exception 'A logged workout keeps its member, day and program.' using errcode = 'P0001';
  end if;
  return new;
end $$;
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'workout_logs_guard') then
    create trigger workout_logs_guard before update on public.workout_logs for each row execute function public.guard_workout_logs();
  end if;
end $$;

-- M07: top set per workout for each exercise (last 10), personal bests, recent workouts.
create or replace function public.member_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_root uuid := public.my_member_root();
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'bests', coalesce((
      select jsonb_agg(b order by b->>'name') from (
        select distinct on (lower(s.exercise_name)) jsonb_build_object('name', s.exercise_name, 'kg', s.kg, 'reps', s.reps, 'at', w.started_at) as b
        from public.set_logs s join public.workout_logs w on w.id = s.workout_log_id join public.members g on g.id = w.member_id
        where g.root_id = v_root and s.done and s.kg is not null
        order by lower(s.exercise_name), s.kg desc, s.reps desc, w.started_at
      ) x), '[]'::jsonb),
    'series', coalesce((
      select jsonb_object_agg(name, pts) from (
        select name, jsonb_agg(jsonb_build_object('at', at, 'kg', kg) order by at) as pts from (
          select s.exercise_name as name, w.started_at as at, max(s.kg) as kg,
                 row_number() over (partition by lower(s.exercise_name) order by w.started_at desc) as rn
          from public.set_logs s join public.workout_logs w on w.id = s.workout_log_id join public.members g on g.id = w.member_id
          where g.root_id = v_root and s.done and s.kg is not null
          group by s.exercise_name, lower(s.exercise_name), w.id, w.started_at
        ) t where rn <= 10 group by name
      ) y), '{}'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'day_name', w.day_name, 'started_at', w.started_at, 'finished_at', w.finished_at, 'sets', w.sets_done, 'volume_kg', w.volume_kg,
        'prs', (select count(*) from public.set_logs s where s.workout_log_id = w.id and s.is_pr)) order by w.started_at desc)
      from (select w.* from public.workout_logs w join public.members g on g.id = w.member_id where g.root_id = v_root order by w.started_at desc limit 12) w), '[]'::jsonb)
  );
end $$;

-- M11: one check-in a day, editable until the end of the next day.
create or replace function public.member_checkin(p_date date, p_sleep numeric, p_energy int, p_digestion int, p_water numeric, p_steps int, p_weight numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.my_member_root(); v_today date := public.today_bkk();
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_date > v_today or p_date < v_today - 1 then raise exception 'Check in for today or yesterday.' using errcode = 'P0001'; end if;
  insert into public.daily_checkins (member_id, date, sleep_h, energy, digestion, water_l, steps, weight_kg, note)
  values (v_root, p_date, p_sleep, p_energy, p_digestion, p_water, p_steps, p_weight, nullif(trim(p_note), ''))
  on conflict (member_id, date) do update set sleep_h = excluded.sleep_h, energy = excluded.energy, digestion = excluded.digestion, water_l = excluded.water_l,
    steps = excluded.steps, weight_kg = excluded.weight_kg, note = excluded.note;
  return public.member_checkin_streak(v_root, v_today);
end $$;

-- M10: "Show at the counter". Prices come from the menu, never from the phone.
-- p_items = [{"item_id": "strong-vibes", "qty": 1, "options": ["xl", "extra-scoop"]}]
create or replace function public.member_cafe_order(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.my_member_root(); it jsonb; v_item public.menu_items; v_qty int; v_unit int; v_total int := 0; v_lines jsonb := '[]'::jsonb; v_opts jsonb; v_id uuid;
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'The order is empty.' using errcode = 'P0001'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into v_item from public.menu_items where id = it->>'item_id' and archived_at is null and in_app and not is_draft;
    if v_item.id is null then raise exception 'That item is not on the menu.' using errcode = 'P0001'; end if;
    v_qty := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label_en, 'price', o.price_thb)), '[]'::jsonb), v_item.price_thb + coalesce(sum(o.price_thb), 0)
      into v_opts, v_unit
    from public.menu_options o where o.archived_at is null and o.id in (select jsonb_array_elements_text(coalesce(it->'options', '[]'::jsonb)));
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object('item_id', v_item.id, 'name', v_item.name_en, 'name_th', v_item.name_th, 'qty', v_qty, 'unit', v_unit, 'options', v_opts);
  end loop;
  insert into public.cafe_orders (member_id, items, total_thb) values (v_root, v_lines, v_total) returning id into v_id;
  return jsonb_build_object('id', v_id, 'items', v_lines, 'total', v_total);
end $$;

-- M13: "Delete my app login". The gym's records stay; the login is unlinked here and closed by the server
-- (service role), and Pete is told.
create or replace function public.member_unlink_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.my_member_root();
begin
  if v_root is null then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.members set user_id = null where user_id = auth.uid();
  perform public.log_activity(v_root, 'member.app_removed', 'Removed their SUPER1 app login', '{}'::jsonb, null);
  insert into public.outbox (kind, payload) values ('login_removed', jsonb_build_object('member_id', v_root));
  return jsonb_build_object('member_id', v_root);
end $$;

revoke execute on function public.member_link_me(), public.member_qr(), public.member_home(date), public.member_progress(),
  public.member_save_workout(uuid, text, timestamptz, timestamptz, jsonb, uuid, text), public.member_checkin(date, numeric, int, int, numeric, int, numeric, text),
  public.member_cafe_order(jsonb), public.member_unlink_me() from public, anon;
grant execute on function public.member_link_me(), public.member_qr(), public.member_home(date), public.member_progress(),
  public.member_save_workout(uuid, text, timestamptz, timestamptz, jsonb, uuid, text), public.member_checkin(date, numeric, int, int, numeric, int, numeric, text),
  public.member_cafe_order(jsonb), public.member_unlink_me() to authenticated;
