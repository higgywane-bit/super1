import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { owner } from "../../../client/owner";
import { Card } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht, dayLabel } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { Kpi, label, sub } from "./parts";

/** O03 · Week: 7 bars from the imported Qashier days ("Not imported" otherwise), tap a day, week KPIs. */
export function WeekTab() {
  const { t, lang } = useI18n();
  const today = localDate();
  const q = useQuery({ queryKey: ["owner", "week", today], queryFn: () => owner.week(today) });
  const days = q.data ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const picked = days.find((x) => x.day === sel) ?? days.at(-1);
  const max = Math.max(1, ...days.map((x) => Number(x.total ?? 0)));
  const imported = days.filter((x) => x.imported);
  const total = imported.reduce((a, x) => a + Number(x.total ?? 0), 0);
  const short = (d: string) => dayLabel(d, lang).split(" ")[0];
  return (
    <>
      <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={label}>{days.length ? t("owner.salesWeek", { from: dayLabel(days[0].day, lang), to: dayLabel(days[6].day, lang) }) : ""}</span>
          <span className="s1-num" style={{ font: "700 26px/32px var(--font-sans)", letterSpacing: "-0.02em" }}>
            {baht(total)}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, alignItems: "end", height: 170 }}>
          {days.map((x, i) => {
            const on = x.day === picked?.day;
            const h = x.imported ? Math.max(6, (Number(x.total) / max) * 150) : 150;
            return (
              <button
                key={x.day}
                type="button"
                onClick={() => setSel(x.day)}
                aria-pressed={on}
                aria-label={`${dayLabel(x.day, lang)} · ${x.imported ? baht(Number(x.total)) : t("owner.notImported")}`}
                style={{ appearance: "none", border: 0, padding: 0, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, height: "100%", justifyContent: "flex-end" }}
              >
                <span
                  className="s1-bar-grow"
                  style={{
                    height: h,
                    borderRadius: 10,
                    animationDelay: `${i * 40}ms`,
                    background: !x.imported ? "repeating-linear-gradient(135deg, var(--surface-3) 0 6px, var(--surface-2) 6px 12px)" : on ? "var(--s1-blue)" : "var(--surface-4)",
                    boxShadow: on && !x.imported ? "inset 0 0 0 2px var(--s1-blue)" : undefined,
                  }}
                />
                <span style={{ font: `${on ? 700 : 500} 13px/18px var(--font-sans)`, color: on ? "var(--foreground)" : "var(--text-secondary)", textAlign: "center" }}>{short(x.day)}</span>
              </button>
            );
          })}
        </div>
        {picked && (
          <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--surface-3)", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: "600 16px/21px var(--font-sans)" }}>{picked.imported ? t("owner.dayLine", { day: dayLabel(picked.day, lang) }) : `${dayLabel(picked.day, lang)} · ${t("owner.notImported")}`}</span>
            <span className="s1-num" style={sub}>
              {picked.imported
                ? t("owner.dayLineSub", { total: baht(Number(picked.total)), checkins: picked.members, passes: picked.day_passes })
                : t("owner.dayLineMissing", { checkins: picked.members, passes: picked.day_passes })}
            </span>
          </div>
        )}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Kpi title={t("owner.kSales")} value={imported.length ? baht(total / imported.length) : "—"} foot={imported.length ? t("owner.kSalesSub", { total: baht(total), n: imported.length }) : t("owner.notImported")} />
        <Kpi title={t("owner.kCheckins")} value={days.reduce((a, x) => a + x.members, 0)} foot={t("owner.thisWeek")} delay={60} />
        <Kpi title={t("owner.kPasses")} value={days.reduce((a, x) => a + x.day_passes, 0)} foot={t("owner.thisWeek")} delay={120} />
        <Kpi title={t("owner.kNew")} value={days.reduce((a, x) => a + x.new_members, 0)} foot={t("owner.thisWeek")} delay={180} />
      </div>
    </>
  );
}
