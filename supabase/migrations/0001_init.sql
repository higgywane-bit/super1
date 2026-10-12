-- =====================================================================================
-- SUPER1 · initial schema
-- One database for: front desk, counter QR sign-up, member app, coach portal,
-- Andy (owner) and Pete (admin). See docs/03-DATA-MODEL.md and docs/04-BUSINESS-RULES.md.
--
-- Hard rules baked in here:
--   1. Nothing is ever deleted. Every table has a trigger that refuses DELETE, even for service_role.
--   2. Visit, credential, membership, sale, PT-session and activity rows are never rewritten.
--      Only the columns listed in each guard trigger may change, and only through the functions below.
--   3. Every manual change made at the desk carries the staff member on shift (staff_id).
--      Automatic door scans are unattributed.
--   4. Dates are Bangkok calendar dates, inclusive at both ends.
-- =====================================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- Helpers that don't touch tables
-- -------------------------------------------------------------------------------------

-- Today in Bangkok. Tests pin the date with: set super1.test_today = '2026-10-12'
-- (clients can't set it: PostgREST only sets request.* settings).
create or replace function public.today_bkk() returns date
language sql stable as $$
  select coalesce(nullif(current_setting('super1.test_today', true), '')::date, (now() at time zone 'Asia/Bangkok')::date)
$$;

-- Inclusive end date. Month plans end the day before the same date n months later; when the
-- start day doesn't exist in the target month (31 Jan + 1 month) the plan ends on that month's last day.
create or replace function public.plan_end_date(p_start date, p_days int, p_months int) returns date
language sql immutable as $$
  select case
    when p_days is not null then p_start + (p_days - 1)
    when extract(day from p_start) >
         extract(day from (date_trunc('month', p_start + make_interval(months => p_months)) + interval '1 month - 1 day'))
      then (date_trunc('month', p_start + make_interval(months => p_months)) + interval '1 month - 1 day')::date
    else (p_start + make_interval(months => p_months) - interval '1 day')::date
  end
$$;

-- Uppercase, drop spaces and dashes, fix look-alikes (O->0, I/L->1). Tag numbers pass through unchanged.
create or replace function public.normalize_code(p text) returns text
language sql immutable as $$
  select translate(regexp_replace(upper(coalesce(p, '')), '[^0-9A-Z]', '', 'g'), 'OIL', '011')
$$;

create or replace function public.forbid_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'SUPER1 never deletes rows (% on %). Archive, end, void or merge instead.', tg_op, tg_table_name
    using errcode = 'P0001';
end $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- -------------------------------------------------------------------------------------
-- People and logins
-- -------------------------------------------------------------------------------------

-- One row per Supabase Auth user. role decides what they can open.
create table public.profiles (
  id uuid primary key references auth.users(id),
  role text not null check (role in ('admin', 'owner', 'desk', 'coach', 'member')),
  display_name text not null default '',
  email text,
  lang text not null default 'en' check (lang in ('en', 'th', 'ru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Front-desk names on the shift picker. No logins: the desk shares one login.
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  qashier_name text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  full_name text not null default '',
  user_id uuid unique references auth.users(id),
  email text,
  photo_path text,
  on_qr boolean not null default true,            -- pickable on the counter QR
  portal text not null default 'none' check (portal in ('none', 'invited', 'active', 'house')),
  qashier_product text,                            -- "SUPERCOACH AUN"
  active boolean not null default true,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.desk_devices (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  signed_out_at timestamptz
);

-- "Who's on shift" is picked once per shift on each desk device.
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.desk_devices(id),
  staff_id uuid not null references public.staff(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- -------------------------------------------------------------------------------------
-- Members
-- -------------------------------------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  member_no integer generated always as identity (start with 1001) unique,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null default '' check (length(last_name) <= 80),
  nickname text,
  phone text,
  email text,
  line_id text,
  lang text not null default 'en' check (lang in ('en', 'th', 'ru')),
  notes text,
  created_via text not null default 'desk' check (created_via in ('desk', 'qr', 'import', 'admin')),
  user_id uuid unique references auth.users(id),   -- set when they first sign in to the member app
  created_at timestamptz not null default now(),
  created_by_staff uuid references public.staff(id),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by_staff uuid references public.staff(id),
  archive_reason text,
  -- Merge = link, not move. A duplicate points at the member it was merged into; its rows stay where they are.
  merged_into uuid references public.members(id),
  merged_at timestamptz,
  root_id uuid not null,                           -- the member every read groups by (self, or the merge root)
  legacy_id uuid unique,                           -- id in the old Lovable Cloud database
  check (merged_into is null or merged_into <> id)
);
create index members_root_idx on public.members (root_id);
create index members_phone_idx on public.members (regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'));
create index members_email_idx on public.members (lower(email));
create index members_name_idx on public.members (lower(first_name || ' ' || last_name));

create or replace function public.members_set_root() returns trigger
language plpgsql as $$
begin
  if new.root_id is null then new.root_id := new.id; end if;
  return new;
end $$;
create trigger members_set_root before insert on public.members for each row execute function public.members_set_root();
create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();

-- Tags, app QR codes and old Glofox cards. A member can have several (a merge brings the duplicate's tag along).
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  kind text not null check (kind in ('tag', 'qr', 'card')),
  code text not null unique check (code = public.normalize_code(code) and length(code) between 3 and 32),
  created_at timestamptz not null default now(),
  created_by_staff uuid references public.staff(id),
  revoked_at timestamptz,
  revoked_by_staff uuid references public.staff(id),
  revoke_reason text
);
create index credentials_member_idx on public.credentials (member_id);

create table public.member_pauses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  from_date date not null,
  until_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  created_by_staff uuid references public.staff(id),
  created_by_user uuid references auth.users(id),
  original_until date not null,                    -- what was first set, before any early end
  ended_early_at timestamptz,
  cancelled_at timestamptz,
  check (until_date >= from_date)
);
create index member_pauses_member_idx on public.member_pauses (member_id);

-- -------------------------------------------------------------------------------------
-- Plans, sales, memberships
-- -------------------------------------------------------------------------------------

create table public.plans (
  id text primary key,                             -- "1m", "th6m", "pt10", "10v", "inbody3"
  name text not null,
  name_th text,
  kind text not null check (kind in ('membership', 'visits', 'pt', 'extra')),
  audience text not null default 'all' check (audience in ('all', 'thai')),
  price_thb integer not null check (price_thb >= 0),
  duration_days integer check (duration_days > 0),
  duration_months integer check (duration_months > 0),
  sessions integer check (sessions > 0),          -- visits or PT sessions in the pack
  on_desk boolean not null default true,
  sort integer not null default 0,
  qashier_product text,                            -- exact Qashier product name, for reconciliation
  qashier_modifier text,                           -- PT and InBody are a product + a modifier in Qashier
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((duration_days is null) <> (duration_months is null)),
  check (kind not in ('visits', 'pt') or sessions is not null)
);
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();

create table public.plan_price_history (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id),
  old_price integer not null,
  new_price integer not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id)
);

-- What the desk logged as sold. Money itself goes through Qashier; this is the mirror we reconcile against.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_date date not null default public.today_bkk(),
  at timestamptz not null default now(),
  member_id uuid references public.members(id),    -- null for walk-in day passes
  plan_id text references public.plans(id),
  item text not null,
  qty integer not null default 1 check (qty > 0),
  price_thb integer not null check (price_thb >= 0),
  method text not null check (method in ('cash', 'card', 'promptpay', 'transfer', 'comp', 'online', 'qashier', 'glofox')),
  staff_id uuid references public.staff(id),
  shift_id uuid references public.shifts(id),
  user_id uuid references auth.users(id),
  source text not null default 'desk' check (source in ('desk', 'online', 'import', 'admin')),
  note text,
  legacy_id uuid unique
);
create index sales_day_idx on public.sales (business_date);
create index sales_member_idx on public.sales (member_id);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  plan_id text not null references public.plans(id),
  plan_name text not null,                         -- snapshot at sale time
  kind text not null check (kind in ('membership', 'visits', 'pt', 'extra')),
  price_thb integer not null check (price_thb >= 0),
  starts_on date not null,
  ends_on date not null,                           -- inclusive; already includes pause days
  sessions_total integer,
  sessions_used integer not null default 0,
  coach_id uuid references public.coaches(id),
  sale_id uuid references public.sales(id),
  notes text,
  created_at timestamptz not null default now(),
  created_by_staff uuid references public.staff(id),
  created_by_user uuid references auth.users(id),
  voided_at timestamptz,                           -- only for a sale entered by mistake, with a reason
  void_reason text,
  voided_by uuid references auth.users(id),
  legacy_id uuid unique,
  check (ends_on >= starts_on),
  check (sessions_used >= 0 and (sessions_total is null or sessions_used <= sessions_total)),
  check (kind <> 'pt' or coach_id is not null),
  check (voided_at is null or void_reason is not null)
);
create index memberships_member_idx on public.memberships (member_id, kind, starts_on);
create index memberships_coach_idx on public.memberships (coach_id) where kind = 'pt';

