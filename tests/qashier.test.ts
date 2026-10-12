import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { andyGroup, englishName, gymSalesByProduct, inclVat, parseCsv, parseQashierReport, summarizeQashier } from "../src/lib/qashier/parse";

const csv = readFileSync(new URL("../fixtures/qashier/2026-10-12_sales_report.csv", import.meta.url), "utf8");
const raw = parseQashierReport(csv);
const day = summarizeQashier(raw);

describe("CSV reader", () => {
  it("handles quotes, commas and newlines inside quotes", () => {
    expect(parseCsv('"a, b","c ""d"""\r\n"e\nf",g')).toEqual([["a, b", 'c "d"'], ["e\nf", "g"]]);
  });
});

describe("Qashier sales report, Mon 12 Oct 2026", () => {
  it("reads the header", () => {
    expect(raw.store).toBe("Superfit™");
    expect(raw.businessDate).toBe("2026-10-12");
    expect(Object.keys(raw.kv)).toEqual(["Sales Information", "Credit Information", "Package Information", "Total Settlement by Payment Method"]);
    expect(Object.keys(raw.tables)).toEqual(["Sales by Category", "Sales by Product", "Sales by Modifier", "Sales by Tag", "Sales by Tab", "Sales by Combo", "Net Sales by Employee", "Discount Information"]);
  });

  it("matches the till: ฿50,222 total, ฿46,936.45 net, ฿3,285.55 VAT, 123 sales", () => {
    expect(day.totalSales).toBe(50222);
    expect(day.netSales).toBe(46936.45);
    expect(day.vat).toBe(3285.55);
    expect(day.transactions).toBe(123);
    expect(day.cost).toBe(2428);
  });

  it("passes every cross-check", () => {
    for (const c of day.checks) expect(c.ok, `${c.id}: ${c.detail}`).toBe(true);
  });

  it("splits into Andy's three buckets incl. VAT", () => {
    expect(Math.round(day.groups.gym)).toBe(37050);
    expect(Math.round(day.groups.cafe)).toBe(10655);
    expect(Math.round(day.groups.shop)).toBe(2517);
    expect(day.groups.other).toBe(0);
  });

  it("payments: cash 47%, PromptPay, Visa and Mastercard", () => {
    expect(day.payments).toEqual([
      { method: "Cash", amount: 23688 },
      { method: "PromptPay", amount: 14341 },
      { method: "Visa Manual", amount: 7663 },
      { method: "Mastercard Manual", amount: 4530 },
    ]);
  });

  it("staff: Joy 64 sales ฿30,139, Hayatee Boonya 59 sales ฿20,083 at the till", () => {
    expect(day.staff.map((s) => [s.name, s.transactions, Math.round(s.till)])).toEqual([
      ["joy", 64, 30139],
      ["Hayatee Boonya", 59, 20083],
    ]);
  });

  it("memberships and day passes for desk reconciliation", () => {
    const gym = gymSalesByProduct(day);
    expect(gym["Day Pass (วันหนึ่ง)"]).toEqual({ qty: 45, till: 11250 });
    expect(gym["1 Month (1 เดือน)"]).toEqual({ qty: 3, till: 6600 });
    expect(gym["THAI 1 เดือน"]).toEqual({ qty: 5, till: 6000 });
    expect(gym["THAI 6 เดือน"]).toEqual({ qty: 1, till: 6000 });
    const memberships = Object.entries(gym).filter(([k]) => !k.startsWith("Day Pass"));
    expect(memberships.reduce((a, [, v]) => a + v.qty, 0)).toBe(14);
    expect(memberships.reduce((a, [, v]) => a + v.till, 0)).toBe(25800);
  });

  it("modifiers carry real add-on prices", () => {
    const xl = day.modifiers.find((x) => x.name === "XL Size");
    expect(xl).toMatchObject({ qty: 11, till: 550 });
    const scoop = day.modifiers.find((x) => x.name.startsWith("Extra Scoop ("));
    expect(scoop).toMatchObject({ qty: 5, till: 300 });
  });

  it("flags the legacy fruit category but still counts it as café", () => {
    const legacy = day.categories.filter((c) => c.legacy);
    expect(legacy.map((c) => [c.name.split(" ")[0], c.group, c.qty])).toEqual([["Fruit", "cafe", 1]]);
  });
});

describe("helpers", () => {
  it("VAT and names", () => {
    expect(inclVat(10514.02)).toBe(11250);
    expect(englishName("Strong Vibes สตรองไวบ์")).toBe("Strong Vibes");
    expect(englishName("Memberships (สมาชิกภาพ)")).toBe("Memberships");
    expect(englishName("THAI 1 เดือน")).toBe("THAI 1 เดือน");
    expect(andyGroup("Personal Trainers  (ชุดฝึกอบรมส่วนบุคคล)")).toBe("gym");
    expect(andyGroup("InBody Scan (สแกนองค์ประกอบร่างกาย)")).toBe("gym");
    expect(andyGroup("Superfit T-shirt")).toBe("shop");
    expect(andyGroup("Juices (น้ำผลไม้)")).toBe("cafe");
    expect(andyGroup("Something new")).toBe("other");
  });
});
