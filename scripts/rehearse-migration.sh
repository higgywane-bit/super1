#!/usr/bin/env bash
# Rehearse the whole migration on a throwaway Postgres (no Supabase needed), twice in a row on the
# same copy to prove the transform is idempotent:
#   schema + seed  →  legacy-load (export)  →  migrate-legacy.sql ×2  →  verify-migration (report)
# Usage: bash scripts/rehearse-migration.sh [export.sql] [today] [report.md]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPORT="${1:-$ROOT/fixtures/legacy/export.sql}"
TODAY="${2:-2026-10-12}"
REPORT="${3:-$ROOT/migration-report.md}"
PGBIN="${PGBIN:-$(dirname "$(command -v postgres 2>/dev/null || ls /usr/lib/postgresql/*/bin/postgres | tail -1)")}"
DATA="$(mktemp -d)"
PORT="${PGPORT_REHEARSE:-55433}"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS=(runuser -u postgres --); fi
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -h 127.0.0.1" -l "$DATA/log" -w start >/dev/null
export TARGET_DB_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
PSQL=(psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -o /dev/null -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -o /dev/null -f "$f"; done
"${PSQL[@]}" -o /dev/null -f "$ROOT/supabase/seed.sql"

node "$ROOT/scripts/legacy-load.mjs" --dump "$EXPORT"
echo "— migrate (run 1)"; "${PSQL[@]}" -f "$ROOT/scripts/migrate-legacy.sql"
SNAP1=$("${PSQL[@]}" -t -A -c "select (select count(*) from members)||','||(select count(*) from memberships)||','||(select count(*) from sales)||','||(select count(*) from checkins)||','||(select count(*) from activity)||','||(select count(*) from set_logs)||','||(select count(*) from program_versions)")
echo "— migrate (run 2, must change nothing)"; "${PSQL[@]}" -o /dev/null -f "$ROOT/scripts/migrate-legacy.sql"
SNAP2=$("${PSQL[@]}" -t -A -c "select (select count(*) from members)||','||(select count(*) from memberships)||','||(select count(*) from sales)||','||(select count(*) from checkins)||','||(select count(*) from activity)||','||(select count(*) from set_logs)||','||(select count(*) from program_versions)")
if [ "$SNAP1" != "$SNAP2" ]; then echo "✗ second run changed the data: $SNAP1 → $SNAP2"; exit 1; fi
echo "✓ idempotent ($SNAP1)"
node "$ROOT/scripts/verify-migration.ts" --today "$TODAY" --out "$REPORT"
