import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Coffee } from "lucide-react";
import { useRef, useState } from "react";
import { admin, type MenuItem } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { storageUrl } from "../../../client/supabase";
import { Button, Card, Field, Icon, Label, Sheet, Switch, TextArea, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht } from "../../../i18n/format";
import { useViewer } from "../../shared/Gate";
import { PageHeader } from "../StaffSidebar";

const DRAFTS = "__drafts";

/** A03 · Café menu: category tabs, items with in-app switch and macro state, editor sheet. */
export function AdminMenu() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const menu = useQuery({ queryKey: ["admin", "menu"], queryFn: admin.menu });
  const [tab, setTab] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const items = menu.data?.items ?? [];
  const cats = menu.data?.cats ?? [];
  const drafts = items.filter((i) => i.is_draft);
  const current = tab ?? (drafts.length ? DRAFTS : cats[0]?.id ?? null);
  const shown = current === DRAFTS ? drafts : items.filter((i) => i.category_id === current && !i.is_draft);
  const checked = items.filter((i) => i.macros_verified_at).length;
  const catName = (c: (typeof cats)[number]) => (lang === "th" && c.name_th) || c.name_en;

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "menu"] });

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title={t("admin.menu")}
        sub={t("menu.sub")}
        actions={
          <span className="s1-pill" style={{ color: "var(--s1-yellow)", background: "var(--s1-yellow-tint)" }}>
            {t("menu.checkedCount", { n: checked, total: items.length })}
          </span>
        }
      />
      <div role="tablist" aria-label={t("admin.menu")} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[...(drafts.length ? [{ id: DRAFTS, label: t("menu.drafts"), n: drafts.length }] : []), ...cats.map((c) => ({ id: c.id, label: catName(c), n: items.filter((i) => i.category_id === c.id && !i.is_draft).length }))].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={current === c.id}
            type="button"
            className="s1-pill s1-pill--plain s1-tap"
            onClick={() => setTab(c.id)}
            style={{
              height: 36,
              padding: "0 14px",
              font: "600 14px/18px var(--font-sans)",
              color: current === c.id ? "var(--s1-blue)" : "var(--foreground)",
              background: current === c.id ? "var(--s1-blue-tint)" : "var(--surface-2)",
              boxShadow: current === c.id ? "inset 0 0 0 2px var(--s1-blue)" : undefined,
              cursor: "pointer",
              border: 0,
            }}
          >
            {c.label} <span style={{ color: "var(--text-secondary)", marginLeft: 4 }}>{c.n}</span>
          </button>
        ))}
      </div>
      {current === DRAFTS && <p style={{ margin: "0 4px", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("menu.draftNote")}</p>}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {shown.length === 0 && <p style={{ padding: 18, margin: 0, color: "var(--text-secondary)" }}>{t("admin.empty")}</p>}
        {shown.map((i, n) => {
          const sub = [(lang === "th" ? i.name_en : i.name_th) || null, i.desc_en || "—"].filter(Boolean).join(" · ");
          const photo = storageUrl(i.photo_path);
          return (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: n ? "1px solid var(--hairline)" : undefined, flexWrap: "wrap" }}>
              <span style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", background: "var(--surface-3)", overflow: "hidden", display: "grid", placeItems: "center", flex: "none" }}>
                {photo ? <img src={photo} alt="" width={48} height={48} style={{ objectFit: "cover", width: 48, height: 48 }} /> : <Icon icon={Coffee} size={20} />}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 220px" }}>
                <span style={{ font: "600 16px/21px var(--font-sans)" }}>{(lang === "th" && i.name_th) || (lang === "ru" && i.name_ru) || i.name_en}</span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
              </div>
              <span className="s1-num" style={{ font: "700 16px/20px var(--font-sans)", width: 64, textAlign: "right" }}>
                {baht(i.price_thb)}
              </span>
              <span
                className="s1-pill"
                style={
                  i.macros_verified_at
                    ? { color: "var(--s1-green)", background: "var(--s1-green-tint)" }
                    : i.kcal == null
                      ? undefined
                      : { color: "var(--s1-yellow)", background: "var(--s1-yellow-tint)" }
                }
              >
                {i.macros_verified_at ? t("menu.verified") : i.kcal == null ? t("menu.noMacros") : t("menu.toCheck")}
              </span>
              <Switch
                checked={i.in_app && !i.is_draft}
                label={t("menu.inAppFor", { name: i.name_en })}
                onChange={async (on) => {
                  try {
                    await admin.saveItem(i.id, on ? { in_app: true, is_draft: false } : { in_app: false });
                    refresh();
                  } catch (e) {
                    const u = toUiError(e);
                    toast(t(u.key, u.vars), { tone: "stop" });
                  }
                }}
              />
              <Button size="sm" variant="plain" style={{ color: "var(--foreground)" }} onClick={() => setEditing(i)}>
                {t("menu.edit")}
              </Button>
            </div>
          );
        })}
      </Card>
      <MenuEditor item={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

type Draft = Pick<MenuItem, "name_en" | "name_th" | "name_ru" | "desc_en" | "desc_th" | "desc_ru" | "photo_path"> & {
  price: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  verified: boolean;
  qashier: string;
};

const numOrNull = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));

