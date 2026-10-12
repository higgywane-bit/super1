import type { ISODate } from "../dates";

/**
 * Qashier "Sales Report" CSV export (one business day per file).
 *
 * Shape (see fixtures/qashier/2026-10-12_sales_report.csv):
 *   line 1  store name ("Superfit™"), UTF-8 with BOM
 *   line 2  "12/10/2026 00:00:00 - 12/10/2026 23:59:59"  (DD/MM/YYYY)
 *   then blank-line-separated sections. Each starts with a one-cell title row.
 *   - key/value sections: "Sales Information", "Credit Information", "Package Information",
 *     "Total Settlement by Payment Method" -> rows of [label, number]
 *   - table sections: a header row, then data rows (may be empty: header only)
 *
 * Money: every "Gross Sales" / "Net Sales" / "Total Sales" in the category, product, modifier,
 * tab and employee tables is EX-VAT. Only "Total Sales" and the payment settlements in the
 * key/value sections are what customers actually paid (incl. 7% VAT). Multiply ex-VAT by 1.07
 * to get till money: Day Pass 10,514.02 x 1.07 = 11,250.00.
 */

export const VAT_RATE = 0.07;

export type QashierRaw = {
  store: string;
  rangeText: string;
  businessDate: ISODate;
  kv: Record<string, Record<string, string>>;
  tables: Record<string, Record<string, string>[]>;
};

