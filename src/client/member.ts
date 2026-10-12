/** The member app's reads and writes. Everything is the member's own (RLS + member_* functions). */
import type { ProgramBody } from "../lib/coach";
import type { Last } from "../lib/workout";
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

export type MemberProgram = { program_id: string; coach: string | null; own: boolean; version_id: string; version: number; sent_at: string; body: ProgramBody };
export type MemberHome = {
  today: string;
  member: { id: string; member_no: number; first_name: string; name: string; lang: "en" | "th" | "ru"; email: string | null };
  card: { status: string; plan: string | null; cover_ends: string | null; days_left: number | null; visits_left: number | null; visits_this_month: number; paused_until: string | null; starts_on: string | null };
  pt: { total: number; used: number; left: number; ends_on: string; plan: string; coach: string } | null;
  tag: string | null;
  programs: MemberProgram[];
  targets: { goal: string; protein_g: number; carbs_g: number; fat_g: number; kcal: number; water_l: number | null; steps: number | null; sent_at: string; coach: string } | null;
  picks: { item_id: string; coach: string }[];
  note: { body: string; at: string; coach: string } | null;
  checkin: { date: string; sleep_h: number | null; energy: number | null; digestion: number | null; water_l: number | null; steps: number | null; weight_kg: number | null; note: string | null } | null;
  streak: { last: string | null; streak: number; days_since?: number };
  last_workout: { day_name: string; at: string; program_version_id: string | null } | null;
  last: Last;
};
export type Progress = {
  bests: { name: string; kg: number; reps: number; at: string }[];
  series: Record<string, { at: string; kg: number }[]>;
  recent: { id: string; day_name: string; started_at: string; finished_at: string | null; sets: number; volume_kg: number; prs: number }[];
};
export type SavedWorkout = { id: string; prs: { name: string; kg: number; reps: number; prev?: number }[]; sets: number; volume_kg: number; already?: boolean };
export type PendingWorkout = { id: string; day_name: string; started_at: string; finished_at: string; program_version_id: string | null; note: string | null; sets: { exercise_id: string | null; name: string; kg: number | null; reps: number | null; seconds: number | null }[] };
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
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  macros_verified_at: string | null;
  sort: number;
};
export type MenuCategory = { id: string; name_en: string; name_th: string | null; name_ru: string | null; sort: number };
export type OptionGroup = { id: string; label_en: string; label_th: string | null; label_ru: string | null; category_ids: string[]; item_ids: string[]; max_choices: number | null; sort: number };
export type MenuOption = { id: string; group_id: string; label_en: string; label_th: string | null; price_thb: number; sort: number };
export type CartLine = { item_id: string; qty: number; options: string[] };
export type Order = { id: string; total: number; items: { item_id: string; name: string; name_th: string | null; qty: number; unit: number; options: { id: string; label: string; price: number }[] }[] };

export const member = {
  link: () => rpc<{ member_id: string | null; linked?: boolean }>("member_link_me"),
  home: async (): Promise<MemberHome> => {
    const h = await rpc<MemberHome>("member_home");
    const n = (v: unknown) => (v == null ? null : Number(v));
    if (h.checkin) h.checkin = { ...h.checkin, sleep_h: n(h.checkin.sleep_h), water_l: n(h.checkin.water_l), weight_kg: n(h.checkin.weight_kg) };
    if (h.targets) h.targets = { ...h.targets, water_l: n(h.targets.water_l) };
    return h;
  },
  qr: () => rpc<string>("member_qr"),
  progress: () => rpc<Progress>("member_progress"),
  saveWorkout: (w: PendingWorkout) =>
    rpc<SavedWorkout>("member_save_workout", { p_id: w.id, p_day_name: w.day_name, p_started: w.started_at, p_finished: w.finished_at, p_sets: w.sets, p_program_version: w.program_version_id, p_note: w.note }),
  checkin: (date: string, v: { sleep: number; energy: number; digestion: number; water: number; steps: number; weight: number | null; note: string | null }) =>
    rpc<{ streak: number }>("member_checkin", { p_date: date, p_sleep: v.sleep, p_energy: v.energy, p_digestion: v.digestion, p_water: v.water, p_steps: v.steps, p_weight: v.weight, p_note: v.note }),
  order: (lines: CartLine[]) => rpc<Order>("member_cafe_order", { p_items: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, options: l.options })) }),
  unlink: () => rpc<{ member_id: string }>("member_unlink_me"),
  menu: async () => {
    const [items, cats, groups, options] = await Promise.all([
      sb().from("menu_items").select("id, category_id, name_en, name_th, name_ru, desc_en, desc_th, desc_ru, price_thb, photo_path, kcal, protein_g, carbs_g, fat_g, macros_verified_at, sort").is("archived_at", null).eq("in_app", true).eq("is_draft", false).order("sort"),
      sb().from("menu_categories").select("id, name_en, name_th, name_ru, sort").order("sort"),
      sb().from("menu_option_groups").select("id, label_en, label_th, label_ru, category_ids, item_ids, max_choices, sort").order("sort"),
      sb().from("menu_options").select("id, group_id, label_en, label_th, price_thb, sort").is("archived_at", null).order("sort"),
    ]);
    return { items: must(items) as MenuItem[], cats: must(cats) as MenuCategory[], groups: must(groups) as OptionGroup[], options: must(options) as MenuOption[] };
  },
};

/** Finished workouts not yet saved (offline): kept on the phone until the server has them. */
const QUEUE = "s1_workout_queue";
export function queuedWorkouts(): PendingWorkout[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) ?? "[]") as PendingWorkout[];
  } catch {
    return [];
  }
}
function writeQueue(q: PendingWorkout[]) {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q));
  } catch {
    /* no storage */
  }
}
export function queueWorkout(w: PendingWorkout) {
  writeQueue([...queuedWorkouts().filter((x) => x.id !== w.id), w]);
}
/** Send every queued workout; each is idempotent on its id, so a retry never doubles it. */
export async function flushWorkouts(): Promise<SavedWorkout[]> {
  const out: SavedWorkout[] = [];
  for (const w of queuedWorkouts()) {
    try {
      out.push(await member.saveWorkout(w));
      writeQueue(queuedWorkouts().filter((x) => x.id !== w.id));
    } catch {
      break; // still offline: keep the rest for later
    }
  }
  return out;
}
