-- =====================================================================================
-- SUPER1 · phase 3: Andy (owner, read-only) and Pete (admin).
-- Read models for O02–O05 and the admin dashboard, the Qashier import (versioned, service role),
-- price changes with history, and the admin inbox. Nothing here deletes anything.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Qashier import: one transaction. Same file twice → "already imported"; same day again → version n+1,
-- the previous version is marked superseded (kept). Called by the server with the service role.
-- -------------------------------------------------------------------------------------
create or replace function public.qashier_import(p_day jsonb, p_lines jsonb, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_date date := (p_day->>'business_date')::date; v_sha text := p_day->>'file_sha256'; v_ver int; v_id uuid; v_prev uuid;
begin
  select id into v_prev from public.qashier_imports where file_sha256 = v_sha limit 1;
  if v_prev is not null then
    return jsonb_build_object('status', 'already', 'id', v_prev);
  end if;
  perform pg_advisory_xact_lock(hashtext('qashier:' || v_date::text));
  select coalesce(max(version), 0) + 1 into v_ver from public.qashier_imports where business_date = v_date;
  update public.qashier_imports set superseded_at = now() where business_date = v_date and superseded_at is null;
  insert into public.qashier_imports (business_date, version, file_name, file_sha256, store, total_sales, net_sales, vat, cost, gross_profit,
    transactions, voided_transactions, raw, checks, imported_by)
  values (v_date, v_ver, p_day->>'file_name', v_sha, p_day->>'store', (p_day->>'total_sales')::numeric, (p_day->>'net_sales')::numeric,
    (p_day->>'vat')::numeric, coalesce((p_day->>'cost')::numeric, 0), (p_day->>'gross_profit')::numeric, (p_day->>'transactions')::int,
    coalesce((p_day->>'voided_transactions')::int, 0), coalesce(p_day->'raw', '{}'), coalesce(p_day->'checks', '[]'), p_user)
  returning id into v_id;
  insert into public.qashier_lines (import_id, section, name, category, qty, ex_vat, till, cost)
  select v_id, l->>'section', l->>'name', l->>'category', coalesce((l->>'qty')::numeric, 0), (l->>'ex_vat')::numeric, (l->>'till')::numeric, (l->>'cost')::numeric
  from jsonb_array_elements(p_lines) l;
  return jsonb_build_object('status', case when v_ver = 1 then 'imported' else 'replaced' end, 'id', v_id, 'version', v_ver);
end $$;

-- -------------------------------------------------------------------------------------
-- Prices: the new price applies at the desk at once; old and new go to plan_price_history.
-- -------------------------------------------------------------------------------------
create or replace function public.admin_set_plan_price(p_plan text, p_price integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old integer;
begin
  if not public.is_admin() then raise exception 'Only Pete can change prices.' using errcode = '42501'; end if;
  if p_price is null or p_price < 0 or p_price > 1000000 then raise exception 'Price must be whole baht.' using errcode = 'P0001'; end if;
  select price_thb into v_old from public.plans where id = p_plan for update;
  if v_old is null then raise exception 'Unknown plan %', p_plan using errcode = 'P0001'; end if;
  if v_old = p_price then return jsonb_build_object('changed', false); end if;
  update public.plans set price_thb = p_price where id = p_plan;
  insert into public.plan_price_history (plan_id, old_price, new_price, changed_by) values (p_plan, v_old, p_price, auth.uid());
  perform public.log_activity(null, 'plan.price', format('%s: ฿%s → ฿%s', p_plan, v_old, p_price), jsonb_build_object('plan', p_plan, 'old', v_old, 'new', p_price), null);
  return jsonb_build_object('changed', true, 'old', v_old, 'new', p_price);
end $$;

-- -------------------------------------------------------------------------------------
-- O02 visits: member check-ins vs day passes, yesterday, live pulse (computed from real rows).
-- -------------------------------------------------------------------------------------
create or replace function public.owner_visits(p_day date default public.today_bkk())
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'day', p_day,
      'members', count(*) filter (where business_date = p_day and result = 'allowed' and reason is distinct from 'day-pass'),
      'day_passes', count(*) filter (where business_date = p_day and result = 'allowed' and reason = 'day-pass'),
      'declined', count(*) filter (where business_date = p_day and result = 'declined'),
      'members_yesterday', count(*) filter (where business_date = p_day - 1 and result = 'allowed' and reason is distinct from 'day-pass'),
      'last_hour', count(*) filter (where business_date = p_day and result = 'allowed' and at > now() - interval '1 hour'),
      'last_30', count(*) filter (where business_date = p_day and result = 'allowed' and at > now() - interval '30 minutes'),
      'day_pass_sales', (select coalesce(sum(price_thb), 0) from public.sales where business_date = p_day and plan_id = 'day' and member_id is null),
      'app_orders', (select count(*) from public.cafe_orders where (created_at at time zone 'Asia/Bangkok')::date = p_day)
    )
    from public.checkins where business_date between p_day - 1 and p_day
  );
end $$;

-- -------------------------------------------------------------------------------------
-- O03 week: one row per day; Qashier totals only for imported days.
-- -------------------------------------------------------------------------------------
create or replace function public.owner_week(p_end date default public.today_bkk())
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    select jsonb_agg(jsonb_build_object(
      'day', d::date,
      'imported', q.id is not null,
      'total', q.total_sales,
      'transactions', q.transactions,
      'members', (select count(*) from public.checkins c where c.business_date = d::date and c.result = 'allowed' and c.reason is distinct from 'day-pass'),
      'day_passes', (select count(*) from public.checkins c where c.business_date = d::date and c.result = 'allowed' and c.reason = 'day-pass'),
      'new_members', (select count(*) from public.members m where m.root_id = m.id and (m.created_at at time zone 'Asia/Bangkok')::date = d::date and m.created_via <> 'import')
    ) order by d)
    from generate_series(p_end - 6, p_end, interval '1 day') d
    left join public.qashier_imports q on q.business_date = d::date and q.superseded_at is null
  );
