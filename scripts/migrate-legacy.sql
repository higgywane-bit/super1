-- =====================================================================================
-- SUPER1 · move the old Lovable Cloud data into SUPER1 (docs/08-MIGRATION.md, "Table mapping").
--
--   legacy.*  (verbatim old rows, loaded by scripts/legacy-load.mjs)  →  public.*
--
-- Idempotent: every row carries the old id in legacy_id (or keeps the old uuid as its id), and a row
-- already migrated is skipped. Run it as often as you like: rehearsals, then the cutover.
-- Nothing is ever deleted or rewritten. A row that can't go across as it is gets an entry in
-- legacy._issues (with what was done about it) and shows up in the migration report.
-- Run as the database owner:  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-legacy.sql
-- =====================================================================================

\set ON_ERROR_STOP 1
begin;

-- Issues found while migrating (one per old row and kind; re-runs don't duplicate them).
create table if not exists legacy._issues (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  legacy_table text not null,
  legacy_id text not null,
  kind text not null,
  detail text not null,
  explained boolean not null default false,
  unique (legacy_table, legacy_id, kind)
);

create or replace function pg_temp.issue(p_table text, p_id text, p_kind text, p_detail text, p_explained boolean default false) returns void
language sql as $$
  insert into legacy._issues (legacy_table, legacy_id, kind, detail, explained) values (p_table, p_id, p_kind, p_detail, p_explained)
  on conflict (legacy_table, legacy_id, kind) do nothing
$$;

-- Old plan ids → SUPER1 plan ids (docs/08). Anything else matches a seed plan by name, or becomes an archived legacy plan.
create or replace function pg_temp.plan_map(p_id text, p_name text) returns text language sql stable as $$
  select coalesce(
    case p_id
      when '1-month' then '1m' when '3-months' then '3m' when '6-months' then '6m' when '12-months' then '12m'
      when '1-week' then '1w' when '2-weeks' then '2w' when 'day-pass' then 'day'
      when 'pt-1' then 'pt1' when 'pt-3' then 'pt3' when 'pt-10' then 'pt10' when 'pt-20' then 'pt20'
      when '10-visits' then '10v'
    end,
    (select id from public.plans where lower(name) = lower(trim(p_name)) and id not like 'legacy-%' limit 1),
    'legacy-' || trim(both '-' from regexp_replace(lower(coalesce(nullif(p_id, ''), p_name)), '[^a-z0-9]+', '-', 'g'))
  )
$$;

create or replace function pg_temp.new_kind(p_kind text, p_plan text) returns text language sql immutable as $$
  select case when p_kind = 'pt' then 'pt' when p_plan = '10-visits' then 'visits' else 'membership' end
$$;

create or replace function pg_temp.bkk_date(p timestamptz) returns date language sql immutable as $$
  select (p at time zone 'Asia/Bangkok')::date
$$;

-- -------------------------------------------------------------------------------------
-- 1. Coaches: match the seed by name, keep the old full name. Unknown names are added (not on the QR).
-- -------------------------------------------------------------------------------------
update public.coaches c set legacy_id = l.id, full_name = coalesce(nullif(c.full_name, ''), l.full_name, '')
from legacy.coaches l where lower(c.name) = lower(l.name) and c.legacy_id is null;

insert into public.coaches (slug, name, full_name, on_qr, portal, legacy_id, created_at)
select lower(regexp_replace(l.name, '[^A-Za-z0-9]+', '-', 'g')), l.name, coalesce(l.full_name, ''), false, 'none', l.id, coalesce(l.created_at, now())
from legacy.coaches l
where not exists (select 1 from public.coaches c where c.legacy_id = l.id or lower(c.name) = lower(l.name));

create or replace function pg_temp.coach_by_name(p text) returns uuid language sql stable as $$
  select id from public.coaches where lower(name) = lower(trim(p)) limit 1
$$;
create or replace function pg_temp.coach_by_legacy(p uuid) returns uuid language sql stable as $$
  select id from public.coaches where legacy_id = p
$$;

-- -------------------------------------------------------------------------------------
-- 2. Members: same uuid, same member number. Demo rows (the scanner test member) stay behind.
-- -------------------------------------------------------------------------------------
select pg_temp.issue('members', id::text, 'demo-skipped', 'Demo member (' || coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ') not migrated', true)
from legacy.members where source = 'demo';

select pg_temp.issue('members', id::text, 'no-first-name', 'Empty first name: migrated as "?"')
from legacy.members where source is distinct from 'demo' and coalesce(trim(first_name), '') = '';

insert into public.members (id, member_no, first_name, last_name, nickname, email, phone, line_id, notes, lang, created_via,
  created_at, updated_at, archived_at, legacy_id)
overriding system value
select l.id, l.member_no, left(coalesce(nullif(trim(l.first_name), ''), '?'), 80), left(coalesce(l.last_name, ''), 80), l.nickname,
  nullif(lower(trim(l.email)), ''), nullif(trim(l.phone), ''), l.line_id, l.notes, 'en',
  case when l.source in ('glofox', 'import', 'glofox-import', 'csv') then 'import' when l.source = 'qr' then 'qr' else 'desk' end,
  coalesce(l.created_at, now()), coalesce(l.updated_at, l.created_at, now()), l.archived_at, l.id
from legacy.members l
where l.source is distinct from 'demo'
on conflict do nothing;

-- New members (desk and counter QR) continue after the highest old number.
select setval(pg_get_serial_sequence('public.members', 'member_no'), greatest((select max(member_no) from public.members), 1000));

-- -------------------------------------------------------------------------------------
-- 3. Credentials: same code. Old app QR codes stay QR codes; Glofox and physical cards are tags.
-- -------------------------------------------------------------------------------------
select pg_temp.issue('credentials', l.id::text, 'bad-code', 'Code "' || l.code || '" is not a valid SUPER1 code (normalised: ' || public.normalize_code(l.code) || '): not migrated')
from legacy.credentials l join public.members m on m.id = l.member_id
where l.code <> public.normalize_code(l.code) or length(l.code) not between 3 and 32;

insert into public.credentials (id, member_id, kind, code, created_at, revoked_at, revoke_reason)
select l.id, l.member_id, case when l.kind = 'qr' then 'qr' else 'tag' end, l.code, coalesce(l.created_at, now()), l.revoked_at,
  case when l.revoked_at is not null then 'Revoked in the old app' end
from legacy.credentials l join public.members m on m.id = l.member_id
where l.code = public.normalize_code(l.code) and length(l.code) between 3 and 32
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 4. Plans the old app sold that SUPER1 doesn't have ("3 Days", "2 Months"): archived legacy plans.
-- -------------------------------------------------------------------------------------
insert into public.plans (id, name, kind, price_thb, duration_days, sessions, on_desk, sort, archived_at)
select distinct on (pid) pid, l.plan_name, pg_temp.new_kind(l.kind, l.plan_id), greatest(coalesce(l.price, 0), 0),
  greatest(l.ends_on - l.starts_on + 1, 1),
  case when pg_temp.new_kind(l.kind, l.plan_id) in ('pt', 'visits') then coalesce(l.sessions_total, 1) end,
  false, 900, now()
from (select *, pg_temp.plan_map(plan_id, plan_name) as pid from legacy.memberships) l
where l.pid like 'legacy-%' and not exists (select 1 from public.plans p where p.id = l.pid)
order by pid, l.created_at;

-- -------------------------------------------------------------------------------------
-- 5. Memberships + one sales row each (the history Andy and the reconciliation read).
--    Dates, sessions and prices are kept exactly; old freezes are already inside ends_on.
-- -------------------------------------------------------------------------------------
select pg_temp.issue('memberships', l.id::text, 'ends-before-start', format('Ends %s before it starts %s: not migrated', l.ends_on, l.starts_on))
from legacy.memberships l join public.members m on m.id = l.member_id where l.ends_on < l.starts_on;

select pg_temp.issue('memberships', l.id::text, 'sessions-over', format('%s of %s sessions used: migrated as %s of %s', l.sessions_used, l.sessions_total, l.sessions_total, l.sessions_total))
from legacy.memberships l join public.members m on m.id = l.member_id where l.sessions_total is not null and l.sessions_used > l.sessions_total;

select pg_temp.issue('memberships', l.id::text, 'pt-no-coach', 'PT pack without a coach: given to "Team"', true)
from legacy.memberships l join public.members m on m.id = l.member_id
where l.kind = 'pt' and pg_temp.coach_by_name(l.coach) is null;

select pg_temp.issue('memberships', l.id::text, 'payment-method', 'Unknown payment method "' || l.payment_method || '": recorded as qashier')
from legacy.memberships l join public.members m on m.id = l.member_id
where l.payment_method not in ('cash', 'card', 'promptpay', 'transfer', 'comp', 'online', 'qashier', 'glofox');

insert into public.sales (id, business_date, at, member_id, plan_id, item, qty, price_thb, method, source, note, legacy_id)
select l.id, pg_temp.bkk_date(coalesce(l.created_at, l.starts_on::timestamptz)), coalesce(l.created_at, l.starts_on::timestamptz), l.member_id,
  pg_temp.plan_map(l.plan_id, l.plan_name), l.plan_name, 1, greatest(coalesce(l.price, 0), 0),
  case when l.payment_method in ('cash', 'card', 'promptpay', 'transfer', 'comp', 'online', 'qashier', 'glofox') then l.payment_method else 'qashier' end,
  'import', l.payment_ref, l.id
from legacy.memberships l join public.members m on m.id = l.member_id
where l.ends_on >= l.starts_on
on conflict do nothing;

insert into public.memberships (id, member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used,
  coach_id, sale_id, notes, created_at, voided_at, void_reason, legacy_id)
select l.id, l.member_id, pg_temp.plan_map(l.plan_id, l.plan_name), l.plan_name, pg_temp.new_kind(l.kind, l.plan_id),
  greatest(coalesce(l.price, 0), 0), l.starts_on, l.ends_on, l.sessions_total,
  case when l.sessions_total is not null then least(coalesce(l.sessions_used, 0), l.sessions_total) else coalesce(l.sessions_used, 0) end,
  case when l.kind = 'pt' then coalesce(pg_temp.coach_by_name(l.coach), (select id from public.coaches where slug = 'team')) else pg_temp.coach_by_name(l.coach) end,
  (select s.id from public.sales s where s.legacy_id = l.id), l.notes, coalesce(l.created_at, now()),
  l.cancelled_at, case when l.cancelled_at is not null then coalesce(nullif(l.cancel_reason, ''), 'Cancelled in the old app') end, l.id
from legacy.memberships l join public.members m on m.id = l.member_id
where l.ends_on >= l.starts_on
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 6. Old freezes → member pauses (the dates on the memberships are NOT shifted again).
-- -------------------------------------------------------------------------------------
insert into public.member_pauses (member_id, from_date, until_date, original_until, reason, created_at, legacy_id)
select l.member_id, l.frozen_from, l.frozen_until, l.frozen_until, 'Freeze from the old app', coalesce(l.created_at, now()), l.id
from legacy.memberships l join public.members m on m.id = l.member_id
where l.frozen_from is not null and l.frozen_until is not null and l.frozen_until >= l.frozen_from and l.cancelled_at is null
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 7. Check-ins: same uuid; reasons renamed; business date in Bangkok.
-- -------------------------------------------------------------------------------------
insert into public.checkins (id, at, business_date, member_id, credential_id, code, result, reason, membership_id, consumed_visit, method, legacy_id)
select l.id, l.at, pg_temp.bkk_date(l.at), m.id, c.id, l.code,
  case when l.allowed then 'allowed' else 'declined' end,
  case
    when l.allowed then case when ms.kind = 'visits' then 'visits' else 'membership' end
    when l.reason = 'no-membership' then 'no-plan'
    when l.reason = 'frozen' then 'paused'
    else l.reason
  end,
  ms.id, false,
  case when l.method in ('manual', 'search', 'name') then 'manual' when l.method in ('qr', 'app', 'app_qr', 'pass') then 'app_qr' else 'scan' end,
  l.id
from legacy.check_ins l
left join public.members m on m.id = l.member_id
left join public.credentials c on c.code = public.normalize_code(l.code)
left join public.memberships ms on ms.id = l.membership_id
where l.member_id is null or m.id is not null
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 8. Activity: every old line, typed legacy.<type>, with the staff member when there was one.
-- -------------------------------------------------------------------------------------
insert into public.activity (at, member_id, kind, message, data, actor, staff_id, legacy_id)
select l.at, m.id, 'legacy.' || l.type, l.message, jsonb_build_object('legacy_type', l.type),
  case when l.staff_name is not null then 'desk' else 'system' end,
  (select s.id from public.staff s where s.name = l.staff_name), l.id
from legacy.activity l
left join public.members m on m.id = l.member_id
where l.member_id is null or m.id is not null
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 9. PT clients → a won lead with their coach (so the coach still sees them). The app login
--    links itself when they first sign in with the same email (phase 5).
-- -------------------------------------------------------------------------------------
insert into public.leads (coach_id, member_id, name, phone, email, lang, source, stage, created_at, won_at, legacy_id)
select pg_temp.coach_by_legacy(p.coach_id), p.member_id, trim(m.first_name || ' ' || m.last_name), m.phone, m.email,
  case when p.lang in ('en', 'th', 'ru') then p.lang else 'en' end, 'manual', 'won', coalesce(p.created_at, now()), coalesce(p.joined_at, p.created_at, now()), p.id
from legacy.pt_clients p join public.members m on m.id = p.member_id
where pg_temp.coach_by_legacy(p.coach_id) is not null
on conflict do nothing;

select pg_temp.issue('pt_clients', p.id::text, 'no-coach', 'PT client without a coach: no lead made', true)
from legacy.pt_clients p join public.members m on m.id = p.member_id where pg_temp.coach_by_legacy(p.coach_id) is null;

update public.members m set lang = p.lang
from legacy.pt_clients p where p.member_id = m.id and p.lang in ('th', 'ru') and m.lang = 'en';

-- -------------------------------------------------------------------------------------
-- 10. Coaches' own exercises.
-- -------------------------------------------------------------------------------------
insert into public.exercises (name, muscle_group, muscle, equipment, log_type, default_sets, default_reps, default_seconds, coach_id, cue, created_at, legacy_id)
select left(coalesce(nullif(l.data->>'name', ''), 'Exercise'), 120),
  case when l.data->>'group' in ('chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'cardio') then l.data->>'group' else 'core' end,
  coalesce(l.data->>'muscle', ''), coalesce(nullif(l.data->>'equipment', ''), 'Other'),
  case when l.data->>'log' in ('weight_reps', 'reps', 'time') then l.data->>'log' else 'weight_reps' end,
  coalesce((l.data->>'sets')::int, 3), (l.data->>'reps')::int, (l.data->>'seconds')::int,
  pg_temp.coach_by_legacy(l.coach_id), l.data->>'cue', coalesce(l.created_at, now()), l.id
from legacy.pt_library_items l
where coalesce(l.kind, 'exercise') = 'exercise' and pg_temp.coach_by_legacy(l.coach_id) is not null
on conflict do nothing;

select pg_temp.issue('pt_library_items', l.id::text, 'kept-in-legacy', 'Library item of kind "' || coalesce(l.kind, '') || '" or without a coach stays in legacy', true)
from legacy.pt_library_items l where coalesce(l.kind, 'exercise') <> 'exercise' or pg_temp.coach_by_legacy(l.coach_id) is null;

-- -------------------------------------------------------------------------------------
-- 11. Programs (workout plans) → programs + program_versions; diet plans → targets or a note.
-- -------------------------------------------------------------------------------------
create or replace function pg_temp.program_body(doc jsonb) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(d->>'name', 'Day'),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'exercise_id', (select x.id from public.exercises x where x.slug = e->>'exerciseId' or x.legacy_id::text = e->>'exerciseId' limit 1),
            'name', e->>'name',
            'sets', jsonb_array_length(coalesce(e->'sets', '[]'::jsonb)),
            'reps', nullif(e->'sets'->0->>'reps', '')::int,
            'seconds', nullif(e->'sets'->0->>'seconds', '')::int,
            'unit', case e->>'log' when 'time' then 's' else 'reps' end,
            'rest_s', 90,
            'cue', (select string_agg(c->>'en', ' · ') from jsonb_array_elements(coalesce(e->'cues', '[]'::jsonb)) c)
          ) order by eo)
          from jsonb_array_elements(coalesce(d->'exercises', '[]'::jsonb)) with ordinality ex(e, eo)), '[]'::jsonb)
      ) order by dord)
      from jsonb_array_elements(coalesce(doc->'days', '[]'::jsonb)) with ordinality dd(d, dord)), '[]'::jsonb),
    'legacy', doc)
