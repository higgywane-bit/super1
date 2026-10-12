import { expect, test, type Page } from "@playwright/test";
import { APP, open, signInWithCode, WORLD } from "./helpers";

// Phase 6 demo (prompts/phase-6-launch.md): an existing member links their tag at the counter, gets the app,
// signs in, and checks in with the member QR. (Installing from the store is the same app: the shells load
// super1.app.) Needs a fresh local database: npm run e2e:fresh

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

async function runOutbox() {
  // (Node can't resolve *.localhost, so call the dev server by address with the world host.)
  const r = await fetch("http://127.0.0.1:3000/api/cron", { method: "POST", headers: { host: "world.localhost:3000", authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron-secret"}` } });
  expect(r.status).toBe(200);
}

test("Somchai links his tag at the counter, signs in to the app, and checks in with his app QR", async ({ browser }) => {
  test.setTimeout(180_000);
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await deskSignIn(desk);

  // At the counter, on his phone: Already a member → name, tag, email.
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await open(phone, `${APP}/join`);
  await phone.getByRole("button", { name: "English" }).click();
  await phone.getByRole("button", { name: /Already a member/ }).click();
  await phone.getByLabel("Your name").fill("Somchai Kittisak");
  await phone.getByLabel("Tag number").fill("004102");
  await phone.getByLabel("Email").fill("somchai.k@gmail.com");
  await phone.getByRole("button", { name: "Link and get the app" }).click();
  await expect(phone.getByRole("heading", { name: "Nearly there" })).toBeVisible();

  // The desk checks it's him and sends the invite.
  const card = desk.locator(".s1-card", { hasText: "Somchai" }).filter({ hasText: "004102" });
  await expect(card).toBeVisible({ timeout: 6000 });
  await card.getByRole("button", { name: "Check and link" }).click();
  await desk.getByRole("button", { name: "It's them · send the app invite" }).click();
  await expect(desk.getByText("Linked. Invite sent to somchai.k@gmail.com.")).toBeVisible();

  await runOutbox();
  let invite = false;
  for (let i = 0; i < 30 && !invite; i++) {
    const r = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:somchai.k@gmail.com")}`)).json()) as { messages: { Subject: string }[] };
    invite = r.messages.some((m) => m.Subject.length > 0);
    if (!invite) await new Promise((res) => setTimeout(res, 500));
  }
  expect(invite).toBe(true);
  await new Promise((res) => setTimeout(res, 3000)); // so the sign-in code is told apart from the invite's

  // He signs in to the app and opens Me: his QR.
  const app = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await open(app, `${APP}/`);
  await signInWithCode(app, "somchai.k@gmail.com");
  await app.getByRole("navigation", { name: "SUPER1" }).getByRole("button", { name: "Me", exact: true }).click();
  const code = await app.getByTestId("member-qr").getAttribute("data-code");
  expect(code).toMatch(/^S1/);

  // The desk scans the QR: he's in.
  await open(desk, `${WORLD}/`);
  await expect(desk.getByRole("heading", { name: "Check-in" })).toBeVisible();
  await desk.keyboard.type(`${code}\n`);
  const ok = desk.getByRole("status").filter({ hasText: "WELCOME IN" });
  await expect(ok).toBeVisible();
  await expect(ok.getByText("Somchai Kittisak")).toBeVisible();
});
