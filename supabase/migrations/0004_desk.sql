-- =====================================================================================
-- SUPER1 · phase 1: front desk and the counter QR.
--
-- Read models for the desk screens (one call per screen, rules stay in SQL), a manual check-in
-- by member that goes through desk_check_in, shifts, desk → Pete messages, the outbox claim used
-- by the worker, the /join rate limit, and the nightly "abandoned sign-up" sweep.
-- Nothing here deletes or rewrites history.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Outbox: the worker claims rows so two runs never send the same email.
-- -------------------------------------------------------------------------------------
alter table public.outbox add column if not exists claimed_at timestamptz;

create or replace function public.outbox_claim(p_limit integer default 20)
returns setof public.outbox language sql security definer set search_path = public as $$
  update public.outbox o set claimed_at = now(), attempts = o.attempts + 1
  where o.id in (
    select id from public.outbox
    where sent_at is null and attempts < 8 and (claimed_at is null or claimed_at < now() - interval '2 minutes')
    order by id
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning o.*
$$;

create or replace function public.outbox_done(p_id bigint) returns void
language sql security definer set search_path = public as $$
  update public.outbox set sent_at = now(), last_error = null where id = p_id and sent_at is null
$$;

create or replace function public.outbox_failed(p_id bigint, p_error text) returns void
language sql security definer set search_path = public as $$
  update public.outbox set claimed_at = null, last_error = left(p_error, 1000) where id = p_id and sent_at is null
$$;

-- -------------------------------------------------------------------------------------
-- /join abuse protection: at most N sign-ups per IP (hashed) per window. Append-only.
-- -------------------------------------------------------------------------------------
create table public.join_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index join_attempts_ip_idx on public.join_attempts (ip_hash, at desc);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;
create trigger join_attempts_no_delete before delete on public.join_attempts for each row execute function public.forbid_delete();
create trigger join_attempts_no_truncate before truncate on public.join_attempts for each statement execute function public.forbid_delete();

create or replace function public.join_attempt_ok(p_ip_hash text, p_max integer default 5, p_window_minutes integer default 10)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  select count(*) into v_n from public.join_attempts where ip_hash = p_ip_hash and at > now() - make_interval(mins => p_window_minutes);
  if v_n >= p_max then return false; end if;
  insert into public.join_attempts (ip_hash) values (p_ip_hash);
  return true;
end $$;

-- -------------------------------------------------------------------------------------
-- Shifts and desk devices
-- -------------------------------------------------------------------------------------

-- Start a shift on this device: ends the device's open shift and opens one for the staff member.
create or replace function public.desk_start_shift(p_device uuid, p_staff uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  if p_staff is null then raise exception 'Pick who is on shift first.' using errcode = 'P0001'; end if;
  update public.shifts set ended_at = now() where device_id is not distinct from p_device and ended_at is null;
  insert into public.shifts (device_id, staff_id) values (p_device, p_staff) returning id into v_id;
  if p_device is not null then update public.desk_devices set last_seen_at = now() where id = p_device; end if;
  return v_id;
end $$;

-- -------------------------------------------------------------------------------------
-- Manual check-in by member ("type a name"): the same door rules, recorded under the staff on shift.
-- -------------------------------------------------------------------------------------
create or replace function public.desk_check_in_member(p_member uuid, p_device uuid, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select c.code into v_code from public.credentials c join public.members g on g.id = c.member_id
  where g.root_id = public.member_root(p_member) and c.revoked_at is null
  order by (c.kind = 'tag') desc, c.created_at desc limit 1;
  if v_code is null then raise exception 'This member has no tag yet. Attach one first.' using errcode = 'P0001'; end if;
  return public.desk_check_in(v_code, p_device, 'manual', p_staff);
end $$;

-- Attach a new tag to an existing member (a lost tag, or a member without one).
create or replace function public.desk_add_tag(p_member uuid, p_tag text, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tag text := public.normalize_code(p_tag); v_root uuid := public.member_root(p_member);
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  if length(v_tag) < 3 then raise exception 'Scan or type the tag number.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.credentials where code = v_tag) then raise exception 'Tag % is already in use.', v_tag using errcode = 'P0001'; end if;
  insert into public.credentials (member_id, kind, code, created_by_staff) values (v_root, 'tag', v_tag, p_staff);
  perform public.log_activity(v_root, 'credential.added', 'Tag ' || v_tag || ' attached', jsonb_build_object('code', v_tag), p_staff);
  return jsonb_build_object('code', v_tag);
end $$;

-- -------------------------------------------------------------------------------------
-- Desk → Pete messages (replaces the old staff email function). Pete's replies arrive in phase 3.
-- -------------------------------------------------------------------------------------
create or replace function public.desk_message_pete(p_body text, p_staff uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  if nullif(trim(p_body), '') is null then raise exception 'Write a message first.' using errcode = 'P0001'; end if;
  insert into public.messages (from_side, staff_id, user_id, body) values ('desk', p_staff, auth.uid(), trim(p_body)) returning id into v_id;
  insert into public.outbox (kind, payload) values ('support_email', jsonb_build_object('message_id', v_id));
  return v_id;
end $$;

-- -------------------------------------------------------------------------------------
-- Read models for the desk. Each returns plain data; the screens turn it into words (EN/TH).
-- -------------------------------------------------------------------------------------

-- Today feed (D02): door decisions, new members, sales and PT sessions for one business day.
create or replace function public.desk_feed(p_day date default public.today_bkk(), p_limit integer default 80)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_rows jsonb; v_total int; v_hour int;
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  with door as (
    select c.at, case when c.result = 'allowed' then (case when c.reason = 'day-pass' then 'daypass' else 'ok' end) else 'no' end as kind,
      c.member_id, c.reason, c.code, s.name as by_name, null::jsonb as extra
    from public.checkins c left join public.staff s on s.id = c.staff_id
    where c.business_date = p_day
  ),
  acts as (
    select a.at,
      case a.kind when 'member.created' then 'new' when 'membership.sold' then 'sale' when 'pt.used' then 'pt' end as kind,
      a.member_id, null::text as reason, null::text as code,
      coalesce(s.name, case when a.actor = 'coach' then (select co.name from public.coaches co where co.user_id = a.user_id) end) as by_name,
      case a.kind
        when 'membership.sold' then (
          select jsonb_build_object('plan', m.plan_name, 'kind', m.kind, 'price', m.price_thb, 'method', sa.method, 'starts_on', m.starts_on, 'ends_on', m.ends_on)
          from public.memberships m left join public.sales sa on sa.id = m.sale_id where m.id = (a.data->>'membership_id')::uuid)
        when 'member.created' then (
          select jsonb_build_object('plan', m.plan_name, 'price', m.price_thb, 'tag', (select code from public.credentials where member_id = a.member_id order by created_at limit 1),
                                    'coach', (select name from public.coaches where id = (a.data->>'coach_id')::uuid))
          from public.memberships m where m.member_id = a.member_id order by m.created_at limit 1)
        when 'pt.used' then (
          select jsonb_build_object('coach', co.name, 'total', m.sessions_total, 'undone', p.undone_at is not null, 'session_id', p.id,
            -- left right after this session: today's balance plus the sessions taken since
            'left', m.sessions_total - m.sessions_used + (select count(*) from public.pt_sessions x where x.membership_id = m.id and x.undone_at is null and x.at > p.at))
          from public.pt_sessions p join public.memberships m on m.id = p.membership_id join public.coaches co on co.id = p.coach_id
          where p.id = (a.data->>'session_id')::uuid)
      end as extra
    from public.activity a left join public.staff s on s.id = a.staff_id
    where a.kind in ('member.created', 'membership.sold', 'pt.used')
      -- business date of the row; the offset is 0 except when tests pin super1.test_today
      and (a.at at time zone 'Asia/Bangkok')::date + (public.today_bkk() - (now() at time zone 'Asia/Bangkok')::date) = p_day
  ),
  rows as (
    select * from door union all select * from acts where kind is not null
  )
  select coalesce(jsonb_agg(r order by r.at desc), '[]'::jsonb) into v_rows from (
    select x.at, x.kind, x.reason, x.code, x.by_name as by, x.extra,
      x.member_id, trim(m.first_name || ' ' || m.last_name) as name,
      case when x.member_id is not null and x.kind in ('ok', 'no') then public.member_card(x.member_id, p_day) end as card
    from rows x left join public.members m on m.id = public.member_root(x.member_id)
    where not (x.kind = 'pt' and coalesce((x.extra->>'undone')::boolean, false))
    order by x.at desc limit p_limit
  ) r;
  select count(*) filter (where result = 'allowed'), count(*) filter (where result = 'allowed' and at > now() - interval '1 hour')
    into v_total, v_hour from public.checkins where business_date = p_day;
  return jsonb_build_object('day', p_day, 'checkins', v_total, 'last_hour', v_hour, 'rows', v_rows);
end $$;

-- Members list (D05): search name, phone, tag, email or member number; filter by status.
create or replace function public.desk_members(p_q text default '', p_filter text default 'all', p_limit integer default 200)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_q text := lower(trim(coalesce(p_q, ''))); v_digits text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g'); v_code text := public.normalize_code(p_q);
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row_data order by sort_name) from (
      select lower(m.first_name || ' ' || m.last_name) as sort_name,
        jsonb_build_object(
          'id', m.id, 'member_no', m.member_no, 'name', trim(m.first_name || ' ' || m.last_name), 'phone', m.phone, 'email', m.email,
          'lang', m.lang, 'archived', m.archived_at is not null, 'archived_at', m.archived_at,
          'tag', (select c.code from public.credentials c join public.members g on g.id = c.member_id
                  where g.root_id = m.id and c.revoked_at is null order by (c.kind = 'tag') desc, c.created_at desc limit 1),
          'last_visit', (select max(c.business_date) from public.checkins c join public.members g on g.id = c.member_id where g.root_id = m.id and c.result = 'allowed'),
          'card', card) as row_data,
        case when m.archived_at is not null then 'archived' else card->>'status' end as st
      from public.members m
      cross join lateral (select public.member_card(m.id) as card) k
      where m.root_id = m.id
        and (v_q = '' or lower(m.first_name || ' ' || m.last_name) like '%' || v_q || '%'
             or lower(coalesce(m.nickname, '')) like '%' || v_q || '%'
             or lower(coalesce(m.email, '')) like '%' || v_q || '%'
             or (length(v_digits) >= 3 and regexp_replace(coalesce(m.phone, ''), '[^0-9]', '', 'g') like '%' || v_digits || '%')
             or m.member_no::text = v_digits
             or exists (select 1 from public.credentials c join public.members g on g.id = c.member_id where g.root_id = m.id and c.code like v_code || '%' and length(v_code) >= 3))
    ) x
    where (p_filter = 'all' and st <> 'archived') or st = p_filter
    limit greatest(1, least(p_limit, 500))
  ), '[]'::jsonb);
end $$;

-- Member profile (D06, D10): the card, plans, tags, pauses, history, visits, waiver, app status, likely duplicates.
create or replace function public.desk_member_detail(p_member uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_root uuid := public.member_root(p_member); v_m public.members; v_digits text;
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.members where id = v_root;
  if v_m.id is null then raise exception 'Unknown member' using errcode = 'P0001'; end if;
  v_digits := regexp_replace(coalesce(v_m.phone, ''), '[^0-9]', '', 'g');
  return jsonb_build_object(
    'member', jsonb_build_object('id', v_m.id, 'member_no', v_m.member_no, 'first_name', v_m.first_name, 'last_name', v_m.last_name,
      'name', trim(v_m.first_name || ' ' || v_m.last_name), 'phone', v_m.phone, 'email', v_m.email, 'lang', v_m.lang,
      'created_via', v_m.created_via, 'created_at', v_m.created_at, 'archived_at', v_m.archived_at, 'archive_reason', v_m.archive_reason,
      'has_login', v_m.user_id is not null,
      'created_by', (select name from public.staff where id = v_m.created_by_staff),
      'merged_members', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'member_no', g.member_no)), '[]'::jsonb) from public.members g where g.root_id = v_root and g.id <> v_root)),
    'card', public.member_card(v_root),
    'memberships', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'plan_id', m.plan_id, 'plan', m.plan_name, 'kind', m.kind, 'price', m.price_thb,
        'starts_on', m.starts_on, 'ends_on', m.ends_on, 'sessions_total', m.sessions_total, 'sessions_used', m.sessions_used,
        'coach', co.name, 'coach_id', m.coach_id, 'method', sa.method, 'sold_by', st.name, 'sold_at', m.created_at, 'voided', m.voided_at is not null)
        order by m.starts_on desc, m.created_at desc), '[]'::jsonb)
      from public.memberships m join public.members g on g.id = m.member_id
      left join public.coaches co on co.id = m.coach_id left join public.sales sa on sa.id = m.sale_id left join public.staff st on st.id = coalesce(sa.staff_id, m.created_by_staff)
      where g.root_id = v_root),
    'credentials', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'kind', c.kind, 'code', c.code, 'revoked', c.revoked_at is not null) order by c.created_at desc), '[]'::jsonb)
      from public.credentials c join public.members g on g.id = c.member_id where g.root_id = v_root),
    'pauses', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'from', p.from_date, 'until', p.until_date, 'reason', p.reason) order by p.from_date desc), '[]'::jsonb)
      from public.member_pauses p join public.members g on g.id = p.member_id where g.root_id = v_root and p.cancelled_at is null),
    'history', (select coalesce(jsonb_agg(h order by (h->>'at') desc), '[]'::jsonb) from (
        select jsonb_build_object('at', a.at, 'kind', a.kind, 'message', a.message, 'data', a.data, 'by', coalesce(s.name, case a.actor when 'admin' then 'Pete' end)) as h
        from public.activity a join public.members g on g.id = a.member_id left join public.staff s on s.id = a.staff_id
        where g.root_id = v_root order by a.at desc limit 30) hx),
    'visits', (select coalesce(jsonb_agg(v order by (v->>'at') desc), '[]'::jsonb) from (
        select jsonb_build_object('at', c.at, 'day', c.business_date, 'result', c.result, 'reason', c.reason) as v
        from public.checkins c join public.members g on g.id = c.member_id where g.root_id = v_root order by c.at desc limit 10) vx),
    'waiver', (select jsonb_build_object('signed_at', s.created_at, 'version', w.version, 'signature_path', s.signature_path)
      from public.signups s left join public.waiver_versions w on w.id = s.waiver_version_id
      join public.members g on g.id = s.member_id where g.root_id = v_root and s.kind = 'new' order by s.created_at limit 1),
    'invite', (select jsonb_build_object('created_at', i.created_at, 'sent_at', i.sent_at, 'accepted_at', i.accepted_at, 'email', i.email)
      from public.invites i join public.members g on g.id = i.member_id where g.root_id = v_root order by i.created_at desc limit 1),
    'open_merge', (select jsonb_build_object('id', r.id, 'requested_at', r.requested_at) from public.merge_requests r
      where r.status = 'open' and (r.keep_member_id = v_root or r.duplicate_member_id = v_root) order by r.requested_at desc limit 1),
    'duplicates', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'member_no', o.member_no, 'name', trim(o.first_name || ' ' || o.last_name),
          'created_at', o.created_at, 'archived', o.archived_at is not null,
          'visits', (select count(*) from public.checkins c join public.members g on g.id = c.member_id where g.root_id = o.id and c.result = 'allowed'))), '[]'::jsonb)
      from public.members o
      where o.root_id = o.id and o.id <> v_root
        and ((length(v_digits) >= 6 and regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g') = v_digits)
          or (v_m.email is not null and lower(o.email) = lower(v_m.email)))),
    'visits_total', (select count(*) from public.checkins c join public.members g on g.id = c.member_id where g.root_id = v_root and c.result = 'allowed')
  );