end $$;

-- -------------------------------------------------------------------------------------
-- O04 members: standing counts by plan, who ends in the next 7 days, PT.
-- -------------------------------------------------------------------------------------
create or replace function public.owner_members(p_day date default public.today_bkk())
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gym_reader() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    with cards as (
      select m.id, trim(m.first_name || ' ' || m.last_name) as name, m.created_at, public.member_card(m.id, p_day) as c
      from public.members m where m.root_id = m.id and m.archived_at is null
    )
    select jsonb_build_object(
      'active', count(*) filter (where c->>'status' in ('active', 'expiring')),
      'expiring', count(*) filter (where c->>'status' = 'expiring'),
      'paused', count(*) filter (where c->>'status' = 'paused'),
      'new_month', (select count(*) from public.members m where m.root_id = m.id and m.created_via <> 'import'
                    and date_trunc('month', (m.created_at at time zone 'Asia/Bangkok')::date) = date_trunc('month', p_day)),
      'by_plan', (select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'n', n) order by n desc, plan), '[]'::jsonb) from (
                   select c->>'plan' as plan, count(*) as n from cards where c->>'status' in ('active', 'expiring') group by 1) x),
      'ending', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plan', c->>'plan', 'ends_on', c->>'cover_ends', 'days_left', (c->>'days_left')::int)
                   order by (c->>'days_left')::int, name), '[]'::jsonb)
                 from cards where c->>'status' = 'expiring'),
      'pt_active', (select count(*) from public.memberships where kind = 'pt' and voided_at is null and p_day between starts_on and ends_on and sessions_used < sessions_total),
      'pt_sessions_month', (select count(*) from public.pt_sessions where undone_at is null and date_trunc('month', (at at time zone 'Asia/Bangkok')::date) = date_trunc('month', p_day)),
      'pt_by_coach', (select coalesce(jsonb_agg(jsonb_build_object('coach', co.name, 'sessions', n) order by n desc), '[]'::jsonb) from (
                       select coach_id, count(*) n from public.pt_sessions where undone_at is null
                       and date_trunc('month', (at at time zone 'Asia/Bangkok')::date) = date_trunc('month', p_day) group by 1) s join public.coaches co on co.id = s.coach_id)
    ) from cards
  );
end $$;

-- -------------------------------------------------------------------------------------
-- Admin inbox: open merge requests with both members side by side.
-- -------------------------------------------------------------------------------------
create or replace function public.admin_merge_requests()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'requested_at', r.requested_at, 'note', r.note, 'by', s.name,
      'keep', public.admin_member_brief(r.keep_member_id), 'duplicate', public.admin_member_brief(r.duplicate_member_id)) order by r.requested_at)
    from public.merge_requests r left join public.staff s on s.id = r.requested_by_staff where r.status = 'open'), '[]'::jsonb);
end $$;

create or replace function public.admin_member_brief(p_member uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'member_no', m.member_no, 'name', trim(m.first_name || ' ' || m.last_name), 'phone', m.phone, 'email', m.email,
    'created_at', m.created_at, 'created_via', m.created_via,
    'visits', (select count(*) from public.checkins c join public.members g on g.id = c.member_id where g.root_id = m.root_id and c.result = 'allowed'),
    'tags', (select coalesce(jsonb_agg(c.code), '[]'::jsonb) from public.credentials c join public.members g on g.id = c.member_id where g.root_id = m.root_id and c.revoked_at is null),
    'plans', (select coalesce(jsonb_agg(jsonb_build_object('plan', x.plan_name, 'starts_on', x.starts_on, 'ends_on', x.ends_on) order by x.starts_on desc), '[]'::jsonb)
              from public.memberships x join public.members g on g.id = x.member_id where g.root_id = m.root_id and x.voided_at is null),
    'has_login', m.user_id is not null)
  from public.members m where m.id = p_member
$$;

-- Desk devices: Pete signs one out (or all, after a passcode change). Each desk device checks its row
-- and signs itself out; access tokens expire within the hour anyway.
create or replace function public.admin_sign_out_devices(p_device uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.desk_devices set signed_out_at = now() where (p_device is null or id = p_device) and signed_out_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- A desk device that was signed out by Pete asks to be let back in when the desk signs in again.
create or replace function public.desk_device_ok(p_device uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select signed_out_at is null from public.desk_devices where id = p_device), false)
$$;

revoke execute on function public.qashier_import(jsonb, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.admin_set_plan_price(text, integer), public.owner_visits(date), public.owner_week(date), public.owner_members(date),
  public.admin_merge_requests(), public.admin_member_brief(uuid), public.admin_sign_out_devices(uuid), public.desk_device_ok(uuid) from public, anon;
grant execute on function public.admin_set_plan_price(text, integer), public.owner_visits(date), public.owner_week(date), public.owner_members(date),
  public.admin_merge_requests(), public.admin_member_brief(uuid), public.admin_sign_out_devices(uuid), public.desk_device_ok(uuid) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.qashier_import(jsonb, jsonb, uuid) to service_role;
  end if;
end $$;
