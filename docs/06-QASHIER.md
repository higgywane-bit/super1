# 06 · Qashier

Qashier is the till. Every baht is rung there, including memberships sold at the desk. SUPER1 never replaces it: it reads Qashier's daily **Sales Report** CSV that Pete uploads, shows the numbers to Andy, and checks them against what the desk logged.

Code: `src/lib/qashier/parse.ts` (tested in `tests/qashier.test.ts` against the real 12 Oct report in `fixtures/qashier/`).

## The file

Export in Qashier HQ: **Reports → Sales Report → one day → CSV**. Shape:

```
"Superfit™"                                          ← store
"12/10/2026 00:00:00 - 12/10/2026 23:59:59"          ← DD/MM/YYYY range = the business date
(blank)
"Sales Information"                                  ← key/value section
"Gross Sales","46936.45"
"Total Sales","50222.00"  …
(blank)
"Sales by Category"                                  ← table section: header row, then rows
"Category","Gross Sales","Quantity Sold","Total Discount Given"
"Memberships (สมาชิกภาพ)","24112.15","14","0.00"  …
```

- UTF-8 with BOM, quoted fields, Thai text in names, some names with trailing spaces.
- Key/value sections: Sales Information, Credit Information, Package Information, Total Settlement by Payment Method.
- Table sections (may be header-only): Sales by Category, Sales by Product, Sales by Modifier, Sales by Tag, Sales by Tab, Sales by Combo, Net Sales by Employee, Discount Information.

## VAT

- **Total Sales** and the payment settlements are what customers paid, **including 7% VAT** (฿50,222.00).
- Every category, product, modifier, tab and employee amount is **ex-VAT** ("Gross Sales" there means net of VAT). Multiply by 1.07 for till money: Day Pass 10,514.02 → ฿11,250.00.
- Net ฿46,936.45 + VAT ฿3,285.55 = ฿50,222.00.

## Checks on import (all must pass on the fixture)

| Check | 12 Oct |
|---|---|
| Categories add up to net sales | 46,936.45 = 46,936.45 |
| Payments add up to total sales | 50,222.00 = 50,222.00 |
| Staff transactions add up to all transactions | 64 + 59 = 123 |
| Gym + Café + Shop (incl. VAT) = total sales (±฿1 rounding) | 37,050 + 10,655 + 2,517 = 50,222 |
| No unknown categories | all mapped |

A failed check doesn't block the import; it shows in red in the preview and is saved with the import.

## Andy's three buckets

| Bucket | Qashier categories |
|---|---|
| Gym | Memberships, Day Pass, Personal Trainers, InBody Scan |
| Café | Protein, Water (incl. C4, creatine, Wilder), Coffee, Juices, Drink, Snacks & Fruit, Waffles, and the old "หมวดหมู่เก่า" categories |
| Shop | Superfit Clothes, Superfit T-shirt, Towel |

Old categories marked **หมวดหมู่เก่า** ("old category, keep for now") still appear when staff tap old tiles. They count under their new bucket and are flagged so Pete can retire the tiles.

## How Qashier names things (for reconciliation)

| SUPER1 plan | Qashier |
|---|---|
| Memberships | product, e.g. `1 Month (1 เดือน)`, `THAI 6 เดือน`, `10 Visit Pack (แพ็กเกจ 10 ครั้ง)` |
| PT packs | product **per coach** `SUPERCOACH AUN` (฿0) + modifier `PT 10 Session` (฿15,000) |
| InBody | product `InBody Scan (สแกนองค์ประกอบร่างกาย)` (฿0) + modifier `Single Scan` / `2 Pack` / `3 Pack` / `4 Pack` / `10 Pack` |
| Café add-ons | modifiers, e.g. `XL Size` ฿50, `Extra Scoop (ตักเพิ่ม)` ฿60 |

These live in `plans.qashier_product` / `qashier_modifier` and `menu_items.qashier_products` / `menu_options.qashier_modifier`, seeded from the full Qashier catalogue (127 products, 63 modifiers).

## Import flow

1. Pete drops one or more CSVs (A01). Each file is parsed on the server, never in the browser only.
2. Preview per day: totals, checks, desk vs Qashier, products not in the menu.
3. **Import** writes `qashier_imports` (raw sections as JSON + totals + checks) and `qashier_lines` (category, product, modifier, tab, staff, payment). Re-importing the same date adds version n+1 and marks the old one superseded. Same file twice (same SHA-256) → "Already imported".
4. Andy's app reads the latest version per day (`qashier_days`).

## Desk vs Qashier

For one business date:

- **Desk**: `sales` grouped by `plan_id`, mapped through `plans.qashier_product` (+ modifier for PT/InBody).
- **Qashier**: product lines in the gym bucket.

Show both counts and amounts side by side. Any difference is a question for the desk (sold but not rung, or rung but not logged). On 12 Oct: memberships 14 · ฿25,800 both sides; day passes 45 · ฿11,250.

## Products not in the menu app

Any Qashier product (outside gym plans) not found in `menu_items.qashier_products` is listed with its price, with **Add as drafts** (hidden from members until Pete switches them on).

## Staff names

Qashier logins (`joy`, `Hayatee Boonya`) map to desk staff via `staff.qashier_name`. Unmatched logins show on A04 for Pete to match.

## Later

Qashier HQ may offer an API or scheduled email export. If it does, replace the manual upload with a nightly fetch; the parser and tables stay the same.
