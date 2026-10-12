import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { owner } from "../../../client/owner";
import { Card, Disc, Group, Icon, Row } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel, daysLeftText } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { Bar, Kpi, label, Notice, Section } from "./parts";

const MONTHS: Record<string, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  th: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
  ru: ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"],
};

/** O04 · Members: active, ending in 7 days, new this month, paused; by plan; who ends soon; PT. */
export function MembersTab() {
  const { t, lang } = useI18n();
  const today = localDate();
  const q = useQuery({ queryKey: ["owner", "members", today], queryFn: () => owner.members(today) });
  const m = q.data;
  if (!m) return null;
  const top = Math.max(1, ...m.by_plan.map((p) => p.n));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Kpi title={t("owner.active")} value={m.active} />
        <Kpi title={t("owner.ending7")} value={m.expiring} valueColor="var(--s1-yellow)" delay={60} />
        <Kpi title={t("owner.newIn", { month: MONTHS[lang][Number(today.slice(5, 7)) - 1] })} value={m.new_month} valueColor="var(--s1-blue)" delay={120} />
        <Kpi title={t("owner.paused")} value={m.paused} valueColor="var(--text-secondary)" delay={180} />
      </div>
      <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={label}>{t("owner.planMix")}</span>
        {m.by_plan.map((p) => (
          <div key={p.plan} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: "500 15px/20px var(--font-sans)" }}>
              <span>{p.plan}</span>
              <span className="s1-num" style={{ fontWeight: 600 }}>
                {p.n}
              </span>
            </div>
            <Bar value={p.n} max={top} color="var(--s1-blue)" />
          </div>
        ))}
      </Card>
      <Section title={t("owner.expiringSoon")}>
        {m.ending.length ? (
          <Group>
            {m.ending.map((x) => (
              <Row key={x.id} title={x.name} sub={`${x.plan} · ${dayLabel(x.ends_on, lang)}`} meta={<span className="s1-pill s1-pill--expiring">{daysLeftText(x.days_left, lang)}</span>} />
            ))}
          </Group>
        ) : (
          <Notice>{t("owner.noneEnding")}</Notice>
        )}
      </Section>
      <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <Disc tone="pt">
          <Icon icon={Dumbbell} />
        </Disc>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span className="s1-headline" style={{ fontSize: 16 }}>
            {t("owner.ptTitle", { n: m.pt_active })}
          </span>
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
            {t("owner.ptSub", { n: m.pt_sessions_month })}
            {m.pt_by_coach.length ? ` · ${m.pt_by_coach.map((c) => `${c.coach} ${c.sessions}`).join(" · ")}` : ""}
          </span>
        </div>
      </Card>
    </>
  );
}
