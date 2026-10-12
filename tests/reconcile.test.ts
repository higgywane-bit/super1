import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseQashierReport, summarizeQashier } from "../src/lib/qashier/parse";
import { reconcile, reconTotals, type DeskSale, type ReconPlan } from "../src/lib/qashier/reconcile";

const day = summarizeQashier(parseQashierReport(readFileSync(new URL("../fixtures/qashier/2026-10-12_sales_report.csv", import.meta.url), "utf8")));
const seed = JSON.parse(readFileSync(new URL("../supabase/seed/plans.json", import.meta.url), "utf8")).plans as (ReconPlan & { price_thb: number })[];
const plans: ReconPlan[] = seed.map((p) => ({ id: p.id, name: p.name, kind: p.kind, qashier_product: p.qashier_product ?? null, qashier_modifier: p.qashier_modifier ?? null }));
const price = (id: string) => seed.find((p) => p.id === id)!.price_thb;
const sell = (id: string, n: number): DeskSale[] => Array.from({ length: n }, () => ({ plan_id: id, qty: 1, price_thb: price(id) }));

describe("desk vs Qashier on Mon 12 Oct", () => {
  // What the desk logged that day, matching the till: 14 memberships · ฿25,800 and 45 day passes.
  const desk: DeskSale[] = [...sell("1m", 3), ...sell("th1m", 5), ...sell("th6m", 1), ...sell("2w", 2), ...sell("1w", 3), { plan_id: "day", qty: 45, price_thb: 11250 }];

  it("memberships match: 14 · ฿25,800 on both sides", () => {
    const rows = reconcile(plans, desk, day.products, day.modifiers);
    const m = reconTotals(rows, ["membership", "visits"]);
    expect(m.desk).toEqual({ qty: 14, amount: 25800 });
    expect(m.qashier).toEqual({ qty: 14, amount: 25800 });
    expect(m.match).toBe(true);
  });

  it("day passes match: 45 · ฿11,250", () => {
    const d = reconTotals(reconcile(plans, desk, day.products, day.modifiers), ["daypass"]);
    expect(d.qashier).toEqual({ qty: 45, amount: 11250 });
    expect(d.match).toBe(true);
  });

  it("a sale the desk forgot shows as a difference, not a correction", () => {
    const rows = reconcile(plans, desk.slice(1), day.products, day.modifiers);
    const oneMonth = rows.find((r) => r.key === "1 Month (1 เดือน)")!;
    expect(oneMonth).toMatchObject({ desk: { qty: 2, amount: 4400 }, qashier: { qty: 3, amount: 6600 }, match: false });
  });

  it("PT packs match on the Qashier modifier, whichever coach product carried it", () => {
    const rows = reconcile(plans, [{ plan_id: "pt10", qty: 1, price_thb: 15000 }], [], [{ name: "PT 10 Session", qty: 1, exVat: 14018.69, till: 15000 }]);
    expect(rows).toEqual([expect.objectContaining({ key: "PT 10 Session", kind: "pt", match: true })]);
  });
});

import type { QLine } from "../src/client/owner";
import { cafe, groups, membershipsSold, payments, pct, staff } from "../src/surfaces/world/owner/derive";

describe("Andy's Today from the imported lines", () => {
  const lines: QLine[] = [
    ...day.categories.map((c) => ({ section: "category" as const, name: c.name, category: null, qty: c.qty, till: c.till })),
    ...day.products.map((p) => ({ section: "product" as const, name: p.name, category: p.category ?? null, qty: p.qty, till: p.till })),
    ...day.modifiers.map((m) => ({ section: "modifier" as const, name: m.name, category: null, qty: m.qty, till: m.till })),
    ...day.staff.map((s) => ({ section: "staff" as const, name: s.name, category: null, qty: s.transactions, till: s.till })),
    ...day.payments.map((p) => ({ section: "payment" as const, name: p.method, category: null, qty: 0, till: p.amount })),
  ];
  it("Gym ฿37,050 · Café ฿10,655 · Shop ฿2,517", () => {
    const g = groups(lines);
    expect([Math.round(g.gym), Math.round(g.cafe), Math.round(g.shop)]).toEqual([37050, 10655, 2517]);
  });
  it("cash 47%, PromptPay 29%, card 24% (Visa + Mastercard)", () => {
    const p = payments(lines);
    expect(p.map((r) => [r.key, Math.round(pct(r.amount, 50222))])).toEqual([["cash", 47], ["promptpay", 29], ["card", 24]]);
    expect(p.find((r) => r.key === "card")!.amount).toBe(12193);
  });
  it("14 memberships · ฿25,800 rung on Qashier", () => {
    const m = membershipsSold(lines);
    expect(m.reduce((a, r) => a + r.qty, 0)).toBe(14);
    expect(Math.round(m.reduce((a, r) => a + r.till, 0))).toBe(25800);
  });
  it("café: ฿10,655 in the café categories, add-ons without the PT/InBody modifiers", () => {
    const c = cafe(lines, new Set(["PT 10 Session"]));
    expect(Math.round(c.total)).toBe(10655);
    expect(c.addOns.some((a) => a.name === "XL Size")).toBe(true);
  });
  it("Qashier login joy is Joy at the desk", () => {
    expect(staff(lines, [{ name: "Joy", qashier_name: "joy" }])[0]).toMatchObject({ name: "Joy", sales: 64 });
  });
});
