# Phase 6 · Launch

Read `CLAUDE.md`, `docs/09-BUILD-PLAN.md` phase 6 and `docs/10-DEPLOY.md` (app stores).

## Do

1. Capacitor shells for iOS and Android around super1.app: push notifications (programs, PT sessions, reminders), screen brightness up when showing the member QR, deep links from invite emails.
2. Store listings in English and Thai, privacy policy page (PDPA), "Delete my app login" flow (removes the auth user after unlinking; gym records stay; Pete notified).
3. Counter onboarding kit: printable QR stand (A06), staff one-pager in Thai and English, the link-your-tag flow tested with real members.
4. Exercise media: short looping videos/stills for the library in the `exercises` bucket, shown in C06 and M05.
5. Nightly reminders: 7 and 1 days before the end, 3 days after (outbox `renewal_reminder`, member's language).

## Done when

- An existing member links their tag at the counter, installs the app from the store, signs in, and checks in with the member QR.