-- Door scans and manual check-ins. Written once, never changed.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  business_date date not null default public.today_bkk(),
  member_id uuid references public.members(id),
  credential_id uuid references public.credentials(id),
  code text,
  result text not null check (result in ('allowed', 'declined')),
  reason text,                                     -- allowed: membership|visits|day-pass  declined: see docs/04
  membership_id uuid references public.memberships(id),
  consumed_visit boolean not null default false,
  method text not null default 'scan' check (method in ('scan', 'manual', 'app_qr', 'import')),
  device_id uuid references public.desk_devices(id),
  staff_id uuid references public.staff(id),       -- null for automatic scans
  legacy_id uuid unique
);
create index checkins_day_idx on public.checkins (business_date, at);
create index checkins_member_idx on public.checkins (member_id, at);
create index checkins_credential_recent_idx on public.checkins (credential_id, at desc);

create table public.pt_sessions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id),
  member_id uuid not null references public.members(id),
  coach_id uuid not null references public.coaches(id),
  at timestamptz not null default now(),
  via text not null check (via in ('desk', 'coach_portal', 'coach_counter', 'import')),
  staff_id uuid references public.staff(id),
  user_id uuid references auth.users(id),
  undone_at timestamptz,
  undone_by_staff uuid references public.staff(id),
  undone_by_user uuid references auth.users(id)
);
create index pt_sessions_member_idx on public.pt_sessions (member_id, at);
create index pt_sessions_coach_idx on public.pt_sessions (coach_id, at);

-- -------------------------------------------------------------------------------------
-- Counter QR sign-up, leads, app invites
-- -------------------------------------------------------------------------------------

create table public.waiver_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  texts jsonb not null,                            -- {"en": [...], "th": [...], "ru": [...]}
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id)
);

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'new' check (kind in ('new', 'link')),   -- link = existing member linking tag + email
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null default '' check (length(last_name) <= 80),
  phone text check (length(phone) <= 40),
  email text check (length(email) <= 200),
  lang text not null default 'en' check (lang in ('en', 'th', 'ru')),
  coach_id uuid references public.coaches(id),
  waiver_version_id uuid references public.waiver_versions(id),
  signature_path text,                             -- storage: signatures/<signup id>.png
  link_tag text,
  status text not null default 'waiting' check (status in ('waiting', 'completed', 'linked', 'abandoned')),
  member_id uuid references public.members(id),
  completed_at timestamptz,
  completed_by_staff uuid references public.staff(id)
);
create index signups_waiting_idx on public.signups (created_at) where status = 'waiting';

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id),
  member_id uuid references public.members(id),
  signup_id uuid references public.signups(id),
  name text not null,
  phone text,
  email text,
  lang text not null default 'en' check (lang in ('en', 'th', 'ru')),
  source text not null check (source in ('qr', 'desk', 'manual')),
  stage text not null default 'new' check (stage in ('new', 'contacted', 'trial', 'won', 'not_now')),
  trial_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  won_at timestamptz
);
create index leads_coach_idx on public.leads (coach_id, stage);
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  email text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days'
);

-- Emails and pushes are written here inside the same transaction, then sent by a worker. Never lost, never doubled.
create table public.outbox (
  id bigint generated always as identity primary key,
  kind text not null,                              -- invite_email, lead_push, program_push, support_email ...
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
create index outbox_pending_idx on public.outbox (created_at) where sent_at is null;

-- -------------------------------------------------------------------------------------
-- Coaching
-- -------------------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  muscle_group text not null check (muscle_group in ('chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'cardio')),
  muscle text not null default '',
  equipment text not null,
  log_type text not null check (log_type in ('weight_reps', 'reps', 'time')),
  default_sets integer not null default 3,
  default_reps integer,
  default_seconds integer,
  default_minutes integer,
  coach_id uuid references public.coaches(id),     -- null = SUPER1 library; set = a coach's own exercise
  cue text,
  video_url text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  coach_id uuid references public.coaches(id),     -- null = the member's own program ("My own")
  name text not null default 'Program',
  created_at timestamptz not null default now(),
  unique (member_id, coach_id)
);

-- Every send is a new immutable version. body = {"days":[{"name":"Day A · Push","items":[{exercise_id, name, sets, reps, unit, rest_s, cue}]}]}
create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id),
  version integer not null,
  body jsonb not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id),
  unique (program_id, version)
);

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  coach_id uuid not null references public.coaches(id),
  goal text not null check (goal in ('lose', 'maintain', 'build')),
  protein_g integer not null check (protein_g between 0 and 500),
  carbs_g integer not null check (carbs_g between 0 and 1000),
  fat_g integer not null check (fat_g between 0 and 400),
  kcal integer generated always as (protein_g * 4 + carbs_g * 4 + fat_g * 9) stored,
  water_l numeric(3,1) check (water_l between 0 and 10),
  steps integer check (steps between 0 and 100000),
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id)
);
create index nutrition_targets_member_idx on public.nutrition_targets (member_id, sent_at desc);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  coach_id uuid not null references public.coaches(id),
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  program_version_id uuid references public.program_versions(id),
  day_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  note text,
  sets_done integer not null default 0,
  volume_kg numeric(10,1) not null default 0,
  created_at timestamptz not null default now()
);
create index workout_logs_member_idx on public.workout_logs (member_id, started_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id),
  exercise_id uuid references public.exercises(id),
  exercise_name text not null,
  set_no integer not null check (set_no > 0),
  kg numeric(6,2),
  reps integer,
  seconds integer,
  done boolean not null default true,
  is_pr boolean not null default false
);
create index set_logs_workout_idx on public.set_logs (workout_log_id);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  date date not null,
  sleep_h numeric(3,1) check (sleep_h between 0 and 24),
  energy smallint check (energy between 1 and 5),
  digestion smallint check (digestion between 1 and 5),
  water_l numeric(3,1) check (water_l between 0 and 10),
  steps integer check (steps between 0 and 100000),
  weight_kg numeric(5,1) check (weight_kg between 20 and 400),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, date)
);
create trigger daily_checkins_touch before update on public.daily_checkins for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------------------------
-- Café menu (what members see; Qashier stays the till)
-- -------------------------------------------------------------------------------------

create table public.menu_categories (
  id text primary key,                             -- shakes, coffee, juices, fuel, drinks, food, shop
  name_en text not null,
  name_th text,
  name_ru text,
  sort integer not null default 0,
  andy_group text not null default 'cafe' check (andy_group in ('cafe', 'shop', 'gym')),
  qashier_categories text[] not null default '{}'
);