/** RFC 4180 CSV: quotes, escaped quotes, commas and newlines inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const isBlank = (r: string[]) => r.every((c) => c.trim() === "");
const looksNumeric = (s: string) => /^-?[\d.,]+%?(\/-?[\d.,]+%?)?$/.test(s.trim());

/** "12/10/2026 00:00:00 - ..." -> "2026-10-12" */
export function businessDateFromRange(range: string): ISODate {
  const m = range.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) throw new Error(`Qashier: can't read the date range "${range}"`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function parseQashierReport(text: string): QashierRaw {
  const rows = parseCsv(text);
  const content = rows.filter((r) => !isBlank(r));
  if (content.length < 2) throw new Error("Qashier: file is empty");
  const store = content[0][0].trim();
  const rangeText = content[1][0].trim();
  const out: QashierRaw = { store, rangeText, businessDate: businessDateFromRange(rangeText), kv: {}, tables: {} };

  let i = rows.findIndex((r) => r[0]?.trim() === rangeText) + 1;
  while (i < rows.length) {
    if (isBlank(rows[i])) {
      i++;
      continue;
    }
    const title = rows[i][0].trim();
    i++;
    const block: string[][] = [];
    while (i < rows.length && !isBlank(rows[i])) block.push(rows[i++]);
    if (!block.length) {
      out.tables[title] = [];
      continue;
    }
    const first = block[0];
    if (first.length === 2 && looksNumeric(first[1])) {
      out.kv[title] = Object.fromEntries(block.map((r) => [r[0].trim(), r[1].trim()]));
    } else {
      const header = first.map((h) => h.trim());
      out.tables[title] = block.slice(1).map((r) => Object.fromEntries(header.map((h, k) => [h, (r[k] ?? "").trim()])));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ summary */

const num = (s: string | undefined) => (s == null || s === "" ? 0 : Number(s.replace(/,/g, "")));
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Ex-VAT amount -> what the till took, to the satang. */
export const inclVat = (exVat: number) => round2(exVat * (1 + VAT_RATE));

export type AndyGroup = "gym" | "cafe" | "shop" | "other";

/** English part of a bilingual Qashier name: "Memberships (สมาชิกภาพ)" -> "Memberships". */
export function englishName(name: string): string {
  const noParens = name.replace(/\s*\(.*$/, "").trim();
  // "Strong Vibes สตรองไวบ์" -> "Strong Vibes", but keep "THAI 1 เดือน" whole (the Thai word is part of the name).
  const m = noParens.match(/^(.*?[A-Za-z&:'!.]) +[฀-๿][฀-๿ &]*$/);
  return (m ? m[1] : noParens).trim();
}

/** Old Qashier categories marked "หมวดหมู่เก่า" (kept for history) still count, under their new group. */
export function isLegacyCategory(name: string): boolean {
  return name.includes("หมวดหมู่เก่า");
}

/** Which of Andy's three buckets a Qashier category belongs to. Unknown categories land in "other" and are flagged. */
export function andyGroup(category: string): AndyGroup {
  const c = category.toLowerCase();
  if (/^(memberships|day pass|personal trainers|inbody)/.test(c)) return "gym";
  if (/^(superfit clothes|superfit t-shirt|towel)/.test(c)) return "shop";
  if (/^(protein|water|coffee|juices|drink|snacks|fruit|waffles|protein balls|protein bars)/.test(c) || c.startsWith("ครีเอท")) return "cafe";
  return "other";
}

export type QashierLine = { name: string; category?: string; qty: number; exVat: number; till: number; cost?: number };

export type QashierDay = {
  businessDate: ISODate;
  store: string;
  totalSales: number;
  netSales: number;
  vat: number;
  cost: number;
  grossProfit: number;
  transactions: number;
  voidedTransactions: number;
  voidedAmount: number;
  payments: { method: string; amount: number }[];
  categories: (QashierLine & { group: AndyGroup; legacy: boolean })[];
  products: QashierLine[];
  modifiers: QashierLine[];
  tabs: QashierLine[];
  staff: { name: string; transactions: number; exVat: number; till: number }[];
  groups: Record<AndyGroup, number>;
  checks: { id: string; ok: boolean; detail: string }[];
};

export function summarizeQashier(raw: QashierRaw): QashierDay {
  const info = raw.kv["Sales Information"] ?? {};
  const settle = raw.kv["Total Settlement by Payment Method"] ?? {};
  const t = raw.tables;

  const categories = (t["Sales by Category"] ?? []).map((r) => {
    const exVat = num(r["Gross Sales"]);
    return { name: r["Category"], qty: num(r["Quantity Sold"]), exVat, till: inclVat(exVat), group: andyGroup(r["Category"]), legacy: isLegacyCategory(r["Category"]) };
  });
  const products = (t["Sales by Product"] ?? []).map((r) => {
    const exVat = num(r["Gross Sales"]);
    return { name: r["Product Name"], category: r["Category"], qty: num(r["Quantity Sold"]), exVat, till: inclVat(exVat), cost: num(r["Total Cost"]) };
  });
  const line = (nameKey: string) => (r: Record<string, string>) => {
    const exVat = num(r["Gross Sales"]);
    return { name: r[nameKey], qty: num(r["Quantity Sold"]), exVat, till: inclVat(exVat) };
  };
  const modifiers = (t["Sales by Modifier"] ?? []).map(line("Modifier"));
  const tabs = (t["Sales by Tab"] ?? []).map(line("Tab Name"));
  const staff = (t["Net Sales by Employee"] ?? []).map((r) => {
    const exVat = num(r["Total Sales"]);
    return { name: r["Employee"], transactions: num(r["Number of Sales"]), exVat, till: inclVat(exVat) };
  });
  const payments = Object.entries(settle)
    .filter(([k]) => k !== "Total Settlement")
    .map(([method, v]) => ({ method, amount: num(v) }));

  const totalSales = num(info["Total Sales"]);
  const netSales = num(info["Net Sales"]);
  const transactions = num(info["Number of Sales Transactions"]);

  const groups: Record<AndyGroup, number> = { gym: 0, cafe: 0, shop: 0, other: 0 };
  for (const c of categories) groups[c.group] = round2(groups[c.group] + c.till);

  const catSum = round2(categories.reduce((a, c) => a + c.exVat, 0));
  const paySum = round2(payments.reduce((a, p) => a + p.amount, 0));
  const staffTx = staff.reduce((a, s) => a + s.transactions, 0);
  const groupSum = round2(groups.gym + groups.cafe + groups.shop + groups.other);
  const checks = [
    { id: "categories-net", ok: Math.abs(catSum - netSales) < 0.05, detail: `categories ${catSum.toFixed(2)} vs net sales ${netSales.toFixed(2)}` },
    { id: "payments-total", ok: Math.abs(paySum - totalSales) < 0.05, detail: `payments ${paySum.toFixed(2)} vs total sales ${totalSales.toFixed(2)}` },
    { id: "staff-transactions", ok: staffTx === transactions, detail: `staff ${staffTx} vs transactions ${transactions}` },
    { id: "groups-total", ok: Math.abs(groupSum - totalSales) <= 1, detail: `gym+cafe+shop ${groupSum.toFixed(2)} vs total sales ${totalSales.toFixed(2)}` },
    { id: "no-unknown-categories", ok: groups.other === 0, detail: groups.other ? `unmapped categories: ${categories.filter((c) => c.group === "other").map((c) => c.name).join(", ")}` : "all categories mapped" },
  ];

  return {
    businessDate: raw.businessDate,
    store: raw.store,
    totalSales,
    netSales,
    vat: num(info["Total VAT"]),
    cost: num(info["Total Cost"]),
    grossProfit: num(info["Gross Profit"]),
    transactions,
    voidedTransactions: num(info["Number of Voided Transactions"]),
    voidedAmount: num(info["Total Voided Amount"]),
    payments,
    categories,
    products,
    modifiers,
    tabs,
    staff,
    groups,
    checks,
  };
}

/** Membership and day-pass lines in a Qashier day, keyed by Qashier product name, for reconciling against desk sales. */
export function gymSalesByProduct(day: QashierDay): Record<string, { qty: number; till: number }> {
  const out: Record<string, { qty: number; till: number }> = {};
  for (const p of day.products) {
    if (andyGroup(p.category ?? "") !== "gym") continue;
    const k = p.name;
    out[k] = { qty: (out[k]?.qty ?? 0) + p.qty, till: round2((out[k]?.till ?? 0) + p.till) };
  }
  return out;
}
