# Phase 1 · Front desk and counter QR sign-up

Read `CLAUDE.md`, `docs/01-PRODUCT.md` sections 1 and 2, `docs/02-CONNECTIONS.md` flows 1–5 and 10, and all of `docs/04-BUSINESS-RULES.md`. Build to boards D01–D10, Join, QRStand and Invite (`design/screens/`).

## Do

1. Desk sign-in (D01) with **Who's on shift?** (staff from `staff`); the shift is stored in `shifts` and on the device; the sidebar chip changes it. Every desk call passes `staff_id`.
2. Check-in (D02): a hidden input that always has focus so a USB/Bluetooth tag reader works from anywhere on the page; manual "type a name" search; `desk_check_in`; allowed popup (D03) and declined popup (D04) with Motion #3/#4 and Web Audio sounds (unlocked on first tap, mute in the sidebar); Today feed and counter queue via Supabase Realtime; offline banner and queued scans (never allow offline).
3. Members (D05), profile (D06), sell or renew (D08) with the dates card driven by `src/lib/membership.ts` and saved by `desk_sell`; toast with the Qashier amount; PT log (D09) with `use_pt_session` and Undo (`undo_pt_session`, 10 minutes); pause and end pause; archive/restore; ask Pete to merge (D10); Message Pete (writes `messages`, outbox emails Pete).
4. `/join` on super1.app: language, new vs existing, details, coach pick (`join_options`), waiver lines + finger signature (PNG to the `signatures` bucket through a server function), `create_signup`, welcome screen (Motion #2). Cloudflare Turnstile + 5 per IP per 10 minutes.
5. Finish a sign-up (D07): `desk_complete_signup`; link requests: `desk_complete_link`.
6. Outbox worker (cron every minute) sending the invite email (Invite board) in EN/TH/RU via Resend.
7. Playwright tests for the demo below.

## Done when

- "Definition of done" in `docs/09-BUILD-PLAN.md`.
- Demo (phase 1 in 09-BUILD-PLAN): Ivan signs up in Russian picking Sunman → shows at the desk in under 2 s → tag 004417, 1 Month, card → invite email in Russian → scan 004417 → "WELCOME IN · Ivan Petrov · 30 days left". Expired tag → red popup → Renew now → sell 1 Week → scan → allowed. Emma's renewal shows "Starts Sun 1 Nov".
