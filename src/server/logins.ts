import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ROLES, type Role } from "./roles";
import { supabaseAdmin, supabaseServer, type DB } from "./supabase";

const InviteInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(ROLES as [Role, ...Role[]]),
  name: z.string().trim().max(80).default(""),
  lang: z.enum(["en", "th", "ru"]).default("en"),
  /** For role coach: link the login to this coach (coaches.user_id). */
  coachId: z.string().uuid().optional(),
});
export type InviteLoginInput = z.input<typeof InviteInput>;

async function findUserId(admin: DB, email: string): Promise<string | null> {
  const { data: p } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (p?.id) return p.id;
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Create (or re-role) a login. Admin only. Logins exist only by invite (sign-ups are off in
 * Supabase Auth); the person then signs in with an email code. Returns the auth user id.
 */
export async function inviteLoginWith(admin: DB, input: InviteLoginInput): Promise<{ userId: string; created: boolean }> {
  const v = InviteInput.parse(input);
  let userId = await findUserId(admin, v.email);
  let created = false;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email: v.email, email_confirm: true, user_metadata: { lang: v.lang } });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create the login");
    userId = data.user.id;
    created = true;
  }
  const { error: pe } = await admin
    .from("profiles")
    .upsert({ id: userId, role: v.role, email: v.email, display_name: v.name, lang: v.lang }, { onConflict: "id" });
  if (pe) throw new Error(pe.message);
  if (v.role === "coach" && v.coachId) {
    const { error: ce } = await admin.from("coaches").update({ user_id: userId, portal: "invited" }).eq("id", v.coachId);
    if (ce) throw new Error(ce.message);
  }
  return { userId, created };
}

/** Admin-only server function: invite a login with a role. */
export const inviteLogin = createServerFn({ method: "POST" })
  .validator((d: InviteLoginInput) => InviteInput.parse(d))
  .handler(async ({ data }) => {
    const sb = supabaseServer();
    const { data: isAdmin, error } = await sb.rpc("is_admin");
    if (error || !isAdmin) throw new Error("Only Pete can add logins.");
    return inviteLoginWith(supabaseAdmin(), data);
  });
