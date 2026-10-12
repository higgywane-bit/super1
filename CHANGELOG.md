# Changelog

## Phase 0 · Foundations

- TanStack Start (React 19, Vite) on Cloudflare Workers: `wrangler.jsonc`, Worker entry `src/server.ts` with Cron Triggers (outbox every minute, nightly jobs).
- One Worker, two domains: `super1.world` (desk `/`, `/owner`, `/admin`) and `super1.app` (member `/`, `/join`, `/coach`). Router URL rewrites map each host to its route group (`/w/*`, `/a/*`); wrong host and `www.` redirect to the right domain; previews honour `?surface=`. Development on `world.localhost:3000` and `app.localhost:3000`.
- Supabase local stack (`supabase/config.toml`, `npm run db:start`), sign-in code email template in EN/TH/RU, storage buckets (`0002_storage.sql`), `set_my_lang` (`0003_foundations.sql`), typed database types (`npm run db:types`).
- Auth: 6-digit email codes for everyone (invite-only, no self sign-up); the shared desk login uses email + passcode. `profiles.role` gates each area; other logins get "Not for this account". Admin-only `inviteLogin` server function and `npm run invite` for the first admin.
- Design kit in `src/components/kit/` on the mock-up's own CSS (`s1.css`, `bundle.css`, `tokens.css`): Button, Pill, Card, Group/Row, Input/Label/Field, Segmented, Tile, Chip, Sheet + Glass, Disc, Avatar, TabBar, NavItem, Switch, Checkbox, Toast, Icon, Wordmark. Reduced motion honoured.
- i18n: typed `en`/`th`/`ru` dictionaries with the same keys (tested), language per device (cookie) and per login, `lang` on `<html>`.
- Sign-in screens with the SUPER1 wordmark and Motion #1: D01 (desk), O01 (owner), admin, M01/M02 (member), C01 (coach); Join language screen; admin, owner, desk, member shells.
- CI: install, `npm test`, `npm run db:test`, `npm run typecheck`, build. Playwright demo `e2e/phase0.spec.ts` (5 checks) against the local stack.

## Starter pack · Mon 12 Oct 2026

- Spec in `docs/` (product, connections, data model, business rules, design, Qashier, payments, migration, build plan, deploy, open questions).
- Database `supabase/migrations/0001_init.sql`: schema, no-delete and history guards, row level security, desk/coach/merge functions; 61 scenario checks.
- Seed: 21 plans with Qashier names, 63 café and shop items with 42 add-ons from the Qashier catalogue, 107 exercises, staff and coaches.
- `src/lib`: dates, membership rules (queueing, pause fix, door decisions, PT), Qashier report parser; 39 unit tests.
- Mock-up: 52 boards (sources, PNG and static HTML), tokens, brand, photos.
