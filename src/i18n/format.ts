import { diffDays, formatTime, localDate, type ISODate } from "../lib/dates";
import type { Lang } from "./index";
import { translate } from "./index";

const DAYS: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  th: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  ru: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
};
const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
  ru: ["янв", "февр", "мар", "апр", "мая", "июн", "июл", "авг", "сент", "окт", "нояб", "дек"],
};

/** "Sat 31 Oct" · "ส. 31 ต.ค." · "сб 31 окт" (year added when it isn't this year). Calendar dates only. */
export function dayLabel(d: ISODate | null | undefined, lang: Lang, today?: ISODate): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  const base = `${DAYS[lang][dow]} ${day} ${MONTHS[lang][m - 1]}`;
  return today && today.slice(0, 4) !== d.slice(0, 4) ? `${base} ${y}` : base;
}

/** "Mar 2025" for join dates. */
export function monthLabel(d: ISODate, lang: Lang): string {
  const [y, m] = d.slice(0, 10).split("-").map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
}

/** "฿2,200" (whole baht incl. VAT). */
export function baht(n: number | null | undefined): string {
  return `฿${Math.round(n ?? 0).toLocaleString("en-US")}`;
}

/** "07:42" in gym time. */
export function time(at: string | Date): string {
  return formatTime(typeof at === "string" ? new Date(at) : at);
}

/** "Last day today" · "Ends tomorrow" · "19 days left" in the person's language. */
export function daysLeftText(n: number, lang: Lang): string {
  if (n <= 0) return translate(lang, "days.lastDay");
  if (n === 1) return translate(lang, "days.tomorrow");
  return translate(lang, "days.left", { n });
}

/** "just now" · "6 min ago" · "2 h ago" */
export function ago(at: string, lang: Lang, now: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - Date.parse(at)) / 60_000));
  if (mins < 1) return translate(lang, "desk.justNow");
  if (mins < 60) return translate(lang, "desk.minAgo", { n: mins });
  return translate(lang, "desk.hAgo", { n: Math.floor(mins / 60) });
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return diffDays(a, b);
}

export const LANG_NAMES: Record<Lang, string> = { en: "English", th: "ไทย", ru: "Русский" };

/** "Today" for today's date, otherwise the day label (Fri 9 Oct). */
export function dayOrToday(d: ISODate | null | undefined, lang: Lang, today: ISODate): string {
  if (!d) return "—";
  return d.slice(0, 10) === today ? translate(lang, "desk.today") : dayLabel(d, lang, today);
}

/** "today 21:10" or "Fri 9 Oct" for a moment in gym time. */
export function whenLabel(at: string, lang: Lang, today: ISODate): string {
  const d = localDate(new Date(at));
  return d === today ? `${translate(lang, "desk.today").toLowerCase()} ${time(at)}` : dayLabel(d, lang, today);
}

/** The gym-time calendar date of a moment ("2026-10-12" for 21:10 Bangkok time). */
export function localDayOf(at: string): ISODate {
  return localDate(new Date(at));
}
