# Changelog

## Phase 5 · Member app (super1.app)

- Installable PWA (`manifest-app.webmanifest`), phone-first, the same minimal style: tab bar Home / Train / Fuel / Me.
- Sign-in from the invite email by code; the first sign-in links the login to the member by the invited email (`member_link_me`).
- Home: coach news (a new program or note), today's workout (the day after the last one trained), days left, PT left, daily check-in, today's targets.
- Train: each program's days with last-time weights, "Start my own workout", Progress (top set per exercise over time, personal bests, recent workouts).
- Live workout: kg / reps (or seconds) steppers pre-filled from last time, tick a set → rest timer (45–180 s), next exercise, note, finish. Kept on the phone as you go and queued if offline; saving is idempotent, so a retry never doubles it (`member_save_workout`). Done screen: ring, sets, PR badges ("+2.5 kg").
- Fuel: the coach's targets and picks, the café by category with photos and prices; item sheet with add-ons, quantity, macros only when Pete has checked them ("Macros being verified" otherwise); "Show at the counter" order card priced by the server (`member_cafe_order` → `cafe_orders`).
- Daily check-in (today, editable until tomorrow), Me (days left, plan and end date, tag, the member QR credential that scans at the desk, PT pack, visits), Settings (language EN/ไทย/Русский, sign out, Delete my app login: the login is unlinked and closed, the gym's records stay, Pete gets an email).
- Live: program versions, targets, notes, picks and PT sessions refresh Home without a reload.
- Database `0009_member.sql` (member read models and actions, a guard on logged workouts) with 22 new checks; pure rules in `src/lib/workout.ts` with tests; photos fall back to an icon tile when an image is missing.
- Phase 5 Playwright demo: Emma's invite arrives → she signs in → days left and PT sessions → daily check-in → Day A with one more plate on the bench → PR badge → her member QR scans her in at the desk → Sunman sees "Trained today" and today's check-in.

## Phase 4 · Coach portal (super1.app/coach)

- Minimal by design: people first, tap to open, one action per screen. Sidebar: Clients and leads (new-lead badge), Exercise library.
- Home: new leads as rows (tap → sheet with what they bought, WhatsApp with a hello in their language, Call, stage New / Contacted / Trial booked, Not now / Restore), then clients as rows with last workout, a yellow flag after 3 days without a check-in, and PT left in pink. New leads and client changes arrive over Realtime.
- Client: name, PT left, WhatsApp, pink −1 (one confirm, done state, Undo for 10 minutes). Tabs:
  - Workouts: day chips, exercise rows "4 × 8 · last 42.5 × 8 PR"; tap a row to edit sets, reps or seconds, rest and cue; library picker; Send appears only with unsent changes and creates a new version (`coach_send_program`).
  - Food: goal, kcal computed from P/C/F, steppers for protein, carbs, fat, water, steps (`coach_set_targets`); café picks as chips, max 3 (`coach_set_picks`).
  - Check-ins: four averages, the last 10 days (missing days marked), a nudge when they've gone quiet (one a day, `coach_nudge`), notes that show on the member's Home.
- Library: SUPER1's exercises + the coach's own, search, group chips, add your own.
- Counter mode (C07) left out at the owner's request; −1 lives on the client page. Admin dashboard: the PT-by-coach section removed.
- Database `0008_coach.sql`: `coach_home`, `coach_client`, `coach_set_picks`, `coach_nudge`, a guard so coaches only change a lead's stage and note, `program_push` naming the coach; 32 new checks (Aun can't see Emma). Member emails for `program_push` and `coach_nudge`. Pure rules in `src/lib/coach.ts` with tests.
- Phase 4 Playwright demo: Olga picks Sunman at the counter → the desk finishes it → she appears in Sunman's leads live; Sunman sends Emma "Day A · Push" (version 2) and 130 / 180 / 55 = 1,735 kcal; −1 takes Emma from 6 to 5 and the desk feed shows "PT session with Sunman".

## Phase 3 · Andy (owner) and Pete (admin)

