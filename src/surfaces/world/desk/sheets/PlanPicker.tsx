import type { Coach, PayMethod, Plan } from "../../../../client/desk";
import { Segmented, Tile } from "../../../../components/kit";
import { useI18n, type MessageKey } from "../../../../i18n";
import { baht } from "../../../../i18n/format";

export type PlanTab = "member" | "thai" | "pt" | "packs";
export const TABS: PlanTab[] = ["member", "thai", "pt", "packs"];
export const METHODS: PayMethod[] = ["card", "cash", "promptpay", "transfer", "comp"];

export function plansFor(plans: Plan[], tab: PlanTab): Plan[] {
  return plans.filter((p) =>
    tab === "member" ? p.kind === "membership" && p.audience === "all" : tab === "thai" ? p.audience === "thai" : tab === "pt" ? p.kind === "pt" : p.kind === "visits" || p.kind === "extra",
  );
}

export function tabOf(p: Plan): PlanTab {
  if (p.audience === "thai") return "thai";
  if (p.kind === "pt") return "pt";
  if (p.kind === "visits" || p.kind === "extra") return "packs";
  return "member";
}

/** Plan tabs + tiles (D07/D08). Thai plan names show in Thai on a Thai desk. */
export function PlanTiles({ plans, tab, onTab, plan, onPlan }: { plans: Plan[]; tab: PlanTab; onTab: (t: PlanTab) => void; plan: Plan | null; onPlan: (p: Plan) => void }) {
  const { t, lang } = useI18n();
  const list = plansFor(plans, tab);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Segmented
        block
        label={t("desk.plan")}
        value={tab}
        onChange={(v) => {
          onTab(v);
          const first = plansFor(plans, v)[0];
          if (first) onPlan(first);
        }}
        options={TABS.map((x) => ({ value: x, label: t(`tab.${x}` as MessageKey) }))}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        {list.map((p) => (
          <Tile
            key={p.id}
            pt={p.kind === "pt"}
            selected={plan?.id === p.id}
            onClick={() => onPlan(p)}
            name={<span style={{ fontSize: 15 }}>{lang === "th" && p.name_th ? p.name_th : p.name}</span>}
            price={baht(p.price_thb)}
            style={{ minHeight: 72, padding: "12px 14px" }}
          />
        ))}
      </div>
    </div>
  );
}

export function CoachChips({ coaches, value, onChange, locked }: { coaches: Coach[]; value: string | null; onChange: (id: string) => void; locked?: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="s1-label">{t("desk.coach")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {coaches.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={value === c.id}
            disabled={locked && value !== c.id}
            onClick={() => onChange(c.id)}
            className={value === c.id ? "s1-chip-pt" : "s1-chip-off"}
            style={{ height: 40, padding: "0 14px", border: 0, borderRadius: 999, font: "600 14px/1 var(--font-sans)", cursor: "pointer", opacity: locked && value !== c.id ? 0.4 : 1 }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MethodPicker({ value, onChange, label }: { value: PayMethod | null; onChange: (m: PayMethod) => void; label: string }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="s1-label">{label}</p>
      <Segmented block label={label} value={value ?? ("" as PayMethod)} onChange={onChange} options={METHODS.map((m) => ({ value: m, label: t(`method.${m}` as MessageKey) }))} />
    </div>
  );
}
