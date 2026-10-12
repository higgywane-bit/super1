import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLang, LANG_COOKIE, type Lang } from "../i18n";
import type { PublicConfig } from "../client/supabase";
import { env, requireEnv } from "./env";
import type { Role } from "./roles";
import { supabaseServer } from "./supabase";

export type Viewer = { id: string; email: string | null; role: Role | null; name: string; lang: Lang | null };
export type Boot = { config: PublicConfig; deviceLang: Lang | null };

/** Public config for the browser (anon key only) and this device's language. */
export const getBoot = createServerFn({ method: "GET" }).handler(async (): Promise<Boot> => {
  const e = env();
  const c = getCookie(LANG_COOKIE);
  return {
    config: { supabaseUrl: requireEnv("SUPABASE_URL"), supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY"), turnstileSiteKey: e.TURNSTILE_SITE_KEY || null },
    deviceLang: isLang(c) ? c : null,
  };
});

/** Who is signed in on this device, with their role from `profiles`. Null when signed out. */
export const getViewer = createServerFn({ method: "GET" }).handler(async (): Promise<Viewer | null> => {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await sb.from("profiles").select("role, display_name, lang").eq("id", data.user.id).maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role: (p?.role as Role | undefined) ?? null,
    name: p?.display_name ?? "",
    lang: isLang(p?.lang) ? p.lang : null,
  };
});

/**
 * Change the language on this device (cookie, a year) and, when signed in, on the login too.
 * A shared desk device keeps its own language whoever is signed in.
 */
export const setLanguage = createServerFn({ method: "POST" })
  .validator(z.object({ lang: z.enum(["en", "th", "ru"]), profile: z.boolean().default(true) }))
  .handler(async ({ data }) => {
    setCookie(LANG_COOKIE, data.lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    if (data.profile) {
      const sb = supabaseServer();
      const { data: u } = await sb.auth.getUser();
      if (u.user) await sb.rpc("set_my_lang", { p_lang: data.lang });
    }
    return { lang: data.lang };
  });
