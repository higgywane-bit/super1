-- =====================================================================================
-- SUPER1 · phase 2: moving the data from Lovable Cloud (docs/08-MIGRATION.md).
-- scripts/migrate-legacy.sql is idempotent: every migrated row carries the id it had in the old
-- database (legacy_id), and a second run skips rows already there. These tables didn't have it yet.
-- =====================================================================================

alter table public.activity add column if not exists legacy_id uuid unique;
alter table public.coaches add column if not exists legacy_id uuid unique;
alter table public.leads add column if not exists legacy_id uuid unique;
alter table public.member_pauses add column if not exists legacy_id uuid unique;      -- the old frozen membership
alter table public.exercises add column if not exists legacy_id uuid unique;
alter table public.programs add column if not exists legacy_id uuid unique;           -- the old pt_plans row
alter table public.program_versions add column if not exists legacy_id uuid unique;
alter table public.nutrition_targets add column if not exists legacy_id uuid unique;
alter table public.coach_notes add column if not exists legacy_id uuid unique;
alter table public.workout_logs add column if not exists legacy_id uuid unique;
alter table public.daily_checkins add column if not exists legacy_id uuid unique;
