import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { diffDays, localDate } from "../src/lib/dates";
import { APP, open, signInWithCode, WORLD } from "./helpers";

// Phase 5 demo (prompts/phase-5-member-app.md). Needs a fresh local database with the demo people:
//   npm run e2e:fresh   (db reset + scripts/demo-setup.sh + the suite)

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
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

test("Emma opens her invite, trains Day A with a PR, checks in, her QR scans her in, and Sunman sees it", async ({ browser }) => {
  test.setTimeout(180_000);

  // Her invite goes out from the outbox.
  // (Node can't resolve *.localhost, so call the dev server by address with the world host.)
  const cron = await fetch("http://127.0.0.1:3000/api/cron", { method: "POST", headers: { host: "world.localhost:3000", authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron-secret"}` } });
  expect(cron.status).toBe(200);
  let invite = false;
  for (let i = 0; i < 30 && !invite; i++) {
    const r = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:emma.wilson@gmail.com")}`)).json()) as { messages: { Subject: string }[] };
    invite = r.messages.some((m) => m.Subject.includes("SUPER1"));
    if (!invite) await new Promise((res) => setTimeout(res, 500));
  }
  expect(invite).toBe(true);
  await new Promise((res) => setTimeout(res, 3000)); // so the sign-in code below is told apart from the invite's

  // She signs in on her phone: days left on 1 Month and 6 PT sessions.
  const emma = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await open(emma, `${APP}/`);
  await signInWithCode(emma, "emma.wilson@gmail.com");
  await expect(emma.getByTestId("days-left")).toContainText(String(diffDays(localDate(), "2026-10-31")));
  // 6 on a fresh database (the phase 4 demo, when run first, has already used one).
  const sql = postgres(process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 1 });
  const [pack] = await sql`select sessions_total - sessions_used as left from public.memberships where member_id = ${EMMA} and kind = 'pt'`;
  await sql.end();
  await expect(emma.getByTestId("pt-left")).toContainText(String(pack.left));

  // Daily check-in.
  await emma.getByRole("button", { name: /Daily check-in/ }).click();
  await emma.getByRole("button", { name: "Complete" }).click();
  await expect(emma.getByText(/Checked in/).first()).toBeVisible();

  // Day A · Push: one more plate on the bench → a PR.
  await emma.getByRole("navigation", { name: "SUPER1" }).getByRole("button", { name: "Train", exact: true }).click();
  await emma.getByRole("button", { name: /^Day A · Push/ }).click();
  await expect(emma.getByTestId("live-exercise")).toHaveText("Barbell bench press");
  await emma.getByRole("button", { name: "More kg" }).first().click();
  await emma.getByRole("button", { name: "Set 1 done" }).click();
  await emma.getByRole("button", { name: "Skip" }).click();
  for (let i = 0; i < 4; i++) await emma.getByRole("button", { name: "Next exercise" }).click();
  await emma.getByRole("button", { name: "Finish workout" }).click();
  await expect(emma.getByTestId("workout-done")).toBeVisible();
  await expect(emma.getByTestId("pr-badge")).toContainText("+2.5 kg");

  // Her member QR scans her in at the desk.
  await emma.getByRole("button", { name: "Done" }).click();
  await emma.getByRole("navigation", { name: "SUPER1" }).getByRole("button", { name: "Me", exact: true }).click();
  const code = await emma.getByTestId("member-qr").getAttribute("data-code");
  expect(code).toMatch(/^S1/);
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await deskSignIn(desk);
  await desk.keyboard.type(`${code}\n`);
  const ok = desk.getByRole("status").filter({ hasText: "WELCOME IN" });
  await expect(ok).toBeVisible();
  await expect(ok.getByText("Emma Wilson")).toBeVisible();

  // Sunman sees today's workout and check-in.
  const sunman = await (await browser.newContext({ viewport: { width: 1440, height: 940 } })).newPage();
  await open(sunman, `${APP}/coach`);
  await signInWithCode(sunman, "sunman@superfitphuket.com");
  await expect(sunman.getByTestId("client-card").filter({ hasText: "Emma Wilson" })).toContainText("Trained today");
  await open(sunman, `${APP}/coach/clients/${EMMA}?tab=checkins`);
  await expect(sunman.getByTestId("checkins-table").locator("div").first()).not.toContainText("No check-in");
});
