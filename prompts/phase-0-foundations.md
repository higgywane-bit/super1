# Phase 0 · Foundations

You are starting the SUPER1 build in this repo. Read `CLAUDE.md`, then `docs/00-START-HERE.md`, `docs/03-DATA-MODEL.md`, `docs/05-DESIGN.md` and `docs/10-DEPLOY.md`. Keep everything that is already here (`src/lib`, `tests`, `supabase`, `design`, `docs`, `fixtures`, `scripts`) and build around it.

## Do

1. Scaffold a TanStack Start v1 app (React 19, Vite) that deploys to Cloudflare Workers, in this repo (merge with the existing `package.json`; keep its scripts). Tailwind v4 importing `design/tokens.css`. Inter + Noto Sans Thai. Lucide icons.
2. Host routing: `super1.world` serves `src/surfaces/world` (desk at `/`, `/owner`, `/admin`); `super1.app` serves `src/surfaces/app` (member app at `/`, `/join`, `/coach`). Wrong host → redirect to the right domain. In development use `world.localhost:3000` and `app.localhost:3000`.
3. Supabase: a `supabase/config.toml` for local development; apply `supabase/migrations/0001_init.sql`; load `supabase/seed.sql`; create the storage buckets listed in 03-DATA-MODEL. Generate typed database types into `src/server/db.types.ts`.
4. Auth: email one-time codes (6 digits) for everyone; the shared desk account signs in with email + passcode. `profiles.role` decides which surface a login may open; others get a polite "not for this account" screen. Write a small admin-only server function to invite a login with a role.
5. Design kit in `src/components/kit/`: Button, Pill, Card, Group and Row, Input and Label, Segmented, Tile, Chip, Sheet (right on desktop, bottom on phone) with Glass dim, Disc, Avatar, TabBar, NavItem, Switch, Checkbox, Toast. Match `design/mockup/ds/super1/components/bundle.css` and `design/mockup/s1.css` exactly. Add the motion utilities from the tokens and honour reduced motion.
6. i18n: `src/i18n/en.ts`, `th.ts`, `ru.ts` with typed keys; language per profile and per device; `lang` attribute on `<html>`.
7. The splash/sign-in screens with the SUPER1 wordmark and Motion #1 (05-DESIGN).
8. `.env.example` with every variable from 10-DEPLOY. GitHub Actions: install, `npm test`, `npm run db:test`, `npm run typecheck`, build.

## Done when

- Everything in "Definition of done" in `docs/09-BUILD-PLAN.md`.
- Demo: Pete (higgywane@gmail.com, invited as admin) opens super1.world, gets a code by email, lands on an empty admin shell; switches English ↔ ไทย. super1.app/join shows the language screen (EN / ไทย / Русский). A desk login can't open /admin.