function toDraft(i: MenuItem): Draft {
  return {
    name_en: i.name_en,
    name_th: i.name_th,
    name_ru: i.name_ru,
    desc_en: i.desc_en,
    desc_th: i.desc_th,
    desc_ru: i.desc_ru,
    photo_path: i.photo_path,
    price: String(i.price_thb),
    kcal: i.kcal == null ? "" : String(i.kcal),
    protein: i.protein_g == null ? "" : String(i.protein_g),
    carbs: i.carbs_g == null ? "" : String(i.carbs_g),
    fat: i.fat_g == null ? "" : String(i.fat_g),
    verified: !!i.macros_verified_at,
    qashier: i.qashier_products.join("\n"),
  };
}

function MenuEditor({ item, onClose, onSaved }: { item: MenuItem | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const viewer = useViewer();
  const file = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [forId, setForId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const menu = useQuery({ queryKey: ["admin", "menu"], queryFn: admin.menu, enabled: !!item });
  if (item && forId !== item.id) {
    setForId(item.id);
    setD(toDraft(item));
  }
  if (!item && forId) {
    setForId(null);
  }
  const set = (patch: Partial<Draft>) => setD((s) => (s ? { ...s, ...patch } : s));
  const groups = item ? (menu.data?.groups ?? []).filter((g) => g.item_ids.includes(item.id) || g.category_ids.includes(item.category_id)) : [];
  const fromMacros = d ? Math.round((numOrNull(d.protein) ?? 0) * 4 + (numOrNull(d.carbs) ?? 0) * 4 + (numOrNull(d.fat) ?? 0) * 9) : 0;

  async function save() {
    if (!item || !d) return;
    setBusy(true);
    try {
      const price = Number(d.price);
      if (!Number.isInteger(price) || price < 0) throw new Error("price");
      await admin.saveItem(item.id, {
        name_en: d.name_en.trim() || item.name_en,
        name_th: d.name_th?.trim() || null,
        name_ru: d.name_ru?.trim() || null,
        desc_en: d.desc_en?.trim() || null,
        desc_th: d.desc_th?.trim() || null,
        desc_ru: d.desc_ru?.trim() || null,
        photo_path: d.photo_path,
        price_thb: price,
        kcal: numOrNull(d.kcal),
        protein_g: numOrNull(d.protein),
        carbs_g: numOrNull(d.carbs),
        fat_g: numOrNull(d.fat),
        qashier_products: d.qashier.split("\n").map((s) => s.trim()).filter(Boolean),
        ...(d.verified !== !!item.macros_verified_at
          ? d.verified
            ? ({ macros_verified_at: new Date().toISOString(), macros_verified_by: viewer?.id ?? null } as Partial<MenuItem>)
            : ({ macros_verified_at: null, macros_verified_by: null } as Partial<MenuItem>)
          : {}),
      });
      toast(t("menu.saved", { name: d.name_en }), { tone: "go" });
      onSaved();
      onClose();
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  }

  const photo = storageUrl(d?.photo_path);
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? t("menu.editTitle", { name: item.name_en }) : ""} width={560}>
      {item && d && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "8px 22px 28px" }}>
          <h2 className="s1-title2" style={{ margin: 0 }}>
            {t("menu.editTitle", { name: item.name_en })}
          </h2>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ width: 88, height: 88, borderRadius: "var(--radius-tile)", background: "var(--surface-3)", overflow: "hidden", display: "grid", placeItems: "center" }}>
              {photo ? <img src={photo} alt="" width={88} height={88} style={{ objectFit: "cover", width: 88, height: 88 }} /> : <Icon icon={Coffee} />}
            </span>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  set({ photo_path: await admin.uploadMenuPhoto(f, item.id) });
                } catch (err) {
                  const u = toUiError(err);
                  toast(t(u.key, u.vars), { tone: "stop" });
                }
              }}
            />
            <Button size="sm" variant="tinted" onClick={() => file.current?.click()}>
              <Icon icon={Camera} size={16} /> {d.photo_path ? t("menu.changePhoto") : t("menu.photo")}
            </Button>
          </div>
          <Field id="m-name-en" label={t("menu.nameEn")} value={d.name_en} onChange={(e) => set({ name_en: e.target.value })} />
          <Field id="m-name-th" label={t("menu.nameTh")} lang="th" value={d.name_th ?? ""} onChange={(e) => set({ name_th: e.target.value })} />
          <Field id="m-name-ru" label={t("menu.nameRu")} lang="ru" value={d.name_ru ?? ""} onChange={(e) => set({ name_ru: e.target.value })} />
          <Field id="m-price" label={t("menu.price")} inputMode="numeric" value={d.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d]/g, "") })} />
          <div>
            <Label htmlFor="m-desc">{t("menu.desc")}</Label>
            <TextArea id="m-desc" value={d.desc_en ?? ""} onChange={(e) => set({ desc_en: e.target.value })} style={{ minHeight: 72 }} />
          </div>
          <div>
            <Label htmlFor="m-desc-th">{t("menu.descTh")}</Label>
            <TextArea id="m-desc-th" lang="th" value={d.desc_th ?? ""} onChange={(e) => set({ desc_th: e.target.value })} style={{ minHeight: 72 }} />
          </div>
          <div>
            <Label htmlFor="m-desc-ru">{t("menu.descRu")}</Label>
            <TextArea id="m-desc-ru" lang="ru" value={d.desc_ru ?? ""} onChange={(e) => set({ desc_ru: e.target.value })} style={{ minHeight: 72 }} />
          </div>
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="s1-headline" style={{ margin: 0 }}>
              {t("menu.addOns")}
            </h3>
            {groups.length === 0 && <span style={{ color: "var(--text-secondary)", font: "500 14px/19px var(--font-sans)" }}>{t("menu.noAddOns")}</span>}
            {groups.map((g) => (
              <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "600 14px/18px var(--font-sans)" }}>{g.label_en}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(menu.data?.options ?? [])
                    .filter((o) => o.group_id === g.id)
                    .map((o) => (
                      <span key={o.id} className="s1-pill s1-pill--plain">
                        {o.label_en}
                        {o.price_thb ? ` +${baht(o.price_thb)}` : ""}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="s1-headline" style={{ margin: 0 }}>
              {t("menu.macros")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
              <Field id="m-kcal" label={t("menu.kcal")} inputMode="numeric" value={d.kcal} onChange={(e) => set({ kcal: e.target.value.replace(/[^\d]/g, "") })} />
              <Field id="m-p" label={t("menu.protein")} inputMode="decimal" value={d.protein} onChange={(e) => set({ protein: e.target.value.replace(/[^\d.]/g, "") })} />
              <Field id="m-c" label={t("menu.carbs")} inputMode="decimal" value={d.carbs} onChange={(e) => set({ carbs: e.target.value.replace(/[^\d.]/g, "") })} />
              <Field id="m-f" label={t("menu.fat")} inputMode="decimal" value={d.fat} onChange={(e) => set({ fat: e.target.value.replace(/[^\d.]/g, "") })} />
            </div>
            {fromMacros > 0 && <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("menu.kcalFromMacros", { kcal: fromMacros })}</span>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "600 15px/20px var(--font-sans)" }}>{t("menu.checked")}</span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("menu.checkedNote")}</span>
              </div>
              <Switch checked={d.verified} label={t("menu.checked")} onChange={(v) => set({ verified: v })} />
            </div>
          </section>
          <div>
            <Label htmlFor="m-qashier">{t("menu.qashierNames")}</Label>
            <TextArea id="m-qashier" value={d.qashier} onChange={(e) => set({ qashier: e.target.value })} style={{ minHeight: 72 }} />
          </div>
          <Button onClick={() => void save()} disabled={busy}>
            {t("menu.save")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
