-- The old Lovable Cloud tables, column for column, in their own `legacy` schema (docs/08-MIGRATION.md).
-- Rows are loaded verbatim by scripts/legacy-load.mjs and never edited: no constraints that could
-- reject an old row, no foreign keys, and the same no-delete guard as the rest of SUPER1.
-- Not exposed to the API (anon/authenticated have no access). Safe to run more than once.

create schema if not exists legacy;
revoke all on schema legacy from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema legacy from anon, authenticated'; end if;
end $$;

create table if not exists legacy.members (
  id uuid primary key, member_no integer, first_name text, last_name text, nickname text, email text, phone text,
  line_id text, notes text, source text, pass_token text, tags text[], created_at timestamptz, updated_at timestamptz,
  archived_at timestamptz
);
create table if not exists legacy.credentials (
  id uuid primary key, member_id uuid, kind text, code text, created_at timestamptz, revoked_at timestamptz
);
create table if not exists legacy.memberships (
  id uuid primary key, member_id uuid, plan_id text, plan_name text, kind text, starts_on date, ends_on date,
  sessions_total integer, sessions_used integer, price integer, payment_method text, payment_ref text,
  frozen_from date, frozen_until date, cancelled_at timestamptz, cancel_reason text, notes text,
  created_at timestamptz, coach text
);
create table if not exists legacy.check_ins (
  id uuid primary key, member_id uuid, membership_id uuid, code text, method text, allowed boolean, reason text, at timestamptz
);
create table if not exists legacy.activity (
  id uuid primary key, member_id uuid, type text, message text, at timestamptz, staff_name text
);
create table if not exists legacy.user_roles (id uuid primary key, user_id uuid, role text);
create table if not exists legacy.coaches (id uuid primary key, user_id uuid, name text, full_name text, created_at timestamptz);
create table if not exists legacy.pt_clients (
  id uuid primary key, member_id uuid, coach_id uuid, user_id uuid, status text, invite_token_hash text,
  invite_expires_at timestamptz, invite_sent_at timestamptz, invite_channel text, joined_at timestamptz,
  visibility jsonb, lang text, last_seen_at timestamptz, created_at timestamptz, updated_at timestamptz
);
create table if not exists legacy.pt_plans (
  id uuid primary key, client_id uuid, coach_id uuid, kind text, name text, doc jsonb, version integer,
  created_at timestamptz, updated_at timestamptz
);
create table if not exists legacy.pt_library_items (id uuid primary key, coach_id uuid, kind text, data jsonb, created_at timestamptz);
create table if not exists legacy.workout_logs (
  id uuid primary key, client_id uuid, day_id text, day_name text, started_at timestamptz, finished_at timestamptz,
  entries jsonb, note text, volume_kg integer, sets_done integer, plan_version integer, created_at timestamptz
);
create table if not exists legacy.daily_feedback (
  id uuid primary key, client_id uuid, date date, answers jsonb, completed_at timestamptz, updated_at timestamptz
);
create table if not exists legacy.pt_notifications (
  id uuid primary key, client_id uuid, audience text, kind text, title text, body text, href text, plan_kind text,
  created_at timestamptz, read_at timestamptz
);
create table if not exists legacy.menu_workspace (id text primary key, doc jsonb, revision integer, created_at timestamptz, updated_at timestamptz);

-- Which export each load came from (file name, checksum, when), for the report.
create table if not exists legacy._loads (
  id bigint generated always as identity primary key, source text not null, sha256 text not null,
  loaded_at timestamptz not null default now(), rows jsonb not null default '{}'
);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'legacy' loop
    if not exists (select 1 from pg_trigger where tgname = t || '_no_delete' and tgrelid = format('legacy.%I', t)::regclass) then
      execute format('create trigger %I before delete on legacy.%I for each row execute function public.forbid_delete()', t || '_no_delete', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_no_truncate' and tgrelid = format('legacy.%I', t)::regclass) then
      execute format('create trigger %I before truncate on legacy.%I for each statement execute function public.forbid_delete()', t || '_no_truncate', t);
    end if;
  end loop;
end $$;
