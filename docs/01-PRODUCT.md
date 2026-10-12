# 01 · Product: every surface, every screen

The mock-up is the spec for layout, copy and motion. Every screen below names its board (`D07`, `M05`…). The boards live in `design/mockup/*.dc.html` and on the canvas (link in `design/mockup/README.md`). Where this page and a board disagree, this page wins on behaviour and the board wins on look.

## Who signs in where

| Surface | Domain and path | Who | Sign-in |
|---|---|---|---|
| Front desk | `super1.world` | Joy, Jeab, Tee, Bonnie, Fai, Ning (shared) | Shared desk login (email + passcode), then **who's on shift** |
| Owner | `super1.world/owner` | Andy | Email code |
| Admin | `super1.world/admin` | Pete | Email code |
| Counter QR | `super1.app/join` | Walk-in customers | None |
| Member app | `super1.app` (web now, App Store and Play later) | Members | Email code |
| Coach portal | `super1.app/coach` | Coaches (Sunman first) | Email code |

- `super1.world` never serves member or coach pages; `super1.app` never serves desk, owner or admin pages. Wrong host → redirect to the right one.
- Staff screens: English and ไทย. Member screens and the QR: English, ไทย, Русский. Every string comes from the dictionary; business data (names, plan names from the database) is not translated.

---

## 1. Counter QR sign-up (no login)

| Board | Screen | Must do |
|---|---|---|
| QRStand | Printed stand on the counter | QR to `super1.app/join`, SUPER1 wordmark, "Scan to join / สแกนเพื่อสมัคร / Сканируйте" |
| Join | Language | EN / ไทย / Русский, big targets |
| Join | New or existing | "First time here" or "Already a member" (link tag + email) |
| Join | Your details | First name, last name, phone, email; coach picker ("Training with a coach?", coaches on the QR + "Not now") |
| Join | Waiver | The 3 waiver lines in their language, "Read the full terms", agree checkbox, signature pad (draw with finger), Clear |
| Join | Welcome | The "1" pops, glow breathes, "Welcome, {name}", "Show this at the desk", coach line if picked, "Your app link is on its way" |
| Invite | Invite email | In their language: welcome, plan and dates, tag, "Get the app", sign-in code instructions |

Acceptance:
- Submitting creates a `signups` row and the desk sees it in under 2 seconds.
- Phone or email required; first name required; can't continue without agree + signature.
- Abuse: Cloudflare Turnstile (invisible) + max 5 sign-ups per IP per 10 minutes.

## 2. Front desk (`super1.world`) — boards D01–D10

Layout: left sidebar (wordmark; **On shift** chip with Change; Check-in with queue badge; Members; yellow **Message Pete**; EN/ไทย; Log out), main area max 1140 px. Designed for a 1440 × 940 desk screen and an iPad.

| Board | Screen | Must do |
|---|---|---|
| D01 | Sign in | Shared email + passcode → **Who's on shift?** chips (staff list) → "Start shift as Joy". The shift sticks on that device until changed. |
| D02 | Check-in | Header "Check-in", "Scan a tag or type a name anywhere". **Waiting at the counter** cards (name, language, minutes ago, coach pill, "Attach tag and sell plan"). **Today** feed: allowed, declined, new member, PT session, sale rows with who and time; "Mon 12 Oct · 63 check-ins · 14 in the last hour". "Log PT session" button. |
| D03 | Scan allowed | Popup: green tick draws, "WELCOME IN", name, big days-left number, plan, PT pill, visits this month; auto-closes in 4 s with a draining line; bell sound. |
| D04 | Scan declined | Popup: red cross, shake, buzz; name, reason pill ("Expired Fri 9 Oct"), plan and tag; Close / **Renew now** (opens D08). Stays until tapped. |
| D05 | Members | Search name/phone/tag; filters All, Active, Expiring, Expired, Paused, No plan, Archived; rows with initials, plan line, tag, status pill; "New member". |
| D06 | Member profile | Name, member number, how they joined; status pill; big days-left; plan line (dates, price, method, sold by); **Sell or renew**; PT card (pack, left, coach, valid until, **Use 1 session**); history (activity); tag; app status; waiver; phone; email; language; recent visits; **Archive or merge**. |
| D07 | Finish a counter sign-up | Sheet: name, language, phone, email; waiver signature thumbnail; coach pill. 1 Scan their new tag. 2 Plan (tabs: Memberships, Thai residents, PT, Packs and extras). 3 Paid on Qashier by (Card, Cash, PromptPay, Transfer, Comp). Summary sentence. "Create member and sell 1 Month · ฿2,200". Toast "Invite sent… Ring ฿2,200 on Qashier." |
| D08 | Sell or renew | Same plan tabs and tiles; coach chips for PT; **dates card** ("Starts Sun 1 Nov, after the current plan" or "Starts today"; range; rule note); paid-by; "Sell 1 Month · ฿2,200"; "Ring it on Qashier · sold by Joy". |
| D09 | Log a PT session | Search a PT client; rows with coach and "6 of 10 left"; **Use 1 session**; note that coaches can do it on their phone. |
| D10 | Archive or merge | Archive card (what it keeps, "Archive Natalia"); Merge card for a likely duplicate (same phone): both member numbers with join date and visits; **Ask Pete to merge** → "Sent to Pete". |

