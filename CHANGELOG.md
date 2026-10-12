# Changelog

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
