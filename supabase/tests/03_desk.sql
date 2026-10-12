-- Phase 1 checks: desk read models, manual check-in, shifts, messages, outbox claim, /join limit.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
set super1.test_today = '2026-10-12';

create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'higgywane@gmail.com'),
  ('00000000-0000-0000-0000-00000000a003', 'desk@superfitphuket.com'),
  ('00000000-0000-0000-0000-00000000a005', 'emma.wilson@gmail.com');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'admin', 'Pete'),
  ('00000000-0000-0000-0000-00000000a003', 'desk', 'Front desk'),
  ('00000000-0000-0000-0000-00000000a005', 'member', 'Emma Wilson');
insert into public.staff (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Joy');
insert into public.coaches (id, slug, name) values ('00000000-0000-0000-0000-0000000000c1', 'sunman', 'Sunman');
insert into public.plans (id, name, kind, price_thb, duration_days, duration_months, sessions) values
  ('day', 'Day Pass', 'membership', 250, 1, null, null),
  ('1w', '1 Week', 'membership', 1200, 7, null, null),
  ('1m', '1 Month', 'membership', 2200, null, 1, null),
  ('pt10', '10 PT sessions', 'pt', 15000, null, 4, 10);
insert into public.waiver_versions (version, texts) values (1, '{"en":["I train at my own risk."]}');

insert into public.members (id, first_name, last_name, phone, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Emma', 'Wilson', '+44 7700 900456', 'emma.wilson@gmail.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'Natalia', 'Orlova', '+7 999 555 0123', null),
  ('00000000-0000-0000-0000-0000000000f2', 'Natalia', 'Orlova', '+7 999 555 0123', null),
  ('00000000-0000-0000-0000-0000000000a9', 'Tom', 'Reid', null, null);
insert into public.credentials (member_id, kind, code) values
  ('00000000-0000-0000-0000-0000000000e1', 'tag', '003909'),
  ('00000000-0000-0000-0000-0000000000f1', 'tag', '000957'),
  ('00000000-0000-0000-0000-0000000000f2', 'tag', '001877');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000e1', '1m', '1 Month', 'membership', 2200, '2026-10-01', '2026-10-31'),
  ('00000000-0000-0000-0000-0000000000f1', '1m', '1 Month', 'membership', 2200, '2026-10-10', '2026-11-09'),
  ('00000000-0000-0000-0000-0000000000f2', '1w', '1 Week', 'membership', 1200, '2026-10-03', '2026-10-09');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'pt10', '10 PT sessions', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, '00000000-0000-0000-0000-0000000000c1');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);

-- Shifts
do $$
declare d uuid; s1 uuid; s2 uuid;
begin
  insert into public.desk_devices (label) values ('Desk iPad') returning id into d;
  s1 := public.desk_start_shift(d, '00000000-0000-0000-0000-0000000000b1');
  s2 := public.desk_start_shift(d, '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.ok((select count(*) from public.shifts where device_id = d and ended_at is null) = 1, 'one open shift per desk device');
end $$;
do $$
begin
  perform public.desk_start_shift(null, null);
  raise exception 'FAIL: shift without staff';
exception when others then
  perform pg_temp.ok(sqlerrm like 'Pick who is on shift%', 'a shift needs a name');
end $$;

-- Manual check-in by member goes through the door rules and records the staff
select pg_temp.ok((public.desk_check_in_member('00000000-0000-0000-0000-0000000000e1', null, '00000000-0000-0000-0000-0000000000b1')->>'allowed')::boolean, 'type a name: Emma checked in by hand');
select pg_temp.ok((select staff_id from public.checkins where code = '003909' order by at desc limit 1) = '00000000-0000-0000-0000-0000000000b1', 'manual check-in records Joy');
select pg_temp.ok(public.desk_check_in_member('00000000-0000-0000-0000-0000000000f2', null, '00000000-0000-0000-0000-0000000000b1')->>'reason' = 'expired', 'by hand, Natalia #1188 is still declined');
do $$
begin
  perform public.desk_check_in_member('00000000-0000-0000-0000-0000000000a9', null, '00000000-0000-0000-0000-0000000000b1');
  raise exception 'FAIL: checked in without a tag';
exception when others then
  perform pg_temp.ok(sqlerrm like 'This member has no tag%', 'no tag, no manual check-in');
end $$;
do $$
begin
  perform public.desk_check_in_member('00000000-0000-0000-0000-0000000000e1', null, null);
  raise exception 'FAIL: manual without staff';
exception when others then
  perform pg_temp.ok(sqlerrm like 'Pick who is on shift%', 'manual check-in needs the staff on shift');
end $$;

-- Tags
select pg_temp.ok(public.desk_add_tag('00000000-0000-0000-0000-0000000000a9', '004-555', '00000000-0000-0000-0000-0000000000b1')->>'code' = '004555', 'Tom gets tag 004555');
do $$
begin
  perform public.desk_add_tag('00000000-0000-0000-0000-0000000000a9', '003909', '00000000-0000-0000-0000-0000000000b1');
  raise exception 'FAIL: reused a tag';
exception when others then
  perform pg_temp.ok(sqlerrm like 'Tag 003909 is already in use%', 'a tag can''t be given twice');
end $$;

-- Sell, PT, then the feed shows every kind
select public.desk_sell('00000000-0000-0000-0000-0000000000f2', '1w', 'cash', '00000000-0000-0000-0000-0000000000b1');
select public.use_pt_session('00000000-0000-0000-0000-0000000000e1', 'desk', '00000000-0000-0000-0000-0000000000b1');
do $$
declare f jsonb; kinds text[];
begin
  f := public.desk_feed();
  select array_agg(distinct r->>'kind') into kinds from jsonb_array_elements(f->'rows') r;
  perform pg_temp.ok(kinds @> array['ok', 'no', 'sale', 'pt'], 'Today feed has allowed, declined, sale and PT rows');
  perform pg_temp.ok((f->>'checkins')::int = 1, 'feed counts allowed check-ins');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(f->'rows') r where r->>'kind' = 'pt' and (r->'extra'->>'left')::int = 5 and r->'extra'->>'coach' = 'Sunman'), 'PT row says Sunman · 5 left');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(f->'rows') r where r->>'kind' = 'sale' and r->'extra'->>'plan' = '1 Week' and r->>'by' = 'Joy'), 'sale row says 1 Week, sold by Joy');
