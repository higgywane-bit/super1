-- Phase 4 · Coach portal (C01–C06; counter mode left out). Read models for the portal and the few actions that need a rule:
-- café picks (max 3), a nudge (one a day). Programs and targets go through
-- coach_send_program / coach_set_targets (0001); lead stages, notes and own exercises are plain writes
-- under RLS. Every function works on the calling coach only (my_coach_id) and the members they see.

-- Members a coach works with: everyone with a PT pack from them (any time), by merge root.
create or replace function public.coach_client_roots(p_coach uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct g.root_id from public.memberships m join public.members g on g.id = m.member_id
  where m.kind = 'pt' and m.coach_id = p_coach and m.voided_at is null
$$;
revoke execute on function public.coach_client_roots(uuid) from public, anon, authenticated;

-- Last daily check-in and the streak of consecutive days up to it.
create or replace function public.member_checkin_streak(p_root uuid, p_today date default public.today_bkk()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_last date; v_n int := 0; v_d date;
begin
  select max(d.date) into v_last from public.daily_checkins d join public.members g on g.id = d.member_id where g.root_id = p_root and d.date <= p_today;
  if v_last is null then return jsonb_build_object('last', null, 'streak', 0); end if;
  v_d := v_last;
  while exists (select 1 from public.daily_checkins d join public.members g on g.id = d.member_id where g.root_id = p_root and d.date = v_d) loop
    v_n := v_n + 1; v_d := v_d - 1;
  end loop;
  return jsonb_build_object('last', v_last, 'streak', v_n, 'days_since', p_today - v_last);
end $$;
revoke execute on function public.member_checkin_streak(uuid, date) from public, anon, authenticated;

-- C02: the coach, KPIs, leads and clients, in one read.
create or replace function public.coach_home(p_day date default public.today_bkk()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_c public.coaches;
begin
  if v_coach is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_c from public.coaches where id = v_coach;
  return jsonb_build_object(
    'coach', jsonb_build_object('id', v_c.id, 'name', v_c.name, 'full_name', coalesce(nullif(v_c.full_name, ''), v_c.name), 'email', v_c.email, 'photo_path', v_c.photo_path),
    'today', p_day,
    'sessions_month', (select count(*) from public.pt_sessions s where s.coach_id = v_coach and s.undone_at is null
                       and date_trunc('month', (s.at at time zone 'Asia/Bangkok')::date) = date_trunc('month', p_day)),
    'leads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'name', l.name, 'phone', l.phone, 'email', l.email, 'lang', l.lang, 'source', l.source, 'stage', l.stage,
        'created_at', l.created_at, 'note', l.note, 'member_id', l.member_id, 'trial_at', l.trial_at,
        'bought', (select m.plan_name from public.memberships m join public.members g on g.id = m.member_id
                   where l.member_id is not null and g.root_id = public.member_root(l.member_id) and m.kind = 'membership' and m.voided_at is null
                   order by m.created_at desc limit 1),
        'tag', (select c.code from public.credentials c join public.members g on g.id = c.member_id
                where l.member_id is not null and g.root_id = public.member_root(l.member_id) and c.revoked_at is null order by c.created_at desc limit 1)
      ) order by l.created_at desc)
      from public.leads l where l.coach_id = v_coach and l.stage <> 'won'), '[]'::jsonb),
    'clients', coalesce((
      select jsonb_agg(x.j order by x.pt_left desc nulls last, x.name)
      from (
        select r.root as id, trim(mb.first_name || ' ' || mb.last_name) as name, (pt.sessions_total - pt.sessions_used) as pt_left,
          jsonb_build_object(
            'member_id', r.root, 'member_no', mb.member_no, 'name', trim(mb.first_name || ' ' || mb.last_name), 'lang', mb.lang,
            'phone', mb.phone, 'email', mb.email, 'since', (select min(m.starts_on) from public.memberships m join public.members g on g.id = m.member_id
                                                          where g.root_id = r.root and m.kind = 'pt' and m.coach_id = v_coach and m.voided_at is null),
            'pt', case when pt.id is null then null else jsonb_build_object('id', pt.id, 'plan', pt.plan_name, 'total', pt.sessions_total, 'used', pt.sessions_used,
                    'left', pt.sessions_total - pt.sessions_used, 'ends_on', pt.ends_on) end,
            'card', public.member_card(r.root, p_day),
            'last_workout', (select jsonb_build_object('day_name', w.day_name, 'at', w.started_at, 'sets', w.sets_done,
                               'pr', (select jsonb_build_object('name', s.exercise_name, 'kg', s.kg, 'reps', s.reps) from public.set_logs s
                                      where s.workout_log_id = w.id and s.is_pr order by s.kg desc nulls last limit 1))
                             from public.workout_logs w join public.members g on g.id = w.member_id where g.root_id = r.root order by w.started_at desc limit 1),
            'checkin', public.member_checkin_streak(r.root, p_day)
          ) as j
        from (select public.coach_client_roots(v_coach) as root) r
        join public.members mb on mb.id = r.root
        left join lateral (
          select m.* from public.memberships m join public.members g on g.id = m.member_id
          where g.root_id = r.root and m.kind = 'pt' and m.coach_id = v_coach and m.voided_at is null and p_day between m.starts_on and m.ends_on
            and m.sessions_used < m.sessions_total order by m.ends_on limit 1
        ) pt on true
        where mb.archived_at is null
      ) x), '[]'::jsonb)
  );
