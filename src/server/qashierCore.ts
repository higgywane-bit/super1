import { andyGroup, parseQashierReport, summarizeQashier, type QashierDay } from "../lib/qashier/parse";
import { reconcile, type ReconPlan } from "../lib/qashier/reconcile";
import type { Json } from "./db.types";
import type { QashierImportResult, QashierPreview } from "./qashierTypes";
import { supabaseAdmin, supabaseServer } from "./supabase";

export async function assertAdmin(): Promise<{ id: string; name: string }> {
  const sb = supabaseServer();
  const { data: u } = await sb.auth.getUser();
  const { data: ok } = await sb.rpc("is_admin");
  if (!u.user || !ok) throw new Error("Only Pete can import Qashier reports.");
  const { data: p } = await sb.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
  return { id: u.user.id, name: p?.display_name || "Pete" };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parse(text: string): QashierDay {
  return summarizeQashier(parseQashierReport(text));
}

export async function preview(files: { name: string; text: string }[]): Promise<QashierPreview[]> {
  const db = supabaseAdmin();
  const [{ data: plans }, { data: menu }, { data: staff }] = await Promise.all([
    db.from("plans").select("id, name, kind, qashier_product, qashier_modifier"),
    db.from("menu_items").select("qashier_products"),
    db.from("staff").select("name, qashier_name"),
  ]);
  const inMenu = new Set((menu ?? []).flatMap((m) => m.qashier_products.map((p) => p.trim())));
  const known = new Set((staff ?? []).map((s) => s.qashier_name?.trim()).filter(Boolean));
  const out: QashierPreview[] = [];
  for (const f of files) {
    try {
      const day = parse(f.text);
      const sha = await sha256(f.text);
      const { data: same } = await db.from("qashier_imports").select("id").eq("file_sha256", sha).limit(1);
      const { data: current } = await db.from("qashier_imports").select("version").eq("business_date", day.businessDate).is("superseded_at", null).maybeSingle();
      const { data: desk } = await db.from("sales").select("plan_id, qty, price_thb").eq("business_date", day.businessDate).neq("source", "import");
      const recon = reconcile((plans ?? []) as ReconPlan[], desk ?? [], day.products, day.modifiers);
      const notInMenu = day.products
        .filter((p) => andyGroup(p.category ?? "") !== "gym" && !inMenu.has(p.name.trim()))
        .map((p) => ({ name: p.name, category: p.category ?? "", qty: p.qty, till: p.till, price: p.qty ? Math.round(p.till / p.qty) : 0 }));
      const { products, modifiers, tabs, ...rest } = day;
      out.push({
        fileName: f.name,
        ok: true,
        sha256: sha,
        day: { ...rest, productCount: products.length, modifierCount: modifiers.length },
        state: same?.length ? "already" : current ? "replace" : "new",
        existingVersion: current?.version,
        recon,
        notInMenu,
        legacyCategories: day.categories.filter((c) => c.legacy).map((c) => c.name),
        unmatchedStaff: day.staff.map((s) => s.name.trim()).filter((n) => !known.has(n)),
      });
      void tabs;
    } catch (e) {
      out.push({ fileName: f.name, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

export async function importFiles(files: { name: string; text: string }[], me: { id: string; name: string }): Promise<QashierImportResult[]> {
  const db = supabaseAdmin();
  const out: QashierImportResult[] = [];
  for (const f of files) {
    try {
      const raw = parseQashierReport(f.text);
      const day = summarizeQashier(raw);
      const lines = [
        ...day.categories.map((c) => ({ section: "category", name: c.name, category: null, qty: c.qty, ex_vat: c.exVat, till: c.till })),
        ...day.products.map((p) => ({ section: "product", name: p.name, category: p.category ?? null, qty: p.qty, ex_vat: p.exVat, till: p.till, cost: p.cost ?? null })),
        ...day.modifiers.map((m) => ({ section: "modifier", name: m.name, category: null, qty: m.qty, ex_vat: m.exVat, till: m.till })),
        ...day.tabs.map((m) => ({ section: "tab", name: m.name, category: null, qty: m.qty, ex_vat: m.exVat, till: m.till })),
        ...day.staff.map((s) => ({ section: "staff", name: s.name, category: null, qty: s.transactions, ex_vat: s.exVat, till: s.till })),
        ...day.payments.map((p) => ({ section: "payment", name: p.method, category: null, qty: 0, ex_vat: null, till: p.amount })),
      ];
      const { data, error } = await db.rpc("qashier_import", {
        p_day: {
          business_date: day.businessDate,
          file_sha256: await sha256(f.text),
          file_name: f.name,
          store: day.store,
          total_sales: day.totalSales,
          net_sales: day.netSales,
          vat: day.vat,
          cost: day.cost,
          gross_profit: day.grossProfit,
          transactions: day.transactions,
          voided_transactions: day.voidedTransactions,
          raw: { ...raw, meta: { imported_by_name: me.name, groups: day.groups } } as unknown as Json,
          checks: day.checks as unknown as Json,
        },
        p_lines: lines as unknown as Json,
        p_user: me.id,
      });
      if (error) throw new Error(error.message);
      const r = data as { status: "imported" | "replaced" | "already"; version?: number };
      out.push({ fileName: f.name, status: r.status, businessDate: day.businessDate, version: r.version });
    } catch (e) {
      out.push({ fileName: f.name, status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
