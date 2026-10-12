import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { desk, type PayMethod, type Plan } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Card, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { baht, dayLabel } from "../../../../i18n/format";
import { useDesk, useStaticData } from "../DeskContext";
import { CoachChips, MethodPicker, PlanTiles, tabOf, type PlanTab } from "./PlanPicker";
import { saleDates } from "./dates";
import { SheetHeader } from "./SheetHeader";
import { currentPlan } from "../ProfilePage";

/** D08 · Sell or renew: plan, coach for PT, the dates card (queueing rules), paid by, then ring it on Qashier. */
export function SellSheet({ memberId, planId }: { memberId: string; planId?: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const { plans, coaches } = useStaticData();
  const detail = useQuery({ queryKey: ["desk", "detail", memberId], queryFn: () => desk.detail(memberId) });
  const [tab, setTab] = useState<PlanTab>("member");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [coach, setCoach] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (plan || !plans.length) return;
    const d = detail.data;
    const last = d ? currentPlan(d.memberships, "membership") : undefined;
    const p = plans.find((x) => x.id === planId) ?? plans.find((x) => x.id === last?.plan_id) ?? plans.find((x) => x.id === "1m") ?? plans[0];
    setPlan(p);
    setTab(tabOf(p));
  }, [plans, plan, planId, detail.data]);
  useEffect(() => {
    if (!coach && detail.data) {
      const ptc = detail.data.memberships.find((m) => m.kind === "pt" && m.coach_id)?.coach_id;
      setCoach(ptc ?? coaches.find((c) => c.slug === "sunman")?.id ?? null);
    }
  }, [detail.data, coaches, coach]);

  const d = detail.data;
  const dates = plan && d ? saleDates(plan, d.memberships) : null;
  const coachName = coaches.find((c) => c.id === coach)?.name ?? "";
  const ready = !!(plan && method && d && (plan.kind !== "pt" || coach));
  const cur = d ? currentPlan(d.memberships, "membership") : undefined;

  async function sell() {
    if (!ready || !plan || !method || !shift || !d) return;
    setBusy(true);
    try {
      await desk.sell(d.member.id, plan.id, method, shift.staffId, plan.kind === "pt" ? coach : null);
      refresh();
      close();
      toast(t("desk.soldToast", { plan: plan.name, price: baht(plan.price_thb) }), { ms: 6000 });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SheetHeader
        title={t("desk.sellRenew")}
        sub={d ? `${d.member.name}${cur ? ` · ${t("desk.planLineShort", { plan: cur.plan, from: dayLabel(cur.starts_on, lang), to: dayLabel(cur.ends_on, lang) })}` : ""}` : ""}
        onClose={close}
      />
      <PlanTiles plans={plans} tab={tab} onTab={setTab} plan={plan} onPlan={setPlan} />
      {tab === "pt" && <CoachChips coaches={coaches} value={coach} onChange={setCoach} />}
      <Card style={{ padding: 16, background: "var(--surface-2)", display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="s1-headline" style={{ fontSize: 16 }}>
          {!plan || !dates ? t("dates.pick") : dates.queued ? t("dates.after", { date: dayLabel(dates.start, lang) }) : t("dates.today")}
        </span>
        {dates && (
          <span className="s1-num" style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
            {dayLabel(dates.start, lang)} → {dayLabel(dates.end, lang, dates.start)}
          </span>
        )}
        <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>
          {plan?.kind === "pt" ? t("dates.notePt", { coach: coachName }) : plan?.kind === "visits" ? t("dates.notePack") : t("dates.noteTime")}
        </span>
      </Card>
      <MethodPicker value={method} onChange={setMethod} label={t("desk.paidBy")} />
      <Button size="lg" block disabled={!ready || busy} className={ready ? undefined : "s1-off"} onClick={() => void sell()}>
        {plan ? t("desk.sellBtn", { plan: plan.name, price: baht(plan.price_thb) }) : t("desk.sellRenew")}
      </Button>
      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)", textAlign: "center" }}>{t("desk.ringQashier", { name: shift?.name ?? "" })}</span>
    </div>
  );
}
