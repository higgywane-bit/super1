import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { admin, type AdminPlan } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { Button, Card, Input, Segmented, Switch, useToast } from "../../../components/kit";
import { useT } from "../../../i18n";
import { PageHeader } from "../StaffSidebar";

type Tab = "membership" | "thai" | "pt" | "extra";

const tabOf = (p: AdminPlan): Tab => (p.kind === "pt" ? "pt" : p.kind === "membership" ? (p.audience === "thai" ? "thai" : "membership") : "extra");

/** A02 · Plans and prices: price edits go through admin_set_plan_price (price history); desk on/off. */
export function AdminPlans() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: admin.plans });
  const [tab, setTab] = useState<Tab>("membership");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const dirty = Object.entries(edits).filter(([id, v]) => {
    const p = plans.data?.find((x) => x.id === id);
    return p && /^\d+$/.test(v) && Number(v) !== p.price_thb;
  });

  const length = (p: AdminPlan) => {
    if (p.kind === "pt" || p.kind === "extra" || p.kind === "visits") return t("plans.sessions", { n: p.sessions ?? 1 });
    if (p.duration_days) return p.duration_days === 1 ? t("plans.day1") : t("plans.days", { n: p.duration_days });
    if (p.duration_months) return p.duration_months === 1 ? t("plans.calMonth1") : t("plans.calMonths", { n: p.duration_months });
    return "—";
  };

  async function save() {
    setBusy(true);
    try {
      for (const [id, v] of dirty) await admin.setPrice(id, Number(v));
      setEdits({});
      toast(t("plans.saved"), { tone: "go" });
      await qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  }

  const rows = (plans.data ?? []).filter((p) => !p.archived_at && tabOf(p) === tab);

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title={t("admin.plans")}
        sub={t("plans.sub")}
        actions={
          <Button onClick={() => void save()} disabled={busy || dirty.length === 0}>
            {dirty.length ? `${t("plans.save")} · ${t("plans.unsaved", { n: dirty.length })}` : t("plans.save")}
          </Button>
        }
      />
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <Segmented
          label={t("admin.plans")}
          value={tab}
          onChange={setTab}
          options={(["membership", "thai", "pt", "extra"] as const).map((v) => ({ value: v, label: t(`plans.tab.${v}`) }))}
          className="s1-seg--fit"
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <Card style={{ padding: 0, overflowX: "auto", flex: "2 1 min(560px, 100%)", minWidth: 0 }}>
          <table className="s1-adm-table">
            <thead>
              <tr>
                <th>{t("plans.plan")}</th>
                <th>{t("plans.length")}</th>
                <th>{t("plans.qashier")}</th>
                <th style={{ textAlign: "right" }}>{t("plans.price")} ฿</th>
                <th>{t("plans.onDesk")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const v = edits[p.id] ?? String(p.price_thb);
                const changed = /^\d+$/.test(v) && Number(v) !== p.price_thb;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{length(p)}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{p.qashier_modifier ? `${p.qashier_product} · ${p.qashier_modifier}` : p.qashier_product}</td>
                    <td style={{ width: 140 }}>
                      <Input
                        inputMode="numeric"
                        aria-label={t("plans.priceFor", { name: p.name })}
                        value={v}
                        onChange={(e) => setEdits((s) => ({ ...s, [p.id]: e.target.value.replace(/[^\d]/g, "") }))}
                        className="s1-num"
                        style={{ textAlign: "right", fontWeight: 700, boxShadow: changed ? "inset 0 0 0 2px var(--s1-blue)" : undefined }}
                      />
                    </td>
                    <td style={{ width: 72 }}>
                      <Switch
                        checked={p.on_desk}
                        label={t("plans.deskFor", { name: p.name })}
                        onChange={async (on) => {
                          try {
                            await admin.setOnDesk(p.id, on);
                            await qc.invalidateQueries({ queryKey: ["admin", "plans"] });
                          } catch (e) {
                            const u = toUiError(e);
                            toast(t(u.key, u.vars), { tone: "stop" });
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, flex: "1 1 min(260px, 100%)" }}>
          <h2 className="s1-headline" style={{ margin: 0 }}>
            {t("plans.rules")}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10, font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
            {(["plans.rule1", "plans.rule2", "plans.rule3", "plans.rule4", "settings.nothingDeleted"] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
          {dirty.length > 0 && <p style={{ margin: 0, font: "600 14px/20px var(--font-sans)", color: "var(--s1-yellow)" }}>{t("plans.qashierToo")}</p>}
        </Card>
      </div>
    </div>
  );
}
