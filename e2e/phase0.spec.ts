import { expect, test } from "@playwright/test";
import { APP, expectNoHorizontalScroll, open, signInWithCode, WORLD } from "./helpers";

// Phase 0 demo (prompts/phase-0-foundations.md). Needs Pete invited as admin and the shared desk
// login: npm run invite -- higgywane@gmail.com admin Pete; npm run invite -- desk@superfitphuket.com desk "Front desk" --passcode 246810

test("Pete gets a code by email, lands on the admin shell and switches English ↔ ไทย", async ({ page }) => {
  await open(page, `${WORLD}/admin`);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await signInWithCode(page, "higgywane@gmail.com");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "ไทย" }).click();
  await expect(page.getByRole("heading", { name: "แดชบอร์ด" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await page.reload();
  await page.locator('body[data-hydrated="true"]').waitFor();
  await expect(page.getByRole("heading", { name: "แดชบอร์ด" })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("super1.app/join shows the language screen (EN / ไทย / Русский)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, `${APP}/join`);
  await expect(page.getByRole("heading", { name: "Welcome to Superfit" })).toBeVisible();
  for (const name of ["English", "ภาษาไทย", "Русский"]) await expect(page.getByRole("button", { name })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Русский" }).click();
  await expect(page.getByRole("heading", { name: "Добро пожаловать в Superfit" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});

test("a desk login can't open /admin", async ({ page }) => {
  await open(page, `${WORLD}/`);
  await page.getByLabel("Email").fill("desk@superfitphuket.com");
  await page.getByLabel("Passcode").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Who's on shift?" })).toBeVisible();
  await open(page, `${WORLD}/admin`);
  await expect(page.getByRole("heading", { name: "Not for this account" })).toBeVisible();
  await expect(page.getByText("This page is for Pete")).toBeVisible();
});

test("wrong host goes to the right domain", async ({ page }) => {
  await open(page, `${WORLD}/join`);
  await expect(page).toHaveURL(`${APP}/join`);
  await open(page, `${APP}/admin`);
  await expect(page).toHaveURL(`${WORLD}/admin`);
});

test("sign-in screens fit a 390 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [`${WORLD}/`, `${WORLD}/owner`, `${WORLD}/admin`, `${APP}/`, `${APP}/coach`]) {
    await open(page, url);
    await expectNoHorizontalScroll(page);
  }
});