$$;

do $$
declare r record; v_prog uuid; v_coach uuid; v_member uuid;
begin
  for r in
    select p.*, c.member_id as client_member, c.coach_id as client_coach
    from legacy.pt_plans p join legacy.pt_clients c on c.id = p.client_id
    join public.members m on m.id = c.member_id
    where p.kind = 'workout' and not exists (select 1 from public.program_versions v where v.legacy_id = p.id)
    order by p.created_at
  loop
    v_coach := coalesce(pg_temp.coach_by_legacy(r.coach_id), pg_temp.coach_by_legacy(r.client_coach));
    v_member := r.client_member;
    insert into public.programs (member_id, coach_id, name, created_at, legacy_id)
    values (v_member, v_coach, coalesce(nullif(r.name, ''), 'Program'), coalesce(r.created_at, now()), r.id)
    on conflict (member_id, coach_id) do nothing;
    select id into v_prog from public.programs where member_id = v_member and coach_id is not distinct from v_coach;
    insert into public.program_versions (program_id, version, body, sent_at, legacy_id)
    values (v_prog, (select coalesce(max(version), 0) + 1 from public.program_versions where program_id = v_prog),
            pg_temp.program_body(r.doc), coalesce(r.updated_at, r.created_at, now()), r.id);
  end loop;
