import { describe, expect, it } from "vitest";
import { buildSession, gainText, lineTotal, nextDay, setsToSave } from "../src/lib/workout";

const days = [
  { name: "Day A · Push", items: [{ exercise_id: "b", name: "Barbell bench press", sets: 4, reps: 8, rest_s: 120, log_type: "weight_reps" as const }] },
  { name: "Day B · Pull", items: [] },
  { name: "Day C · Legs", items: [{ exercise_id: "p", name: "Plank", sets: 3, reps: null, seconds: 40, rest_s: 60, log_type: "time" as const }] },
];

describe("member workout rules", () => {
  it("picks the day after the last one trained", () => {
    expect(nextDay(days, null)).toBe(0);
    expect(nextDay(days, "Day A · Push")).toBe(1);
    expect(nextDay(days, "Day C · Legs")).toBe(0);
    expect(nextDay(days, "Something old")).toBe(0);
    expect(nextDay([], null)).toBe(-1);
  });

  it("pre-fills sets from last time", () => {
    const s = buildSession(days[0], { b: { kg: 40, reps: 8, seconds: null } });
    expect(s[0].sets).toHaveLength(4);
    expect(s[0].sets[0]).toEqual({ kg: 40, reps: 8, seconds: null, done: false });
    expect(s[0].target).toBe("4 × 8");
    const t = buildSession(days[2], {});
    expect(t[0].sets[0]).toEqual({ kg: null, reps: null, seconds: 40, done: false });
    expect(t[0].target).toBe("3 × 40 s");
  });

  it("saves only completed sets", () => {
    const s = buildSession(days[0], { b: { kg: 40, reps: 8, seconds: null } });
    s[0].sets[1] = { ...s[0].sets[1], kg: 42.5, done: true };
    expect(setsToSave(s)).toEqual([{ exercise_id: "b", name: "Barbell bench press", kg: 42.5, reps: 8, seconds: null }]);
  });

  it("café line totals and PR gains", () => {
    expect(lineTotal(149, [50], 2)).toBe(398);
    expect(lineTotal(90, [], 0)).toBe(90);
    expect(gainText(42.5, 40)).toBe("+2.5 kg");
    expect(gainText(45, 40)).toBe("+5 kg");
  });
});