end $$;

-- Members list
select pg_temp.ok(jsonb_array_length(public.desk_members('natalia')) = 2, 'search by name finds both Natalias');
select pg_temp.ok(public.desk_members('0039')->0->>'name' = 'Emma Wilson', 'search by tag');
select pg_temp.ok(public.desk_members('900456')->0->>'name' = 'Emma Wilson', 'search by phone digits');
select pg_temp.ok(jsonb_array_length(public.desk_members('', 'none')) = 1, 'No plan filter finds Tom');

-- Profile: likely duplicate by phone
select pg_temp.ok(jsonb_array_length(public.desk_member_detail('00000000-0000-0000-0000-0000000000f2')->'duplicates') = 1, 'profile spots #0957 as a likely duplicate (same phone)');
select pg_temp.ok((public.desk_member_detail('00000000-0000-0000-0000-0000000000e1')->'card'->>'days_left')::int = 19, 'profile card: 19 days left');

-- PT clients
select pg_temp.ok(public.desk_pt_clients('emm')->0->>'coach' = 'Sunman', 'Log PT session lists Emma with Sunman');

-- Message Pete writes the message and an outbox row
select public.desk_message_pete('Tag reader at the door is slow', '00000000-0000-0000-0000-0000000000b1');
reset role;
select pg_temp.ok((select count(*) from public.outbox where kind = 'support_email') = 1, 'message to Pete queues an email');

-- Outbox claim: a claimed row isn't claimed again until it is released or stale
do $$
declare a int; b int; id1 bigint;
begin
  select count(*) into a from public.outbox_claim(10);
  select count(*) into b from public.outbox_claim(10);
  perform pg_temp.ok(a >= 1 and b = 0, 'claimed rows are not handed out twice');
  select id into id1 from public.outbox where kind = 'support_email';
  perform public.outbox_done(id1);
  perform pg_temp.ok((select sent_at is not null from public.outbox where id = id1), 'sent rows are stamped');
end $$;

-- /join limit: 5 per IP per 10 minutes
do $$
declare i int; okc int := 0;
begin
  for i in 1..7 loop
    if public.join_attempt_ok('iphash-1') then okc := okc + 1; end if;
  end loop;
  perform pg_temp.ok(okc = 5, 'sixth sign-up from one IP within 10 minutes is refused');
  perform pg_temp.ok(public.join_attempt_ok('iphash-2'), 'another IP is fine');
end $$;

-- Abandoned sign-ups
insert into public.signups (first_name, phone, created_at) values ('Old', '0811', now() - interval '2 days'), ('New', '0812', now());
select pg_temp.ok(public.mark_abandoned_signups() = 1, 'only sign-ups older than 24 h are marked abandoned');

-- Members can't use the desk read models; anon can't touch the outbox
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a005', false);
do $$
begin
  perform public.desk_feed();
  raise exception 'FAIL: member read the desk feed';
exception when others then
  perform pg_temp.ok(sqlerrm = 'not allowed', 'a member can''t read the desk feed');
end $$;
do $$
begin
  perform public.outbox_claim(1);
  raise exception 'FAIL: member claimed outbox';
exception when others then
  perform pg_temp.ok(sqlerrm like '%permission denied%', 'only the server can claim outbox rows');
end $$;
reset role;

-- Counter QR: a link request needs tag + email, not a waiver; a new sign-up still needs the signature
set role anon;
do $$
declare r jsonb;
begin
  r := public.create_signup('{"kind":"link","first_name":"Mark","link_tag":"002231","email":"mark@x.com","lang":"en"}');
  perform pg_temp.ok(r->>'id' is not null, 'an existing member can ask to link tag 002231 without a new waiver');
  begin
    perform public.create_signup('{"kind":"new","first_name":"Ivan","phone":"+7 916","lang":"ru"}');
    raise exception 'FAIL: new sign-up without signature';
  exception when others then
    perform pg_temp.ok(sqlerrm = 'The waiver must be signed.', 'a new sign-up still needs agree + signature');
  end;
  begin
    perform public.create_signup('{"kind":"link","first_name":"Mark","link_tag":"","email":"mark@x.com"}');
    raise exception 'FAIL: link without tag';
  exception when others then
    perform pg_temp.ok(sqlerrm like 'Type the number%', 'a link request needs the tag number');
  end;
end $$;
reset role;
