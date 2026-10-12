import { expect, type Page } from "@playwright/test";

export const WORLD = "http://world.localhost:3000";
export const APP = "http://app.localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Go to a page and wait until React has hydrated it (clicks before that are lost). */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator('body[data-hydrated="true"]').waitFor();
}

/** The newest 6-digit code Mailpit caught for this address, after `since`. */
export async function codeFor(email: string, since: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    const body = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const fresh = body.messages.find((m) => Date.parse(m.Created) >= since - 2000);
    if (fresh) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { HTML: string; Text: string };
      const m = (msg.HTML || msg.Text).match(/>\s*(\d{6})\s*</) ?? (msg.Text || "").match(/\b(\d{6})\b/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No code email for ${email}`);
}

/** Email-code sign-in on whatever sign-in screen is showing. */
export async function signInWithCode(page: Page, email: string) {
  const since = Date.now();
  await page.getByLabel(/^(Email|อีเมล|Эл\. почта)$/).fill(email);
  await page.getByRole("button", { name: /code|รหัส|код/i }).first().click();
  const code = await codeFor(email, since);
  await page.getByLabel(/6-digit code|รหัส 6 หลัก|6-значный код/).fill(code);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
