/**
 * Front-desk data. The desk talks to Supabase straight from the browser: every read and write goes
 * through row level security and the rule functions in the database (desk_check_in, desk_sell …),
 * which refuse anything the desk login may not do. Scans stay fast (one round trip, no Worker hop).
 */
import type { Json } from "../server/db.types";
import { kickOutbox } from "../server/outboxFn";
import { supabaseBrowser } from "./supabase";

export type MemberCard = {
  member_id: string;
  member_no: number;
  name: string;
  archived: boolean;
  status: "active" | "expiring" | "paused" | "upcoming" | "expired" | "none";
  plan: string | null;
  cover_ends: string | null;
  days_left: number | null;
  starts_on: string | null;
  ended_on: string | null;
  paused_until: string | null;
  visits_left: number | null;
  pt_left: number | null;
  pt_total: number | null;
  pt_ends_on: string | null;
  pt_coach: string | null;
  visits_this_month: number;
};

export type CheckInResult = {
  allowed: boolean;
  reason: string;
  code?: string;
  duplicate?: boolean;
  consumed_visit?: boolean;
  card?: MemberCard;
};

export type FeedRow = {
  at: string;
  kind: "ok" | "no" | "daypass" | "new" | "sale" | "pt";
  reason: string | null;
  code: string | null;
  by: string | null;
  member_id: string | null;
  name: string | null;
  card: MemberCard | null;
  extra: Record<string, Json> | null;
};
export type Feed = { day: string; checkins: number; last_hour: number; rows: FeedRow[] };

export type MemberRow = {
  id: string;
  member_no: number;
  name: string;
  phone: string | null;
  email: string | null;
  lang: "en" | "th" | "ru";
  archived: boolean;
  archived_at: string | null;
  tag: string | null;
  last_visit: string | null;
  card: MemberCard;
};

export type MembershipRow = {
  id: string;
  plan_id: string;
  plan: string;
  kind: "membership" | "visits" | "pt" | "extra";
  price: number;
  starts_on: string;
  ends_on: string;
  sessions_total: number | null;
  sessions_used: number;
  coach: string | null;
  coach_id: string | null;
  method: string | null;
  sold_by: string | null;
  sold_at: string;
  voided: boolean;
};

export type MemberDetail = {
  member: {
    id: string;
    member_no: number;
    first_name: string;
    last_name: string;
    name: string;
    phone: string | null;
    email: string | null;
    lang: "en" | "th" | "ru";
    created_via: "desk" | "qr" | "import" | "admin";
    created_at: string;
    archived_at: string | null;
    archive_reason: string | null;
    has_login: boolean;
    created_by: string | null;
    merged_members: { id: string; member_no: number }[];
  };
  card: MemberCard;
  memberships: MembershipRow[];
  credentials: { id: string; kind: string; code: string; revoked: boolean }[];
  pauses: { id: string; from: string; until: string; reason: string | null }[];
  history: { at: string; kind: string; message: string; data: Record<string, Json>; by: string | null }[];
  visits: { at: string; day: string; result: "allowed" | "declined"; reason: string | null }[];
  waiver: { signed_at: string; version: number; signature_path: string | null } | null;
  invite: { created_at: string; sent_at: string | null; accepted_at: string | null; email: string } | null;
  open_merge: { id: string; requested_at: string } | null;
  duplicates: { id: string; member_no: number; name: string; created_at: string; archived: boolean; visits: number }[];
  visits_total: number;
};

export type PtClient = { member_id: string; name: string; coach: string; left: number; total: number; ends_on: string };

export type Plan = {
  id: string;
  name: string;
  name_th: string | null;
  kind: "membership" | "visits" | "pt" | "extra";
  audience: "all" | "thai";
  price_thb: number;
  duration_days: number | null;
  duration_months: number | null;
  sessions: number | null;
  sort: number;
};

export type Signup = {
  id: string;
  created_at: string;
  kind: "new" | "link";
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lang: "en" | "th" | "ru";
  coach_id: string | null;
  signature_path: string | null;
  link_tag: string | null;
};

export type Staff = { id: string; name: string };
export type Coach = { id: string; name: string; slug: string };
export type PayMethod = "card" | "cash" | "promptpay" | "transfer" | "comp";

/** After an action that queued an email: send it now instead of at the next cron minute. */
function kick<T>(p: Promise<T>): Promise<T> {
  return p.then((r) => {
    void kickOutbox().catch(() => {});
    return r;
  });
}

