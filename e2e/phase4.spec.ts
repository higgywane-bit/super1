import { expect, test, type Page } from "@playwright/test";
import { APP, open, signInWithCode, WORLD } from "./helpers";

// Phase 4 demo (prompts/phase-4-coach-portal.md; counter mode left out by request). Needs a fresh local database:
//   npm run e2e:fresh   (db reset + scripts/demo-setup.sh + the suite)
// Aun not seeing Emma is checked in supabase/tests/05_coach.sql.

const EMMA = "d0000000-0000-4000-8000-000000001043";

async function deskSignIn(page: Page) {
  await open(page, `${WORLD}/`);
  await page.getByLabel("Email").fill("desk@superfitphuket.com");
  await page.getByLabel("Passcode").fill(process.env.DESK_PASSCODE ?? "246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Joy", exact: true }).click();
  await page.getByRole("button", { name: "Start shift as Joy" }).click();
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible();
}

test("a new lead reaches Sunman live; he sends Emma a program and targets, and −1 shows at the desk", async ({ browser }) => {
  test.setTimeout(180_000);
  const sunman = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await open(sunman, `${APP}/coach`);
  await signInWithCode(sunman, "sunman@superfitphuket.com");
  await expect(sunman.getByRole("heading", { name: "Clients and leads" })).toBeVisible();
  await expect(sunman.getByTestId("client-card").filter({ hasText: "Emma Wilson" }).getByTestId("pt-left")).toHaveText("6");

  // Olga signs up at the counter and picks Sunman; the desk finishes it; Sunman sees the lead without reloading.
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await deskSignIn(desk);
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await open(phone, `${APP}/join`);
  await phone.getByRole("button", { name: "English" }).click();
  await phone.getByRole("button", { name: /New to Superfit/ }).click();
  await phone.getByLabel("First name").fill("Olga");
  await phone.getByLabel("Last name").fill("Ivanova");
  await phone.getByLabel("Phone", { exact: true }).fill("+7 916 555 0177");
  await phone.getByLabel("Email", { exact: true }).fill("olga.ivanova@mail.ru");
  await phone.getByRole("button", { name: "Sunman" }).click();
  await phone.getByRole("button", { name: "Next" }).click();
  await phone.getByRole("checkbox", { name: /I agree/ }).click();
  const pad = phone.getByRole("img", { name: /Sign here|signature/i });
  const box = (await pad.boundingBox())!;
  await phone.mouse.move(box.x + 30, box.y + 100);
  await phone.mouse.down();
  for (const [dx, dy] of [[80, 40], [140, 90], [200, 50]]) await phone.mouse.move(box.x + dx, box.y + dy, { steps: 5 });
  await phone.mouse.up();
  await phone.getByRole("button", { name: "Join Superfit" }).click();

  const card = desk.locator(".s1-card", { hasText: "Olga Ivanova" });
  await expect(card).toBeVisible({ timeout: 6000 });
  await card.getByRole("button", { name: "Attach tag and sell plan" }).click();
  await desk.getByLabel(/Scan their new tag/).fill("004488");
  await desk.getByRole("button", { name: /^1 Month/ }).click();
  await desk.getByRole("button", { name: "Card", exact: true }).click();
  await desk.getByRole("button", { name: /^Create member and sell 1 Month/ }).click();
  await expect(desk.getByText(/Invite sent to olga\.ivanova@mail\.ru/)).toBeVisible();
  await expect(sunman.getByTestId("lead-card").filter({ hasText: "Olga Ivanova" })).toBeVisible({ timeout: 6000 });

  // Program: Day A · Push, one more rep on the bench, Send → a new version.
  await open(sunman, `${APP}/coach/clients/${EMMA}?tab=program`);
  await expect(sunman.getByTestId("sync-pill")).toContainText("v1");
  await sunman.getByTestId("program-row").first().click();
  await sunman.getByRole("button", { name: "More Reps" }).click();
  await sunman.getByRole("button", { name: "Save" }).click();
  await expect(sunman.getByTestId("sync-pill")).toHaveText("Unsent changes");
  await sunman.getByRole("button", { name: "Send to Emma" }).click();
  await expect(sunman.getByText("Sent to Emma · version 2")).toBeVisible();
  await expect(sunman.getByTestId("sync-pill")).toContainText("v2");

  // Nutrition: 120/170/55 → 130/180/55 = 1,735 kcal.
  await sunman.getByRole("button", { name: "Food" }).click();
  for (let i = 0; i < 2; i++) await sunman.getByRole("button", { name: "More Protein" }).click();
  for (let i = 0; i < 2; i++) await sunman.getByRole("button", { name: "More Carbs" }).click();
  await expect(sunman.getByTestId("kcal")).toHaveText("1,735");
  await sunman.getByRole("button", { name: "Send to Emma" }).click();
  await expect(sunman.getByText("Sent to Emma · 1,735 kcal a day")).toBeVisible();

  // Use 1 session: 6 → 5, and the desk feed says "PT session with Sunman".
  await sunman.getByRole("button", { name: "Use 1 session" }).first().click();
  await sunman.getByRole("dialog").getByRole("button", { name: "Use 1 session" }).click();
  await expect(sunman.getByTestId("session-done")).toContainText("5");
  await sunman.getByRole("button", { name: "Done" }).click();
  await expect(sunman.getByTestId("pt-pill")).toContainText("5 of 10 PT left");
  await expect(desk.getByText(/PT session with Sunman/).first()).toBeVisible({ timeout: 8000 });
});