end $$;

select pg_temp.issue('pt_plans', p.id::text, 'template', 'Workout template not tied to a client: stays in legacy', true)
from legacy.pt_plans p where p.client_id is null;
select pg_temp.issue('pt_plans', p.id::text, 'feedback-setup', 'Daily check-in question setup: stays in legacy (SUPER1 uses a fixed check-in)', true)
from legacy.pt_plans p where p.kind = 'feedback';

insert into public.nutrition_targets (member_id, coach_id, goal, protein_g, carbs_g, fat_g, sent_at, legacy_id)
select c.member_id, coalesce(pg_temp.coach_by_legacy(p.coach_id), pg_temp.coach_by_legacy(c.coach_id)), 'maintain',
  (p.doc->>'protein')::numeric::int, (p.doc->>'carbs')::numeric::int, (p.doc->>'fat')::numeric::int, coalesce(p.updated_at, p.created_at, now()), p.id
from legacy.pt_plans p join legacy.pt_clients c on c.id = p.client_id join public.members m on m.id = c.member_id
where p.kind = 'diet' and coalesce(pg_temp.coach_by_legacy(p.coach_id), pg_temp.coach_by_legacy(c.coach_id)) is not null
  and jsonb_typeof(p.doc->'protein') = 'number' and jsonb_typeof(p.doc->'carbs') = 'number' and jsonb_typeof(p.doc->'fat') = 'number'
  and (p.doc->>'protein')::numeric between 0 and 500 and (p.doc->>'carbs')::numeric between 0 and 1000 and (p.doc->>'fat')::numeric between 0 and 400
