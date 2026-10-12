/**
 * Pure coach-portal rules (docs/01-PRODUCT.md §4): program shape and stats, macros → kcal, stepper
 * limits, the "no check-in for 3 days" flag, WhatsApp links. No React, no Supabase.
 */

export type ProgramItem = {
  exercise_id: string | null;
  name: string;
  muscle?: string;
  equipment?: string;
  log_type?: "weight_reps" | "reps" | "time";
  sets: number;
  reps: number | null;
  seconds?: number | null;
  rest_s: number;
  cue?: string | null;
};
export type ProgramDay = { name: string; items: ProgramItem[] };
export type ProgramBody = { days: ProgramDay[] };

/** kcal from grams: protein and carbs 4 kcal/g, fat 9 kcal/g (the same formula as nutrition_targets.kcal). */
export function kcalOf(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/** Share of each macro in the day's kcal, as whole percentages that add up to 100 (0s when empty). */
export function macroSplit(protein: number, carbs: number, fat: number): { protein: number; carbs: number; fat: number } {
  const total = kcalOf(protein, carbs, fat);
  if (!total) return { protein: 0, carbs: 0, fat: 0 };
  const p = Math.round(((protein * 4) / total) * 100);
  const c = Math.round(((carbs * 4) / total) * 100);
  return { protein: p, carbs: c, fat: Math.max(0, 100 - p - c) };
}

/** A stepper value moved by `step`, kept inside [min, max] and on the step grid (0.5 L water stays 2.5, not 2.4999). */
export function stepValue(value: number, delta: number, min: number, max: number): number {
  const decimals = Math.max(0, (String(delta).split(".")[1] ?? "").length);
  const next = Number((value + delta).toFixed(decimals));
  return Math.min(max, Math.max(min, next));
}

/** Sets in a day, and minutes it takes: each set ~40 s of work plus its rest, rounded up to 5 minutes. */
export function dayStats(day: ProgramDay): { exercises: number; sets: number; minutes: number } {
  const sets = day.items.reduce((a, i) => a + i.sets, 0);
  const seconds = day.items.reduce((a, i) => a + i.sets * ((i.seconds ?? 40) + i.rest_s), 0);
  return { exercises: day.items.length, sets, minutes: seconds ? Math.ceil(seconds / 60 / 5) * 5 : 0 };
}

/** Same program? (what the coach is editing vs the last version sent). Order matters; whitespace in names doesn't. */
export function sameProgram(a: ProgramBody | null | undefined, b: ProgramBody | null | undefined): boolean {
  const norm = (x: ProgramBody | null | undefined) =>
    JSON.stringify(
      (x?.days ?? []).map((d) => ({
        name: d.name.trim(),
        items: d.items.map((i) => [i.exercise_id, i.name.trim(), i.sets, i.reps ?? null, i.seconds ?? null, i.rest_s, (i.cue ?? "").trim()]),
      })),
    );
  return norm(a) === norm(b);
}

/** "Day A", "Day B", … for the next day the coach adds. */
export function nextDayName(days: ProgramDay[], prefix = "Day"): string {
  const used = new Set(days.map((d) => d.name.trim().split(/\s|·/)[1]));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return `${prefix} ${letter}`;
  }
  return `${prefix} ${days.length + 1}`;
}

/** Flag a client yellow when their last daily check-in is 3 or more days ago (or they never checked in). */
export function checkinIsLate(daysSince: number | null | undefined): boolean {
  return daysSince == null || daysSince >= 3;
}

/** WhatsApp chat link for a phone number (digits only; a Thai number starting 0 becomes +66). */
export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("0")) d = `66${d.slice(1)}`;
  if (d.length < 8) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
