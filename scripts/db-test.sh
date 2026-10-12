#!/usr/bin/env bash
# Runs the migration and the scenario tests on a throwaway local Postgres (15+). No Supabase needed.
# Usage: bash scripts/db-test.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v postgres 2>/dev/null || ls /usr/lib/postgresql/*/bin/postgres | tail -1)")}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-55432}"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS=(runuser -u postgres --); fi
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" -w start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -o /dev/null)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
# The seed must load cleanly into an empty database, twice (idempotent)...
"${PSQL[@]}" -c "create database seedcheck"
SEED_PSQL=(psql -h /tmp -p "$PORT" -U postgres -d seedcheck -v ON_ERROR_STOP=1 -q -t -o /dev/null)
"${SEED_PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${SEED_PSQL[@]}" -f "$f"; done
"${SEED_PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${SEED_PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "seed: $(psql -h /tmp -p "$PORT" -U postgres -d seedcheck -tAc "select (select count(*) from plans) || ' plans, ' || (select count(*) from menu_items) || ' menu items, ' || (select count(*) from exercises) || ' exercises, ' || (select count(*) from coaches) || ' coaches'")"
# ...and the scenarios run on their own database.
"${PSQL[@]}" -f "$ROOT/supabase/tests/01_scenarios.sql"
