# 00 · Start here

SUPER1 replaces the Lovable desk app with one system for everyone at Superfit. This folder is the whole spec. Read in this order:

| Doc | Read it for |
|---|---|
| `01-PRODUCT.md` | Every surface and screen, with its mock-up board and acceptance criteria |
| `02-CONNECTIONS.md` | How data moves between the six surfaces, live updates, emails |
| `03-DATA-MODEL.md` | Tables, functions, who can read what |
| `04-BUSINESS-RULES.md` | Dates, queueing, pauses, the door, PT, archive, merge, attribution. **The law.** |
| `05-DESIGN.md` | Tokens, type, components, the 9 motion moments, words |
| `06-QASHIER.md` | The till's daily report, VAT, reconciliation |
| `07-PAYMENTS.md` | Why SUPER1 takes no money at launch, and the later options |
| `08-MIGRATION.md` | Moving every record from Lovable Cloud without losing one |
| `09-BUILD-PLAN.md` | Phases 0–6, definition of done, demos |
| `10-DEPLOY.md` | Domains, hosting, accounts, env vars, cron, security |
| `11-OPEN-QUESTIONS.md` | Assumptions waiting for an answer |

## What already works in this repo

- `src/lib/dates.ts`, `src/lib/membership.ts`: the rules, with 28 tests.
- `src/lib/qashier/parse.ts`: the Qashier report parser, tested against the real 12 Oct report (11 tests).
- `supabase/migrations/0001_init.sql`: the full schema, row level security and the rule functions, tested by 61 scenario checks (`npm run db:test`).
- `supabase/seed/*.json` → `supabase/seed.sql`: 21 plans with Qashier names, 63 café and shop items with 42 add-ons from the real Qashier catalogue, 107 exercises, staff and coaches.
- `design/`: tokens, logos, photos, every mock-up board's source and a PNG of every screen.

## The people

| Name | Role | Signs in to |
|---|---|---|
| Pete (higgywane@gmail.com) | Admin, builds SUPER1 | super1.world/admin |
| Andy | Owner | super1.world/owner (phone) |
| Joy, Jeab, Tee, Bonnie, Fai, Ning | Front desk | super1.world (shared desk login, then who's on shift) |
| Sunman Fitness | First coach on the portal | super1.app/coach |
| Aun, Bella, Nicha, Poom, Bonnie, Orn, Team | Coaches | on the counter QR; portal later |
| Members | Customers | super1.app (and the stores later) |

The mock-up uses the same sample people everywhere: **Emma Wilson** (#1043, tag 003909, 1 Month to Sat 31 Oct, 10 PT with Sunman, 6 left), **Natalia Orlova** (#1188 duplicate of #0957, tag 001877, expired Fri 9 Oct), **Ivan Petrov** (signs up at the counter in Russian, picks Sunman, tag 004417), **Sarah Kim** (20 PT with Sunman), **Mark Hughes**, **Somchai Kittisak** (10 Visits). Today in the mock-up is **Mon 12 Oct 2026**; the Qashier numbers are that day's real report.

## Words used in the code and the docs

| Word | Means |
|---|---|
| Member | A person in the gym's records (`members`), whether or not they use the app |
| Root | The member everything groups under after a merge (`root_id`) |
| Plan | Something the desk can sell (`plans`): membership, 10 Visits, PT pack, extra |
| Membership | One plan a member bought, with dates (`memberships`), whatever its kind |
| Cover | The unbroken run of time-based memberships; "days left" counts to its end |
| Tag | The key fob scanned at the door (a `credentials` row); members can also show a QR in the app |
| Check-in | One door decision, allowed or declined (`checkins`) |
| On shift | The desk staff member every desk action is recorded under |
| Sign-up | A counter QR submission waiting for the desk (`signups`) |
| Lead | A person a coach should contact (`leads`) |
| Qashier day | One imported daily Sales Report (`qashier_imports`) |
