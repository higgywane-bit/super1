/** The coach portal's reads and writes from the browser. RLS and the coach_* functions keep a coach to their own people. */
import type { ProgramBody } from "../lib/coach";
import { supabaseBrowser } from "./supabase";

export type { ProgramBody, ProgramDay, ProgramItem } from "../lib/coach";

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

export type Lang3 = "en" | "th" | "ru";
export type LeadStage = "new" | "contacted" | "trial" | "won" | "not_now";
export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lang: Lang3;
  source: "qr" | "desk" | "manual";
  stage: LeadStage;
  created_at: string;
  note: string | null;
  member_id: string | null;
  trial_at: string | null;
  bought: string | null;
  tag: string | null;
};
export type Card = {
  status: string;
  plan: string | null;
  cover_ends: string | null;
  days_left: number | null;
  pt_left: number | null;
  pt_total: number | null;
  pt_ends_on: string | null;
};
export type Pack = { id: string; plan: string; total: number; used: number; left: number; ends_on: string };
export type Pr = { name: string; kg: number | null; reps: number | null } | null;
export type Client = {
  member_id: string;
  member_no: number;
  name: string;
  lang: Lang3;
  phone: string | null;
  email: string | null;
  since: string | null;
  pt: Pack | null;
  card: Card;
  last_workout: { day_name: string; at: string; sets: number; pr: Pr } | null;
  checkin: { last: string | null; streak: number; days_since?: number };
};
export type CoachHome = {
  coach: { id: string; name: string; full_name: string; email: string | null; photo_path: string | null };
  today: string;
  sessions_month: number;
  leads: Lead[];
  clients: Client[];
};

export type Targets = { goal: "lose" | "maintain" | "build"; protein_g: number; carbs_g: number; fat_g: number; kcal: number; water_l: number | null; steps: number | null; sent_at: string };
export type DailyCheckin = {
  id: string;
  date: string;
  sleep_h: number | null;
  energy: number | null;
  digestion: number | null;
  water_l: number | null;
  steps: number | null;
  weight_kg: number | null;
  note: string | null;
};
export type ClientDetail = {
  member: { id: string; member_no: number; name: string; first_name: string; lang: Lang3; phone: string | null; email: string | null; since: string | null };
  card: Card;
  program: { version: number; sent_at: string; body: ProgramBody } | null;
  workouts: { id: string; day_name: string; started_at: string; finished_at: string | null; sets: number; volume_kg: number; pr: Pr }[];
  last: Record<string, { kg: number | null; reps: number | null; seconds: number | null; pr: boolean; at: string }>;
  targets: Targets | null;
  picks: string[];
  checkins: DailyCheckin[];
  streak: { last: string | null; streak: number; days_since?: number };
  weight_first: { date: string; kg: number } | null;
  notes: { id: string; body: string; at: string }[];
  nudged_today: boolean;
};
export type Exercise = {
  id: string;
  name: string;
  muscle_group: "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core" | "cardio";
  muscle: string;
  equipment: string;
  log_type: "weight_reps" | "reps" | "time";
  default_sets: number;
  default_reps: number | null;
  default_seconds: number | null;
  coach_id: string | null;
  cue: string | null;
  media_path?: string | null;
};
export type CafeItem = { id: string; category_id: string; name_en: string; name_th: string | null; desc_en: string | null; price_thb: number; sort: number };
export type UseResult = { session_id: string; left: number; total: number; ends_on: string };

const num = (v: unknown) => (v == null ? null : Number(v));

export const coach = {
  home: () => rpc<CoachHome>("coach_home"),
  client: async (member: string): Promise<ClientDetail> => {
    const d = await rpc<ClientDetail>("coach_client", { p_member: member });
    d.checkins = d.checkins.map((c) => ({ ...c, sleep_h: num(c.sleep_h), water_l: num(c.water_l), weight_kg: num(c.weight_kg) }));
    if (d.targets) d.targets = { ...d.targets, water_l: num(d.targets.water_l) };
    return d;
  },
  setStage: async (lead: string, stage: LeadStage) => void must(await sb().from("leads").update({ stage }).eq("id", lead)),
  useSession: (member: string, via: "coach_portal") => rpc<UseResult>("use_pt_session", { p_member: member, p_via: via }),
  undo: (session: string) => rpc<{ ok: boolean }>("undo_pt_session", { p_session: session }),
  sendProgram: (member: string, body: ProgramBody) => rpc<{ version: number }>("coach_send_program", { p_member: member, p_body: body }),
  setTargets: (member: string, t: { goal: Targets["goal"]; protein: number; carbs: number; fat: number; water: number; steps: number }) =>
    rpc<{ kcal: number }>("coach_set_targets", { p_member: member, p_goal: t.goal, p_protein: t.protein, p_carbs: t.carbs, p_fat: t.fat, p_water: t.water, p_steps: t.steps }),
  setPicks: (member: string, items: string[]) => rpc<{ picks: string[] }>("coach_set_picks", { p_member: member, p_items: items }),
  nudge: (member: string) => rpc<{ sent: boolean }>("coach_nudge", { p_member: member }),
  addNote: async (member: string, coachId: string, body: string) => void must(await sb().from("coach_notes").insert({ member_id: member, coach_id: coachId, body })),
  exercises: async (): Promise<Exercise[]> =>
    must(
      await sb()
        .from("exercises")
        .select("id, name, muscle_group, muscle, equipment, log_type, default_sets, default_reps, default_seconds, coach_id, cue, media_path")
        .is("archived_at", null)
        .order("name"),
    ) as Exercise[],
  addExercise: async (coachId: string, e: Omit<Exercise, "id" | "coach_id" | "media_path">) => must(await sb().from("exercises").insert({ ...e, coach_id: coachId }).select("id").single()),
  cafe: async (): Promise<CafeItem[]> =>
    must(await sb().from("menu_items").select("id, category_id, name_en, name_th, desc_en, price_thb, sort").is("archived_at", null).eq("in_app", true).eq("is_draft", false).order("sort")) as CafeItem[],
};
