import { Card, Group, Row, Disc } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht, dayLabel, time } from "../../../i18n/format";
import { reconcile, reconTotals, type ReconPlan } from "../../../lib/qashier/reconcile";
import { useCountUp } from "../../shared/useCountUp";
import { dayPassLine, groups, membershipsSold, payments, pct, staff as staffRows } from "./derive";
import { Bar, Kpi, label, Notice, Section, sub } from "./parts";
import type { useOwnerToday } from "./useOwnerData";

const GROUP_COLORS = { gym: "var(--s1-blue)", cafe: "color-mix(in srgb, var(--s1-blue) 55%, white)", shop: "var(--surface-4)" };

/** O02 · Today: Qashier sales (count-up), visits with the live pulse, memberships sold vs the desk, payments. */
export function TodayTab({ d }: { d: ReturnType<typeof useOwnerToday> }) {
  const { t, lang } = useI18n();
  const day = d.day;
  const total = useCountUp(day?.total_sales ?? 0);
  const members = useCountUp(d.visits?.members ?? 0);
  const g = groups(d.lines);
  const sold = membershipsSold(d.lines);
  const pass = dayPassLine(d.lines);
  const pays = payments(d.lines);
  const recon = day ? reconTotals(reconcile(d.plans as ReconPlan[], d.desk, d.lines.filter((l) => l.section === "product").map((l) => ({ name: l.name, category: l.category ?? "", qty: l.qty, exVat: 0, till: l.till })), d.lines.filter((l) => l.section === "modifier").map((l) => ({ name: l.name, qty: l.qty, exVat: 0, till: l.till }))), ["membership", "visits"]) : null;
  const planByProduct = (product: string) => d.plans.find((p) => p.qashier_product === product);
  const isToday = day?.business_date === d.today;
  const v = d.visits;
  const passes = v?.day_passes ?? 0;
  const visitsTotal = (v?.members ?? 0) + passes;
  const delta = (v?.members ?? 0) - (v?.members_yesterday ?? 0);
  const soldQty = sold.reduce((a, r) => a + r.qty, 0);
  const soldTill = sold.reduce((a, r) => a + r.till, 0);

  return (
    <>
      {d.dayLoaded && !day && <Notice>{t("owner.noImports")}</Notice>}
      {day && (
        <section className="s1-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 1px 0 rgba(0,180,255,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={label}>{t("owner.sales")}</span>
            <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>
              {isToday ? t("owner.fromQashier", { time: time(day.imported_at), name: day.raw.meta?.imported_by_name ?? "Pete" }) : t("owner.fromQashierDay", { day: dayLabel(day.business_date, lang) })}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="s1-num" style={{ font: "700 52px/56px var(--font-sans)", letterSpacing: "-0.035em" }}>
              {baht(total)}
            </span>
            <span className="s1-num" style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
              {t("owner.salesSub", { n: day.transactions, avg: baht(day.transactions ? day.total_sales / day.transactions : 0) })}
            </span>
          </div>
          <div
            style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", gap: 2 }}
            role="img"
            aria-label={t("owner.splitAria", { gym: Math.round(pct(g.gym, day.total_sales)), cafe: Math.round(pct(g.cafe, day.total_sales)), shop: Math.round(pct(g.shop, day.total_sales)) })}
          >
            {(["gym", "cafe", "shop"] as const).map((k) => (
              <span key={k} className="s1-width-grow" style={{ width: `${pct(g[k], day.total_sales)}%`, background: GROUP_COLORS[k] }} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["gym", "cafe", "shop"] as const).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: GROUP_COLORS[k] }} />
                <span style={{ flex: 1, font: "500 15px/20px var(--font-sans)" }}>{t(k === "gym" ? "owner.gym" : k === "cafe" ? "owner.cafe" : "owner.shop")}</span>
                <span className="s1-num" style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>
                  {pct(g[k], day.total_sales)}%
                </span>
                <span className="s1-num" style={{ width: 78, textAlign: "right", font: "600 15px/20px var(--font-sans)" }}>
                  {baht(g[k])}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Section title={t("owner.visits")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <Kpi
            title={t("owner.checkins")}
            value={Math.round(members)}
            foot={t("owner.vsYesterday", { n: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}` })}
            footColor={delta >= 0 ? "var(--s1-green)" : "var(--s1-red)"}
          />
          <Kpi title={t("owner.dayPasses")} value={passes} foot={baht(isToday && pass ? pass.till : (v?.day_pass_sales ?? 0))} delay={90} />
        </div>
        <Card style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2, background: "var(--surface-3)" }}>
            <span className="s1-width-grow" style={{ width: `${pct(v?.members ?? 0, visitsTotal)}%`, background: "var(--s1-green)" }} />
            <span className="s1-width-grow" style={{ width: `${pct(passes, visitsTotal)}%`, background: "var(--s1-yellow)" }} />
          </div>
          <span className="s1-num" style={sub}>
            {t("owner.visitMix", { n: visitsTotal, m: Math.round(pct(v?.members ?? 0, visitsTotal)), d: Math.round(pct(passes, visitsTotal)) })}
          </span>
        </Card>
        <Card style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="s1-ping" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--s1-green)", flex: "none" }} />
          <span className="s1-num" style={{ flex: 1, font: "500 15px/20px var(--font-sans)" }}>
            {t("owner.pulse", { h: v?.last_hour ?? 0, m: v?.last_30 ?? 0 })}
          </span>
        </Card>
      </Section>

      {day && (
        <Section
          title={t("owner.memberships")}
          right={
            <span className="s1-num" style={{ font: "600 15px/20px var(--font-sans)" }}>
              {soldQty} · {baht(soldTill)}
            </span>
          }
        >
          <Group className="s1-stagger">
            {sold.map((r) => {
              const p = planByProduct(r.product);
              return (
                <Row
                  key={r.product}
                  style={{ minHeight: 56, padding: "10px 16px" }}
                  leading={
                    <Disc tone="money" style={{ width: 32, height: 32, font: "700 13px/1 var(--font-sans)" }} aria-hidden="true">
                      {r.qty}
                    </Disc>
                  }
                  title={<span style={{ fontSize: 15 }}>{p ? (lang === "th" && p.name_th ? p.name_th : p.name) : r.product}</span>}
                  sub={<span style={{ fontSize: 13 }}>{t("owner.each", { price: baht(r.qty ? r.till / r.qty : 0) })}</span>}
                  meta={
                    <span className="s1-num" style={{ font: "600 15px/20px var(--font-sans)" }}>
                      {baht(r.till)}
                    </span>
                  }
                />
              );
            })}
          </Group>
          {recon && (
            <span className={recon.match ? "s1-pill s1-pill--active" : "s1-pill s1-pill--expiring"} style={{ alignSelf: "flex-start", marginLeft: 4 }}>
              {recon.match ? t("owner.match") : t("owner.mismatch")}
            </span>
          )}
        </Section>
      )}

      {day && (
        <Section title={t("owner.payments")}>
          <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {pays.map((p) => (
              <div key={p.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "500 15px/20px var(--font-sans)" }}>
                    {p.key === "cash" ? t("owner.cash") : p.key === "card" ? t("owner.card") : p.key === "promptpay" ? "PromptPay" : p.parts.map((x) => x.name).join(" · ")}
                    {p.key === "card" && p.parts.length > 1 ? ` · ${p.parts.map((x) => `${x.name} ${baht(x.amount)}`).join(" · ")}` : ""} · {Math.round(pct(p.amount, day.total_sales))}%
                  </span>
                  <span className="s1-num" style={{ font: "600 15px/20px var(--font-sans)" }}>
                    {baht(p.amount)}
                  </span>
                </div>
                <Bar value={p.amount} max={day.total_sales} color={p.key === "cash" ? "var(--s1-green)" : p.key === "promptpay" ? "var(--s1-blue)" : "var(--surface-4)"} />
              </div>
            ))}
          </Card>
          <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={label}>{t("owner.byStaff")}</span>
            {staffRows(d.lines, d.staff).map((s) => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ font: "500 15px/20px var(--font-sans)" }}>
                  {s.name} · {s.sales}
                </span>
                <span className="s1-num" style={{ font: "600 15px/20px var(--font-sans)" }}>
                  {baht(s.till)}
                </span>
              </div>
            ))}
          </Card>
          <span className="s1-num" style={{ font: "500 12px/17px var(--font-sans)", color: "var(--text-tertiary)", padding: "0 4px" }}>
            {t("owner.vatNote", { net: baht(day.net_sales), vat: baht(day.vat), cost: baht(day.cost) })}
          </span>
        </Section>
      )}
    </>
  );
}
