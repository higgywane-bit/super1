import { env } from "./env";
import { supabaseAdmin } from "./supabase";

/**
 * Push to the member's phones through Firebase Cloud Messaging (HTTP v1), which reaches both the iOS and
 * the Android shell. Needs FCM_SERVICE_ACCOUNT; without it pushes are skipped (email still goes out).
 * A token FCM says is gone is revoked, never deleted.
 */
type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let cached: { token: string; until: number } | null = null;

const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.until > now + 60) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: now + j.expires_in };
  return j.access_token;
}

/** Send a notification to every live token of the login linked to this member. Returns how many went out. */
export async function pushToMember(memberId: string, title: string, body: string, link = "/"): Promise<number> {
  const raw = env().FCM_SERVICE_ACCOUNT;
  if (!raw) return 0;
  const sa = JSON.parse(raw) as ServiceAccount;
  const db = supabaseAdmin();
  const { data: m } = await db.from("members").select("user_id").eq("id", memberId).maybeSingle();
  if (!m?.user_id) return 0;
  const { data: tokens } = await db.from("push_tokens").select("id, token").eq("user_id", m.user_id).is("revoked_at", null);
  if (!tokens?.length) return 0;
  const auth = await accessToken(sa);
  let sent = 0;
  for (const t of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: { link }, apns: { payload: { aps: { sound: "default" } } } } }),
    });
    if (res.ok) sent++;
    else if (res.status === 404 || res.status === 400) await db.from("push_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", t.id);
  }
  return sent;
}
