# Synthetic legacy export

`export.sql` imitates a `pg_dump --data-only --schema=public` of the old Lovable Cloud database
(`higgywane-bit/healthy-journey-mate`). The people are made up. It exists so the migration can be
rehearsed end to end without real data:

```
bash scripts/rehearse-migration.sh fixtures/legacy/export.sql 2026-10-12
```

It covers each row of the mapping table in docs/08-MIGRATION.md: a Glofox import with a card code, a
10 Visits pack (and a used-up one), a freeze with an overlapping queued renewal (the old bug), a custom
"3 Days" plan and a "2 Months" plan, a cancelled sale, an archived member, a revoked tag, the demo
member, a PT client with a program, diet plans with and without macros, a coach's own exercise, a
workout log, a daily check-in, and a verified café recipe (plus one for an item that doesn't exist).
