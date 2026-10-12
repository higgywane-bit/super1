import { env } from "./env";

export type Email = { to: string; subject: string; html: string; text: string; idempotencyKey: string };

/**
 * Send one email. Production: Resend (with an idempotency key, so a retry after a crash never sends
 * twice). Local development: Mailpit's send API (MAILPIT_URL), so the demos can read the invite.
 */
export async function sendEmail(m: Email): Promise<void> {
  const e = env();
  const from = e.EMAIL_FROM || "SUPER1 <hello@super1.app>";
  if (e.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": m.idempotencyKey },
      body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return;
  }
  if (e.MAILPIT_URL) {
    const [, name = "SUPER1", addr = "hello@super1.app"] = from.match(/^(.*?)\s*<(.+)>$/) ?? [];
    const r = await fetch(`${e.MAILPIT_URL.replace(/\/$/, "")}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ From: { Email: addr, Name: name }, To: [{ Email: m.to }], Subject: m.subject, HTML: m.html, Text: m.text, Headers: { "X-Idempotency-Key": m.idempotencyKey } }),
    });
    if (!r.ok) throw new Error(`Mailpit ${r.status}`);
    return;
  }
  throw new Error("No email provider configured (RESEND_API_KEY).");
}
