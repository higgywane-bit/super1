import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../server/db.types";

export type PublicConfig = { supabaseUrl: string; supabaseAnonKey: string; turnstileSiteKey: string | null };

let client: SupabaseClient<Database> | null = null;
let config: PublicConfig | null = null;

/** Called once by the root route with the public config from the server. */
export function configureSupabase(c: PublicConfig) {
  config = c;
}

/**
 * The browser's Supabase client (anon key + the person's session in cookies, so the server sees
 * the same session). Browser only.
 */
export function supabaseBrowser(): SupabaseClient<Database> {
  if (typeof window === "undefined") throw new Error("supabaseBrowser() is browser-only");
  if (!client) {
    if (!config) throw new Error("Supabase is not configured yet");
    client = createBrowserClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      cookieOptions: { sameSite: "lax", secure: window.location.protocol === "https:", path: "/" },
    });
  }
  return client;
}
