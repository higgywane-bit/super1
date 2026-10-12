import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { ru } from "../src/i18n/ru";
import { th } from "../src/i18n/th";
import { translate } from "../src/i18n";

describe("dictionaries", () => {
  const keys = Object.keys(en).sort();
  it("th and ru have exactly the English keys", () => {
    expect(Object.keys(th).sort()).toEqual(keys);
    expect(Object.keys(ru).sort()).toEqual(keys);
  });
  it("no empty strings", () => {
    for (const d of [en, th, ru]) for (const [k, v] of Object.entries(d)) expect(v.trim(), k).not.toBe("");
  });
  it("placeholders match across languages", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const k of keys) {
      const want = ph(en[k as keyof typeof en]);
      expect(ph(th[k as keyof typeof th]), `th ${k}`).toBe(want);
      expect(ph(ru[k as keyof typeof ru]), `ru ${k}`).toBe(want);
    }
  });
  it("fills placeholders", () => {
    expect(translate("en", "owner.hi", { name: "Andy" })).toBe("Hi Andy");
    expect(translate("th", "owner.hi", { name: "Andy" })).toBe("สวัสดี Andy");
  });
});