create table public.menu_items (
  id text primary key,
  category_id text not null references public.menu_categories(id),
  name_en text not null,
  name_th text,
  name_ru text,
  desc_en text,
  desc_th text,
  desc_ru text,
  price_thb integer not null check (price_thb >= 0),
  photo_path text,
  in_app boolean not null default true,
  is_draft boolean not null default false,
  qashier_products text[] not null default '{}',   -- every Qashier product this item covers (sizes, colours)
  kcal integer,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fat_g numeric(5,1),
  macros_verified_at timestamptz,                  -- macros show in the app only when verified
  macros_verified_by uuid references auth.users(id),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create trigger menu_items_touch before update on public.menu_items for each row execute function public.touch_updated_at();
create index menu_items_qashier_idx on public.menu_items using gin (qashier_products);

create table public.menu_option_groups (
  id text primary key,
  label_en text not null,
  label_th text,
  label_ru text,
  category_ids text[] not null default '{}',
  item_ids text[] not null default '{}',
  max_choices integer,
  sort integer not null default 0,
  qashier_group text
);

create table public.menu_options (
  id text primary key,
  group_id text not null references public.menu_option_groups(id),
  label_en text not null,
  label_th text,
  label_ru text,
  price_thb integer not null check (price_thb >= 0),
  qashier_modifier text,
  sort integer not null default 0,
  archived_at timestamptz
);

create table public.coach_picks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  coach_id uuid not null references public.coaches(id),
  menu_item_id text not null references public.menu_items(id),
  why_en text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

-- The "Show at the counter" card in the member app. Not a payment: the café rings it on Qashier.
create table public.cafe_orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  items jsonb not null,
  total_thb integer not null check (total_thb >= 0),
  created_at timestamptz not null default now(),
  rung_at timestamptz
);

-- -------------------------------------------------------------------------------------
-- Qashier daily reports. Re-importing a day adds a new version; the old one is superseded, not deleted.
-- -------------------------------------------------------------------------------------

create table public.qashier_imports (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  version integer not null,
  file_name text not null,
  file_sha256 text not null,
  store text not null,
  total_sales numeric(12,2) not null,              -- incl. VAT, what the till took
  net_sales numeric(12,2) not null,
  vat numeric(12,2) not null,
  cost numeric(12,2) not null default 0,
  gross_profit numeric(12,2),
  transactions integer not null,
  voided_transactions integer not null default 0,
  raw jsonb not null,                              -- every section as parsed, for later reports
  checks jsonb not null default '[]',
  imported_at timestamptz not null default now(),
  imported_by uuid references auth.users(id),
  superseded_at timestamptz,
  unique (business_date, version)
);

create table public.qashier_lines (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.qashier_imports(id),
  section text not null check (section in ('category', 'product', 'modifier', 'tab', 'staff', 'payment')),
  name text not null,
  category text,
  qty numeric(10,2) not null default 0,
  ex_vat numeric(12,2),
  till numeric(12,2) not null,
  cost numeric(12,2)
);
create index qashier_lines_import_idx on public.qashier_lines (import_id, section);

create view public.qashier_days with (security_invoker = true) as
  select * from public.qashier_imports where superseded_at is null;

-- -------------------------------------------------------------------------------------
-- Activity, desk ↔ Pete messages, merge requests, settings
-- -------------------------------------------------------------------------------------

create table public.activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  member_id uuid references public.members(id),
  kind text not null,                              -- member.created, membership.sold, checkin.manual, pt.used ...
  message text not null,
  data jsonb not null default '{}',
  actor text not null check (actor in ('desk', 'coach', 'admin', 'owner', 'member', 'system')),
  staff_id uuid references public.staff(id),       -- set for every manual desk change
  user_id uuid references auth.users(id)
);
create index activity_member_idx on public.activity (member_id, at desc);
create index activity_at_idx on public.activity (at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_side text not null check (from_side in ('desk', 'admin')),
  staff_id uuid references public.staff(id),
  user_id uuid references auth.users(id),
  body text not null check (length(body) between 1 and 2000),
  read_at timestamptz
);

create table public.merge_requests (
  id uuid primary key default gen_random_uuid(),
  keep_member_id uuid not null references public.members(id),
  duplicate_member_id uuid not null references public.members(id),
  note text,
  requested_at timestamptz not null default now(),
  requested_by_staff uuid references public.staff(id),
  status text not null default 'open' check (status in ('open', 'merged', 'rejected')),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  check (keep_member_id <> duplicate_member_id)
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- -------------------------------------------------------------------------------------
-- Guards: no deletes anywhere; history rows can't be rewritten
-- -------------------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['profiles','staff','coaches','desk_devices','shifts','members','credentials','member_pauses','plans',
    'plan_price_history','sales','memberships','checkins','pt_sessions','waiver_versions','signups','leads','invites','outbox',
    'exercises','programs','program_versions','nutrition_targets','coach_notes','workout_logs','set_logs','daily_checkins',
    'menu_categories','menu_items','menu_option_groups','menu_options','coach_picks','cafe_orders','qashier_imports',
    'qashier_lines','activity','messages','merge_requests','settings']
  loop
    execute format('create trigger %I before delete on public.%I for each row execute function public.forbid_delete()', t || '_no_delete', t);
    execute format('create trigger %I before truncate on public.%I for each statement execute function public.forbid_delete()', t || '_no_truncate', t);
  end loop;
end $$;

create or replace function public.forbid_update() returns trigger
language plpgsql as $$
begin
  raise exception 'SUPER1 history rows are written once (% on %).', tg_op, tg_table_name using errcode = 'P0001';
end $$;

-- Written once, never changed.
create trigger checkins_immutable before update on public.checkins for each row execute function public.forbid_update();
create trigger sales_immutable before update on public.sales for each row execute function public.forbid_update();
create trigger activity_immutable before update on public.activity for each row execute function public.forbid_update();
create trigger program_versions_immutable before update on public.program_versions for each row execute function public.forbid_update();
create trigger nutrition_targets_immutable before update on public.nutrition_targets for each row execute function public.forbid_update();
create trigger plan_price_history_immutable before update on public.plan_price_history for each row execute function public.forbid_update();
create trigger qashier_lines_immutable before update on public.qashier_lines for each row execute function public.forbid_update();

-- Memberships: only dates (pauses), sessions_used (PT and visits), notes and the void fields may change.
create or replace function public.guard_memberships() returns trigger
language plpgsql as $$
begin
  if (new.member_id, new.plan_id, new.plan_name, new.kind, new.price_thb, new.sessions_total, new.coach_id, new.sale_id, new.created_at, new.legacy_id)
     is distinct from
     (old.member_id, old.plan_id, old.plan_name, old.kind, old.price_thb, old.sessions_total, old.coach_id, old.sale_id, old.created_at, old.legacy_id) then
    raise exception 'A sold membership keeps its member, plan, price and coach. Void it and sell again.' using errcode = 'P0001';
  end if;
  if old.voided_at is not null and new.voided_at is null then
    raise exception 'A voided membership stays voided.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger memberships_guard before update on public.memberships for each row execute function public.guard_memberships();

-- Credentials: only the revoke fields may change.
create or replace function public.guard_credentials() returns trigger
language plpgsql as $$
begin
  if (new.member_id, new.kind, new.code, new.created_at) is distinct from (old.member_id, old.kind, old.code, old.created_at) then
    raise exception 'A credential keeps its member and code. Revoke it and issue a new one.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger credentials_guard before update on public.credentials for each row execute function public.guard_credentials();

-- PT sessions: only the undo fields may change.
create or replace function public.guard_pt_sessions() returns trigger
language plpgsql as $$
begin
  if (new.membership_id, new.member_id, new.coach_id, new.at, new.via, new.staff_id, new.user_id)
     is distinct from (old.membership_id, old.member_id, old.coach_id, old.at, old.via, old.staff_id, old.user_id) then
    raise exception 'A PT session is written once. Undo it instead.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger pt_sessions_guard before update on public.pt_sessions for each row execute function public.guard_pt_sessions();

-- -------------------------------------------------------------------------------------
-- Who is asking (used by RLS and the functions below)
-- -------------------------------------------------------------------------------------

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role() = 'admin', false) $$;

-- Admin, Andy and the desk can read the gym's operational data.
create or replace function public.is_gym_reader() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role() in ('admin', 'owner', 'desk'), false) $$;

create or replace function public.is_desk_or_admin() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role() in ('admin', 'desk'), false) $$;

create or replace function public.is_owner_or_admin() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role() in ('admin', 'owner'), false) $$;

create or replace function public.my_coach_id() returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.coaches c join public.profiles p on p.id = c.user_id
  where c.user_id = auth.uid() and p.role = 'coach' and c.archived_at is null
$$;

-- The merge root of the member linked to this login.
create or replace function public.my_member_root() returns uuid
language sql stable security definer set search_path = public as $$
  select root_id from public.members where user_id = auth.uid() limit 1
$$;

