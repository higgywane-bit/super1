import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { desk, type PayMethod, type Plan, type Signup } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Card, Label, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { localDate } from "../../../../lib/dates";
import { planEndDate } from "../../../../lib/membership";
import { ago, baht, dayLabel, LANG_NAMES } from "../../../../i18n/format";
import { useDesk, useStaticData } from "../DeskContext";
import { CoachChips, MethodPicker, PlanTiles, type PlanTab } from "./PlanPicker";
import { Note, SheetHeader } from "./SheetHeader";

/**
 * D07 · Finish a counter sign-up: scan their new tag, pick the plan, how it was paid on Qashier, one
 * tap → desk_complete_signup (member + tag + sale + plan + coach lead + app invite, one transaction).
 */
export function SignupSheet({ signup: s }: { signup: Signup }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const { plans, coaches } = useStaticData();
  const [tag, setTag] = useState("");
  const [tab, setTab] = useState<PlanTab>("member");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const tagInput = useRef<HTMLInputElement>(null);
  const sig = useQuery({ queryKey: ["desk", "sig", s.signature_path], queryFn: () => desk.signatureUrl(s.signature_path ?? ""), enabled: !!s.signature_path, staleTime: 240_000 });

  useEffect(() => {
    if (!plan && plans.length) setPlan(plans.find((p) => p.id === "1m") ?? plans[0]);
  }, [plans, plan]);
  useEffect(() => {
    tagInput.current?.focus();
  }, []);

  const name = `${s.first_name} ${s.last_name}`.trim();
  const coach = coaches.find((c) => c.id === s.coach_id)?.name ?? null;
  const today = localDate();
  const end = plan ? planEndDate(today, plan.duration_days ? { days: plan.duration_days } : { months: plan.duration_months ?? 1 }) : today;
  const cleanTag = tag.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  const ready = cleanTag.length >= 3 && !!plan && !!method && (plan.kind !== "pt" || !!s.coach_id);

  async function create() {
    if (!ready || !plan || !method || !shift) return;
    setBusy(true);
    try {
      await desk.completeSignup(s.id, cleanTag, plan.id, method, shift.staffId);
      refresh();
      close();
      const price = baht(plan.price_thb);
      toast(s.email ? t("desk.inviteToast", { email: s.email, price }) : t("desk.createdToast", { name, price }), { ms: 7000 });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SheetHeader title={name} sub={[LANG_NAMES[s.lang], s.phone, s.email].filter(Boolean).join(" · ")} onClose={close} />
      <Card style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, background: "var(--surface-2)" }}>
        <span style={{ width: 120, height: 52, flex: "none", background: "var(--surface-3)", borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center" }}>
          {sig.data && <img src={sig.data} alt={t("desk.waiver")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        </span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "600 15px/20px var(--font-sans)" }}>{t("desk.waiverSigned")}</span>
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{ago(s.created_at, lang)}</span>
        </span>
        {coach && <span className="s1-pill s1-pill--pt">{coach}</span>}
      </Card>
      <div>
        <Label htmlFor="d-tag">1 · {t("desk.scanTag")}</Label>
        <input
          ref={tagInput}
          id="d-tag"
          className="s1-input s1-num"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("desk.scanTagPh")}
          value={tag}
          onChange={(e) => setTag(e.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 32))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          style={{ height: 56, fontSize: 22, letterSpacing: "0.12em" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="s1-label" style={{ marginBottom: 0 }}>
          2 · {t("desk.plan")}
        </p>
        <PlanTiles plans={plans} tab={tab} onTab={setTab} plan={plan} onPlan={setPlan} />
        {tab === "pt" && <CoachChips coaches={coaches} value={s.coach_id} onChange={() => {}} locked />}
      </div>
      <MethodPicker value={method} onChange={setMethod} label={`3 · ${t("desk.paidBy")}`} />
      {plan && (
        <Note>
          {t("desk.summaryNew", {
            name,
            tag: cleanTag || "—",
            plan: plan.name,
            from: dayLabel(today, lang),
            to: dayLabel(end, lang, today),
            invite: s.email ? t("desk.summaryInvite") : "",
            lead: coach ? t("desk.summaryLead", { coach }) : "",
          })}
        </Note>
      )}
      <Button size="lg" block disabled={!ready || busy} className={ready ? undefined : "s1-off"} onClick={() => void create()}>
        {plan ? t("desk.createBtn", { plan: plan.name, price: baht(plan.price_thb) }) : t("desk.newMember")}
      </Button>
      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)", textAlign: "center" }}>{t("desk.ringQashier", { name: shift?.name ?? "" })}</span>
    </div>
  );
}