Acceptance:
- Every action that changes a member sends the staff on shift; without it the action is refused.
- After any sale, a toast reminds the exact amount to ring on Qashier.
- Desk can't delete anything and can't merge (only ask).
- Sound: allowed ding, declined buzz (Web Audio, unlocked on first tap; mute toggle in the sidebar).
- A scan is handled in under 300 ms on the desk network.

## 3. Member app (`super1.app`) — boards M01–M13

Phone-first (390 × 844), tab bar: Home, Train, Fuel, Me. Dark, glass tab bar.

| Board | Screen | Must do |
|---|---|---|
| M01 | Splash and sign in | Wordmark wipes in, blue glow blooms (once per launch). Email field, "Email me a code". |
| M02 | Email code | 6 boxes, auto-advance, paste support, resend in 30 s. |
| M03 | Home | Greeting; **from your coach** card ("Sunman sent your program · Day A updated"); **Today** workout card ("5 · ~50 min · Workout now"); tiles: days left on plan, PT sessions left with coach; daily check-in card; today's targets (kcal, P/C/F); café teaser; progress card. |
| M04 | Train | "From Sunman" days (Day A · Push…) and "My own" programs; each day with exercises and last-time weights; "Add your own exercise". |
| M05 | Live workout | Exercise name (library name), target "4 × 8", coach cue, sets with kg and reps steppers (pre-filled from last time), tick to complete set, rest timer (90 s default, choices 45–180), next exercise, finish. |
| M06 | Workout done | Ring fills (1.1 s), sets count, PR badge pops (yellow), "+2.5 kg on last week", "Saved to your progress. Sunman can see it." |
| M07 | Progress | Top set chart per exercise, personal bests, recent workouts. |
| M08 | Fuel and café menu | Daily targets from the coach (kcal and P/C/F bars); **Sunman's picks** (pinned café items); the **whole menu** by category (Shakes, Coffee, Juices, Fuel-ups, Waffles and snacks, Shop) with photos and prices. |
| M09 | Menu item | Hero photo, name EN + TH, price, ingredients, add-on groups with prices (XL +฿50, extra scoop +฿60…), macros (or "Being verified"), **Show at the counter**. |
| M10 | Show at the counter | White order card: items, add-ons, total; "The café rings it up on Qashier. Pay by card, cash or PromptPay." Writes a `cafe_orders` row. |
| M11 | Daily check-in | Sleep hours, energy 1–5, digestion 1–5, water (target from coach), steps, bodyweight; streak line; "Complete". |
| M12 | Me and membership | Name, member number, active pill, big days left, plan and end date, tag number + member QR (backup check-in), PT pack, visits. |
| M13 | Settings | Language (EN/ไทย/Русский), notifications, sign out, **Delete my app login** (removes the login only; the gym's records of visits and payments stay; Pete is told). Needed for the App Store. |

Acceptance:
- A member only ever sees their own data (RLS).
- Coach changes (program, targets, picks, notes) appear without reload.
- The member QR on M12 checks them in at the door (`app_qr`).
- Café macros show only for items Pete has verified.
- Works offline for the current workout; syncs when back.

## 4. Coach portal (`super1.app/coach`) — boards C01–C07

Desktop layout for planning, phone layout for counter mode. Sidebar: wordmark + Coach pill, coach card, **Clients and leads** (new-lead badge), **Exercise library**, **Counter mode**, EN/ไทย, Log out.

| Board | Screen | Must do |
|---|---|---|
| C01 | Sign in | Photo half + form: email, "Email me a code", code boxes. "Pete sets up your login." |
| C02 | Clients and leads | KPIs: active clients, sessions this month, new leads. Lead cards: name, language, source, when, detail, phone, email, stage switcher (New / Contacted / Trial booked), WhatsApp, Call, Not now. "Show not now". Client cards: PT left (pink), plan, last workout, last check-in (yellow if none for 3 days), Open, Use 1 session. |
| C03 | Program builder | Client header (PT pill, plan pill, WhatsApp, Use 1 session); tabs Program / Nutrition / Check-ins; day list + Add day; logged workouts; exercise rows with sets and reps steppers, rest, cue, last time (PR in yellow), remove; "Add exercise" (library picker sheet); sync pill ("In the app · v4 · Sun 11 Oct" or "Unsent changes"); **Send to Emma**. |
| C04 | Nutrition | Goal (Lose fat / Maintain / Build muscle); big kcal (computed); P/C/F bar; steppers for protein, carbs, fat (5 g), water (0.5 L), steps (1,000); **Send to Emma**; **Café picks** list with Pin/Pinned (max 3). |
| C05 | Daily check-ins | 4 stat cards (sleep avg, energy, water vs target, weight change); yellow banner when no check-in for 3 days + **Send a nudge**; 10-day table (sleep, energy, digestion, water, steps, weight, note; missing days marked); reply box → shows on the member's Home. |
| C06 | Exercise library | 107 exercises + the coach's own; search; group chips with counts; cards with muscle, equipment, default, log type; **Add your own** sheet (name, group, equipment, how it's logged, default sets/reps, cue). |
| C07 | Counter mode (phone) | Search own clients; cards with PT left and a big pink **−1**; confirm sheet (6 → 5) → done state (big number, "Logged 21:15 · Emma sees it now", Undo, Done); "Logged today" list. |

