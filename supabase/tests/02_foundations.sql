-- Phase 0 checks: languages per login. Runs on its own database (scripts/db-test.sh).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'higgywane@gmail.com'),
  ('00000000-0000-0000-0000-00000000a005', 'emma.wilson@gmail.com');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'admin', 'Pete'),
  ('00000000-0000-0000-0000-00000000a005', 'member', 'Emma Wilson');
insert into public.members (id, first_name, last_name, email, user_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'Emma', 'Wilson', 'emma.wilson@gmail.com', '00000000-0000-0000-0000-00000000a005');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
select public.set_my_lang('th');
reset role;
select pg_temp.ok((select lang from public.profiles where id = '00000000-0000-0000-0000-00000000a001') = 'th', 'Pete switches his login to ไทย');
set role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a005', false);
select public.set_my_lang('ru');
reset role;
select pg_temp.ok((select lang from public.profiles where id = '00000000-0000-0000-0000-00000000a005') = 'ru', 'Emma switches her login to Русский');
select pg_temp.ok((select lang from public.members where id = '00000000-0000-0000-0000-0000000000e1') = 'ru', 'her member record follows, so emails come in Russian');
select pg_temp.ok((select lang from public.profiles where id = '00000000-0000-0000-0000-00000000a001') = 'th', 'Emma cannot change Pete''s language');
set role authenticated;

do $$
begin
  perform public.set_my_lang('de');
  raise exception 'FAIL: accepted an unknown language';
exception when others then
  perform pg_temp.ok(sqlerrm like 'Unknown language%', 'unknown languages are refused');
end $$;

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000a005';
reset role;
select pg_temp.ok((select role from public.profiles where id = '00000000-0000-0000-0000-00000000a005') = 'member', 'a member cannot make herself admin');
set role authenticated;

select set_config('request.jwt.claim.sub', '', false);
reset role;
set role anon;
do $$
begin
  perform public.set_my_lang('th');
  raise exception 'FAIL: anon changed a language';
exception when others then
  perform pg_temp.ok(sqlerrm like '%permission denied%' or sqlerrm = 'not allowed', 'no login, no language change');
end $$;
reset role;
