# Cutover night · moving the desk from Lovable Cloud to SUPER1

The plan is docs/08-MIGRATION.md; this page is the checklist for the night. Run every command from
the repo root. Nothing here deletes anything, in either database.

## A week before

- [ ] Two rehearsals on copies of the new project, each with a fresh export from the old one:
      `bash scripts/rehearse-migration.sh <export.sql> <today>` → `migration-report.md` with **0 unexplained**.
      Read the "Issues" table with Pete; fix data in the old app if needed (never in SQL).
- [ ] Images copied: `node scripts/copy-images.mjs --old-repo ../healthy-journey-mate --old-origin https://<old app> --dry-run`, then without `--dry-run`.
- [ ] Logins invited: Pete (admin), Andy (owner), the desk account with its passcode, coaches (`npm run invite`).
- [ ] Desk iPad and computer tested on the preview URL (scanner types into the check-in page).
- [ ] Staff told: from cutover morning the desk is super1.world.

## 22:00 · after close

1. [ ] Put the old desk in read-only (turn off writes or put the "moved" page up). Announce in the staff chat.
2. [ ] Export the old database: `pg_dump --data-only --schema=public "$LEGACY_DB_URL" > old-$(date +%F).sql`
       (or the CSV export from the Cloud UI, one file per table).
3. [ ] Preflight: `bash scripts/cutover-check.sh` (environment, migrations, storage, refuses the old database).
4. [ ] Load: `TARGET_DB_URL=… LEGACY_DB_URL=… node scripts/legacy-load.mjs --dump old-$(date +%F).sql`
5. [ ] Transform: `psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-legacy.sql`
6. [ ] Verify: `TARGET_DB_URL=… node scripts/verify-migration.ts --today $(TZ=Asia/Bangkok date -d tomorrow +%F)`
       → must print ✓. Keep `migration-report.md` (attach it to the cutover note).
7. [ ] Point `super1.world` at the Worker (Cloudflare custom domain). The old app stays on its Lovable URL, read-only, for 30 days.
8. [ ] Smoke test on the real domain: desk sign-in, who's on shift, scan one tag from the report.

## 06:00 · opening

- [ ] Staff sign in on the new desk and pick who's on shift.
- [ ] Scan the first 10 members together and tick them in the report's spot-check list.
- [ ] Watch the Today feed and Pete's inbox for the first hour.

## Rollback

If something blocks the desk: point `super1.world` back to the old app (it has every row up to 22:00
and was read-only, so nothing diverged). Export the check-ins and sales made on SUPER1 in the window
(`checkins`, `sales` where `at > '<cutover time>'`) and re-enter them in the old app. Keep the new
database as it is for the retry.
