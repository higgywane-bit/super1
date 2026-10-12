import { andyGroup, englishName } from "../../../lib/qashier/parse";
import type { QLine } from "../../../client/owner";

/** Andy's numbers from one imported Qashier day's lines. Pure, so the dashboard and tests agree. */
export function groups(lines: QLine[]) {
  const g = { gym: 0, cafe: 0, shop: 0, other: 0 };
  for (const l of lines) if (l.section === "category") g[andyGroup(l.name)] += l.till;
  return g;
}

export type PayRow = { key: "cash" | "promptpay" | "card" | "other"; amount: number; parts: { name: string; amount: number }[] };

export function payments(lines: QLine[]): PayRow[] {
  const rows: Record<PayRow["key"], PayRow> = {
    cash: { key: "cash", amount: 0, parts: [] },
    promptpay: { key: "promptpay", amount: 0, parts: [] },
    card: { key: "card", amount: 0, parts: [] },
    other: { key: "other", amount: 0, parts: [] },
  };
  for (const l of lines) {
    if (l.section !== "payment") continue;
    const n = l.name.toLowerCase();
    const key: PayRow["key"] = n.startsWith("cash") ? "cash" : n.includes("promptpay") ? "promptpay" : /visa|master|card|amex|jcb|unionpay/.test(n) ? "card" : "other";
    rows[key].amount += l.till;
    rows[key].parts.push({ name: l.name.replace(/\s*Manual$/i, ""), amount: l.till });
  }
  return Object.values(rows).filter((r) => r.amount > 0);
}

export type SoldRow = { product: string; qty: number; till: number };

/** Memberships and packs rung on Qashier (gym products, without day passes and the ฿0 PT/InBody carriers). */
export function membershipsSold(lines: QLine[]): SoldRow[] {
  return lines
    .filter((l) => l.section === "product" && andyGroup(l.category ?? "") === "gym" && !/^Day Pass/i.test(l.name) && !/^SUPERCOACH/i.test(l.name) && !/^InBody/i.test(l.name) && l.qty > 0)
    .map((l) => ({ product: l.name, qty: l.qty, till: l.till }))
    .sort((a, b) => b.till - a.till);
}

export function dayPassLine(lines: QLine[]): SoldRow | null {
  const l = lines.find((x) => x.section === "product" && /^Day Pass/i.test(x.name));
  return l ? { product: l.name, qty: l.qty, till: l.till } : null;
}

export function cafe(lines: QLine[], planModifiers: Set<string>) {
  const cats = lines
    .filter((l) => l.section === "category" && andyGroup(l.name) === "cafe")
    .map((l) => ({ name: englishName(l.name), qty: l.qty, till: l.till }))
    .sort((a, b) => b.till - a.till);
  const cafeCats = new Set(lines.filter((l) => l.section === "category" && andyGroup(l.name) === "cafe").map((l) => l.name));
  const top = lines
    .filter((l) => l.section === "product" && cafeCats.has(l.category ?? ""))
    .map((l) => ({ name: englishName(l.name), qty: l.qty, till: l.till }))
    .sort((a, b) => b.till - a.till)
    .slice(0, 8);
  const addOns = lines
    .filter((l) => l.section === "modifier" && !planModifiers.has(l.name) && l.till > 0)
    .map((l) => ({ name: englishName(l.name), qty: l.qty, till: l.till }))
    .sort((a, b) => b.till - a.till)
    .slice(0, 6);
  return { total: cats.reduce((a, c) => a + c.till, 0), items: cats.reduce((a, c) => a + c.qty, 0), cats, top, addOns };
}

export function staff(lines: QLine[], names: { name: string; qashier_name: string | null }[]) {
  return lines
    .filter((l) => l.section === "staff")
    .map((l) => ({ name: names.find((s) => s.qashier_name?.trim().toLowerCase() === l.name.trim().toLowerCase())?.name ?? l.name, sales: l.qty, till: l.till }))
    .sort((a, b) => b.till - a.till);
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
