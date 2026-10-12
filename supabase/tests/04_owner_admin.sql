-- Phase 3 checks: Qashier import versions, prices with history, Andy read-only, admin inbox, devices.
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
  ('00000000-0000-0000-0000-00000000a002', 'andy@superfitphuket.com'),
  ('00000000-0000-0000-0000-00000000a003', 'desk@superfitphuket.com');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000a001', 'admin', 'Pete'),
  ('00000000-0000-0000-0000-00000000a002', 'owner', 'Andy'),
  ('00000000-0000-0000-0000-00000000a003', 'desk', 'Front desk');
insert into public.staff (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Joy');
insert into public.plans (id, name, kind, price_thb, duration_days, duration_months) values
  ('day', 'Day Pass', 'membership', 250, 1, null), ('1m', '1 Month', 'membership', 2200, null, 1);
insert into public.members (id, first_name, last_name, phone) values
  ('00000000-0000-0000-0000-0000000000f1', 'Natalia', 'Orlova', '+7 999 555 0123'),
  ('00000000-0000-0000-0000-0000000000f2', 'Natalia', 'Orlova', '+7 999 555 0123');
insert into public.credentials (member_id, kind, code) values ('00000000-0000-0000-0000-0000000000f1', 'tag', '000957'), ('00000000-0000-0000-0000-0000000000f2', 'tag', '001877');
insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000f1', '1m', '1 Month', 'membership', 2200, '2026-10-10', '2026-11-09'),
  ('00000000-0000-0000-0000-0000000000f2', '1m', '1 Month', 'membership', 2200, '2026-09-03', '2026-10-02');

-- Qashier import (as the server: the database owner stands in for service_role here)
do $$
declare a jsonb; b jsonb; c jsonb;
begin
  a := public.qashier_import('{"business_date":"2026-10-12","file_sha256":"aaa","file_name":"12.csv","store":"Superfit","total_sales":50222,"net_sales":46936.45,"vat":3285.55,"transactions":123}',
       '[{"section":"category","name":"Memberships","qty":14,"ex_vat":24112.15,"till":25800}]', '00000000-0000-0000-0000-00000000a001');
  perform pg_temp.ok(a->>'status' = 'imported', 'first import of Mon 12 Oct');
  b := public.qashier_import('{"business_date":"2026-10-12","file_sha256":"aaa","file_name":"12 again.csv","store":"Superfit","total_sales":50222,"net_sales":46936.45,"vat":3285.55,"transactions":123}', '[]', null);
  perform pg_temp.ok(b->>'status' = 'already', 'same file twice: already imported');
  c := public.qashier_import('{"business_date":"2026-10-12","file_sha256":"bbb","file_name":"12 fixed.csv","store":"Superfit","total_sales":50322,"net_sales":47029.91,"vat":3292.09,"transactions":124}', '[]', null);
  perform pg_temp.ok(c->>'status' = 'replaced' and (c->>'version')::int = 2, 're-importing the day makes version 2');
  perform pg_temp.ok((select count(*) from public.qashier_imports where business_date = '2026-10-12') = 2, 'the old version is kept');
  perform pg_temp.ok((select total_sales from public.qashier_days where business_date = '2026-10-12') = 50322, 'Andy''s day reads the latest version');
end $$;

-- Pete changes a price: desk sees it at once, history keeps old and new
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
select pg_temp.ok((public.admin_set_plan_price('1m', 2300)->>'changed')::boolean, 'Pete changes 1 Month to ฿2,300');
reset role;
select pg_temp.ok((select price_thb from public.plans where id = '1m') = 2300, 'the desk sells at the new price');
select pg_temp.ok((select old_price || '→' || new_price from public.plan_price_history where plan_id = '1m') = '2200→2300', 'price history: 2200 → 2300');

-- Andy reads everything and changes nothing
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', false);
do $$
begin
  perform public.admin_set_plan_price('1m', 100);
  raise exception 'FAIL: Andy changed a price';
exception when others then
  perform pg_temp.ok(sqlerrm = 'Only Pete can change prices.', 'Andy can''t change prices');
end $$;
do $$
begin
  perform public.qashier_import('{}', '[]', null);
  raise exception 'FAIL: Andy imported';
exception when others then
  perform pg_temp.ok(sqlerrm like '%permission denied%', 'Andy can''t import Qashier days');
end $$;
select pg_temp.ok((select count(*) from public.qashier_lines) = 1, 'Andy reads Qashier lines');
select pg_temp.ok(jsonb_array_length(public.owner_week()) = 7, 'Andy''s week has 7 days');
select pg_temp.ok((public.owner_week()->6->>'imported')::boolean and not (public.owner_week()->5->>'imported')::boolean, 'Mon is imported, Sun says not imported');
select pg_temp.ok((public.owner_members()->>'active')::int = 1, 'one active member (Natalia #0957)');
do $$
begin
  perform public.admin_merge_requests();
  raise exception 'FAIL: Andy read the inbox';
exception when others then
  perform pg_temp.ok(sqlerrm = 'not allowed', 'the merge inbox is Pete''s');
end $$;

-- The desk asks, Pete merges: Natalia's old tag scans her in as #0957
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);
select pg_temp.ok(public.desk_check_in('001877')->>'reason' = 'expired', 'before the merge, tag 001877 is expired');
select public.request_merge('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'Same phone');
select pg_temp.ok((public.owner_visits()->>'declined')::int = 1, 'Andy''s visits count the declined scan separately');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
select pg_temp.ok(jsonb_array_length(public.admin_merge_requests()) = 1 and public.admin_merge_requests()->0->'duplicate'->'tags' ? '001877', 'Pete sees the request with both members');
select public.merge_members((select id from public.merge_requests limit 1));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);
select pg_temp.ok((public.desk_check_in('001877')->>'allowed')::boolean and public.desk_check_in('001877')->'card'->>'member_id' = '00000000-0000-0000-0000-0000000000f1', 'after the merge, tag 001877 scans her in as #0957');

-- Desk devices: Pete signs one out
reset role;
insert into public.desk_devices (id, label) values ('00000000-0000-0000-0000-0000000000d9', 'Desk iPad');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);
select pg_temp.ok(public.desk_device_ok('00000000-0000-0000-0000-0000000000d9'), 'the iPad is signed in');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
select pg_temp.ok(public.admin_sign_out_devices('00000000-0000-0000-0000-0000000000d9') = 1, 'Pete signs the iPad out');
select pg_temp.ok(not public.desk_device_ok('00000000-0000-0000-0000-0000000000d9'), 'the iPad sees it is signed out');
reset role;