end $$;

-- C03–C05: one client, everything the workspace shows.
create or replace function public.coach_client(p_member uuid, p_day date default public.today_bkk()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_root uuid := public.member_root(p_member); v_m public.members; v_prog uuid;
begin
  if v_coach is null or not public.coach_sees_member(p_member) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.members where id = v_root;
  select id into v_prog from public.programs where member_id = v_root and coach_id = v_coach;
  return jsonb_build_object(
    'member', jsonb_build_object('id', v_root, 'member_no', v_m.member_no, 'name', trim(v_m.first_name || ' ' || v_m.last_name), 'first_name', v_m.first_name,
      'lang', v_m.lang, 'phone', v_m.phone, 'email', v_m.email,
      'since', (select min(m.starts_on) from public.memberships m join public.members g on g.id = m.member_id
                where g.root_id = v_root and m.kind = 'pt' and m.coach_id = v_coach and m.voided_at is null)),
    'card', public.member_card(v_root, p_day),
    'program', (select jsonb_build_object('version', v.version, 'sent_at', v.sent_at, 'body', v.body)
                from public.program_versions v where v.program_id = v_prog order by v.version desc limit 1),
    'workouts', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'day_name', w.day_name, 'started_at', w.started_at, 'finished_at', w.finished_at,
        'sets', w.sets_done, 'volume_kg', w.volume_kg,
        'pr', (select jsonb_build_object('name', s.exercise_name, 'kg', s.kg, 'reps', s.reps) from public.set_logs s
               where s.workout_log_id = w.id and s.is_pr order by s.kg desc nulls last limit 1)) order by w.started_at desc)
      from (select w.* from public.workout_logs w join public.members g on g.id = w.member_id where g.root_id = v_root order by w.started_at desc limit 6) w), '[]'::jsonb),
    -- "Last time" per exercise: the best set of the latest workout that had it.
    'last', coalesce((
      select jsonb_object_agg(k, j) from (
        select distinct on (coalesce(s.exercise_id::text, lower(s.exercise_name))) coalesce(s.exercise_id::text, lower(s.exercise_name)) as k,
          jsonb_build_object('kg', s.kg, 'reps', s.reps, 'seconds', s.seconds, 'pr', s.is_pr, 'at', w.started_at) as j
        from public.set_logs s join public.workout_logs w on w.id = s.workout_log_id join public.members g on g.id = w.member_id
        where g.root_id = v_root and s.done
        order by coalesce(s.exercise_id::text, lower(s.exercise_name)), w.started_at desc, s.kg desc nulls last, s.reps desc nulls last
      ) t), '{}'::jsonb),
    'targets', (select jsonb_build_object('goal', t.goal, 'protein_g', t.protein_g, 'carbs_g', t.carbs_g, 'fat_g', t.fat_g, 'kcal', t.kcal,
                  'water_l', t.water_l, 'steps', t.steps, 'sent_at', t.sent_at)
                from public.nutrition_targets t join public.members g on g.id = t.member_id where g.root_id = v_root and t.coach_id = v_coach order by t.sent_at desc limit 1),
    'picks', coalesce((select jsonb_agg(p.menu_item_id order by p.sort, p.created_at) from public.coach_picks p
                       where p.member_id = v_root and p.coach_id = v_coach and p.removed_at is null), '[]'::jsonb),
    'checkins', coalesce((
      select jsonb_agg(to_jsonb(d) - 'member_id' - 'created_at' - 'updated_at' order by d.date desc)
      from public.daily_checkins d join public.members g on g.id = d.member_id where g.root_id = v_root and d.date between p_day - 9 and p_day), '[]'::jsonb),
    'streak', public.member_checkin_streak(v_root, p_day),
    'weight_first', (select jsonb_build_object('date', d.date, 'kg', d.weight_kg) from public.daily_checkins d join public.members g on g.id = d.member_id
                     where g.root_id = v_root and d.weight_kg is not null and d.date between p_day - 9 and p_day order by d.date limit 1),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'at', n.created_at) order by n.created_at desc)
                       from (select * from public.coach_notes n where n.member_id = v_root and n.coach_id = v_coach order by n.created_at desc limit 10) n), '[]'::jsonb),
    'nudged_today', exists (select 1 from public.outbox o where o.kind = 'coach_nudge' and o.payload->>'member_id' = v_root::text
                            and o.payload->>'coach_id' = v_coach::text and o.payload->>'day' = p_day::text)
  );
