import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { en, type MessageKey, type Messages } from "./en";
import { ru } from "./ru";
import { th } from "./th";

export type Lang = "en" | "th" | "ru";
export type { MessageKey, Messages };

export const DICTIONARIES: Record<Lang, Messages> = { en, th, ru };
/** Staff screens: English and ไทย. Members, coaches' clients and the counter QR: + Русский. */
export const STAFF_LANGS: Lang[] = ["en", "th"];
export const MEMBER_LANGS: Lang[] = ["en", "th", "ru"];
export const LANG_COOKIE = "s1_lang";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "th" || v === "ru";
}

export type Vars = Record<string, string | number>;

/** Look up a key and fill {placeholders}. Falls back to English, then to the key. */
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const s = DICTIONARIES[lang][key] ?? en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export type T = (key: MessageKey, vars?: Vars) => string;

type I18n = { lang: Lang; t: T; setLang: (l: Lang) => void };
const Ctx = createContext<I18n>({ lang: "en", t: (k, v) => translate("en", k, v), setLang: () => {} });

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang: (l: Lang) => void; children: ReactNode }) {
  const t = useCallback<T>((k, v) => translate(lang, k, v), [lang]);
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}

export function useT(): T {
  return useContext(Ctx).t;
}
