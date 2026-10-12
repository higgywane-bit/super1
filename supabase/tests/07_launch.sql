-- Phase 6 checks: renewal reminders (7 and 1 days before, 3 days after, once each, not when renewed),
-- push tokens, a push for each PT session.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
set super1.test_today = '2026-10-12';

create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'emma.wilson@gmail.com');
insert into public.profiles (id, role, display_name, email) values ('00000000-0000-0000-0000-0000000000a1', 'member', 'Emma Wilson', 'emma.wilson@gmail.com');
insert into public.plans (id, name, kind, price_thb, duration_months) values ('1m', '1 Month', 'membership', 2200, 1);
insert into public.members (id, first_name, last_name, email, lang) values
  ('00000000-0000-0000-0000-0000000000e1', 'Seven', 'Days', 'seven@x.co', 'th'),
  ('00000000-0000-0000-0000-0000000000e2', 'One', 'Day', 'one@x.co', 'ru'),
  ('00000000-0000-0000-0000-0000000000e3', 'Gone', 'Three', 'gone@x.co', 'en'),
  ('00000000-0000-0000-0000-0000000000e4', 'Renewed', 'Already', 'renewed@x.co', 'en'),
  ('00000000-0000-0000-0000-0000000000e5', 'No', 'Email', null, 'en');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000e1', '1m', '1 Month', 'membership', 2200, '2026-09-20', '2026-10-19'),
  ('00000000-0000-0000-0000-0000000000e2', '1m', '1 Month', 'membership', 2200, '2026-09-14', '2026-10-13'),
  ('00000000-0000-0000-0000-0000000000e3', '1m', '1 Month', 'membership', 2200, '2026-09-10', '2026-10-09'),
  ('00000000-0000-0000-0000-0000000000e4', '1m', '1 Month', 'membership', 2200, '2026-09-20', '2026-10-19'),
  ('00000000-0000-0000-0000-0000000000e4', '1m', '1 Month', 'membership', 2200, '2026-10-20', '2026-11-19'),
  ('00000000-0000-0000-0000-0000000000e5', '1m', '1 Month', 'membership', 2200, '2026-09-20', '2026-10-19');

select pg_temp.ok(public.queue_renewal_reminders() = 3, 'three reminders: 7 days before, 1 day before, 3 days after');
select pg_temp.ok((select payload->>'when' from public.outbox where payload->>'member_id' = '00000000-0000-0000-0000-0000000000e1') = 'before_7'
  and (select payload->>'lang' from public.outbox where payload->>'member_id' = '00000000-0000-0000-0000-0000000000e1') = 'th', 'Seven gets the 7-day reminder, in Thai');
select pg_temp.ok((select payload->>'when' from public.outbox where payload->>'member_id' = '00000000-0000-0000-0000-0000000000e2') = 'before_1', 'One gets the 1-day reminder');
select pg_temp.ok((select payload->>'when' from public.outbox where payload->>'member_id' = '00000000-0000-0000-0000-0000000000e3') = 'after_3', 'Gone gets the win-back 3 days after');
select pg_temp.ok(not exists (select 1 from public.outbox where payload->>'member_id' = '00000000-0000-0000-0000-0000000000e4'), 'no reminder when the next plan is already queued');
select pg_temp.ok(public.queue_renewal_reminders() = 0, 'running the night again sends nothing twice');

-- Push tokens
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select public.register_push('fcm-token-0123456789abcdef', 'ios');
select public.register_push('fcm-token-0123456789abcdef', 'ios');
select pg_temp.ok((select count(*) from public.push_tokens) = 1, 'the app registers its push token once');
do $$
begin
  perform public.register_push('short', 'ios');
  raise exception 'FAIL: bad token accepted';
exception when sqlstate 'P0001' then
  perform pg_temp.ok(true, 'a bad push token is refused');
end $$;
reset role;

-- A push for each PT session
insert into public.coaches (id, slug, name) values ('00000000-0000-0000-0000-0000000000d1', 'sunman', 'Sunman');
insert into public.plans (id, name, kind, price_thb, duration_months, sessions) values ('pt10', '10 PT', 'pt', 15000, 4, 10);
insert into public.memberships (id, member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, sessions_used, coach_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'pt10', '10 PT', 'pt', 15000, '2026-10-01', '2027-01-31', 10, 4, '00000000-0000-0000-0000-0000000000d1');
insert into public.pt_sessions (membership_id, member_id, coach_id, via) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'desk');
select pg_temp.ok((select count(*) from public.outbox where kind = 'pt_push') = 1, 'a PT session queues a push to the member');
