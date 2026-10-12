# Phase 2 · Move the data from Lovable Cloud

Read `CLAUDE.md` and `docs/08-MIGRATION.md` (all of it, twice). The old app is `higgywane-bit/healthy-journey-mate`; its schema is in its `supabase/migrations`, its rules in `src/lib/membership/access.ts`.

## Do

1. A script that loads the old export verbatim into a `legacy` schema (one table per old table, same columns). It must refuse to run against the old project.
2. `scripts/migrate-legacy.sql`: idempotent transform from `legacy.*` into `public.*` exactly as the mapping table says (same member ids and numbers, codes, dates, prices; sales rows for history; pauses from freezes; legacy plans as archived plans; PT clients as won leads; programs, targets, workouts and daily check-ins converted; verified menu recipes → macros).
3. `scripts/verify-migration.ts`: counts per table, every member's standing today (old `memberStanding` vs new `member_card`), every active credential (old `evaluateAccess` vs `desk_check_in` inside a rolled-back transaction), money totals. Writes `migration-report.md`.
4. Image copy: menu, coach and brand assets to Storage.
5. A cutover checklist script/README for the night.

## Done when

- Two rehearsals on copies produce a report with zero unexplained differences.
- Nothing in the code can delete or truncate anything, in either database.
- After cutover the desk team checks in 10 real members on the new desk.
