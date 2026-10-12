import { env as cfEnv } from "cloudflare:workers";

/** Worker variables and secrets (docs/10-DEPLOY.md). Server only: never import from a component. */
export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  APP_ORIGIN_WORLD: string;
  APP_ORIGIN_APP: string;
  CRON_SECRET?: string;
  /** "noreply" style sender, defaults to SUPER1 <hello@super1.app> (docs/11 #17). */
  EMAIL_FROM?: string;
};

export function env(): Env {
  return cfEnv as unknown as Env;
}

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const v = env()[key];
  if (!v) throw new Error(`Missing ${String(key)}. Set it in .dev.vars locally or as a Worker secret.`);
  return v as NonNullable<Env[K]>;
}