create or replace function public.member_root(p_member uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select root_id from public.members where id = p_member
$$;

-- Is this member (any member in its merge group) a client or a lead of the calling coach?
create or replace function public.coach_sees_member(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_coach_id() is not null and exists (
    select 1 from public.members g
    where g.root_id = public.member_root(p_member)
      and (exists (select 1 from public.memberships m where m.member_id = g.id and m.kind = 'pt' and m.coach_id = public.my_coach_id() and m.voided_at is null)
        or exists (select 1 from public.leads l where l.member_id = g.id and l.coach_id = public.my_coach_id()))
  )
$$;

create or replace function public.is_my_member(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_member_root() is not null and public.member_root(p_member) = public.my_member_root()
$$;

create or replace function public.assert_staff(p_staff uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'admin' and p_staff is null then return; end if;
  if p_staff is null or not exists (select 1 from public.staff where id = p_staff and active and archived_at is null) then
    raise exception 'Pick who is on shift first.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.log_activity(p_member uuid, p_kind text, p_message text, p_data jsonb, p_staff uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor text := coalesce(public.my_role(), 'system');
begin
  if v_actor not in ('desk', 'coach', 'admin', 'owner', 'member') then v_actor := 'system'; end if;
  insert into public.activity (member_id, kind, message, data, actor, staff_id, user_id)
  values (p_member, p_kind, p_message, coalesce(p_data, '{}'), v_actor, p_staff, auth.uid());
end $$;

-- -------------------------------------------------------------------------------------
-- Membership rules in SQL (must agree with src/lib/membership.ts)
-- -------------------------------------------------------------------------------------

create or replace function public.coverage_end(p_root uuid, p_kind text, p_from_end date) returns date
language plpgsql stable security definer set search_path = public as $$
declare v_end date := p_from_end; r record;
begin
  for r in
    select m.starts_on, m.ends_on from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = p_root and m.kind = p_kind and m.voided_at is null
      and (m.sessions_total is null or m.sessions_used < m.sessions_total)
    order by m.starts_on
  loop
    if r.starts_on <= v_end + 1 and r.ends_on > v_end then v_end := r.ends_on; end if;
  end loop;
  return v_end;
end $$;

create or replace function public.next_start_date(p_root uuid, p_kind text, p_today date) returns date
language plpgsql stable security definer set search_path = public as $$
declare v_end date;
begin
  if p_kind <> 'membership' then return p_today; end if;
  select m.ends_on into v_end from public.memberships m join public.members g on g.id = m.member_id
  where g.root_id = p_root and m.kind = 'membership' and m.voided_at is null and p_today between m.starts_on and m.ends_on
  order by m.starts_on limit 1;
  if v_end is null then
    select m.ends_on into v_end from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = p_root and m.kind = 'membership' and m.voided_at is null and m.starts_on > p_today
    order by m.starts_on limit 1;
  end if;
  if v_end is null then return p_today; end if;
  return public.coverage_end(p_root, 'membership', v_end) + 1;
end $$;

-- Everything a screen needs to show one member's standing today. Status values match memberStanding().
create or replace function public.member_card(p_member uuid, p_today date default public.today_bkk()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_root uuid := public.member_root(p_member);
  v_m public.members;
  v_cur public.memberships;
  v_up public.memberships;
  v_past public.memberships;
  v_pack public.memberships;
  v_pt public.memberships;
  v_pause public.member_pauses;
  v_cover date;
  v_status text;
  v_days int;
begin
  if not (public.is_gym_reader() or public.coach_sees_member(p_member) or public.is_my_member(p_member)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_m from public.members where id = v_root;
  select m.* into v_cur from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = v_root and m.kind = 'membership' and m.voided_at is null and p_today between m.starts_on and m.ends_on order by m.starts_on limit 1;
  select m.* into v_pack from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = v_root and m.kind = 'visits' and m.voided_at is null and p_today between m.starts_on and m.ends_on and m.sessions_used < m.sessions_total order by m.ends_on limit 1;
  select m.* into v_pt from public.memberships m join public.members g on g.id = m.member_id
    where g.root_id = v_root and m.kind = 'pt' and m.voided_at is null and p_today between m.starts_on and m.ends_on and m.sessions_used < m.sessions_total order by m.ends_on limit 1;
  select p.* into v_pause from public.member_pauses p join public.members g on g.id = p.member_id
    where g.root_id = v_root and p.cancelled_at is null and p_today between p.from_date and p.until_date limit 1;

  if v_pause.id is not null then
    v_status := 'paused';
  elsif v_cur.id is not null then
    v_cover := public.coverage_end(v_root, 'membership', v_cur.ends_on);
    v_days := v_cover - p_today;
    v_status := case when v_days <= 7 then 'expiring' else 'active' end;
  elsif v_pack.id is not null then
    v_status := 'active';
  else
    select m.* into v_up from public.memberships m join public.members g on g.id = m.member_id
      where g.root_id = v_root and m.kind = 'membership' and m.voided_at is null and m.starts_on > p_today order by m.starts_on limit 1;
    if v_up.id is not null then
      v_status := 'upcoming';
    else
      select m.* into v_past from public.memberships m join public.members g on g.id = m.member_id
        where g.root_id = v_root and m.kind in ('membership', 'visits') and m.voided_at is null and m.starts_on <= p_today order by m.ends_on desc limit 1;
      v_status := case when v_past.id is not null then 'expired' else 'none' end;
    end if;
  end if;

  return jsonb_build_object(
    'member_id', v_root, 'member_no', v_m.member_no, 'name', trim(v_m.first_name || ' ' || v_m.last_name),
    'archived', v_m.archived_at is not null, 'status', v_status,
    'plan', coalesce(v_cur.plan_name, v_up.plan_name, v_past.plan_name, v_pack.plan_name),
    'cover_ends', v_cover, 'days_left', v_days, 'starts_on', v_up.starts_on, 'ended_on', v_past.ends_on,
    'paused_until', v_pause.until_date,
    'visits_left', case when v_pack.id is null then null else v_pack.sessions_total - v_pack.sessions_used end,
    'pt_left', case when v_pt.id is null then null else v_pt.sessions_total - v_pt.sessions_used end,
    'pt_total', v_pt.sessions_total, 'pt_ends_on', v_pt.ends_on,
    'pt_coach', (select name from public.coaches where id = v_pt.coach_id),
    'visits_this_month', (select count(*) from public.checkins c join public.members g on g.id = c.member_id
                          where g.root_id = v_root and c.result = 'allowed' and date_trunc('month', c.business_date) = date_trunc('month', p_today))
  );
end $$;

-- -------------------------------------------------------------------------------------
-- Front desk actions
-- -------------------------------------------------------------------------------------

-- The door. Decides, records, and returns the popup.
create or replace function public.desk_check_in(p_code text, p_device uuid default null, p_method text default 'scan', p_staff uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date := public.today_bkk();
  v_code text := public.normalize_code(p_code);
  v_cred public.credentials;
  v_member public.members;
  v_root uuid;
  v_recent public.checkins;
  v_card jsonb;
  v_status text;
  v_result text;
  v_reason text;
  v_membership uuid;
  v_consume boolean := false;
  v_pack public.memberships;
  v_used_up boolean;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_method = 'manual' then perform public.assert_staff(p_staff); end if;

  select * into v_cred from public.credentials where code = v_code and revoked_at is null;
  if v_cred.id is null then
    insert into public.checkins (code, result, reason, method, device_id, staff_id)
    values (v_code, 'declined', 'unknown-code', p_method, p_device, case when p_method = 'manual' then p_staff end);
    return jsonb_build_object('allowed', false, 'reason', 'unknown-code', 'code', v_code);
  end if;

  v_root := public.member_root(v_cred.member_id);
  select * into v_member from public.members where id = v_root;

  -- A second scan within 120 s of an allowed check-in is the same visit. A declined scan is always re-checked
  -- (they may have just renewed at the desk).
  select * into v_recent from public.checkins
  where credential_id = v_cred.id and result = 'allowed' and business_date = v_today and at > now() - interval '120 seconds'
  order by at desc limit 1;
  if v_recent.id is not null then
    return jsonb_build_object('allowed', v_recent.result = 'allowed', 'reason', v_recent.reason, 'duplicate', true, 'card', public.member_card(v_root, v_today));
  end if;

  v_card := public.member_card(v_root, v_today);
  v_status := v_card->>'status';

  if v_member.archived_at is not null then
    v_result := 'declined'; v_reason := 'archived';
  elsif v_status = 'paused' then
    v_result := 'declined'; v_reason := 'paused';
  elsif v_status in ('active', 'expiring') and (v_card->>'cover_ends') is not null then
    v_result := 'allowed'; v_reason := 'membership';
    select m.id into v_membership from public.memberships m join public.members g on g.id = m.member_id
      where g.root_id = v_root and m.kind = 'membership' and m.voided_at is null and v_today between m.starts_on and m.ends_on order by m.starts_on limit 1;
  elsif v_status = 'active' then
    -- Covered by a visit pack: one visit per calendar day.
    select m.* into v_pack from public.memberships m join public.members g on g.id = m.member_id
      where g.root_id = v_root and m.kind = 'visits' and m.voided_at is null and v_today between m.starts_on and m.ends_on and m.sessions_used < m.sessions_total
      order by m.ends_on limit 1 for update of m;
    v_result := 'allowed'; v_reason := 'visits'; v_membership := v_pack.id;
    v_consume := not exists (select 1 from public.checkins c join public.members g on g.id = c.member_id
                             where g.root_id = v_root and c.business_date = v_today and c.result = 'allowed');
    if v_consume then update public.memberships set sessions_used = sessions_used + 1 where id = v_pack.id; end if;
  else
    select exists (select 1 from public.memberships m join public.members g on g.id = m.member_id
                   where g.root_id = v_root and m.kind = 'visits' and m.voided_at is null and v_today between m.starts_on and m.ends_on and m.sessions_used >= m.sessions_total)
      into v_used_up;
    v_result := 'declined';
    v_reason := case when v_used_up then 'used-up' when v_status = 'upcoming' then 'not-started' when v_status = 'expired' then 'expired' else 'no-plan' end;
  end if;

  insert into public.checkins (member_id, credential_id, code, result, reason, membership_id, consumed_visit, method, device_id, staff_id)
  values (v_cred.member_id, v_cred.id, v_code, v_result, v_reason, v_membership, v_consume, p_method, p_device, case when p_method = 'manual' then p_staff end);

  if p_method = 'manual' then
    perform public.log_activity(v_root, 'checkin.manual', 'Checked in by hand: ' || v_result, jsonb_build_object('reason', v_reason), p_staff);
  end if;

  return jsonb_build_object('allowed', v_result = 'allowed', 'reason', v_reason, 'consumed_visit', v_consume, 'card', public.member_card(v_root, v_today));
end $$;

-- Sell or renew. Time plans queue after current cover; packs start today. Returns the dates the desk shows.
create or replace function public.desk_sell(p_member uuid, p_plan text, p_method text, p_staff uuid,
  p_coach uuid default null, p_price integer default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_plan public.plans;
  v_root uuid := public.member_root(p_member);
  v_member public.members;
  v_today date := public.today_bkk();
  v_start date;
  v_end date;
  v_sale uuid;
  v_ms uuid;
  v_price integer;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select * into v_plan from public.plans where id = p_plan and archived_at is null;
  if v_plan.id is null then raise exception 'Unknown plan %', p_plan using errcode = 'P0001'; end if;
  select * into v_member from public.members where id = v_root;
  if v_member.id is null then raise exception 'Unknown member' using errcode = 'P0001'; end if;
  if v_member.archived_at is not null then raise exception 'Restore this member before selling.' using errcode = 'P0001'; end if;
  if v_plan.kind = 'pt' and p_coach is null then raise exception 'Pick the coach for this PT pack.' using errcode = 'P0001'; end if;

  v_price := coalesce(p_price, v_plan.price_thb);
  v_start := public.next_start_date(v_root, v_plan.kind, v_today);
  v_end := public.plan_end_date(v_start, v_plan.duration_days, v_plan.duration_months);

  insert into public.sales (member_id, plan_id, item, price_thb, method, staff_id, user_id, source, note)
  values (v_root, v_plan.id, v_plan.name, v_price, p_method, p_staff, auth.uid(), case when public.my_role() = 'admin' then 'admin' else 'desk' end, p_note)
  returning id into v_sale;

  insert into public.memberships (member_id, plan_id, plan_name, kind, price_thb, starts_on, ends_on, sessions_total, coach_id, sale_id, created_by_staff, created_by_user, notes)
  values (v_root, v_plan.id, v_plan.name, v_plan.kind, v_price, v_start, v_end, v_plan.sessions, case when v_plan.kind = 'pt' then p_coach end, v_sale, p_staff, auth.uid(), p_note)
  returning id into v_ms;

  if v_plan.kind = 'pt' then
    update public.leads set stage = 'won', won_at = now()
      where coach_id = p_coach and member_id in (select id from public.members where root_id = v_root) and stage <> 'won';
  end if;

  perform public.log_activity(v_root, 'membership.sold',
    format('%s sold · ฿%s · %s', v_plan.name, to_char(v_price, 'FM999,999'), p_method),
    jsonb_build_object('membership_id', v_ms, 'starts_on', v_start, 'ends_on', v_end, 'queued', v_start > v_today), p_staff);

  return jsonb_build_object('membership_id', v_ms, 'sale_id', v_sale, 'starts_on', v_start, 'ends_on', v_end, 'queued', v_start > v_today);
end $$;

-- Walk-in day pass: logs the sale and counts the visit, no member record needed.
create or replace function public.desk_day_pass(p_method text, p_staff uuid, p_qty integer default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_price integer; v_sale uuid; i integer;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select price_thb into v_price from public.plans where id = 'day';
  insert into public.sales (plan_id, item, qty, price_thb, method, staff_id, user_id, source)
  values ('day', 'Day Pass', p_qty, v_price * p_qty, p_method, p_staff, auth.uid(), 'desk') returning id into v_sale;
  for i in 1..p_qty loop
    insert into public.checkins (result, reason, method, staff_id) values ('allowed', 'day-pass', 'manual', p_staff);
  end loop;
  return jsonb_build_object('sale_id', v_sale, 'qty', p_qty, 'total', v_price * p_qty);
end $$;

-- Finish a counter QR sign-up: member + tag + first plan + coach lead + app invite, in one go.
create or replace function public.desk_complete_signup(p_signup uuid, p_tag text, p_plan text, p_method text, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_s public.signups;
  v_member uuid;
  v_tag text := public.normalize_code(p_tag);
  v_sale jsonb;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select * into v_s from public.signups where id = p_signup for update;
  if v_s.id is null or v_s.status <> 'waiting' then raise exception 'This sign-up is already done.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.credentials where code = v_tag) then raise exception 'Tag % is already in use.', v_tag using errcode = 'P0001'; end if;

  insert into public.members (first_name, last_name, phone, email, lang, created_via, created_by_staff)
  values (v_s.first_name, v_s.last_name, v_s.phone, v_s.email, v_s.lang, 'qr', p_staff)
  returning id into v_member;
  insert into public.credentials (member_id, kind, code, created_by_staff) values (v_member, 'tag', v_tag, p_staff);

  v_sale := public.desk_sell(v_member, p_plan, p_method, p_staff, v_s.coach_id, null, null);

  if v_s.coach_id is not null then
    insert into public.leads (coach_id, member_id, signup_id, name, phone, email, lang, source, stage)
    values (v_s.coach_id, v_member, v_s.id, trim(v_s.first_name || ' ' || v_s.last_name), v_s.phone, v_s.email, v_s.lang, 'qr',
            case when (select kind from public.plans where id = p_plan) = 'pt' then 'won' else 'new' end);
    insert into public.outbox (kind, payload) values ('lead_push', jsonb_build_object('coach_id', v_s.coach_id, 'member_id', v_member));
  end if;
  if v_s.email is not null and v_s.email <> '' then
    insert into public.invites (member_id, email) values (v_member, v_s.email);
    insert into public.outbox (kind, payload) values ('invite_email', jsonb_build_object('member_id', v_member, 'email', v_s.email, 'lang', v_s.lang));
  end if;

  update public.signups set status = 'completed', member_id = v_member, completed_at = now(), completed_by_staff = p_staff where id = v_s.id;
  perform public.log_activity(v_member, 'member.created', 'Joined at the counter QR · tag ' || v_tag,
    jsonb_build_object('signup_id', v_s.id, 'coach_id', v_s.coach_id), p_staff);
  return jsonb_build_object('member_id', v_member, 'sale', v_sale);
end $$;

-- An existing member used the counter QR to link their tag and email to the app. The desk confirms it's them.
create or replace function public.desk_complete_link(p_signup uuid, p_staff uuid, p_use_email boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_s public.signups; v_root uuid; v_email text;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select * into v_s from public.signups where id = p_signup for update;
  if v_s.id is null or v_s.status <> 'waiting' or v_s.kind <> 'link' then raise exception 'This link request is already done.' using errcode = 'P0001'; end if;
  select public.member_root(member_id) into v_root from public.credentials where code = v_s.link_tag and revoked_at is null;
  if v_root is null then raise exception 'No member has tag %.', v_s.link_tag using errcode = 'P0001'; end if;
  if p_use_email and v_s.email is not null then
    update public.members set email = v_s.email where id = v_root and email is distinct from v_s.email;
  end if;
  select email into v_email from public.members where id = v_root;
  if v_email is not null then
    insert into public.invites (member_id, email) values (v_root, v_email);
    insert into public.outbox (kind, payload) values ('invite_email', jsonb_build_object('member_id', v_root, 'email', v_email, 'lang', v_s.lang));
  end if;
  update public.signups set status = 'linked', member_id = v_root, completed_at = now(), completed_by_staff = p_staff where id = v_s.id;
  perform public.log_activity(v_root, 'member.linked', 'Linked tag and email at the counter QR', jsonb_build_object('signup_id', v_s.id), p_staff);
  return jsonb_build_object('member_id', v_root, 'email', v_email);
end $$;

-- One PT session off the pack. The desk passes who's on shift; a coach can only use their own clients' packs.
create or replace function public.use_pt_session(p_member uuid, p_via text default 'desk', p_staff uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_root uuid := public.member_root(p_member);
  v_coach uuid := public.my_coach_id();
  v_pack public.memberships;
  v_session uuid;
  v_today date := public.today_bkk();
begin
  if public.is_desk_or_admin() then
    perform public.assert_staff(p_staff);
    if p_via <> 'desk' then raise exception 'The desk logs sessions as desk.' using errcode = 'P0001'; end if;
  elsif v_coach is not null then
    if p_via not in ('coach_portal', 'coach_counter') then raise exception 'Coaches log as coach_portal or coach_counter.' using errcode = 'P0001'; end if;
    p_staff := null;
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select m.* into v_pack from public.memberships m join public.members g on g.id = m.member_id
  where g.root_id = v_root and m.kind = 'pt' and m.voided_at is null and v_today between m.starts_on and m.ends_on
    and m.sessions_used < m.sessions_total and (v_coach is null or m.coach_id = v_coach)
  order by m.ends_on limit 1
  for update of m;
  if v_pack.id is null then raise exception 'No PT sessions left on a valid pack.' using errcode = 'P0001'; end if;

  update public.memberships set sessions_used = sessions_used + 1 where id = v_pack.id;
  insert into public.pt_sessions (membership_id, member_id, coach_id, via, staff_id, user_id)
  values (v_pack.id, v_root, v_pack.coach_id, p_via, p_staff, auth.uid()) returning id into v_session;
  perform public.log_activity(v_root, 'pt.used',
    format('PT session with %s · %s of %s left', (select name from public.coaches where id = v_pack.coach_id), v_pack.sessions_total - v_pack.sessions_used - 1, v_pack.sessions_total),
    jsonb_build_object('session_id', v_session, 'membership_id', v_pack.id), p_staff);
  return jsonb_build_object('session_id', v_session, 'left', v_pack.sessions_total - v_pack.sessions_used - 1, 'total', v_pack.sessions_total, 'ends_on', v_pack.ends_on);
end $$;

-- Undo within 10 minutes, by the desk or the coach who logged it. The row stays, marked undone.
create or replace function public.undo_pt_session(p_session uuid, p_staff uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_s public.pt_sessions;
begin
  select * into v_s from public.pt_sessions where id = p_session for update;
  if v_s.id is null or v_s.undone_at is not null then raise exception 'Nothing to undo.' using errcode = 'P0001'; end if;
  if v_s.at < now() - interval '10 minutes' and not public.is_admin() then raise exception 'Too late to undo. Ask Pete.' using errcode = 'P0001'; end if;
  if public.is_desk_or_admin() then perform public.assert_staff(p_staff);
  elsif public.my_coach_id() is distinct from v_s.coach_id or v_s.user_id is distinct from auth.uid() then raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.pt_sessions set undone_at = now(), undone_by_staff = p_staff, undone_by_user = auth.uid() where id = p_session;
  update public.memberships set sessions_used = sessions_used - 1 where id = v_s.membership_id;
  perform public.log_activity(v_s.member_id, 'pt.undone', 'PT session undone', jsonb_build_object('session_id', p_session), p_staff);
  return jsonb_build_object('ok', true);
end $$;

-- Pause: everything running or queued moves back by the pause length (fixes the queued-renewal overlap).
create or replace function public.pause_member(p_member uuid, p_from date, p_until date, p_staff uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.member_root(p_member); v_len int := p_until - p_from + 1; v_id uuid;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  if p_until < p_from then raise exception 'The pause ends before it starts.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.member_pauses p join public.members g on g.id = p.member_id
             where g.root_id = v_root and p.cancelled_at is null and p.from_date <= p_until and p_from <= p.until_date) then
    raise exception 'This overlaps another pause.' using errcode = 'P0001';
  end if;
  update public.memberships m set
    starts_on = case when m.starts_on >= p_from then m.starts_on + v_len else m.starts_on end,
    ends_on = m.ends_on + v_len
  from public.members g
  where g.id = m.member_id and g.root_id = v_root and m.voided_at is null and m.ends_on >= p_from;
  insert into public.member_pauses (member_id, from_date, until_date, original_until, reason, created_by_staff, created_by_user)
  values (v_root, p_from, p_until, p_until, p_reason, p_staff, auth.uid()) returning id into v_id;
  perform public.log_activity(v_root, 'member.paused', format('Paused %s to %s (%s days)', p_from, p_until, v_len), jsonb_build_object('pause_id', v_id), p_staff);
  return v_id;
end $$;

-- Back early: unused days are given back. Queued plans move earlier, running plans end earlier,
-- plans that started during the pause are untouched. Resuming on or before the start cancels the pause.
create or replace function public.end_pause(p_pause uuid, p_resume_on date, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.member_pauses; v_root uuid; v_unused int; v_cancel boolean;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  select * into v_p from public.member_pauses where id = p_pause for update;
  if v_p.id is null or v_p.cancelled_at is not null then raise exception 'No such pause.' using errcode = 'P0001'; end if;
  if p_resume_on > v_p.until_date then return jsonb_build_object('changed', false); end if;
  v_root := public.member_root(v_p.member_id);
  v_cancel := p_resume_on <= v_p.from_date;
  v_unused := case when v_cancel then v_p.until_date - v_p.from_date + 1 else v_p.until_date - p_resume_on + 1 end;
  update public.memberships m set
    starts_on = case when m.starts_on > v_p.until_date then m.starts_on - v_unused else m.starts_on end,
    ends_on = case when m.starts_on > v_p.until_date or m.starts_on < v_p.from_date then m.ends_on - v_unused else m.ends_on end
  from public.members g
  where g.id = m.member_id and g.root_id = v_root and m.voided_at is null and m.ends_on >= v_p.from_date;
  if v_cancel then
    update public.member_pauses set cancelled_at = now() where id = p_pause;
  else
    update public.member_pauses set until_date = p_resume_on - 1, ended_early_at = now() where id = p_pause;
  end if;
  perform public.log_activity(v_root, 'member.pause_ended', format('Back on %s · %s days given back', p_resume_on, v_unused), jsonb_build_object('pause_id', p_pause), p_staff);
  return jsonb_build_object('changed', true, 'days_given_back', v_unused, 'cancelled', v_cancel);
end $$;

create or replace function public.archive_member(p_member uuid, p_staff uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.member_root(p_member);
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  update public.members set archived_at = now(), archived_by_staff = p_staff, archive_reason = p_reason where id = v_root and archived_at is null;
  perform public.log_activity(v_root, 'member.archived', 'Archived · history kept', jsonb_build_object('reason', p_reason), p_staff);
end $$;

create or replace function public.restore_member(p_member uuid, p_staff uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_root uuid := public.member_root(p_member);
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  update public.members set archived_at = null, archived_by_staff = null, archive_reason = null where id = v_root;
  perform public.log_activity(v_root, 'member.restored', 'Restored from archive', '{}', p_staff);
end $$;

create or replace function public.request_merge(p_keep uuid, p_duplicate uuid, p_staff uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_desk_or_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  perform public.assert_staff(p_staff);
  insert into public.merge_requests (keep_member_id, duplicate_member_id, note, requested_by_staff)
  values (public.member_root(p_keep), public.member_root(p_duplicate), p_note, p_staff) returning id into v_id;
  insert into public.outbox (kind, payload) values ('merge_request_email', jsonb_build_object('request_id', v_id));
  return v_id;
end $$;

-- Pete only. Merge = link: the duplicate points at the kept member; its visits, plans and tags stay where they are
-- and are read as one member from now on. Reversible with unmerge_member.
create or replace function public.merge_members(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_r public.merge_requests; v_keep uuid; v_dup uuid;
begin
  if not public.is_admin() then raise exception 'Only Pete can merge.' using errcode = '42501'; end if;
  select * into v_r from public.merge_requests where id = p_request for update;
  if v_r.id is null or v_r.status <> 'open' then raise exception 'This request is closed.' using errcode = 'P0001'; end if;
  v_keep := public.member_root(v_r.keep_member_id);
  v_dup := public.member_root(v_r.duplicate_member_id);
  if v_keep = v_dup then raise exception 'Already the same member.' using errcode = 'P0001'; end if;
  update public.members set merged_into = v_keep, merged_at = now() where id = v_dup;
  -- Logins stay where they are: my_member_root() follows root_id, so an app login on the duplicate now sees the merged member.
  update public.members set root_id = v_keep where root_id = v_dup;
  update public.merge_requests set status = 'merged', decided_at = now(), decided_by = auth.uid() where id = p_request;
  perform public.log_activity(v_keep, 'member.merged', 'Duplicate merged in', jsonb_build_object('duplicate', v_dup, 'request_id', p_request), v_r.requested_by_staff);
  perform public.log_activity(v_dup, 'member.merged', 'Merged into another member', jsonb_build_object('kept', v_keep, 'request_id', p_request), v_r.requested_by_staff);
  return jsonb_build_object('kept', v_keep, 'duplicate', v_dup);
end $$;

create or replace function public.reject_merge(p_request uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Pete can decide merges.' using errcode = '42501'; end if;
  update public.merge_requests set status = 'rejected', decided_at = now(), decided_by = auth.uid(), note = coalesce(p_note, note)
  where id = p_request and status = 'open';
end $$;

create or replace function public.unmerge_member(p_duplicate uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_dup public.members;
begin
  if not public.is_admin() then raise exception 'Only Pete can unmerge.' using errcode = '42501'; end if;
  select * into v_dup from public.members where id = p_duplicate;
  if v_dup.merged_into is null then raise exception 'Not merged.' using errcode = 'P0001'; end if;
  update public.members set merged_into = null, merged_at = null where id = p_duplicate;
  -- Everything that was merged into the duplicate (directly or through others) follows it back out.
  with recursive tree as (
    select id from public.members where id = p_duplicate
    union all
    select m.id from public.members m join tree t on m.merged_into = t.id
  )
  update public.members set root_id = p_duplicate where id in (select id from tree);
  perform public.log_activity(p_duplicate, 'member.unmerged', 'Unmerged', jsonb_build_object('was_in', v_dup.merged_into), null);
end $$;

-- -------------------------------------------------------------------------------------
-- Counter QR (no login): read options, create a sign-up
-- -------------------------------------------------------------------------------------

create or replace function public.join_options() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'waiver', (select jsonb_build_object('id', id, 'version', version, 'texts', texts) from public.waiver_versions order by version desc limit 1),
    'coaches', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'photo_path', photo_path) order by name)
                from public.coaches where on_qr and active and archived_at is null and portal <> 'house'), '[]'::jsonb)
  )
$$;

create or replace function public.create_signup(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_waiver uuid; v_coach uuid;
begin
  select id into v_waiver from public.waiver_versions order by version desc limit 1;
  if nullif(trim(p->>'first_name'), '') is null then raise exception 'First name is required.' using errcode = 'P0001'; end if;
  if nullif(trim(p->>'phone'), '') is null and nullif(trim(p->>'email'), '') is null then raise exception 'Phone or email is required.' using errcode = 'P0001'; end if;
  if coalesce((p->>'agreed')::boolean, false) is not true or nullif(p->>'signature_path', '') is null then raise exception 'The waiver must be signed.' using errcode = 'P0001'; end if;
  if (p->>'coach_id') is not null then
    select id into v_coach from public.coaches where id = (p->>'coach_id')::uuid and on_qr and active;
  end if;
  insert into public.signups (kind, first_name, last_name, phone, email, lang, coach_id, waiver_version_id, signature_path, link_tag)
  values (coalesce(p->>'kind', 'new'), trim(p->>'first_name'), coalesce(trim(p->>'last_name'), ''), nullif(trim(p->>'phone'), ''),
          nullif(lower(trim(p->>'email')), ''), coalesce(p->>'lang', 'en'), v_coach, v_waiver, p->>'signature_path',
          nullif(public.normalize_code(p->>'link_tag'), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'first_name', trim(p->>'first_name'), 'coach', (select name from public.coaches where id = v_coach));
end $$;

-- -------------------------------------------------------------------------------------
-- Coach actions
-- -------------------------------------------------------------------------------------

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
  insert into public.outbox (kind, payload) values ('program_push', jsonb_build_object('member_id', v_root, 'version', v_ver));
  return jsonb_build_object('program_id', v_prog, 'version', v_ver);
end $$;

create or replace function public.coach_set_targets(p_member uuid, p_goal text, p_protein int, p_carbs int, p_fat int, p_water numeric, p_steps int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_coach uuid := public.my_coach_id(); v_id uuid;
begin
  if v_coach is null or not public.coach_sees_member(p_member) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.nutrition_targets (member_id, coach_id, goal, protein_g, carbs_g, fat_g, water_l, steps, sent_by)
  values (public.member_root(p_member), v_coach, p_goal, p_protein, p_carbs, p_fat, p_water, p_steps, auth.uid()) returning id into v_id;
  return jsonb_build_object('id', v_id, 'kcal', p_protein * 4 + p_carbs * 4 + p_fat * 9);
end $$;

-- -------------------------------------------------------------------------------------
-- Row level security. Default deny; the policies below open exactly what each role needs.
-- Writes that change history go through the functions above, never straight to the tables.
-- -------------------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- profiles
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_admin on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- staff, coaches, devices, shifts
create policy staff_read on public.staff for select to authenticated using (public.is_gym_reader());
create policy staff_admin on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy coaches_read on public.coaches for select to authenticated using (true);
create policy coaches_admin on public.coaches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy devices_desk on public.desk_devices for select to authenticated using (public.is_desk_or_admin());
create policy devices_admin on public.desk_devices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy devices_insert on public.desk_devices for insert to authenticated with check (public.is_desk_or_admin());
create policy shifts_desk_read on public.shifts for select to authenticated using (public.is_gym_reader());
create policy shifts_desk_write on public.shifts for insert to authenticated with check (public.is_desk_or_admin());
create policy shifts_desk_end on public.shifts for update to authenticated using (public.is_desk_or_admin()) with check (public.is_desk_or_admin());

-- members and their records
create policy members_read on public.members for select to authenticated
  using (public.is_gym_reader() or public.coach_sees_member(id) or public.is_my_member(id));
create policy members_desk_edit on public.members for update to authenticated using (public.is_desk_or_admin()) with check (public.is_desk_or_admin());
create policy members_desk_insert on public.members for insert to authenticated with check (public.is_desk_or_admin());

create policy credentials_read on public.credentials for select to authenticated using (public.is_desk_or_admin() or public.is_my_member(member_id));
create policy credentials_desk_insert on public.credentials for insert to authenticated with check (public.is_desk_or_admin());
create policy credentials_desk_revoke on public.credentials for update to authenticated using (public.is_desk_or_admin()) with check (public.is_desk_or_admin());

create policy pauses_read on public.member_pauses for select to authenticated using (public.is_gym_reader() or public.is_my_member(member_id));

create policy memberships_read on public.memberships for select to authenticated
  using (public.is_gym_reader() or public.is_my_member(member_id) or (kind = 'pt' and coach_id = public.my_coach_id()) or public.coach_sees_member(member_id));
create policy sales_read on public.sales for select to authenticated using (public.is_gym_reader());
create policy checkins_read on public.checkins for select to authenticated
  using (public.is_gym_reader() or (member_id is not null and (public.is_my_member(member_id) or public.coach_sees_member(member_id))));
create policy pt_sessions_read on public.pt_sessions for select to authenticated
  using (public.is_gym_reader() or coach_id = public.my_coach_id() or public.is_my_member(member_id));

-- plans and price history
create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_admin on public.plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy price_history_read on public.plan_price_history for select to authenticated using (public.is_owner_or_admin());
create policy price_history_admin on public.plan_price_history for insert to authenticated with check (public.is_admin());

-- sign-ups and leads
create policy waiver_read on public.waiver_versions for select to anon, authenticated using (true);
create policy waiver_admin on public.waiver_versions for insert to authenticated with check (public.is_admin());
create policy signups_desk on public.signups for select to authenticated using (public.is_desk_or_admin());
create policy signups_desk_update on public.signups for update to authenticated using (public.is_desk_or_admin()) with check (public.is_desk_or_admin());
create policy leads_coach_read on public.leads for select to authenticated using (coach_id = public.my_coach_id() or public.is_gym_reader());
create policy leads_coach_update on public.leads for update to authenticated using (coach_id = public.my_coach_id() or public.is_admin()) with check (coach_id = public.my_coach_id() or public.is_admin());
create policy leads_coach_insert on public.leads for insert to authenticated with check (coach_id = public.my_coach_id() or public.is_desk_or_admin());
create policy invites_read on public.invites for select to authenticated using (public.is_desk_or_admin());

-- coaching
create policy exercises_read on public.exercises for select to authenticated using (coach_id is null or coach_id = public.my_coach_id() or public.is_admin());
create policy exercises_coach_insert on public.exercises for insert to authenticated with check (coach_id = public.my_coach_id() or public.is_admin());
create policy exercises_coach_update on public.exercises for update to authenticated using (coach_id = public.my_coach_id() or public.is_admin()) with check (coach_id = public.my_coach_id() or public.is_admin());
create policy programs_read on public.programs for select to authenticated using (public.is_my_member(member_id) or coach_id = public.my_coach_id() or public.is_admin());
create policy programs_member_own on public.programs for insert to authenticated with check (coach_id is null and public.is_my_member(member_id));
create policy program_versions_read on public.program_versions for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and (public.is_my_member(p.member_id) or p.coach_id = public.my_coach_id() or public.is_admin())));
create policy program_versions_member_own on public.program_versions for insert to authenticated
  with check (exists (select 1 from public.programs p where p.id = program_id and p.coach_id is null and public.is_my_member(p.member_id)));
create policy targets_read on public.nutrition_targets for select to authenticated using (public.is_my_member(member_id) or coach_id = public.my_coach_id() or public.is_admin());
create policy notes_read on public.coach_notes for select to authenticated using (public.is_my_member(member_id) or coach_id = public.my_coach_id() or public.is_admin());
create policy notes_coach_insert on public.coach_notes for insert to authenticated with check (coach_id = public.my_coach_id() and public.coach_sees_member(member_id));
create policy picks_read on public.coach_picks for select to authenticated using (public.is_my_member(member_id) or coach_id = public.my_coach_id() or public.is_admin());
create policy picks_coach_insert on public.coach_picks for insert to authenticated with check (coach_id = public.my_coach_id() and public.coach_sees_member(member_id));
create policy picks_coach_update on public.coach_picks for update to authenticated using (coach_id = public.my_coach_id()) with check (coach_id = public.my_coach_id());

create policy workouts_read on public.workout_logs for select to authenticated using (public.is_my_member(member_id) or public.coach_sees_member(member_id) or public.is_admin());
create policy workouts_member_insert on public.workout_logs for insert to authenticated with check (public.is_my_member(member_id));
create policy workouts_member_finish on public.workout_logs for update to authenticated using (public.is_my_member(member_id)) with check (public.is_my_member(member_id));
create policy sets_read on public.set_logs for select to authenticated
  using (exists (select 1 from public.workout_logs w where w.id = workout_log_id and (public.is_my_member(w.member_id) or public.coach_sees_member(w.member_id) or public.is_admin())));
create policy sets_member_write on public.set_logs for insert to authenticated
  with check (exists (select 1 from public.workout_logs w where w.id = workout_log_id and public.is_my_member(w.member_id)));
create policy daily_read on public.daily_checkins for select to authenticated using (public.is_my_member(member_id) or public.coach_sees_member(member_id) or public.is_admin());
create policy daily_member_insert on public.daily_checkins for insert to authenticated with check (public.is_my_member(member_id));
create policy daily_member_update on public.daily_checkins for update to authenticated using (public.is_my_member(member_id) and date >= public.today_bkk() - 1) with check (public.is_my_member(member_id));

-- café menu: anyone can read what's in the app; Pete edits
create policy menu_categories_read on public.menu_categories for select to anon, authenticated using (true);
create policy menu_items_read on public.menu_items for select to anon, authenticated using ((in_app and not is_draft and archived_at is null) or public.is_gym_reader());
create policy menu_groups_read on public.menu_option_groups for select to anon, authenticated using (true);
create policy menu_options_read on public.menu_options for select to anon, authenticated using (archived_at is null or public.is_admin());
create policy menu_categories_admin on public.menu_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy menu_items_admin on public.menu_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy menu_groups_admin on public.menu_option_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy menu_options_admin on public.menu_options for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cafe_orders_member on public.cafe_orders for insert to authenticated with check (public.is_my_member(member_id));
create policy cafe_orders_read on public.cafe_orders for select to authenticated using (public.is_my_member(member_id) or public.is_gym_reader());

-- Qashier: Pete imports (through the server, with the service role), Andy reads
create policy qashier_imports_read on public.qashier_imports for select to authenticated using (public.is_owner_or_admin());
create policy qashier_lines_read on public.qashier_lines for select to authenticated using (public.is_owner_or_admin());

-- activity, messages, merges, settings
create policy activity_read on public.activity for select to authenticated using (public.is_gym_reader() or (member_id is not null and public.is_my_member(member_id) and kind in ('membership.sold', 'pt.used', 'member.paused', 'member.pause_ended')));
create policy messages_read on public.messages for select to authenticated using (public.is_desk_or_admin());
create policy messages_desk_insert on public.messages for insert to authenticated
  with check ((public.my_role() = 'desk' and from_side = 'desk' and staff_id is not null) or (public.is_admin() and from_side = 'admin'));
create policy messages_mark_read on public.messages for update to authenticated using (public.is_desk_or_admin()) with check (public.is_desk_or_admin());
create policy merges_read on public.merge_requests for select to authenticated using (public.is_desk_or_admin());
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- outbox: service role only (no policies for anon/authenticated)

-- Who may call what. Supabase grants EXECUTE to PUBLIC by default; tighten it.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.join_options() to anon;
grant execute on function public.create_signup(jsonb) to anon;
grant execute on function public.today_bkk() to anon;

-- Live updates for the screens that need them (no-op where the publication doesn't exist, e.g. plain Postgres in tests).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.signups, public.checkins, public.leads, public.pt_sessions,
      public.program_versions, public.nutrition_targets, public.coach_notes, public.coach_picks, public.messages, public.merge_requests,
      public.daily_checkins, public.workout_logs;
  end if;
end $$;