- Owner app at super1.world/owner (O01–O05), phone first and installable (`manifest-owner.webmanifest`), tab bar Today / Week / Members / Café, read-only. Today is the latest imported Qashier day (says "last import" when it isn't today) with a count-up total, gym / café / shop split, memberships sold vs the desk, how people paid and who rang it up, plus live visits from `checkins`. Days without an import say "Not imported".
- Admin dashboard: KPIs, this week, PT this month, and the inbox: merge requests (review sheet → `merge_members` / `reject_merge`), desk messages with replies, Qashier alerts (failed checks, products not in the menu, unmatched Qashier logins). The inbox and its sidebar badge stay live over Realtime on every admin page.
- A01 Qashier import: drop one or many Sales Report CSVs; the server parses them (`src/lib/qashier`), previews totals, the five checks, desk vs Qashier (`src/lib/qashier/reconcile.ts`), products not in the menu (Add as drafts), legacy categories and unmatched staff; Import writes a new `qashier_imports` version + `qashier_lines` with the service role (`qashier_import`); the same file again is "Already imported".
- A02 plans and prices (`admin_set_plan_price` writes `plan_price_history`; desk on/off; reminder to change Qashier), A03 café menu (photos to the `menu` bucket, names and ingredients EN/TH/RU, add-on groups, macros with the "checked by weighing" switch, drafts), A04 staff and coaches (shift-picker names, Qashier login matching, coach portal invites), A05 logins and roles (every staff login with last sign-in, add a login, desk devices with sign out, change the desk passcode, the role matrix), A06 settings (waiver lines EN/TH/RU published as a new version, the counter QR and its printable stand poster, gym details).
- Desk devices check `desk_device_ok` every minute and sign themselves out when Pete signs them out.
- Database `0007_owner_admin.sql`: `qashier_import`, `admin_set_plan_price`, owner read models (`owner_visits`, `owner_week`, `owner_members`), `admin_merge_requests`, `admin_member_brief`, `admin_sign_out_devices`, `desk_device_ok`; 22 new database checks.
- `scripts/demo-setup.sh` puts the design photos back into Storage after a reset. Phase 3 Playwright demo (`e2e/phase3.spec.ts`): import → ฿50,222 with all checks green → Andy's Today ฿50,222 / Gym ฿37,050 / Café ฿10,655 / Shop ฿2,517 / cash 47% → Andy has nothing to change → the desk asks, Pete merges #1188 into #0957 → tag 001877 scans her in as #0957.

## Phase 2 · Moving the data from Lovable Cloud (tooling)

- `scripts/legacy-load.mjs`: loads a `pg_dump --data-only` (or one CSV per table) of the old database verbatim into a `legacy` schema (`scripts/legacy-schema.sql`: one table per old table, same columns, no-delete guards). Refuses the old project (by `LEGACY_PROJECT_REF`/`LEGACY_DB_URL`, or because the database still has the old tables), anything that isn't SUPER1, and a second load into a non-empty `legacy`.
- `scripts/migrate-legacy.sql`: idempotent transform per the mapping table in docs/08: same member ids and numbers (identity continues after the highest), codes, dates, prices; one import `sales` row per membership; freezes → member pauses (dates not shifted again); unknown/custom plans → archived `legacy-…` plans; PT clients → won leads; workout plans → programs + versions (old doc kept under `body.legacy`); diet plans → targets or a coach note; coaches' exercises; workout logs → set logs; daily feedback → daily check-ins; verified café recipes → menu macros. Anything that can't go across as it is lands in `legacy._issues` with what was done. Migration `0006_legacy_ids.sql` adds `legacy_id` where it was missing.
- `scripts/verify-migration.ts`: counts per table, every member's standing today (the old `memberStanding`, copied verbatim into `scripts/legacy-rules/`, vs `member_card`), every active code (old `evaluateAccess` vs `desk_check_in` in a rolled-back transaction), money totals → `migration-report.md`; deliberate rule changes are marked explained (10 Visits as a pack, member-level pauses, archived tags declined); exits 1 on anything unexplained.
- `scripts/rehearse-migration.sh` (+ CI): the whole pipeline on a throwaway Postgres, transform run twice to prove idempotency, against `fixtures/legacy/export.sql`, a synthetic export covering every mapping case. Two rehearsals give identical reports with zero unexplained differences.
- `scripts/copy-images.mjs`: old app images (menu, coaches, brand) and `design/photos` to Storage, same names, never overwriting.
- `docs/CUTOVER.md` and `scripts/cutover-check.sh`: the night's checklist and a read-only preflight.
- Still to do with Pete: run the rehearsals on copies with **real** exports (the old database isn't reachable from here), then the cutover and the 10-member spot check.

## Phase 1 · Front desk and counter QR sign-up

- Desk (super1.world): shared-login sign-in, **Who's on shift?** (stored in `shifts` and on the device; Change in the sidebar), check-in with an always-focused hidden scan input (USB/Bluetooth readers) and type-a-name search, allowed/declined popups (Motion #3/#4) with Web Audio bell/buzz/chime (unlocked on first tap, mute in the sidebar), counter queue and Today feed live over Supabase Realtime, offline banner with queued scans (never decides offline: "Can't check").
- Members (D05) with search and filters, profile (D06), sell or renew (D08) with the dates card from `src/lib/membership.ts`, PT −1 with 10-minute Undo (D09), pause / end pause, archive / restore, ask Pete to merge (D10), Message Pete, attach a tag, walk-in day pass. After every sale the toast says exactly what to ring on Qashier.
- Counter QR (`super1.app/join`): EN/ไทย/Русский, new or existing, details, coach pick (`join_options`), waiver lines + finger signature (PNG to the private `signatures` bucket by a server function), welcome (Motion #2). Turnstile (when configured) + 5 sign-ups per IP per 10 minutes.
- Finish a sign-up (D07, `desk_complete_signup`) and link requests (`desk_complete_link`).
- Outbox worker (cron every minute, and straight after desk actions): invite email (Invite board) in EN/TH/RU with a sign-in code, coach lead email, desk → Pete and merge-request emails. Resend in production, Mailpit locally.
- Database `0004_desk.sql`: desk read models (`desk_feed`, `desk_members`, `desk_member_detail`, `desk_pt_clients`), `desk_check_in_member`, `desk_add_tag`, `desk_start_shift`, `desk_message_pete`, outbox claim/done/failed, `join_attempt_ok`, `mark_abandoned_signups`. `0005_join.sql`: link requests don't need a new waiver. 32 new database checks.
- Demo data for local runs (`supabase/demo.sql`, `scripts/demo-setup.sh`; never production) and the phase 1 Playwright demo (`npm run e2e:fresh`).
- Choices made where the boards are only a mock-up: the "Try a scan" helper became a **Day pass** button; "New member" points the customer to the counter QR (every member signs the waiver there); the "Already a member" result doesn't show the member's name or days left to an anonymous phone (anyone could type a tag number) and asks them to show the screen at the desk instead; signature files are `signatures/<random id>.png`.

## Phase 0 · Foundations

- TanStack Start (React 19, Vite) on Cloudflare Workers: `wrangler.jsonc`, Worker entry `src/server.ts` with Cron Triggers (outbox every minute, nightly jobs).
- One Worker, two domains: `super1.world` (desk `/`, `/owner`, `/admin`) and `super1.app` (member `/`, `/join`, `/coach`). Router URL rewrites map each host to its route group (`/w/*`, `/a/*`); wrong host and `www.` redirect to the right domain; previews honour `?surface=`. Development on `world.localhost:3000` and `app.localhost:3000`.
- Supabase local stack (`supabase/config.toml`, `npm run db:start`), sign-in code email template in EN/TH/RU, storage buckets (`0002_storage.sql`), `set_my_lang` (`0003_foundations.sql`), typed database types (`npm run db:types`).
- Auth: 6-digit email codes for everyone (invite-only, no self sign-up); the shared desk login uses email + passcode. `profiles.role` gates each area; other logins get "Not for this account". Admin-only `inviteLogin` server function and `npm run invite` for the first admin.
- Design kit in `src/components/kit/` on the mock-up's own CSS (`s1.css`, `bundle.css`, `tokens.css`): Button, Pill, Card, Group/Row, Input/Label/Field, Segmented, Tile, Chip, Sheet + Glass, Disc, Avatar, TabBar, NavItem, Switch, Checkbox, Toast, Icon, Wordmark. Reduced motion honoured.
- i18n: typed `en`/`th`/`ru` dictionaries with the same keys (tested), language per device (cookie) and per login, `lang` on `<html>`.
- Sign-in screens with the SUPER1 wordmark and Motion #1: D01 (desk), O01 (owner), admin, M01/M02 (member), C01 (coach); Join language screen; admin, owner, desk, member shells.
- CI: install, `npm test`, `npm run db:test`, `npm run typecheck`, build. Playwright demo `e2e/phase0.spec.ts` (5 checks) against the local stack.

## Starter pack · Mon 12 Oct 2026

- Spec in `docs/` (product, connections, data model, business rules, design, Qashier, payments, migration, build plan, deploy, open questions).
- Database `supabase/migrations/0001_init.sql`: schema, no-delete and history guards, row level security, desk/coach/merge functions; 61 scenario checks.
- Seed: 21 plans with Qashier names, 63 café and shop items with 42 add-ons from the Qashier catalogue, 107 exercises, staff and coaches.
- `src/lib`: dates, membership rules (queueing, pause fix, door decisions, PT), Qashier report parser; 39 unit tests.
- Mock-up: 52 boards (sources, PNG and static HTML), tokens, brand, photos.
