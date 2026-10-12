#!/usr/bin/env bash
# Preflight for the cutover night (docs/CUTOVER.md). Read-only: checks, never changes anything.
#   TARGET_DB_URL=… LEGACY_DB_URL=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… bash scripts/cutover-check.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
ok() { echo "  ✓ $1"; }
bad() { echo "  ✗ $1"; fail=1; }

echo "Environment"
for v in TARGET_DB_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do [ -n "${!v:-}" ] && ok "$v set" || bad "$v missing"; done
[ -n "${LEGACY_DB_URL:-}${LEGACY_PROJECT_REF:-}" ] && ok "old database identified (so it can be refused)" || bad "set LEGACY_DB_URL or LEGACY_PROJECT_REF"

if [ -n "${TARGET_DB_URL:-}" ]; then
  echo "Target database"
  q() { psql "$TARGET_DB_URL" -X -t -A -c "$1" 2>/dev/null; }
  [ "$(q "select to_regclass('public.check_ins') is null")" = "t" ] && ok "not the old database" || bad "TARGET_DB_URL has the old tables: this is the old database"
  [ "$(q "select to_regclass('public.checkins') is not null")" = "t" ] && ok "SUPER1 schema present" || bad "SUPER1 migrations not applied"
  last=$(ls "$ROOT"/supabase/migrations/*.sql | xargs -n1 basename | tail -1 | cut -d_ -f1)
  [ "$(q "select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'activity' and column_name = 'legacy_id')")" = "t" ] && ok "migration $last (legacy ids) applied" || bad "apply the latest migrations (supabase db push)"
  n=$(q "select count(*) from public.plans")
  [ "${n:-0}" -gt 0 ] && ok "seed loaded ($n plans)" || bad "seed not loaded (supabase/seed.sql)"
  m=$(q "select count(*) from public.members where legacy_id is null and created_via <> 'import'")
  [ "${m:-0}" = "0" ] && ok "no test members in the target" || echo "  ! $m members not from the migration are already in the target (test data?)"
  l=$(q "select coalesce((select count(*) from legacy.members), 0)")
  [ "${l:-0}" = "0" ] && ok "legacy schema empty (ready to load)" || echo "  ! legacy already holds $l members (already loaded?)"
fi

if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Storage"
  for b in signatures menu coaches exercises brand; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/storage/v1/bucket/$b")
    [ "$code" = "200" ] && ok "bucket $b" || bad "bucket $b missing ($code)"
  done
fi

echo
[ $fail = 0 ] && echo "Preflight OK." || { echo "Preflight found problems (✗ above)."; exit 1; }
