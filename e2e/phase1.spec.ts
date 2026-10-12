import { expect, test, type Page } from "@playwright/test";
import { APP, open, WORLD } from "./helpers";

// Phase 1 demo (docs/09-BUILD-PLAN.md). Needs a fresh local database with the demo people:
//   npm run e2e:fresh   (db reset + scripts/demo-setup.sh + the suite)

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function deskSignIn(page: Page) {
  await open(page, `${WORLD}/`);
  await page.getByLabel("Email").fill("desk@superfitphuket.com");
  await page.getByLabel("Passcode").fill(process.env.DESK_PASSCODE ?? "246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Joy", exact: true }).click();
  await page.getByRole("button", { name: "Start shift as Joy" }).click();
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible();
}

async function scan(page: Page, code: string) {
  await page.keyboard.type(`${code}\n`);
}

test("Ivan signs up in Russian, the desk finishes it, the invite arrives in Russian, his tag lets him in", async ({ browser }) => {
  const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 940 } });
  const desk = await deskCtx.newPage();
  await deskSignIn(desk);

  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await phoneCtx.newPage();
  await open(phone, `${APP}/join`);
  await phone.getByRole("button", { name: "Русский" }).click();
  await phone.getByRole("button", { name: /Я здесь впервые/ }).click();
  await phone.getByLabel("Имя").fill("Ivan");
  await phone.getByLabel("Фамилия").fill("Petrov");
  await phone.getByLabel("Телефон").fill("+7 916 555 0142");
  await phone.getByLabel("Эл. почта").fill("ivan.petrov@mail.ru");
  await phone.getByRole("button", { name: "Sunman" }).click();
  await phone.getByRole("button", { name: "Далее" }).click();
  await phone.getByRole("checkbox", { name: /Я принимаю условия/ }).click();
  const pad = phone.getByRole("img", { name: /Поле подписи/ });
  const box = (await pad.boundingBox())!;
  await phone.mouse.move(box.x + 30, box.y + 100);
  await phone.mouse.down();
  for (const [dx, dy] of [[80, 40], [140, 90], [200, 50], [280, 95]]) await phone.mouse.move(box.x + dx, box.y + dy, { steps: 5 });
  await phone.mouse.up();
  await phone.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(phone.getByRole("heading", { name: "Добро пожаловать, Ivan" })).toBeVisible();
  const submitted = Date.now();

  // The desk sees him in under 2 seconds (realtime), with Sunman's pill.
  const card = desk.locator(".s1-card", { hasText: "Ivan Petrov" });
  await expect(card).toBeVisible({ timeout: 4000 });
  expect(Date.now() - submitted).toBeLessThan(2000);
  await expect(card.getByText("Sunman")).toBeVisible();
  await expect(phone.getByRole("heading", { name: "Готово, Ivan" })).toBeVisible();

  // Tag 004417, 1 Month, card.
  await card.getByRole("button", { name: "Attach tag and sell plan" }).click();
  await desk.getByLabel(/Scan their new tag/).fill("004417");
  await desk.getByRole("button", { name: /^1 Month/ }).click();
  await desk.getByRole("button", { name: "Card", exact: true }).click();
  await desk.getByRole("button", { name: "Create member and sell 1 Month · ฿2,200" }).click();
  await expect(desk.getByText("Invite sent to ivan.petrov@mail.ru. Ring ฿2,200 on Qashier.")).toBeVisible();

  // The invite arrives in Russian.
  let subject = "";
  for (let i = 0; i < 30 && !subject; i++) {
    const r = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:ivan.petrov@mail.ru")}`)).json()) as { messages: { Subject: string }[] };
    subject = r.messages.find((m) => m.Subject.includes("SUPER1"))?.Subject ?? "";
    if (!subject) await desk.waitForTimeout(500);
  }
  expect(subject).toBe("Приложение SUPER1 готово");

  // Scan 004417 → WELCOME IN · Ivan Petrov · 30 days left.
  await scan(desk, "004417");
  const ok = desk.getByRole("status").filter({ hasText: "WELCOME IN" });
  await expect(ok).toBeVisible();
  await expect(ok.getByText("Ivan Petrov")).toBeVisible();
  await expect(ok.getByText("30", { exact: true })).toBeVisible();
  await expect(ok.getByText("days left on 1 Month")).toBeVisible();
  await expect(ok).toBeHidden({ timeout: 6000 });

  await deskCtx.close();
  await phoneCtx.close();
});

test("an expired tag is declined, Renew now sells 1 Week, the next scan is allowed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 940 });
  await deskSignIn(page);
  await scan(page, "001877");
  const no = page.getByRole("alert").filter({ hasText: "Natalia Orlova" });
  await expect(no).toBeVisible();
  await expect(no.getByText("Expired Fri 9 Oct")).toBeVisible();
  await no.getByRole("button", { name: "Renew now" }).click();
  await page.getByRole("button", { name: /^1 Week/ }).click();
  await expect(page.getByText("Starts today")).toBeVisible();
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page.getByRole("button", { name: "Sell 1 Week · ฿1,200" }).click();
  await expect(page.getByText("1 Week sold. Ring ฿1,200 on Qashier.")).toBeVisible();
  await scan(page, "001877");
  await expect(page.getByRole("status").filter({ hasText: "WELCOME IN" }).getByText("Natalia Orlova")).toBeVisible();
});

test("Emma's renewal starts Sun 1 Nov, after her current plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 940 });
  await deskSignIn(page);
  await page.getByRole("button", { name: "Members" }).click();
  await page.getByLabel("Search name, phone or tag").fill("Emma");
  await page.getByRole("button", { name: /Emma Wilson/ }).click();
  await page.getByRole("button", { name: "Sell or renew" }).click();
  await page.getByRole("button", { name: /^1 Month/ }).click();
  await expect(page.getByText("Starts Sun 1 Nov, after the current plan")).toBeVisible();
  await expect(page.getByText("Sun 1 Nov → Mon 30 Nov")).toBeVisible();
});

test("the desk fits a 390 px phone (no horizontal scroll)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deskSignIn(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