on conflict do nothing;

insert into public.coach_notes (member_id, coach_id, body, created_at, legacy_id)
select c.member_id, coalesce(pg_temp.coach_by_legacy(p.coach_id), pg_temp.coach_by_legacy(c.coach_id)),
  left(coalesce(nullif(p.doc->>'note', ''), (select string_agg(coalesce(ml->>'name', '') || ': ' ||
    (select string_agg(coalesce(f->>'name', '') || coalesce(' ' || (f->>'amount'), ''), ', ') from jsonb_array_elements(coalesce(ml->'foods', '[]'::jsonb)) f), E'\n')
    from jsonb_array_elements(coalesce(p.doc->'meals', '[]'::jsonb)) ml), 'Diet plan from the old app'), 1000),
  coalesce(p.updated_at, p.created_at, now()), p.id
from legacy.pt_plans p join legacy.pt_clients c on c.id = p.client_id join public.members m on m.id = c.member_id
where p.kind = 'diet' and coalesce(pg_temp.coach_by_legacy(p.coach_id), pg_temp.coach_by_legacy(c.coach_id)) is not null
  and not exists (select 1 from public.nutrition_targets n where n.legacy_id = p.id)
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 12. Workouts: one set_logs row per logged set.
-- -------------------------------------------------------------------------------------
with ins as (
  insert into public.workout_logs (member_id, day_name, started_at, finished_at, note, sets_done, volume_kg, created_at, legacy_id)
  select c.member_id, coalesce(w.day_name, 'Workout'), w.started_at, w.finished_at, w.note, coalesce(w.sets_done, 0), coalesce(w.volume_kg, 0),
    coalesce(w.created_at, w.finished_at, now()), w.id
  from legacy.workout_logs w join legacy.pt_clients c on c.id = w.client_id join public.members m on m.id = c.member_id
  on conflict do nothing
  returning id, legacy_id
)
insert into public.set_logs (workout_log_id, exercise_id, exercise_name, set_no, kg, reps, seconds, done)
select ins.id, (select x.id from public.exercises x where x.slug = e->>'exerciseId' or x.legacy_id::text = e->>'exerciseId' limit 1),
  coalesce(e->>'name', 'Exercise'), so::int, nullif(s->>'weight', '')::numeric, nullif(s->>'reps', '')::int, nullif(s->>'seconds', '')::int,
  coalesce((s->>'done')::boolean, true)