end $$;

-- C04: café picks, at most 3. Replaces the current set; old picks are marked removed (kept).
create or replace function public.coach_set_picks(p_member uuid, p_items text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_root uuid := public.member_root(p_member); v_items text[] := coalesce(p_items, '{}'); i int;
begin
  if v_coach is null or not public.coach_sees_member(p_member) then raise exception 'not allowed' using errcode = '42501'; end if;
  if cardinality(v_items) > 3 then raise exception 'Pin up to 3 café items.' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(v_items) x where not exists (select 1 from public.menu_items m where m.id = x and m.archived_at is null)) then
    raise exception 'Unknown café item.' using errcode = 'P0001';
  end if;
  update public.coach_picks set removed_at = now()
  where member_id = v_root and coach_id = v_coach and removed_at is null and not (menu_item_id = any (v_items));
  for i in 1 .. cardinality(v_items) loop
    if not exists (select 1 from public.coach_picks where member_id = v_root and coach_id = v_coach and removed_at is null and menu_item_id = v_items[i]) then
      insert into public.coach_picks (member_id, coach_id, menu_item_id, sort) values (v_root, v_coach, v_items[i], i);
    end if;
  end loop;
  return jsonb_build_object('picks', to_jsonb(v_items));
end $$;

-- C05: nudge a client who hasn't checked in (email now, push later). Once a day per client.
create or replace function public.coach_nudge(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_root uuid := public.member_root(p_member);
begin
  if v_coach is null or not public.coach_sees_member(p_member) then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.outbox o where o.kind = 'coach_nudge' and o.payload->>'member_id' = v_root::text
             and o.payload->>'coach_id' = v_coach::text and o.payload->>'day' = public.today_bkk()::text) then
    return jsonb_build_object('sent', false, 'already', true);
  end if;
  insert into public.outbox (kind, payload) values ('coach_nudge', jsonb_build_object('member_id', v_root, 'coach_id', v_coach, 'day', public.today_bkk()));
  return jsonb_build_object('sent', true);
end $$;

-- A coach may change a lead's stage, note and trial time, nothing else (who it belongs to, who they are).
create or replace function public.leads_coach_guard() returns trigger language plpgsql as $$
begin
  if public.my_coach_id() is not null and not public.is_admin() and (
    new.coach_id is distinct from old.coach_id or new.member_id is distinct from old.member_id or new.signup_id is distinct from old.signup_id
    or new.source is distinct from old.source or new.created_at is distinct from old.created_at or new.stage = 'won' and old.stage <> 'won') then
    raise exception 'Coaches can change a lead''s stage and note.' using errcode = '42501';
  end if;
  return new;
end $$;
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'leads_coach_guard') then
    create trigger leads_coach_guard before update on public.leads for each row execute function public.leads_coach_guard();
  end if;
end $$;

revoke execute on function public.coach_home(date), public.coach_client(uuid, date), public.coach_set_picks(uuid, text[]), public.coach_nudge(uuid) from public, anon;
grant execute on function public.coach_home(date), public.coach_client(uuid, date), public.coach_set_picks(uuid, text[]), public.coach_nudge(uuid) to authenticated;

-- Same rules as 0001; the member's notification now says which coach sent it.
create or replace function public.coach_send_program(p_member uuid, p_body jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_root uuid := public.member_root(p_member); v_prog uuid; v_ver int;
begin
  if v_coach is null or not public.coach_sees_member(p_member) then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_body->'days') <> 'array' then raise exception 'A program needs days.' using errcode = 'P0001'; end if;
  insert into public.programs (member_id, coach_id) values (v_root, v_coach) on conflict (member_id, coach_id) do nothing;
  select id into v_prog from public.programs where member_id = v_root and coach_id = v_coach;
  select coalesce(max(version), 0) + 1 into v_ver from public.program_versions where program_id = v_prog;
  insert into public.program_versions (program_id, version, body, sent_by) values (v_prog, v_ver, p_body, auth.uid());
  insert into public.outbox (kind, payload) values ('program_push', jsonb_build_object('member_id', v_root, 'version', v_ver, 'coach_id', v_coach));
  return jsonb_build_object('program_id', v_prog, 'version', v_ver);
end $$;
