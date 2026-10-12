import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { open, signInWithCode, WORLD } from "./helpers";

// Phase 3 demo (prompts/phase-3-owner-admin.md). Needs a fresh local database with the demo people:
//   npm run e2e:fresh   (db reset + scripts/demo-setup.sh + the suite)

const CSV = fileURLToPath(new URL("../fixtures/qashier/2026-10-12_sales_report.csv", import.meta.url));
const DB_URL = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function staffSignIn(page: Page, path: string, email: string) {
  await open(page, `${WORLD}${path}`);
  await signInWithCode(page, email);
}

async function deskSignIn(page: Page) {
  await open(page, `${WORLD}/`);
  await page.getByLabel("Email").fill("desk@superfitphuket.com");
  await page.getByLabel("Passcode").fill(process.env.DESK_PASSCODE ?? "246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Joy", exact: true }).click();
  await page.getByRole("button", { name: "Start shift as Joy" }).click();
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible();
}

test("Pete imports the Qashier day, Andy's Today shows it, Pete merges Natalia and her tag scans in as #0957", async ({ browser }) => {
  test.setTimeout(120_000);
  const pete = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await staffSignIn(pete, "/admin", "higgywane@gmail.com");
  await expect(pete.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // A01: drop the CSV → preview ฿50,222, all five checks green → Import.
  await pete.getByRole("button", { name: "Qashier import" }).click();
  await pete.getByTestId("qashier-file").setInputFiles(CSV);
  const checks = pete.getByTestId("import-checks");
  await expect(checks).toContainText("฿50,222.00");
  await expect(checks.locator('[data-ok="true"]')).toHaveCount(5);
  await pete.getByRole("button", { name: "Import Mon 12 Oct" }).click();
  await expect(pete.getByTestId("import-done")).toBeVisible({ timeout: 15_000 });

  // Same file again → "Already imported".
  await pete.getByTestId("qashier-file").setInputFiles(CSV);
  await expect(pete.getByText("Already imported").first()).toBeVisible();

  // Andy's Today: ฿50,222 with Gym ฿37,050, Café ฿10,655, Shop ฿2,517, cash 47%.
  const andy = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await staffSignIn(andy, "/owner", "andy@superfitphuket.com");
  const today = andy.locator("main");
  await expect(today.getByText("฿50,222").first()).toBeVisible({ timeout: 10_000 });
  for (const s of ["฿37,050", "฿10,655", "฿2,517", "47%"]) await expect(today.getByText(s).first()).toBeVisible();

  // Andy can't change anything: no admin, no desk, and the database refuses his writes.
  await open(andy, `${WORLD}/admin`);
  await expect(andy.getByRole("heading", { name: "Not for this account" })).toBeVisible();
  // (The database side is in supabase/tests/04_owner_admin.sql: his price change and import are refused.)
  await open(andy, `${WORLD}/owner`);
  await expect(andy.getByText("฿50,222").first()).toBeVisible();
  await expect(andy.getByRole("textbox")).toHaveCount(0);
  await expect(andy.getByRole("switch")).toHaveCount(0);

  // The desk asks Pete to merge #1188 into #0957.
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await deskSignIn(desk);
  await open(desk, `${WORLD}/members/d0000000-0000-4000-8000-000000001188`);
  await desk.getByRole("button", { name: "Archive or merge" }).click();
  await desk.getByRole("button", { name: "Ask Pete to merge" }).click();
  await expect(desk.getByText("Sent to Pete").first()).toBeVisible();

  // Pete reviews it on the dashboard and merges.
  await pete.getByRole("button", { name: "Dashboard" }).click();
  await pete.getByRole("button", { name: "Review merge" }).click({ timeout: 15_000 });
  await pete.getByRole("button", { name: "Merge into #0957" }).click();
  await expect(pete.getByText("Merged. #1188 now shows as #0957.")).toBeVisible();

  // Tag 001877 scans her in, as #0957.
  await open(desk, `${WORLD}/`);
  await expect(desk.getByRole("heading", { name: "Check-in" })).toBeVisible();
  await desk.keyboard.type("001877\n");
  await expect(desk.getByText("Natalia Orlova").first()).toBeVisible();
  const sql = postgres(DB_URL, { max: 1 });
  try {
    // The check-in keeps the tag's own member row (nothing moves); she is decided and shown as her root, #0957.
    const [row] = await sql`select r.member_no, c.result from public.checkins c join public.members m on m.id = c.member_id join public.members r on r.id = m.root_id order by c.at desc limit 1`;
    expect(row.member_no).toBe(957);
    expect(row.result).toBe("allowed");
  } finally {
    await sql.end();
  }
});