Acceptance:
- A coach sees only their own clients and leads.
- A program send creates a new immutable version; the member sees it at once.
- −1 needs one confirm; Undo works for 10 minutes.

## 5. Andy (owner) — boards O01–O05

Phone-first app at `super1.world/owner` (installable PWA). Tab bar: Today, Week, Members, Café. Header: date, centred greeting, language button.

| Board | Screen | Must do |
|---|---|---|
| O01 | Sign in | Email code. |
| O02 | Today | **Sales** from Qashier (count-up to ฿50,222; "123 sales · ฿408 average"; Gym/Café/Shop bar and amounts). **Visits**: member check-ins (63, "+6 vs yesterday") vs day passes (45, ฿11,250), mix bar, live pulse ("14 in the last hour"). **Memberships sold** (14 · ฿25,800, by plan) + "Desk and Qashier match". **How people paid** (cash 47%, PromptPay, card) and who rang it up. VAT footnote. |
| O03 | Week | 7 bars (tap a day), week total, average day, check-ins, day passes, new members. Days not imported yet are clearly marked **Sample** in the mock; the real app shows "Not imported" instead. |
| O04 | Members | Active, ending in 7 days, new this month, paused; active members by plan; who ends in the next 7 days; PT packs active and sessions this month. |
| O05 | Café | Café total and items; categories; top sellers; shake add-ons (XL, extra scoop…); orders shown from the app. |

Acceptance:
- Andy can't change anything (read-only role).
- "Pulse" is computed from real check-in rows at read time; no fake activity rows.
- Numbers from Qashier say so ("Qashier · imported 21:05 by Pete").

## 6. Pete (admin) — Admin master + boards A01–A06

Desktop at `super1.world/admin`. Sidebar: Dashboard (inbox badge), Qashier import, Plans and prices, Café menu (drafts badge), Staff and coaches, Logins and roles, Settings; Pete card; Log out.

| Board | Screen | Must do |
|---|---|---|
| Admin | Dashboard | Everything Andy sees (KPIs) + **Inbox**: merge requests (Review merge → side-by-side sheet, "What happens", **Merge into #0957**; or Not a duplicate), desk messages (Reply), Qashier alerts. Week bars; PT sessions per coach this month. |
| A01 | Qashier import | Drop zone (several days at once) → preview: file, date, sections, products; 3 green checks; **Desk vs Qashier** table; **In Qashier, not in the menu app** chips + "Add as drafts"; legacy category note; **Import** → "Imported · on Andy's app"; imported-days strip. |
| A02 | Plans and prices | Tabs Memberships, Thai residents, PT, Packs and extras; rows: plan, length, Qashier product, price (edit), desk on/off; Unsaved pill + Save prices ("Change it on Qashier too"); **Rules the system follows** card. |
| A03 | Café menu | Category chips with counts (+ Drafts); rows: photo, name + Thai, price, macros status, in-app switch, Edit. Editor sheet: photo, names EN/TH/RU, price, ingredients, add-ons, macros (draft from recipe), **Checked by weighing** switch, Save. |
| A04 | Staff and coaches | Front desk names (on the shift picker, archive), Qashier login matching ("Who is Hayatee Boonya?"), add a name. Coaches: photo, clients, sessions, portal status, Invite / Resend / Open. |
| A05 | Logins and roles | Logins with role and status; desk devices (sign out one, change desk passcode); role matrix; **Add a login** (email + role + what that role can do). |
| A06 | Settings | Waiver (EN/ไทย/Русский lines, version, publish as v2, lawyer warning); counter QR + download poster; gym details; "Nothing in SUPER1 can be deleted". |

Acceptance:
- Re-importing a day replaces it on the dashboard and keeps the old version.
- A price change logs old and new price, takes effect at the desk immediately, and reminds to change Qashier.
- Merge is reversible (Unmerge on the member).
