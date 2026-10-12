import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { coach, type ClientDetail, type Targets } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Card, Icon, Segmented, Sheet, Stepper, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht, dayLabel, localDayOf } from "../../../i18n/format";
import { kcalOf, macroSplit, stepValue } from "../../../lib/coach";
import { SendBar } from "./SendBar";

const DEFAULTS = { goal: "maintain" as Targets["goal"], protein: 120, carbs: 200, fat: 60, water: 3, steps: 8000 };
const LIGHT_BLUE = "color-mix(in srgb, var(--s1-blue) 55%, white)";

/** C04 · Food: goal, kcal (computed), five steppers, Send when changed; café picks as chips (max 3). */
export function NutritionTab({ d, today }: { d: ClientDetail; today: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const cur = d.targets;
  const [v, setV] = useState(() => (cur ? { goal: cur.goal, protein: cur.protein_g, carbs: cur.carbs_g, fat: cur.fat_g, water: cur.water_l ?? DEFAULTS.water, steps: cur.steps ?? DEFAULTS.steps } : DEFAULTS));
  const [busy, setBusy] = useState(false);
  const kcal = kcalOf(v.protein, v.carbs, v.fat);
  const split = macroSplit(v.protein, v.carbs, v.fat);
  const dirty = !cur || cur.goal !== v.goal || cur.protein_g !== v.protein || cur.carbs_g !== v.carbs || cur.fat_g !== v.fat || Number(cur.water_l) !== v.water || cur.steps !== v.steps;
  const first = d.member.first_name;

  const row = (label: string, dot: string, key: "protein" | "carbs" | "fat" | "water" | "steps", unit: string, step: number, max: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 16px", boxShadow: key === "protein" ? undefined : "inset 0 1px 0 var(--hairline)" }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: dot }} />
      <span style={{ flex: 1, font: "600 16px/21px var(--font-sans)" }}>{label}</span>
      <Stepper
        value={v[key]}
        step={step}
        max={max}
        width={78}
        label={label}
        lessLabel={t("coach.less", { what: label })}
        moreLabel={t("coach.more", { what: label })}
        display={`${key === "steps" ? v[key].toLocaleString("en-US") : v[key]}${unit}`}
        onChange={(n) => setV((s) => ({ ...s, [key]: stepValue(s[key], n - s[key], 0, max) }))}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Segmented block label={t("coach.targets")} value={v.goal} onChange={(goal) => setV((s) => ({ ...s, goal }))} options={(["lose", "maintain", "build"] as const).map((g) => ({ value: g, label: t(`coach.goal.${g}`) }))} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="s1-num" data-testid="kcal" style={{ font: "700 52px/56px var(--font-sans)", letterSpacing: "-0.03em" }}>
            {kcal.toLocaleString("en-US")}
          </span>
          <span style={{ font: "500 16px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.kcalDay")}</span>
        </div>
        <div aria-hidden style={{ display: "flex", gap: 3, height: 6, borderRadius: 3, overflow: "hidden", background: "var(--surface-3)" }}>
          <span className="s1-width-grow" style={{ width: `${split.protein}%`, background: "var(--s1-blue)" }} />
          <span className="s1-width-grow" style={{ width: `${split.carbs}%`, background: LIGHT_BLUE }} />
          <span className="s1-width-grow" style={{ width: `${split.fat}%`, background: "var(--surface-4)" }} />
        </div>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {row(t("coach.protein"), "var(--s1-blue)", "protein", " g", 5, 500)}
        {row(t("coach.carbs"), LIGHT_BLUE, "carbs", " g", 5, 1000)}
        {row(t("coach.fat"), "var(--surface-4)", "fat", " g", 5, 400)}
        {row(t("coach.water"), "var(--s1-blue)", "water", " L", 0.5, 10)}
        {row(t("coach.steps"), "var(--s1-green)", "steps", "", 1000, 100000)}
      </Card>
      <SendBar
        dirty={dirty}
        busy={busy}
        label={t("coach.sendTo", { name: first })}
        note={t("coach.unsent")}
        synced={cur ? t("coach.targetsSync", { date: dayLabel(localDayOf(cur.sent_at), lang, today) }) : null}
        onSend={async () => {
          setBusy(true);
          try {
            const r = await coach.setTargets(d.member.id, v);
            toast(t("coach.targetsSent", { name: first, kcal: r.kcal.toLocaleString("en-US") }), { tone: "go" });
            await qc.invalidateQueries({ queryKey: ["coach", "client", d.member.id] });
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      />
      <Picks d={d} />
    </div>
  );
}

function Picks({ d }: { d: ClientDetail }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const menu = useQuery({ queryKey: ["coach", "cafe"], queryFn: coach.cafe, staleTime: 300_000 });
  const [open, setOpen] = useState(false);
  const picks = d.picks;
  const nameOf = (id: string) => {
    const m = menu.data?.find((x) => x.id === id);
    return (m && ((lang === "th" && m.name_th) || m.name_en)) || id;
  };
  const save = async (next: string[]) => {
    if (next.length > 3) {
      toast(t("coach.picksFull"), { tone: "stop" });
      return;
    }
    try {
      await coach.setPicks(d.member.id, next);
      await qc.invalidateQueries({ queryKey: ["coach", "client", d.member.id] });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    }
  };
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 className="s1-section" style={{ margin: "0 0 0 4px", flex: 1 }}>
          {t("coach.picks")} · {t("coach.picksN", { n: picks.length })}
        </h3>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {picks.map((id) => (
          <button key={id} type="button" aria-label={t("coach.unpin", { name: nameOf(id) })} className="s1-pill s1-pill--plain s1-chip-pt s1-tap" style={{ height: 38, padding: "0 10px 0 14px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)", gap: 6 }} onClick={() => void save(picks.filter((x) => x !== id))}>
            {nameOf(id)} <Icon icon={X} size={14} />
          </button>
        ))}
        {picks.length < 3 && (
          <button type="button" className="s1-pill s1-pill--plain s1-chip-off s1-tap" style={{ height: 38, padding: "0 14px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)", gap: 6 }} onClick={() => setOpen(true)}>
            <Icon icon={Plus} size={14} /> {t("coach.pickCafe")}
          </button>
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("coach.picks")} width={480}>
        <div style={{ display: "flex", flexDirection: "column", padding: "8px 22px 28px" }}>
          <p style={{ margin: "0 0 10px", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.picksSub", { name: d.member.first_name })}</p>
          {(menu.data ?? []).map((m) => {
            const on = picks.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                aria-label={t("coach.pinFor", { name: m.name_en })}
                className="s1-tap"
                onClick={() => void save(on ? picks.filter((x) => x !== m.id) : [...picks, m.id])}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer", boxShadow: "inset 0 -1px 0 var(--hairline)", minHeight: 52 }}
              >
                <span style={{ flex: 1, font: "600 15px/20px var(--font-sans)" }}>{(lang === "th" && m.name_th) || m.name_en}</span>
                <span className="s1-num" style={{ font: "500 14px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                  {baht(m.price_thb)}
                </span>
                <span style={{ width: 24, color: "var(--s1-pink)" }}>{on && <Icon icon={Check} size={18} />}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </section>
  );
}
