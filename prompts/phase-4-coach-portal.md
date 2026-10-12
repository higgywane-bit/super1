# Phase 4 · Coach portal (Sunman pilot)

Read `CLAUDE.md`, `docs/01-PRODUCT.md` section 4, flows 5–7 in `docs/02-CONNECTIONS.md`, and §7 and §12 of `docs/04-BUSINESS-RULES.md`. Build to boards C01–C07 at super1.app/coach.

## Do

1. Sign-in (C01) by email code for logins with role `coach` linked to a `coaches` row.
2. Clients and leads (C02): KPIs, lead cards with stages (direct updates to `leads` under RLS), WhatsApp deep link with a hello in the lead's language, Not now / Restore; client cards with PT left, last workout, last check-in (yellow after 3 days).
3. Client workspace: Program (C03) with days, library picker sheet, steppers, cues, last-time values from `set_logs`, sync pill, `coach_send_program`; Nutrition (C04) with `coach_set_targets` and café picks (max 3, `coach_picks`); Check-ins (C05) with stats, the 10-day table, nudge (outbox) and notes (`coach_notes`).
4. Library (C06): seed exercises + the coach's own (`exercises.coach_id`), search, group chips, add sheet.
5. Counter mode (C07) on the phone: search own clients, −1 with confirm (`use_pt_session` via `coach_counter`), done state, Undo for 10 minutes, Logged today.
6. Realtime: new leads slide in (Motion #8); client cards update when the member logs.

## Done when

- "Definition of done" in `docs/09-BUILD-PLAN.md`.
- Demo: Ivan appears as Sunman's lead as soon as the desk finishes his sign-up; Sunman sends Emma "Day A · Push" (new version) and targets 130/180/55 = 1,735 kcal; −1 on his phone takes Emma from 6 to 5 and the desk feed shows "PT session with Sunman". Aun can't see Emma.