from ins join legacy.workout_logs w on w.id = ins.legacy_id
cross join lateral jsonb_array_elements(coalesce(w.entries, '[]'::jsonb)) e
cross join lateral jsonb_array_elements(coalesce(e->'sets', '[]'::jsonb)) with ordinality ss(s, so);

-- -------------------------------------------------------------------------------------
-- 13. Daily check-ins: the built-in answers; anything else stays in legacy.daily_feedback.
-- -------------------------------------------------------------------------------------
create or replace function pg_temp.num(j jsonb, k text) returns numeric language sql immutable as $$
  select case when jsonb_typeof(j->k) = 'number' then (j->>k)::numeric when (j->>k) ~ '^-?[0-9]+(\.[0-9]+)?$' then (j->>k)::numeric end
$$;

insert into public.daily_checkins (member_id, date, sleep_h, energy, digestion, water_l, steps, weight_kg, note, created_at, updated_at, legacy_id)
select c.member_id, f.date,
  case when pg_temp.num(f.answers, 'sleep') between 0 and 24 then pg_temp.num(f.answers, 'sleep') end,
  case when pg_temp.num(f.answers, 'energy') between 1 and 5 then pg_temp.num(f.answers, 'energy')::smallint end,
  case when pg_temp.num(f.answers, 'digestion') between 1 and 5 then pg_temp.num(f.answers, 'digestion')::smallint end,
  case when pg_temp.num(f.answers, 'water') between 0 and 10 then pg_temp.num(f.answers, 'water') end,
  case when pg_temp.num(f.answers, 'steps') between 0 and 100000 then pg_temp.num(f.answers, 'steps')::int end,
  case when pg_temp.num(f.answers, 'bodyweight') between 20 and 400 then pg_temp.num(f.answers, 'bodyweight') end,
  left(f.answers->>'note', 500),
  coalesce(f.completed_at, f.updated_at, now()), coalesce(f.updated_at, now()), f.id
