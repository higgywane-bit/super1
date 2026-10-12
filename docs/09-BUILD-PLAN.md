# 09 · Build plan

Seven phases. Each one ships something real, ends with green tests and a demo script, and has a ready prompt in `prompts/`. Paste one phase at a time into Claude Code; don't start the next until the demo works.

| Phase | Ships | Who can use it after | Prompt |
|---|---|---|---|
| 0 | Foundations: app skeleton on both domains, database, logins and roles, design kit, languages | Pete signs in | `prompts/phase-0-foundations.md` |
| 1 | Front desk + counter QR sign-up | Desk team (on test data) | `prompts/phase-1-desk-and-signup.md` |
| 2 | Move the data from Lovable Cloud, switch the desk over | Desk team, live | `prompts/phase-2-migration.md` |
| 3 | Andy's app + Pete's admin (Qashier import, prices, menu, people, logins) | Andy, Pete | `prompts/phase-3-owner-and-admin.md` |
| 4 | Coach portal, Sunman pilot | Sunman | `prompts/phase-4-coach-portal.md` |
| 5 | Member app (web, installable) | Emma and friends, then everyone | `prompts/phase-5-member-app.md` |
| 6 | Launch: App Store and Play, onboarding at the counter, exercise videos | Everyone | `prompts/phase-6-launch.md` |
| 7 | Later: online renewals (see 07-PAYMENTS) | Members | written when needed |

## Definition of done (every phase)

- `npm test` and `npm run db:test` green; new rules have new tests.
- `npm run typecheck` and lint clean.
- Every new screen matches its board in `design/screens/<board>.png` (layout, copy, colours, motion from 05-DESIGN) at the board's size, plus phone width 390 with no horizontal scroll.
- No `delete` anywhere in app code; no direct table writes for anything 04-BUSINESS-RULES says goes through a function.
- English + Thai strings for staff screens, + Russian for member screens and the QR, all from the dictionary.
- The phase's demo script (below) works end to end on the preview deployment.
- Small commits with clear messages; a short `CHANGELOG.md` entry.

## Phase 0 · Foundations

