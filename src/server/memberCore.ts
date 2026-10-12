import { supabaseAdmin, supabaseServer } from "./supabase";

export async function removeMyLogin(): Promise<{ ok: true }> {
  const sb = supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("Not signed in.");
  const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (prof?.role !== "member") throw new Error("Only a member can remove their own app login.");
  const { error } = await sb.rpc("member_unlink_me");
  if (error) throw new Error(error.message);
  // Close the login: banned, and the email released so the gym can invite them again later.
  const admin = supabaseAdmin();
  const { error: e2 } = await admin.auth.admin.updateUserById(u.user.id, { email: `removed+${u.user.id}@super1.invalid`, ban_duration: "876000h" });
  if (e2) throw new Error(e2.message);
  await admin.from("profiles").update({ email: null }).eq("id", u.user.id);
  await sb.auth.signOut();
  return { ok: true };
}