function sb() {
  return supabaseBrowser();
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (sb().rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const desk = {
  staff: async (): Promise<Staff[]> => {
    const { data, error } = await sb().from("staff").select("id, name").eq("active", true).is("archived_at", null).order("name");
    if (error) throw error;
    return data;
  },
  coaches: async (): Promise<Coach[]> => {
    const { data, error } = await sb().from("coaches").select("id, name, slug").eq("active", true).is("archived_at", null).order("name");
    if (error) throw error;
    return data;
  },
  plans: async (): Promise<Plan[]> => {
    const { data, error } = await sb()
      .from("plans")
      .select("id, name, name_th, kind, audience, price_thb, duration_days, duration_months, sessions, sort")
      .eq("on_desk", true)
      .is("archived_at", null)
      .order("sort");
    if (error) throw error;
    return data as Plan[];
  },
  registerDevice: async (label: string): Promise<string> => {
    const { data, error } = await sb().from("desk_devices").insert({ label }).select("id").single();
    if (error) throw error;
    return data.id;
  },
  startShift: (device: string | null, staff: string) => rpc<string>("desk_start_shift", { p_device: device, p_staff: staff }),
  checkIn: (code: string, device: string | null) => rpc<CheckInResult>("desk_check_in", { p_code: code, p_device: device, p_method: "scan", p_staff: null }),
  checkInMember: (member: string, device: string | null, staff: string) => rpc<CheckInResult>("desk_check_in_member", { p_member: member, p_device: device, p_staff: staff }),
  feed: (day?: string) => rpc<Feed>("desk_feed", day ? { p_day: day } : {}),
  members: (q: string, filter: string) => rpc<MemberRow[]>("desk_members", { p_q: q, p_filter: filter }),
  detail: (member: string) => rpc<MemberDetail>("desk_member_detail", { p_member: member }),
  ptClients: (q: string) => rpc<PtClient[]>("desk_pt_clients", { p_q: q }),
  waiting: async (): Promise<Signup[]> => {
    const { data, error } = await sb()
      .from("signups")
      .select("id, created_at, kind, first_name, last_name, phone, email, lang, coach_id, signature_path, link_tag")
      .eq("status", "waiting")
      .order("created_at");
    if (error) throw error;
    return data as Signup[];
  },
  sell: (member: string, plan: string, method: PayMethod, staff: string, coach: string | null) =>
    rpc<{ membership_id: string; sale_id: string; starts_on: string; ends_on: string; queued: boolean }>("desk_sell", {
      p_member: member,
      p_plan: plan,
      p_method: method,
      p_staff: staff,
      p_coach: coach,
    }),
  dayPass: (method: PayMethod, staff: string, qty: number) => rpc<{ sale_id: string; qty: number; total: number }>("desk_day_pass", { p_method: method, p_staff: staff, p_qty: qty }),
  completeSignup: (signup: string, tag: string, plan: string, method: PayMethod, staff: string) =>
    kick(rpc<{ member_id: string; sale: { starts_on: string; ends_on: string } }>("desk_complete_signup", { p_signup: signup, p_tag: tag, p_plan: plan, p_method: method, p_staff: staff })),
  completeLink: (signup: string, staff: string, useEmail: boolean) => kick(rpc<{ member_id: string; email: string | null }>("desk_complete_link", { p_signup: signup, p_staff: staff, p_use_email: useEmail })),
  useSession: (member: string, staff: string) => rpc<{ session_id: string; left: number; total: number; ends_on: string }>("use_pt_session", { p_member: member, p_via: "desk", p_staff: staff }),
  undoSession: (session: string, staff: string) => rpc<{ ok: boolean }>("undo_pt_session", { p_session: session, p_staff: staff }),
  pause: (member: string, from: string, until: string, staff: string, reason: string | null) => rpc<string>("pause_member", { p_member: member, p_from: from, p_until: until, p_staff: staff, p_reason: reason }),
  endPause: (pause: string, resumeOn: string, staff: string) => rpc<{ changed: boolean; days_given_back: number }>("end_pause", { p_pause: pause, p_resume_on: resumeOn, p_staff: staff }),
  archive: (member: string, staff: string, reason: string | null) => rpc<void>("archive_member", { p_member: member, p_staff: staff, p_reason: reason }),
  restore: (member: string, staff: string) => rpc<void>("restore_member", { p_member: member, p_staff: staff }),
  requestMerge: (keep: string, duplicate: string, staff: string, note: string | null) => kick(rpc<string>("request_merge", { p_keep: keep, p_duplicate: duplicate, p_staff: staff, p_note: note })),
  addTag: (member: string, tag: string, staff: string) => rpc<{ code: string }>("desk_add_tag", { p_member: member, p_tag: tag, p_staff: staff }),
  messagePete: (body: string, staff: string) => kick(rpc<string>("desk_message_pete", { p_body: body, p_staff: staff })),
  messages: async () => {
    const { data, error } = await sb().from("messages").select("id, created_at, from_side, body, staff_id, read_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  },
  memberByTag: async (tag: string) => {
    const { data, error } = await sb().from("credentials").select("member_id, members!inner(id, root_id, member_no, first_name, last_name, email)").eq("code", tag).is("revoked_at", null).maybeSingle();
    if (error) throw error;
    return data;
  },
  signatureUrl: async (path: string): Promise<string | null> => {
    const key = path.replace(/^signatures\//, "");
    const { data } = await sb().storage.from("signatures").createSignedUrl(key, 300);
    return data?.signedUrl ?? null;
  },
};
