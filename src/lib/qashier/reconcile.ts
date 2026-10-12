import { andyGroup, type QashierLine } from "./parse";

/**
 * Desk vs Qashier for one business date (docs/06-QASHIER.md, "Desk vs Qashier").
 * Desk: SUPER1 `sales` grouped by plan, mapped to Qashier through plans.qashier_product / qashier_modifier.
 * Qashier: gym product lines; PT and InBody are a product plus a priced modifier, so they match on the modifier.
 * Differences are shown, never auto-corrected.
 */
export type ReconPlan = { id: string; name: string; kind: string; qashier_product: string | null; qashier_modifier: string | null };
export type DeskSale = { plan_id: string | null; qty: number; price_thb: number };
export type ReconRow = {
  key: string;
  label: string;
  kind: "membership" | "daypass" | "visits" | "pt" | "extra" | "unknown";
  desk: { qty: number; amount: number };
  qashier: { qty: number; amount: number };
  match: boolean;
};

const round = (n: number) => Math.round(n * 100) / 100;

function keyOf(p: ReconPlan): string | null {
  return p.qashier_modifier ?? p.qashier_product ?? null;
}

export function reconcile(plans: ReconPlan[], desk: DeskSale[], products: QashierLine[], modifiers: QashierLine[]): ReconRow[] {
  const rows = new Map<string, ReconRow>();
  const kindOf = (p: ReconPlan | undefined): ReconRow["kind"] =>
    !p ? "unknown" : p.id === "day" ? "daypass" : (["membership", "visits", "pt", "extra"].includes(p.kind) ? p.kind : "unknown") as ReconRow["kind"];
  const get = (key: string, label: string, kind: ReconRow["kind"]) => {
    let r = rows.get(key);
    if (!r) rows.set(key, (r = { key, label, kind, desk: { qty: 0, amount: 0 }, qashier: { qty: 0, amount: 0 }, match: false }));
    return r;
  };

  const byId = new Map(plans.map((p) => [p.id, p]));
  for (const s of desk) {
    const p = s.plan_id ? byId.get(s.plan_id) : undefined;
    const key = p ? keyOf(p) : null;
    const r = get(key ?? `plan:${s.plan_id ?? "?"}`, p?.name ?? s.plan_id ?? "?", kindOf(p));
    r.desk.qty += s.qty;
    r.desk.amount = round(r.desk.amount + s.price_thb);
  }

  const modifierKeys = new Set(plans.map((p) => p.qashier_modifier).filter(Boolean) as string[]);
  const productKeys = new Map(plans.filter((p) => !p.qashier_modifier && p.qashier_product).map((p) => [p.qashier_product as string, p]));
  for (const m of modifiers) {
    if (!modifierKeys.has(m.name)) continue;
    const p = plans.find((x) => x.qashier_modifier === m.name);
    const r = get(m.name, p?.name ?? m.name, kindOf(p));
    r.qashier.qty += m.qty;
    r.qashier.amount = round(r.qashier.amount + m.till);
  }
  for (const pr of products) {
    if (andyGroup(pr.category ?? "") !== "gym") continue;
    const p = productKeys.get(pr.name);
    // PT ("SUPERCOACH AUN") and InBody products are ฿0 carriers: their money is on the modifier.
    if (!p && (/^SUPERCOACH/i.test(pr.name) || /^InBody/i.test(pr.name))) continue;
    const r = get(pr.name, p?.name ?? pr.name, kindOf(p));
    r.qashier.qty += pr.qty;
    r.qashier.amount = round(r.qashier.amount + pr.till);
  }

  for (const r of rows.values()) r.match = r.desk.qty === r.qashier.qty && Math.abs(r.desk.amount - r.qashier.amount) <= 1;
  const order: ReconRow["kind"][] = ["membership", "visits", "pt", "extra", "daypass", "unknown"];
  return [...rows.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.qashier.amount - a.qashier.amount || a.label.localeCompare(b.label));
}

export function reconTotals(rows: ReconRow[], kinds: ReconRow["kind"][]) {
  const pick = rows.filter((r) => kinds.includes(r.kind));
  return {
    desk: { qty: pick.reduce((a, r) => a + r.desk.qty, 0), amount: round(pick.reduce((a, r) => a + r.desk.amount, 0)) },
    qashier: { qty: pick.reduce((a, r) => a + r.qashier.qty, 0), amount: round(pick.reduce((a, r) => a + r.qashier.amount, 0)) },
    match: pick.every((r) => r.match),
  };
}
