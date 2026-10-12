# 10 · Domains, hosting and accounts

## One repo, one app, two domains

| Domain | Serves | Notes |
|---|---|---|
| `super1.world` | Front desk (`/`), Andy (`/owner`), Pete (`/admin`) | Staff only. `/` redirects to sign-in or the desk. |
| `super1.app` | Member app (`/`), counter QR (`/join`), coach portal (`/coach`) | Customers and coaches. Later also wrapped as the App Store / Play app. |
| `www.` of both | Redirect to the bare domain | |

Both domains point at the **same Cloudflare Worker** (one deployment). The app reads the request host and only renders that domain's route group; anything else redirects to the right domain. Previews: Cloudflare preview URLs with `?surface=world|app` honoured only on non-production hosts.

## Accounts to create (Pete)

| Service | What for | Notes |
|---|---|---|
| GitHub | The new repo (e.g. `higgywane-bit/super1`, private) | Install the Claude GitHub app on it |
| Supabase | Database, auth (email codes), storage, realtime | New project in **Singapore** (closest to Phuket). Separate `staging` project for previews. |
| Cloudflare | Workers hosting, DNS for both domains, Turnstile, cron | Move both domains' DNS to Cloudflare |
| Resend (or Postmark) | Sending email: sign-in codes (as Supabase custom SMTP) and invites/notifications | Verify `super1.app` as a sending domain (SPF, DKIM) |
| Apple Developer, Google Play Console | Phase 6 app stores | Org accounts in Superfit's company name |

## Environment variables

| Name | Where | What |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Worker + client | Public client |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret only | Qashier import, outbox worker, invites. Never sent to a browser. |
| `RESEND_API_KEY` | Worker secret | Outbox emails |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Client / Worker secret | `/join` abuse protection |
| `APP_ORIGIN_WORLD`, `APP_ORIGIN_APP` | Worker | `https://super1.world`, `https://super1.app` |
| `CRON_SECRET` | Worker secret | Protects the outbox and nightly endpoints |

Keep `.env.example` in the repo with every name and no values.

## Scheduled jobs (Cloudflare Cron Triggers)

| Every | Job |
|---|---|
| 1 minute | Send pending `outbox` rows (invites, lead and program notifications, merge-request and support emails) |
| 02:00 Bangkok | Renewal reminders (7 and 1 days before the end, 3 days after); mark abandoned sign-ups older than 24 h |
| 03:00 Bangkok | Database backup check (Supabase daily backups on; weekly `pg_dump` to Cloudflare R2) |

## Auth set-up in Supabase

- Email provider on, **email OTP**: edit the Magic Link template to show `{{ .Token }}` (6 digits) in EN/TH/RU. Code valid 10 minutes.
- Custom SMTP: Resend. Sender `SUPER1 <hello@super1.app>` (to confirm).
- The desk account `desk@superfitphuket.com` has a password (the passcode Pete sets); everyone else uses codes.
- Sign-ups disabled in Supabase Auth: logins exist only by invite (Pete for staff and coaches, the desk for members).

## Security checklist

- RLS on every table (already in the migration); service role only on the server.
- Desk devices: signing out a device revokes its session; changing the passcode signs out all desk devices.
- `/join`: Turnstile + per-IP rate limit + server-side validation (the function also validates).
- Content-Security-Policy, HTTPS only, cookies `Secure; SameSite=Lax`.
- No member data in logs or analytics.

## App stores (phase 6)

- Capacitor shell around `super1.app` (same code), bundle id `app.super1` (to confirm).
- Store listing in English and Thai; screenshots from `design/screens/M*.png`.
- Account deletion: "Delete my app login" in Settings removes the login; gym records stay (explain in the privacy policy).
