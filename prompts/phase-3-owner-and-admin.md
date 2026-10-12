# Phase 3 · Andy (owner) and Pete (admin)

Read `CLAUDE.md`, `docs/01-PRODUCT.md` sections 5 and 6, `docs/06-QASHIER.md`, and flows 8–10 in `docs/02-CONNECTIONS.md`. Build to boards O01–O05, Admin, A01–A06.

## Do

1. Owner app at super1.world/owner, phone-first, installable PWA, tab bar Today / Week / Members / Café, read-only. Today = latest `qashier_days` row for today or the last imported day (say which), plus live check-ins and day passes from `checkins`; count-up (Motion #5); "Desk and Qashier match" from the reconciliation. Week and Members from real data; days without an import say "Not imported".
2. Admin dashboard with KPIs and the inbox: merge requests (review sheet → `merge_members` / `reject_merge`), desk messages with replies (realtime both ways), Qashier alerts.
3. A01 Qashier import: upload one or many CSVs to a server function; parse with `src/lib/qashier/parse.ts`; preview (totals, the five checks, desk vs Qashier, products not in the menu with "Add as drafts", legacy categories); Import writes `qashier_imports` (versioned) + `qashier_lines` with the service role; same file twice → "Already imported".
4. A02 plans and prices (price edits write `plan_price_history`; desk on/off; reminder to change Qashier).
5. A03 café menu manager (photos to the `menu` bucket, names EN/TH/RU, add-on groups, macros with the verified switch; drafts).
6. A04 staff and coaches (shift picker names, Qashier login matching, coach portal invites), A05 logins and roles (invite with role, desk devices sign-out, change desk passcode), A06 settings (waiver versions EN/TH/RU, QR stand poster PDF, gym details).

## Done when

- "Definition of done" in `docs/09-BUILD-PLAN.md`.
- Demo: Pete imports `fixtures/qashier/2026-10-12_sales_report.csv` → preview ฿50,222, all checks green → Import → Andy's Today shows ฿50,222 with Gym ฿37,050, Café ฿10,655, Shop ฿2,517, cash 47%. Pete merges Natalia #1188 into #0957 → tag 001877 scans her in. Andy can't change anything.
