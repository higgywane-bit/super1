import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { Database } from "./db.types";
import { env, requireEnv } from "./env";

export type DB = SupabaseClient<Database>;

/**
 * Supabase as the signed-in person, from the session cookies. Every read and write here goes
 * through row level security. Use this in server functions by default.
 */
export function supabaseServer(): DB {
  const e = env();
  return createServerClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          setCookie(name, value, { ...options, sameSite: "lax", secure: (e.APP_ORIGIN_WORLD ?? "").startsWith("https") || options?.secure, path: "/" });
        }
      },
    },
  });
}

/**
 * Supabase with the service role: bypasses RLS. Only for the jobs that need it (inviting logins,
 * the Qashier import, the outbox worker, uploading a waiver signature). Never send it to a browser.
 */
export function supabaseAdmin(): DB {
  return createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
