#!/usr/bin/env bash
# Local demo: logins for Pete, the desk, Andy and Sunman, plus the mock-up's sample members.
# Needs the local stack (npm run db:start) and .dev.vars. Never run against production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB_URL" in *127.0.0.1*|*localhost*) ;; *) echo "demo-setup only runs against a local database"; exit 1 ;; esac
node scripts/invite-login.mjs higgywane@gmail.com admin Pete
node scripts/invite-login.mjs desk@superfitphuket.com desk "Front desk" --passcode "${DESK_PASSCODE:-246810}"
node scripts/invite-login.mjs andy@superfitphuket.com owner Andy
node scripts/invite-login.mjs sunman@superfitphuket.com coach "Sunman Fitness" --coach sunman
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/demo.sql
echo "Demo ready: http://world.localhost:3000 (desk passcode ${DESK_PASSCODE:-246810}) · http://app.localhost:3000/join"
