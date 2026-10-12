import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { member } from "../../../client/member";
import { toUiError } from "../../../client/errors";
import { Button, Card, Icon, Input, Stepper, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { stepValue } from "../../../lib/coach";
import { useMemberHome } from "./useMember";

/** M11 · Daily check-in: sleep, energy, digestion, water, steps, bodyweight. One a day; today's can be changed. */
export function CheckinPage() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const h = useMemberHome().data!;
  const c = h.checkin;
  const [v, setV] = useState({
    sleep: c?.sleep_h ?? 7,
    energy: c?.energy ?? 3,
    digestion: c?.digestion ?? 3,
    water: c?.water_l ?? 2,
    steps: c?.steps ?? 6000,
    weight: c?.weight_kg ?? null,
  });
  const [note, setNote] = useState(c?.note ?? "");
  const [busy, setBusy] = useState(false);
  const target = h.targets?.water_l;

  const row = (label: string, key: "sleep" | "energy" | "digestion" | "water" | "steps", step: number, min: number, max: number, unit: string, sub?: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "4px 16px", boxShadow: key === "sleep" ? undefined : "inset 0 1px 0 var(--hairline)" }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ font: "600 16px/21px var(--font-sans)" }}>{label}</span>
        {sub && <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{sub}</span>}
      </span>
      <Stepper
        value={v[key]}
        step={step}
        min={min}
        max={max}
        width={72}
        label={label}
        lessLabel={t("m.less", { what: label })}
        moreLabel={t("m.more", { what: label })}
        display={`${key === "steps" ? v[key].toLocaleString("en-US") : v[key]}${unit}`}
        onChange={(n) => setV((s) => ({ ...s, [key]: stepValue(s[key], n - s[key], min, max) }))}
      />
    </div>
  );

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button type="button" className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", paddingLeft: 0, color: "var(--text-secondary)" }} onClick={() => void navigate({ to: "/a" })}>
        <Icon icon={ChevronLeft} size={20} /> {t("m.back")}
      </button>
      <h1 className="s1-largetitle" style={{ margin: 0 }}>
        {t("m.checkin")}
      </h1>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {row(t("m.sleep"), "sleep", 0.5, 0, 14, " h")}
        {row(t("m.energy"), "energy", 1, 1, 5, " / 5")}
        {row(t("m.digestion"), "digestion", 1, 1, 5, " / 5")}
        {row(t("m.water"), "water", 0.5, 0, 10, " L", target != null ? t("m.waterTarget", { n: target }) : undefined)}
        {row(t("m.steps"), "steps", 1000, 0, 60000, "")}
      </Card>
      <Input aria-label={t("m.weight")} placeholder={t("m.weight")} inputMode="decimal" value={v.weight ?? ""} onChange={(e) => setV((s) => ({ ...s, weight: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) || s.weight }))} />
      <Input aria-label={t("m.notePh")} placeholder={t("m.notePh")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="lg"
        block
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await member.checkin(h.today, { ...v, note: note.trim() || null });
            toast(t("m.checkinSaved", { n: r.streak }), { tone: "go" });
            await qc.invalidateQueries({ queryKey: ["member", "home"] });
            void navigate({ to: "/a" });
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("m.complete")}
      </Button>
    </div>
  );
}
