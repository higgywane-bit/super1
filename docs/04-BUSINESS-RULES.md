# 04 · Business rules

Every rule here exists three times and the three must agree:

| Where | What |
|---|---|
| `src/lib/membership.ts`, `src/lib/dates.ts` | Pure TypeScript, used by every screen |
| `supabase/migrations/0001_init.sql` | The same rules in SQL functions (`plan_end_date`, `next_start_date`, `coverage_end`, `member_card`, `desk_check_in`, `pause_member`, `end_pause`, `use_pt_session`) |
| `tests/membership.test.ts`, `supabase/tests/01_scenarios.sql` | The examples below, as tests |

If you change a rule, change all three in the same commit.

---

## 1. Nothing is ever deleted

- No row in any table is ever deleted. Every table has a `forbid_delete` trigger, so even the service role can't.
- **Members** are *archived* (hidden, tag stops working, history kept, restorable) or *merged* (see §9).
- **Memberships** are never edited after sale except: dates (by a pause), `sessions_used` (by a check-in or PT session), `notes`, and *voiding* a sale entered by mistake (needs a reason; a voided plan never counts again and can't be un-voided).
- **Check-ins, sales, activity, program versions, nutrition targets, Qashier lines** are written once and never updated.
- **Credentials** (tags, app QR codes, old Glofox cards) are revoked, never edited or reassigned.
- **PT sessions** are undone (marked `undone_at`), never removed.
- **Qashier days** are re-imported as a new version; the old version is marked superseded.

## 2. Dates

- All business dates are **Bangkok calendar dates** (UTC+7, no daylight saving), stored as `date`, handled as `"YYYY-MM-DD"` strings in TypeScript.
- Start and end dates are **inclusive**. A Day Pass bought today starts and ends today.
- **Days left** = `end − today`. 0 means today is the last day. Emma, cover to Sat 31 Oct, on Mon 12 Oct: **19 days left**.
- Labels: `Last day today` (0), `Ends tomorrow` (1), `19 days left`.

## 3. Plan lengths

| Plan type | End date |
|---|---|
| Day plans (Day Pass 1, 1 Week 7, 2 Weeks 14) | start + days − 1 |
| Month plans (1, 3, 6, 12 Months; Thai plans; packs) | same date n months later, minus a day |
| Month plan starting on a day the end month doesn't have | the end month's last day |

Examples: 1 Month from Thu 1 Oct → **Sat 31 Oct**. From Mon 12 Oct → **Wed 11 Nov**. From 31 Jan → **28 Feb** (29 in a leap year). From 28 Jan → 27 Feb. 1 Week from Sat 3 Oct → Fri 9 Oct.

> The old app ended 31 Jan + 1 month on 27 Feb (a day short). The new rule fixes that. Imported memberships keep their stored dates.

Pack validity (from the old `plans.ts`, **to confirm**, see 11-OPEN-QUESTIONS): 1 PT 1 month, 3 PT 2 months, 10 PT 4 months, 20 PT 6 months, 10 Visits 6 months.

## 4. Selling and queueing (renewals)

- **Time-based memberships queue.** Selling while the member has cover starts the new plan the day after their *unbroken cover* ends. Emma (cover to Sat 31 Oct) buys 1 Month on Mon 12 Oct → **Sun 1 Nov → Mon 30 Nov**. Her days left become 49.
- **Unbroken cover** follows back-to-back plans: a plan that starts on or before the day after the previous one ends extends the cover.
- A plan bought early that hasn't started yet also queues the next one after it.
- **Packs and extras start today**: 10 Visits, PT packs, InBody.
- Every sale writes a `sales` row (price, method, staff on shift) and a `memberships` row in one transaction (`desk_sell`). The money itself is taken on **Qashier**; the desk records how it was paid.
- Payment methods: `card`, `cash`, `promptpay`, `transfer`, `comp` (free), plus `online` later, and `qashier` / `glofox` for imported history.
- Thai resident prices are their own plans (`th1m`, `th3m`, `th6m`, `th12m`), shown under **Thai residents** at the desk.
- PT packs need a coach. Selling a PT pack to a lead marks that coach's lead **won**.

## 5. Pauses (the queued-renewal fix)

A pause belongs to the **member**, not a single plan. When a pause from `F` to `U` (inclusive, `L` days) is set:

| Plan | Effect |
|---|---|
| Ended before `F` | untouched |
| Not started by `F` (queued) | start **and** end move `L` days later |
| Running on `F` | end moves `L` days later |

Example: Emma has 1 Month 1–31 Oct and a renewal 1–30 Nov. Pause Thu 15 → Wed 21 Oct (7 days): 1 Month ends **Sat 7 Nov**, renewal becomes **Sun 8 Nov → Mon 7 Dec**. No overlap, no gap.

> The old app pushed only the paused plan's end date, so a queued renewal overlapped it. This is the bug the user asked to "just fix".

**Ending early.** The member comes back on `R` (before `U`). Unused days `U − R + 1` are given back:

| Plan | Effect |
|---|---|
| Starts after `U` (queued, including one sold during the pause) | start and end move earlier |
| Started before `F` (was running) | end moves earlier |
| Started during the pause (e.g. a PT pack bought while paused) | untouched |

Coming back on or before `F` cancels the pause and restores every date exactly. Emma back on Sun 18 Oct: 1 Month ends **Tue 3 Nov**, renewal **Wed 4 Nov → Thu 3 Dec**.

- Pauses can't overlap. During a pause the door declines with reason `paused`.
- A pause is set and ended by the desk (staff on shift) or Pete.

## 6. The door (check-in)

`desk_check_in(code)` decides, records and returns the popup. In order:

1. Normalise the code (uppercase, drop spaces and dashes, O→0, I/L→1).
2. Unknown or revoked code → **declined `unknown-code`** (row written with the code).
3. Resolve the member through merges (§9). A second scan of the same code within **120 s of an allowed check-in, same day** → same visit, no new row (returns `duplicate: true`). A declined scan is always re-checked (they may have just renewed).
4. Archived → **declined `archived`**.
5. Paused today → **declined `paused`**.
6. A time-based plan covers today → **allowed `membership`**. Nudge `last-day` at 0 days left, `renew-soon` at ≤ 3.
7. Else a 10 Visits pack valid today with visits left → **allowed `visits`**, uses **one visit per calendar day** (a second entry the same day is free). A visit pack is never used while a time plan covers today.
8. Else a valid pack with no visits left → **declined `used-up`**; a plan that starts later → **`not-started`**; a past plan → **`expired`** (show the end date: "Expired Fri 9 Oct"); nothing → **`no-plan`**.

- **Status for lists:** `active`; `expiring` (≤ 7 days left); `paused`; `upcoming`; `expired`; `none`; and `archived` (member flag).
- Automatic scans are **unattributed**. A manual check-in (typed at the desk) records the staff on shift.
- Walk-in **Day Pass** without a member: `desk_day_pass` logs the sale and an allowed check-in with reason `day-pass`. Andy's "check-ins vs day passes" counts member check-ins and day passes separately.

## 7. PT sessions

- A PT pack is a membership with `kind = pt`, a coach, `sessions_total`, `sessions_used`, and an end date.
- **One session off** = `use_pt_session(member)`: picks the valid pack (today within dates, sessions left; for a coach, only their own packs), locks it, increments `sessions_used`, writes a `pt_sessions` row. Emma 6 left → 5.
- Who can: the **desk** (with staff on shift, `via = desk`), the **pack's coach** (`via = coach_portal` or `coach_counter`), Pete.
- **Undo** within 10 minutes by the same desk or coach. The row stays, marked undone, and the count goes back. After 10 minutes only Pete can undo.
- Sessions this month per coach is what Pete and Andy see for coach pay (**pay rules to confirm**).

## 8. Archive

- Archive hides a member from the default list, makes their tags decline at the door (`archived`), and keeps every visit, plan and payment. Restore any time.
- The desk archives with the staff on shift and an optional reason.

## 9. Merge duplicates (link, not move)

The desk can't merge. It **asks Pete** (`request_merge`), and the request lands in Pete's inbox.

When Pete merges duplicate **D** into **K**:

- `D.merged_into = K`, and every member whose `root_id` was D gets `root_id = K`.
- **No visit, plan, sale, credential or session row moves or changes.** Every read groups by `root_id`, so K now shows D's visits and plans, and D's tag scans in as K.
- An app login on D sees K (the member app reads by root).
- Activity on both says *merged by Pete, asked by Tee*.
- **Unmerge** puts everything back (`unmerge_member`).

Example: Natalia **#1188** (made by mistake, 1 Week 3–9 Oct, tag 001877) merged into **#0957** (1 Month 10 Oct → 9 Nov): scanning 001877 now allows her as #0957.

## 10. Who did it (attribution)

- The desk shares one login. On sign-in the desk picks **who's on shift** from the staff list; it stays until someone taps *Change*. Every desk function takes `p_staff` and refuses without it (`Pick who is on shift first.`).
- Coach, admin and owner actions carry their own login (`user_id`).
- Every manual change writes an `activity` row: what, who (staff and/or login), when, and the member.
- Automatic door scans and system jobs are unattributed (`actor = system` or no staff).

## 11. Sign-up at the counter

1. Customer scans the counter QR → `super1.app/join` → language (EN/ไทย/Русский) → name, phone, email → optional coach → waiver lines in their language + signature → **Welcome** screen.
2. `create_signup` stores it (no login needed; rate-limited at the edge). The desk sees it instantly under **Waiting at the counter**.
3. The desk scans a new tag, picks the plan and how it was paid on Qashier, and taps once (`desk_complete_signup`): member + tag + plan + sale + coach lead + app invite email, one transaction.
4. The member's app invite goes to their email (in their language). They sign in with an email code.
- Existing members can use the same QR to **link** their tag and email to the app (`kind = link`); the desk confirms if the email doesn't match the record.
- The waiver text is versioned; each sign-up stores the version it signed and the signature image.

## 12. Leads

- A lead is created when a customer picks a coach on the QR (after the desk completes the sign-up), or by the desk or coach manually.
- Stages: **new → contacted → trial booked → won** (a PT pack sold with that coach) or **not now** (kept, restorable).
- Messaging opens WhatsApp with a hello in the lead's language (no messages stored by SUPER1).

## 13. Money and VAT

- Prices are in whole baht and **include 7% VAT** (as charged at the till).
- Qashier report amounts per category/product/employee are **ex-VAT**; multiply by 1.07 for what the till took. See 06-QASHIER.
- SUPER1 never takes money in phase 1. See 07-PAYMENTS.