from legacy.daily_feedback f join legacy.pt_clients c on c.id = f.client_id join public.members m on m.id = c.member_id
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 14. Café macros: recipes Pete marked verified in the old menu workspace → menu_items, per regular portion.
--     Expected shape (the old workspace): doc.ingredients = [{id, name, kcal, protein, carbs, fat} per 100 g],
--     doc.recipes = {<menu item id>: {verified, ingredients|items: [{id|ingredientId, grams|g}]}}.
-- -------------------------------------------------------------------------------------
with ing as (
  select i->>'id' as id,
    coalesce(pg_temp.num(i, 'kcal'), pg_temp.num(i->'per100g', 'kcal')) as kcal,
    coalesce(pg_temp.num(i, 'protein'), pg_temp.num(i->'per100g', 'protein')) as protein,
    coalesce(pg_temp.num(i, 'carbs'), pg_temp.num(i->'per100g', 'carbs')) as carbs,
    coalesce(pg_temp.num(i, 'fat'), pg_temp.num(i->'per100g', 'fat')) as fat
  from legacy.menu_workspace w cross join lateral jsonb_array_elements(coalesce(w.doc->'ingredients', '[]'::jsonb)) i
),
rec as (
  select r.key as item_id, r.value as recipe
  from legacy.menu_workspace w cross join lateral jsonb_each(case when jsonb_typeof(w.doc->'recipes') = 'object' then w.doc->'recipes' else '{}'::jsonb end) r
  where coalesce((r.value->>'verified')::boolean, r.value ? 'verifiedAt' or r.value ? 'verified_at', false)
),
macros as (
  select rec.item_id,
    round(sum(ing.kcal * g / 100))::int as kcal, round(sum(ing.protein * g / 100), 1) as protein,
    round(sum(ing.carbs * g / 100), 1) as carbs, round(sum(ing.fat * g / 100), 1) as fat, count(*) filter (where ing.id is null) as missing
  from rec
  cross join lateral jsonb_array_elements(coalesce(rec.recipe->'ingredients', rec.recipe->'items', '[]'::jsonb)) x
  cross join lateral (select coalesce(pg_temp.num(x, 'grams'), pg_temp.num(x, 'g'), 0) as g) gg
  left join ing on ing.id = coalesce(x->>'ingredientId', x->>'id')
  group by rec.item_id
)
update public.menu_items mi set kcal = m.kcal, protein_g = m.protein, carbs_g = m.carbs, fat_g = m.fat, macros_verified_at = now()
from macros m where mi.id = m.item_id and m.missing = 0 and mi.macros_verified_at is null;

select pg_temp.issue('menu_workspace', r.key, 'recipe-unmatched', 'Verified recipe "' || r.key || '" has no menu item with that id: Pete finishes it in the menu manager')
from legacy.menu_workspace w cross join lateral jsonb_each(case when jsonb_typeof(w.doc->'recipes') = 'object' then w.doc->'recipes' else '{}'::jsonb end) r
where coalesce((r.value->>'verified')::boolean, false) and not exists (select 1 from public.menu_items mi where mi.id = r.key);

commit;

-- What happened (printed by psql).
select legacy_table, kind, explained, count(*) as rows from legacy._issues group by 1, 2, 3 order by 3, 1, 2;