end $$;

-- PT clients for "Log PT session" (D09): members with a valid PT pack today.
create or replace function public.desk_pt_clients(p_q text default '')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_q text := lower(trim(coalesce(p_q, ''))); v_today date := public.today_bkk();
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x->>'name') from (
    select jsonb_build_object('member_id', g.root_id, 'name', trim(r.first_name || ' ' || r.last_name), 'coach', co.name,
      'left', m.sessions_total - m.sessions_used, 'total', m.sessions_total, 'ends_on', m.ends_on) as x
    from public.memberships m join public.members g on g.id = m.member_id join public.members r on r.id = g.root_id
    join public.coaches co on co.id = m.coach_id
    where m.kind = 'pt' and m.voided_at is null and v_today between m.starts_on and m.ends_on and m.sessions_used < m.sessions_total
      and r.archived_at is null and (v_q = '' or lower(r.first_name || ' ' || r.last_name) like '%' || v_q || '%')
    limit 100) s), '[]'::jsonb);
end $$;

-- -------------------------------------------------------------------------------------
-- Nightly: a sign-up nobody finished within 24 hours is marked abandoned (kept, never deleted).
-- -------------------------------------------------------------------------------------
create or replace function public.mark_abandoned_signups() returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.signups set status = 'abandoned' where status = 'waiting' and created_at < now() - interval '24 hours';
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- -------------------------------------------------------------------------------------
-- Grants. New functions are executable by PUBLIC by default; tighten them.
-- -------------------------------------------------------------------------------------
revoke execute on function public.outbox_claim(integer), public.outbox_done(bigint), public.outbox_failed(bigint, text),
  public.join_attempt_ok(text, integer, integer), public.mark_abandoned_signups() from public, anon, authenticated;
revoke execute on function public.desk_start_shift(uuid, uuid), public.desk_check_in_member(uuid, uuid, uuid), public.desk_add_tag(uuid, text, uuid),
  public.desk_message_pete(text, uuid), public.desk_feed(date, integer), public.desk_members(text, text, integer),
  public.desk_member_detail(uuid), public.desk_pt_clients(text) from public, anon;
grant execute on function public.desk_start_shift(uuid, uuid), public.desk_check_in_member(uuid, uuid, uuid), public.desk_add_tag(uuid, text, uuid),
  public.desk_message_pete(text, uuid), public.desk_feed(date, integer), public.desk_members(text, text, integer),
  public.desk_member_detail(uuid), public.desk_pt_clients(text) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.outbox_claim(integer), public.outbox_done(bigint), public.outbox_failed(bigint, text),
      public.join_attempt_ok(text, integer, integer), public.mark_abandoned_signups() to service_role;
  end if;
end $$;

-- Live updates for the desk: sign-ups, check-ins, PT sessions and messages are already published;
-- activity (sales, new members) joins them so the Today feed updates on every desk device.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.activity;
  end if;
end $$;
