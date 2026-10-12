/**
 * Member-side pure rules (docs/01-PRODUCT.md §3): which day is next, a live workout's sets pre-filled
 * from last time, the rest timer choices, and the café cart total (the server prices the real order).
 */
import type { ProgramDay } from "./coach";

export type Last = Record<string, { kg: number | null; reps: number | null; seconds: number | null }>;
export type LiveSet = { kg: number | null; reps: number | null; seconds: number | null; done: boolean };
export type LiveExercise = { exercise_id: string | null; name: string; cue: string | null; target: string; log_type: "weight_reps" | "reps" | "time"; rest_s: number; sets: LiveSet[] };

export const REST_CHOICES = [45, 60, 90, 120, 180] as const;

/** Today's day: the one after the last day they trained (by name), else the first. */
export function nextDay(days: ProgramDay[], lastDayName: string | null | undefined): number {
  if (!days.length) return -1;
  const i = lastDayName ? days.findIndex((d) => d.name.trim() === lastDayName.trim()) : -1;
  return i < 0 ? 0 : (i + 1) % days.length;
}

/** The live workout for a program day: each set pre-filled with last time's weight and the target reps. */
export function buildSession(day: ProgramDay, last: Last): LiveExercise[] {
  return day.items.map((it) => {
    const l = last[it.exercise_id ?? ""] ?? last[it.name.toLowerCase()];
    const type = it.log_type ?? (l?.seconds ? "time" : "weight_reps");
    const set: LiveSet = {
      kg: type === "weight_reps" ? Number(l?.kg ?? 20) : null,
      reps: type === "time" ? null : it.reps ?? l?.reps ?? 10,
      seconds: type === "time" ? it.seconds ?? l?.seconds ?? 30 : null,
      done: false,
    };
    return {
      exercise_id: it.exercise_id,
      name: it.name,
      cue: it.cue ?? null,
      target: type === "time" ? `${it.sets} × ${it.seconds ?? 30} s` : `${it.sets} × ${it.reps ?? 10}`,
      log_type: type,
      rest_s: it.rest_s || 90,
      sets: Array.from({ length: Math.max(1, it.sets) }, () => ({ ...set })),
    };
  });
}

/** The sets to save (completed ones only), in order. */
export function setsToSave(ex: LiveExercise[]) {
  return ex.flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ exercise_id: e.exercise_id, name: e.name, kg: s.kg, reps: s.reps, seconds: s.seconds })));
}

/** A cart line's unit price: the item plus its chosen add-ons. */
export function lineTotal(price: number, optionPrices: number[], qty: number): number {
  return (price + optionPrices.reduce((a, b) => a + b, 0)) * Math.max(1, qty);
}

/** "+2.5 kg on last time" for a PR (one decimal, no trailing .0). */
export function gainText(kg: number, prev: number): string {
  const d = Math.round((kg - prev) * 10) / 10;
  return `${d > 0 ? "+" : ""}${d} kg`;
}
