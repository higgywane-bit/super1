/**
 * The Worker entry. One Worker answers super1.world and super1.app (docs/10-DEPLOY.md):
 *  1. wrong host / www → redirect to the right domain (src/routing/surface.ts)
 *  2. everything else → TanStack Start (SSR, server functions)
 *  3. Cron Triggers → the outbox worker and the nightly jobs (src/server/cron.ts)
 */
import startEntry from "@tanstack/react-start/server-entry";
import { hostRedirect, isProductionHost } from "./routing/surface";
import { runScheduled } from "./server/cron";

type WorkerEnv = { APP_ORIGIN_WORLD?: string; APP_ORIGIN_APP?: string; SUPABASE_URL?: string; CRON_SECRET?: string };
type Ctx = { waitUntil(p: Promise<unknown>): void };

function securityHeaders(res: Response, url: URL, env: WorkerEnv): Response {
  if (!isProductionHost(url.hostname)) return res;
  const headers = new Headers(res.headers);
  const supabase = env.SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  // Inline styles and the router's hydration script are inline; everything else is same-origin,
  // Supabase (API, realtime, storage images) or Cloudflare Turnstile on /join.
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${supabase}`,
      "font-src 'self'",
      `connect-src 'self' ${supabase} ${supabaseWs}`,
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    const to = hostRedirect(url, { world: env.APP_ORIGIN_WORLD, app: env.APP_ORIGIN_APP });
    if (to) return Response.redirect(to, url.hostname.startsWith("www.") ? 301 : 302);
    // Run the scheduled jobs by hand (development, or after an incident): POST with the cron secret.
    if (url.pathname === "/api/cron" && request.method === "POST") {
      const ok = !!env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`;
      if (!ok) return new Response("Forbidden", { status: 403 });
      const cron = url.searchParams.get("cron") ?? "* * * * *";
      await runScheduled(cron, new Date());
      return Response.json({ ok: true, cron });
    }
    const res = await (startEntry.fetch as (r: Request, ...rest: unknown[]) => Promise<Response>)(request, env, ctx);
    return securityHeaders(res, url, env);
  },

  async scheduled(event: { cron: string; scheduledTime: number }, _env: WorkerEnv, ctx: Ctx): Promise<void> {
    ctx.waitUntil(runScheduled(event.cron, new Date(event.scheduledTime)));
  },
};
