# Phase 5 · Member app

Read `CLAUDE.md`, `docs/01-PRODUCT.md` section 3, flows 4–7 in `docs/02-CONNECTIONS.md`, and `docs/05-DESIGN.md` (motion). Build to boards M01–M13 at super1.app as an installable PWA (phone-first, tab bar Home / Train / Fuel / Me).

## Do

1. Sign-in from the invite email: email code (M01, M02); first sign-in links the login to the member (`members.user_id`) by the invited email.
2. Home (M03), Train (M04: coach program + "My own"), live workout (M05: sets with kg/reps steppers pre-filled from last time, rest timer, works offline and syncs), done (M06: ring, PR badge), progress (M07).
3. Fuel (M08: targets, Sunman's picks, the full menu with photos, prices, categories), item (M09: add-ons, macros only when verified, else "Being verified"), Show at the counter (M10, writes `cafe_orders`).
4. Daily check-in (M11, one per day, editable until the next day), Me (M12: days left, plan, tag number + member QR credential `kind = qr`, PT pack, visits), Settings (M13: language EN/TH/RU, notifications, delete app login).
5. Realtime: program versions, targets, picks, notes, PT count.

## Done when

- "Definition of done" in `docs/09-BUILD-PLAN.md`.
- Demo: Emma opens her invite, signs in, sees 19 days left and 6 PT sessions; does Day A with 42.5 kg × 8 → PR badge; the member QR scans her in at the desk; Sunman sees the workout and today's check-in.