- TanStack Start (React 19, Vite) on Cloudflare Workers; Tailwind v4 with `design/tokens.css`; Supabase client.
- Host routing: `super1.world` → staff route group (`/`, `/desk/*`, `/owner/*`, `/admin/*`), `super1.app` → member group (`/`, `/join`, `/coach/*`). Local dev uses `world.localhost` and `app.localhost` (or a `?host=` override in dev only).
- Supabase project: apply `supabase/migrations/0001_init.sql`, run `supabase/seed.sql`, create the storage buckets (03-DATA-MODEL).
- Auth: email OTP (6-digit code) for everyone; the desk's shared account signs in with email + passcode. `profiles` decides the route group a login can open. Invite Pete (admin) first.
- Kit: `src/components/kit/` (Button, Pill, Card, Group/Row, Input, Segmented, Tile, Chip, Sheet, Disc, Avatar, TabBar, NavItem, Switch, Toast) matching `bundle.css` exactly; motion utilities from tokens.
- i18n: typed dictionary (`src/i18n/{en,th,ru}.ts`), language stored per profile and per device; Thai font stack.
- Logo and splash animation (Motion #1).
- **Demo:** Pete opens super1.world, gets a code by email, lands on an empty admin shell in English, switches to Thai; super1.app/join shows the language screen.

## Phase 1 · Front desk + counter QR

- Boards D01–D10 and Join, QRStand, Invite (email template).
- Desk sign-in with **who's on shift**; every desk call passes `staff_id`.
- Check-in page: hidden scan input always focused, `desk_check_in`, allowed/declined popups with sound (Motion #3, #4), Today feed (realtime), counter queue (realtime `signups`).
- Members list (search, filters), profile, sell or renew (`desk_sell`, dates card from the same rules), PT log (`use_pt_session` + undo), archive, ask Pete to merge, message Pete.
- `/join`: language, details, coach pick (`join_options`), waiver + signature (upload to `signatures`), `create_signup`, welcome (Motion #2). Turnstile + rate limit.
- `desk_complete_signup`, `desk_complete_link`; outbox worker sends the invite email (Resend) in EN/TH/RU.
- **Demo:** on a phone, sign up "Ivan Petrov" in Russian picking Sunman → desk sees him in under 2 s → scan tag 004417, 1 Month, card → invite email arrives in Russian → scan 004417 → green popup "WELCOME IN · Ivan Petrov · 30 days left". Scan an expired tag → red popup with "Renew now" → sell 1 Week → scan again → allowed. Sell Emma a renewal → "Starts Sun 1 Nov".

## Phase 2 · Move the data

- Follow 08-MIGRATION exactly: export, `legacy` schema, `scripts/migrate-legacy.sql` (idempotent), verification report (counts, every member's standing, every credential, money).
- Rehearse twice on a copy. Then the cutover night.
- **Demo:** the migration report shows zero unexplained differences; the desk team checks in 10 real members on the new desk.

## Phase 3 · Andy and Pete

- Owner app O01–O05 (phone-first PWA): Today from the latest Qashier day + live check-ins; Week; Members; Café. Count-up (Motion #5).
- Admin: dashboard + inbox (merge requests with review sheet → `merge_members`, desk messages), A01 Qashier import (server parse with `src/lib/qashier`, preview, checks, desk vs Qashier, drafts), A02 plans and prices (+ price history, "change Qashier too"), A03 café menu manager (photos to storage, macros + verified switch), A04 staff and coaches (Qashier name matching, coach invites), A05 logins and roles, A06 settings (waiver versions, QR poster PDF).
- **Demo:** Pete drops `fixtures/qashier/2026-10-12_sales_report.csv` → preview shows ฿50,222, all checks green, desk vs Qashier, 7 menu drafts → Import → Andy's Today shows ฿50,222 with Gym ฿37,050 / Café ฿10,655 / Shop ฿2,517. Pete merges Natalia #1188 into #0957 → her old tag scans her in.

## Phase 4 · Coach portal (Sunman pilot)

- Boards C01–C07. Leads (stages, WhatsApp deep link with a hello in the lead's language), clients, program builder (days, library picker, steppers, cues, `coach_send_program` versions), nutrition (`coach_set_targets`, café picks max 3), daily check-ins (table + nudge + note), library (+ own exercises), counter mode on the phone (`use_pt_session` with confirm + undo).
- **Demo:** Ivan appears as Sunman's lead the moment the desk finishes his sign-up; Sunman sends Emma "Day A · Push" v5 and targets 130/180/55 → 1,735 kcal; −1 on his phone takes Emma from 6 to 5 and the desk feed shows it.

## Phase 5 · Member app

- Boards M01–M13 at `super1.app`, installable PWA. Email-code sign-in from the invite. Home, Train (coach program + own), live workout (sets, kg/reps steppers pre-filled from last time, rest timer, offline-safe), done (Motion #6), progress, Fuel (targets, coach picks, full menu with photos and add-ons), item page, "Show at the counter" order card (`cafe_orders`), daily check-in, Me (days left, tag + member QR), settings (language, delete app login).
- Realtime: program, targets, picks, notes, PT count.
- **Demo:** Emma opens the invite, signs in, sees 19 days left and 6 PT sessions, does Day A with 42.5 kg × 8 → PR badge; Sunman sees it in C03 and C05.

## Phase 6 · Launch

- Capacitor wrappers for iOS and Android around super1.app (push notifications, screen brightness up for the member QR). App Store and Play listings, privacy labels, account deletion (login only).
- Counter onboarding kit: QR stand poster (A06), staff script, "link your tag" flow for existing members.
- Exercise videos for the library (storage + short loops).
- Reminder emails (7 and 1 days before the end, 3 days after) from the nightly job.
- **Demo:** an existing member links their tag at the counter, installs the app from the store, signs in, and checks in with the member QR.
