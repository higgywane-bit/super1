import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { env } from "./env";
import type { JoinResult, SignupValues } from "./join";
import { supabaseAdmin } from "./supabase";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function turnstileOk(token: string | null, ip: string): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured (local development)
  if (!token) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const j = (await r.json()) as { success?: boolean };
  return !!j.success;
}

function pngBytes(dataUrl: string): Uint8Array | null {
  const m = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bin = atob(m[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  // PNG signature
  return out[0] === 0x89 && out[1] === 0x50 && out[2] === 0x4e && out[3] === 0x47 ? out : null;
}

export async function handleSignup(v: SignupValues): Promise<JoinResult> {
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "unknown";
    if (!(await turnstileOk(v.turnstileToken, ip))) return { ok: false, error: "bot" };

    const admin = supabaseAdmin();
    const { data: allowed, error: rlErr } = await admin.rpc("join_attempt_ok", { p_ip_hash: await sha256(`super1:${ip}`), p_max: 5, p_window_minutes: 10 });
    if (rlErr) return { ok: false, error: "failed" };
    if (!allowed) return { ok: false, error: "too-many" };

    let signaturePath: string | null = null;
    if (v.kind === "new") {
      const png = v.signature ? pngBytes(v.signature) : null;
      if (!png) return { ok: false, error: "invalid" };
      const key = `${crypto.randomUUID()}.png`;
      const { error: upErr } = await admin.storage.from("signatures").upload(key, png, { contentType: "image/png", upsert: false });
      if (upErr) return { ok: false, error: "failed" };
      signaturePath = `signatures/${key}`;
    }

    const { data: r, error } = await admin.rpc("create_signup", {
      p: {
        kind: v.kind,
        first_name: v.firstName,
        last_name: v.lastName,
        phone: v.phone || null,
        email: v.email || null,
        lang: v.lang,
        coach_id: v.kind === "new" ? v.coachId : null,
        agreed: v.agreed,
        signature_path: signaturePath,
        link_tag: v.linkTag || null,
      },
    });
    if (error || !r) return { ok: false, error: "invalid" };
    const res = r as { id: string; first_name: string; coach: string | null };
    return { ok: true, id: res.id, firstName: res.first_name, coach: res.coach };
}
