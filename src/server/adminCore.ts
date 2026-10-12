import type { LoginRow } from "./admin";
import { inviteLoginWith } from "./logins";
import { supabaseAdmin, supabaseServer } from "./supabase";

export async function assertAdmin() {
  const sb = supabaseServer();
  const { data: ok } = await sb.rpc("is_admin");
  if (!ok) throw new Error("Only Pete can do this.");
  return sb;
}

export async function listLogins(): Promise<LoginRow[]> {
  const db = supabaseAdmin();
  const { data: profiles } = await db.from("profiles").select("id, email, role, display_name, lang, created_at");
  const seen = new Map<string, string | null>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) seen.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < 200) break;
  }
  return (profiles ?? [])
    .filter((p) => p.role !== "member")
    .map((p) => ({ id: p.id, email: p.email, role: p.role, name: p.display_name, lang: p.lang, last_sign_in_at: seen.get(p.id) ?? null, created_at: p.created_at }))
    .sort((a, b) => (a.role ?? "").localeCompare(b.role ?? "") || (a.email ?? "").localeCompare(b.email ?? ""));
}

/**
 * New desk passcode: set it on every desk login, then sign out every desk device (each device checks
 * desk_device_ok and signs itself out; tokens expire within the hour).
 */
export async function changeDeskPasscode(passcode: string) {
  const db = supabaseAdmin();
  const { data: desks } = await db.from("profiles").select("id").eq("role", "desk");
  for (const d of desks ?? []) {
    const { error } = await db.auth.admin.updateUserById(d.id, { password: passcode });
    if (error) throw new Error(error.message);
  }
  const { data: n, error } = await supabaseServer().rpc("admin_sign_out_devices", { p_device: null as unknown as string });
  if (error) throw new Error(error.message);
  return { logins: desks?.length ?? 0, devices: n ?? 0 };
}

/** Give a coach a portal login (role coach, linked to the coaches row) and email them a sign-in code. */
export async function inviteCoach(coachId: string, email: string, lang: "en" | "th" | "ru") {
  const db = supabaseAdmin();
  const { data: c } = await db.from("coaches").select("name, full_name").eq("id", coachId).single();
  if (!c) throw new Error("Unknown coach");
  const r = await inviteLoginWith(db, { email, role: "coach", name: c.full_name || c.name, lang, coachId });
  await db.from("coaches").update({ email }).eq("id", coachId);
  await db.from("outbox").insert({ kind: "coach_invite", payload: { coach_id: coachId, email, lang } });
  const { runOutbox } = await import("./outbox");
  await runOutbox().catch(() => undefined);
  return r;
}
