/** Pete's reads and writes from the browser. Every write is admin-only under RLS or in a checked function. */
import { supabaseBrowser } from "./supabase";

const sb = () => supabaseBrowser();
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (sb().rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export type MemberBrief = { id: string; member_no: number; name: string; phone: string | null; email: string | null; created_at: string; created_via: string; visits: number; tags: string[]; plans: { plan: string; starts_on: string; ends_on: string }[]; has_login: boolean };
export type MergeRequest = { id: string; requested_at: string; note: string | null; by: string | null; keep: MemberBrief; duplicate: MemberBrief };
export type Message = { id: string; created_at: string; from_side: "desk" | "admin"; body: string; staff_id: string | null; read_at: string | null };

export type AdminPlan = {
  id: string;
  name: string;
  name_th: string | null;
  kind: "membership" | "visits" | "pt" | "extra";
  audience: "all" | "thai";
  price_thb: number;
  duration_days: number | null;
  duration_months: number | null;
  sessions: number | null;
  on_desk: boolean;
  sort: number;
  qashier_product: string | null;
  qashier_modifier: string | null;
  archived_at: string | null;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name_en: string;
  name_th: string | null;
  name_ru: string | null;
  desc_en: string | null;
  desc_th: string | null;
  desc_ru: string | null;
  price_thb: number;
  photo_path: string | null;
  in_app: boolean;
  is_draft: boolean;
  qashier_products: string[];
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  macros_verified_at: string | null;
  sort: number;
  archived_at: string | null;
};
export type MenuCategory = { id: string; name_en: string; name_th: string | null; name_ru: string | null; sort: number; andy_group: string; qashier_categories: string[] };
export type OptionGroup = { id: string; label_en: string; label_th: string | null; category_ids: string[]; item_ids: string[]; max_choices: number | null; sort: number };
export type MenuOption = { id: string; group_id: string; label_en: string; label_th: string | null; price_thb: number; sort: number };

export const admin = {
  mergeRequests: () => rpc<MergeRequest[]>("admin_merge_requests"),
  merge: (id: string) => rpc<{ kept: string; duplicate: string }>("merge_members", { p_request: id }),
  reject: (id: string) => rpc<void>("reject_merge", { p_request: id, p_note: null }),
  messages: async (): Promise<Message[]> => must(await sb().from("messages").select("id, created_at, from_side, body, staff_id, read_at").order("created_at", { ascending: false }).limit(60)) as Message[],
  reply: async (body: string, userId: string) => {
    must(await sb().from("messages").insert({ from_side: "admin", body, user_id: userId }));
    must(await sb().from("messages").update({ read_at: new Date().toISOString() }).eq("from_side", "desk").is("read_at", null));
  },
  markRead: async () => void must(await sb().from("messages").update({ read_at: new Date().toISOString() }).eq("from_side", "desk").is("read_at", null)),
  staff: async () => must(await sb().from("staff").select("id, name, qashier_name, active, archived_at, created_at").order("name")),
  addStaff: async (name: string) => void must(await sb().from("staff").insert({ name })),
  setStaff: async (id: string, patch: { qashier_name?: string | null; archived_at?: string | null; active?: boolean }) => void must(await sb().from("staff").update(patch).eq("id", id)),
  coaches: async () =>
    must(await sb().from("coaches").select("id, slug, name, full_name, email, photo_path, on_qr, portal, qashier_product, active, user_id, archived_at").order("name")),
  setCoach: async (id: string, patch: { on_qr?: boolean }) => void must(await sb().from("coaches").update(patch).eq("id", id)),
  ptPacks: async (day: string) =>
    must(await sb().from("memberships").select("coach_id, member_id").eq("kind", "pt").is("voided_at", null).lte("starts_on", day).gte("ends_on", day)) as { coach_id: string; member_id: string }[],
  plans: async (): Promise<AdminPlan[]> =>
    must(await sb().from("plans").select("id, name, name_th, kind, audience, price_thb, duration_days, duration_months, sessions, on_desk, sort, qashier_product, qashier_modifier, archived_at").order("sort")) as AdminPlan[],
  setPrice: (plan: string, price: number) => rpc<{ changed: boolean }>("admin_set_plan_price", { p_plan: plan, p_price: price }),
  setOnDesk: async (plan: string, on: boolean) => void must(await sb().from("plans").update({ on_desk: on }).eq("id", plan)),
  menu: async () => {
    const [items, cats, groups, options] = await Promise.all([
      sb().from("menu_items").select("*").is("archived_at", null).order("sort"),
      sb().from("menu_categories").select("*").order("sort"),
      sb().from("menu_option_groups").select("*").order("sort"),
      sb().from("menu_options").select("id, group_id, label_en, label_th, price_thb, sort").is("archived_at", null).order("sort"),
    ]);
    return { items: must(items) as MenuItem[], cats: must(cats) as MenuCategory[], groups: must(groups) as OptionGroup[], options: must(options) as MenuOption[] };
  },
  saveItem: async (id: string, patch: Partial<MenuItem>) => void must(await sb().from("menu_items").update(patch).eq("id", id)),
  addDrafts: async (rows: { id: string; category_id: string; name_en: string; price_thb: number; qashier_products: string[] }[]) =>
    void must(await sb().from("menu_items").upsert(rows.map((r) => ({ ...r, is_draft: true, in_app: false, sort: 999 })), { onConflict: "id", ignoreDuplicates: true })),
  uploadMenuPhoto: async (file: File, id: string): Promise<string> => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `${id}-${Date.now()}.${ext}`;
    const { error } = await sb().storage.from("menu").upload(key, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    return `menu/${key}`;
  },
  devices: async () => must(await sb().from("desk_devices").select("id, label, created_at, last_seen_at, signed_out_at").order("created_at", { ascending: false })),
  signOutDevice: (id: string | null) => rpc<number>("admin_sign_out_devices", { p_device: id }),
  waiver: async () => must(await sb().from("waiver_versions").select("id, version, texts, published_at").order("version", { ascending: false }).limit(1).maybeSingle()),
  publishWaiver: async (version: number, texts: Record<string, string[]>, userId: string) => void must(await sb().from("waiver_versions").insert({ version, texts, published_by: userId })),
  setting: async (key: string): Promise<Record<string, unknown> | undefined> => {
    const row = must(await sb().from("settings").select("value").eq("key", key).maybeSingle()) as { value: Record<string, unknown> } | null;
    return row?.value;
  },
  saveSetting: async (key: string, value: Record<string, unknown>, userId: string) =>
    void must(await sb().from("settings").upsert({ key, value: value as never, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "key" })),
};

/** Public URL of a storage path like "menu/strong-vibes.png". */
export function publicUrl(supabaseUrl: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${path}`;
}
