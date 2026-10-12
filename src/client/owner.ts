/** Andy's (and Pete's dashboard) reads. Read-only under RLS: an owner login can't write any of these. */
import { supabaseBrowser } from "./supabase";

export type QDay = {
  id: string;
  business_date: string;
  version: number;
  total_sales: number;
  net_sales: number;
  vat: number;
  cost: number;
  transactions: number;
  imported_at: string;
  checks: { id: string; ok: boolean; detail: string }[];
  raw: { meta?: { imported_by_name?: string } };
};
export type QLine = { section: "category" | "product" | "modifier" | "tab" | "staff" | "payment"; name: string; category: string | null; qty: number; till: number };
export type Visits = { day: string; members: number; day_passes: number; declined: number; members_yesterday: number; last_hour: number; last_30: number; day_pass_sales: number; app_orders: number };
export type WeekDay = { day: string; imported: boolean; total: number | null; transactions: number | null; members: number; day_passes: number; new_members: number };
export type MembersSummary = {
  active: number;
  expiring: number;
  paused: number;
  new_month: number;
  by_plan: { plan: string; n: number }[];
  ending: { id: string; name: string; plan: string; ends_on: string; days_left: number }[];
  pt_active: number;
  pt_sessions_month: number;
  pt_by_coach: { coach: string; sessions: number }[];
};

const sb = () => supabaseBrowser();
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (sb().rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const owner = {
  /** The latest imported day on or before `day` (today, or the last import). */
  latestDay: async (day: string): Promise<QDay | null> => {
    const { data, error } = await sb()
      .from("qashier_days")
      .select("id, business_date, version, total_sales, net_sales, vat, cost, transactions, imported_at, checks, raw->meta")
      .lte("business_date", day)
      .order("business_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Omit<QDay, "raw"> & { meta: QDay["raw"]["meta"] };
    return { ...d, total_sales: Number(d.total_sales), net_sales: Number(d.net_sales), vat: Number(d.vat), cost: Number(d.cost), raw: { meta: d.meta } };
  },
  importedDays: async (): Promise<{ business_date: string; version: number }[]> => {
    const { data, error } = await sb().from("qashier_days").select("business_date, version").order("business_date", { ascending: false }).limit(14);
    if (error) throw error;
    return data as { business_date: string; version: number }[];
  },
  lines: async (importId: string): Promise<QLine[]> => {
    const { data, error } = await sb().from("qashier_lines").select("section, name, category, qty, till").eq("import_id", importId).limit(2000);
    if (error) throw error;
    return (data ?? []).map((l) => ({ ...l, qty: Number(l.qty), till: Number(l.till) })) as QLine[];
  },
  visits: (day: string) => rpc<Visits>("owner_visits", { p_day: day }),
  week: (end: string) => rpc<WeekDay[]>("owner_week", { p_end: end }),
  members: (day: string) => rpc<MembersSummary>("owner_members", { p_day: day }),
  deskSales: async (day: string) => {
    const { data, error } = await sb().from("sales").select("plan_id, qty, price_thb").eq("business_date", day).neq("source", "import");
    if (error) throw error;
    return data;
  },
  plans: async () => {
    const { data, error } = await sb().from("plans").select("id, name, name_th, kind, qashier_product, qashier_modifier, price_thb");
    if (error) throw error;
    return data;
  },
  staff: async () => {
    const { data, error } = await sb().from("staff").select("id, name, qashier_name, active, archived_at").order("name");
    if (error) throw error;
    return data;
  },
};
