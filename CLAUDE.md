# SUPER1 · instructions for Claude Code

SUPER1 is the operating system for **Superfit**, a gym and café in Chalong, Phuket: front desk, counter QR sign-up, member app, coach portal, owner app (Andy) and admin (Pete). One repo, one Supabase database, two domains: **super1.world** (staff) and **super1.app** (members and coaches). Qashier stays the till; SUPER1 never takes money at launch.

## Read first

1. `docs/00-START-HERE.md`: the map of the spec.
2. The phase prompt you were given (`prompts/phase-*.md`).
3. The docs that prompt points to. `docs/04-BUSINESS-RULES.md` is the law.

## Stack

- TanStack Start v1 (React 19, Vite) deployed to Cloudflare Workers
- Tailwind CSS v4 with `design/tokens.css`; Inter + Noto Sans Thai; Lucide icons
- Supabase: Postgres with RLS, Auth (email one-time codes), Storage, Realtime
- Zod for every input; TanStack Query for server state
- Vitest (`npm test`), database tests (`npm run db:test`, plain Postgres 15+), Playwright for screen checks
- Resend for email, sent from the `outbox` table by a cron worker

## Never

- **Never delete rows.** No `delete`, `truncate` or `drop` of data in app code, SQL, scripts or migrations. Archive, end, void, merge or undo instead. The database refuses deletes anyway.
- Never update check-ins, sales, activity, program versions, nutrition targets or Qashier lines. Never change a sold membership's member, plan, price or coach.
- Never write business rules straight to tables. Use the database functions: `desk_check_in`, `desk_sell`, `desk_day_pass`, `desk_complete_signup`, `desk_complete_link`, `use_pt_session`, `undo_pt_session`, `pause_member`, `end_pause`, `archive_member`, `restore_member`, `request_merge`, `merge_members`, `coach_send_program`, `coach_set_targets`, `create_signup`.
- Never edit an applied migration. Add a new numbered one.
- Never ship the service role key to a browser.
- Never do date maths with raw `Date`. Use `src/lib/dates.ts` and the SQL functions. Business dates are Bangkok calendar dates and inclusive.
- Never hardcode UI text. Every string comes from `src/i18n` (en + th for staff; en + th + ru for members and the QR). Business data (names, plan names) is not translated.
- Never use colours, radii or easing outside `design/tokens.css`. Pink means PT and nothing else. The blue gradient is only for the logo and success moments.
- Never rewrite published git history (no force push, no amending pushed commits).

## Always

- Every desk mutation passes the staff member on shift (`staff_id`); the functions refuse without it. Coach, owner and admin actions carry their login.
- When a rule changes, change `src/lib`, the SQL function and both test suites in the same commit.
- Build each screen to its board: `design/screens/<board>.png` (static render of the mock-up) and the board source in `design/mockup/`. Board ids are in `docs/01-PRODUCT.md`.
- After a sale, tell the desk exactly what to ring on Qashier.
- Money: whole baht incl. 7% VAT. Qashier report category/product amounts are ex-VAT (× 1.07).
- Before saying a task is done: `npm test`, `npm run db:test`, `npm run typecheck` all green, and the phase demo works.
- Ask before deciding anything listed in `docs/11-OPEN-QUESTIONS.md` differently from its default.

## Code layout

```
src/
  lib/              pure rules: dates, membership, qashier (no React, no Supabase)
  server/           server functions: Supabase calls, Qashier import, outbox worker, cron
  components/kit/   the design kit, one component per kit class in design/mockup/ds/super1/components/bundle.css
  surfaces/world/   desk, owner, admin (super1.world)
  surfaces/app/     member app, join, coach portal (super1.app)
  i18n/             en.ts, th.ts, ru.ts (typed, same keys)
supabase/
  migrations/       numbered SQL, never edited once applied
  seed/             JSON source of truth → node scripts/build-seed.mjs → seed.sql
  tests/            shim + scenario tests (scripts/db-test.sh)
design/             tokens.css, brand, photos, mockup (board sources), screens (PNG per board)
docs/               the spec
prompts/            one prompt per build phase
fixtures/           real Qashier report for tests
```

## Commands

```
npm install
npm test                 # vitest: dates, membership rules, Qashier parser
npm run db:test          # migration + seed + 61 scenario checks on a throwaway Postgres
npm run typecheck
node scripts/build-seed.mjs   # after editing supabase/seed/*.json
```
