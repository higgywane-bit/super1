import { describe, expect, it } from "vitest";
import { checkinIsLate, dayStats, kcalOf, macroSplit, nextDayName, sameProgram, stepValue, whatsappUrl, type ProgramBody } from "../src/lib/coach";

describe("coach rules", () => {
  it("130 / 180 / 55 g is 1,735 kcal", () => {
    expect(kcalOf(130, 180, 55)).toBe(1735);
    expect(macroSplit(130, 180, 55)).toEqual({ protein: 30, carbs: 41, fat: 29 });
    expect(macroSplit(0, 0, 0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it("steppers stay on their grid and inside their limits", () => {
    expect(stepValue(2.5, 0.5, 0, 10)).toBe(3);
    expect(stepValue(0.1 + 0.2, 0.5, 0, 10)).toBe(0.8);
    expect(stepValue(0, -5, 0, 500)).toBe(0);
    expect(stepValue(8000, 1000, 0, 100000)).toBe(9000);
  });

  it("day stats: sets and about how long", () => {
    const day = { name: "Day A · Push", items: [{ exercise_id: null, name: "Bench", sets: 4, reps: 8, rest_s: 120 }, { exercise_id: null, name: "Fly", sets: 3, reps: 12, rest_s: 60 }] };
    expect(dayStats(day)).toEqual({ exercises: 2, sets: 7, minutes: 20 });
    expect(dayStats({ name: "Empty", items: [] })).toEqual({ exercises: 0, sets: 0, minutes: 0 });
  });

  it("knows unsent changes", () => {
    const a: ProgramBody = { days: [{ name: "Day A", items: [{ exercise_id: "x", name: "Bench", sets: 4, reps: 8, rest_s: 120 }] }] };
    const b: ProgramBody = structuredClone(a);
    expect(sameProgram(a, b)).toBe(true);
    b.days[0].items[0].reps = 10;
    expect(sameProgram(a, b)).toBe(false);
    expect(sameProgram(null, { days: [] })).toBe(true);
  });

  it("names the next day", () => {
    expect(nextDayName([{ name: "Day A · Push", items: [] }, { name: "Day B · Pull", items: [] }])).toBe("Day C");
    expect(nextDayName([])).toBe("Day A");
  });

  it("flags a client after 3 days without a check-in", () => {
    expect(checkinIsLate(0)).toBe(false);
    expect(checkinIsLate(2)).toBe(false);
    expect(checkinIsLate(3)).toBe(true);
    expect(checkinIsLate(null)).toBe(true);
  });

  it("WhatsApp links", () => {
    expect(whatsappUrl("+7 916 555 0142", "Привет")).toBe("https://wa.me/79165550142?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82");
    expect(whatsappUrl("081 234 5678", "hi")).toBe("https://wa.me/66812345678?text=hi");
    expect(whatsappUrl(null, "hi")).toBeNull();
    expect(whatsappUrl("12", "hi")).toBeNull();
  });
});
