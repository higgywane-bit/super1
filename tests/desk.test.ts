import { describe, expect, it } from "vitest";
import { looksLikeCode } from "../src/client/scan";
import type { MembershipRow, Plan } from "../src/client/desk";
import { saleDates } from "../src/surfaces/world/desk/sheets/dates";

const plan = (p: Partial<Plan>): Plan => ({ id: "1m", name: "1 Month", name_th: null, kind: "membership", audience: "all", price_thb: 2200, duration_days: null, duration_months: 1, sessions: null, sort: 0, ...p });
const ms = (m: Partial<MembershipRow>): MembershipRow => ({
  id: "x",
  plan_id: "1m",
  plan: "1 Month",
  kind: "membership",
  price: 2200,
  starts_on: "2026-10-01",
  ends_on: "2026-10-31",
  sessions_total: null,
  sessions_used: 0,
  coach: null,
  coach_id: null,
  method: "card",
  sold_by: "Joy",
  sold_at: "2026-10-01T02:00:00Z",
  voided: false,
  ...m,
});

describe("scan or name", () => {
  it("tag numbers and app codes are scans", () => {
    expect(looksLikeCode("003909")).toBe(true);
    expect(looksLikeCode("K7M2-Q9PX")).toBe(true);
  });
  it("names are searches", () => {
    expect(looksLikeCode("Emma")).toBe(false);
    expect(looksLikeCode("Emma W")).toBe(false);
    expect(looksLikeCode("12")).toBe(false);
  });
});

describe("the sell sheet's dates card uses the same rules as desk_sell", () => {
  it("Emma (to Sat 31 Oct) renewing on Mon 12 Oct starts Sun 1 Nov", () => {
    expect(saleDates(plan({}), [ms({})], "2026-10-12")).toEqual({ start: "2026-11-01", end: "2026-11-30", queued: true });
  });
  it("an expired member starts today", () => {
    expect(saleDates(plan({ id: "1w", duration_days: 7, duration_months: null }), [ms({ starts_on: "2026-10-03", ends_on: "2026-10-09" })], "2026-10-12")).toEqual({ start: "2026-10-12", end: "2026-10-18", queued: false });
  });
  it("PT packs start today even with cover", () => {
    expect(saleDates(plan({ id: "pt10", kind: "pt", duration_months: 4, sessions: 10 }), [ms({})], "2026-10-12").start).toBe("2026-10-12");
  });
  it("a voided plan doesn't push the new one back", () => {
    expect(saleDates(plan({}), [ms({ voided: true })], "2026-10-12").start).toBe("2026-10-12");
  });
});
