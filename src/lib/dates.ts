/**
 * Calendar dates are plain "YYYY-MM-DD" strings in gym-local time (Asia/Bangkok, UTC+7, no DST).
 * Every membership start and end date is inclusive: a Day Pass bought today starts and ends today.
 * Never use `new Date()` arithmetic on calendar dates anywhere else in the app: go through here.
 */
export type ISODate = string;

export const GYM_UTC_OFFSET_HOURS = 7;
const DAY_MS = 86_400_000;

/** Today's calendar date in Bangkok (or the date of `at`). */
export function localDate(at: Date = new Date()): ISODate {
  return new Date(at.getTime() + GYM_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

function toUTC(d: ISODate): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = toUTC(s);
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(s);
}

export function addDays(d: ISODate, n: number): ISODate {
  return new Date(toUTC(d).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** Last day of the month that `d` falls in. */
export function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * Same day-of-month `n` months later, clamped to that month's last day.
 * 31 Jan + 1 month = 28 Feb (29 in a leap year).
 */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = lastDayOfMonth(target.getUTCFullYear(), target.getUTCMonth());
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

/** Whole days from a to b (b minus a). diffDays("2026-10-12", "2026-10-31") = 19. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / DAY_MS);
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sat 31 Oct", or "Sat 31 Oct 2027" when not in `today`'s year. Matches the mock-up. */
export function formatDay(d: ISODate, today?: ISODate): string {
  const t = toUTC(d);
  const base = `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
  return today && today.slice(0, 4) !== d.slice(0, 4) ? `${base} ${d.slice(0, 4)}` : base;
}

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/** "07:42" in gym time. */
export function formatTime(at: Date): string {
  return TIME.format(at);
}
