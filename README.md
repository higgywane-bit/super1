# SUPER1

The operating system for Superfit, Chalong, Phuket. It covers the front desk, the counter QR sign-up, the member app, the coach portal, Andy's owner app and Pete's admin. It runs as one app on two domains: **super1.world** for staff and **super1.app** for members and coaches.

This repo is the **starter pack**. The spec, the database, the business rules and the full mock-up are done and tested. Claude Code builds the app from here, phase by phase.

## Get it into Claude Code

1. **Make an empty repo.** On GitHub, create a new **private** repository called `super1`. Leave "Add README", ".gitignore" and "license" unticked.
2. **Put these files in it.** Use one of these three:
   - In the Claude chat where this pack was made, say *"push the pack to <your-name>/super1"*. Claude pushes it as the first commit.
   - With GitHub Desktop or the terminal, from this folder:
     ```
     git init && git add . && git commit -m "SUPER1 starter pack"
     git branch -M main
     git remote add origin https://github.com/<your-name>/super1.git
     git push -u origin main
     ```
   - On the GitHub website, use "uploading an existing file". It takes 100 files at a time, so upload the pack in a few batches.
3. **Open Claude Code.** Go to claude.ai/code and connect GitHub if it asks. Install the Claude GitHub app on the `super1` repo, then pick that repo.
4. **Start Phase 0.** Paste everything in `prompts/phase-0-foundations.md` as your first message. When Claude Code finishes, check its changes and try the demo at the bottom of the prompt.
5. **One phase at a time.** Run phase 1, then 2, and so on through 6. Each prompt says what to build, what "done" means, and a demo to try. `docs/09-BUILD-PLAN.md` has the overview.

Claude Code reads `CLAUDE.md` on every run. That file holds the rules it must never break: never delete, staff on shift on every desk change, Qashier stays the till, the design tokens, and three languages.

## What's inside

| Folder | What |
|---|---|
| `docs/` | The spec. Start at `docs/00-START-HERE.md`. |
| `prompts/` | One copy-paste prompt per build phase (0–6). |
| `design/screens/` | A PNG and a static HTML page for all 52 mock-up boards. This is what each screen should look like. |
| `design/mockup/` | The source of every board (the canvas files), plus the CSS kit. |
| `design/tokens.css` | Colours, type, radii and motion as a Tailwind v4 theme. |
| `design/brand/`, `design/photos/` | The SUPER1 wordmark, the "1", the app icon, QR codes, gym and café photos. |
| `supabase/migrations/0001_init.sql` | The whole database: tables, the no-delete guards, security rules, and the desk, coach and merge functions. |
| `supabase/seed/` | Plans and prices with their Qashier names, the full café and shop menu from Qashier, 107 exercises, staff and coaches. |
| `src/lib/` | The membership rules and the Qashier report parser, in TypeScript. |
| `tests/`, `supabase/tests/` | 39 unit tests and 61 database checks, all passing. |
| `fixtures/qashier/` | The real Sales Report for Mon 12 Oct 2026, used by the tests. |

## Decisions already made

- **One repo, one database, two domains.** Staff use super1.world. Members, coaches and the counter QR use super1.app.
- **Nothing is ever deleted.** Members are archived or merged. Merging links the two records instead of moving rows. Mistakes are voided or undone.
- **Qashier stays the till.** SUPER1 reads its daily report and checks it against what the desk logged. No online payments at launch (see `docs/07-PAYMENTS.md`).
- **Shared desk login.** Staff tap who's on shift once, and every desk change is recorded under that name.
- **Pause fix.** Pausing a member moves queued renewals back too.
- **10 Visits** uses one visit per day. **PT −1** works from the desk or the coach's phone, with a 10-minute undo.
- **Sign-in is by email code** for everyone except the shared desk login.
- **Languages.** English and ไทย for staff; English, ไทย and Русский for members and the QR.

## Questions for Pete before the phases that need them

See `docs/11-OPEN-QUESTIONS.md`. The first ones:

- Andy's email
- Is Orn a coach? Is Bonnie a coach as well as desk staff?
- Who is "Hayatee Boonya" on Qashier?
- PT and 10 Visits validity
- Waiver wording, which needs a Thai lawyer

## Commands

```
npm install
npm test            # rules and Qashier parser
npm run db:test     # database: migration, seed, 61 scenario checks (needs Postgres 15+ installed locally)
npm run typecheck
```
