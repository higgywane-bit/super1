import { Smartphone } from "lucide-react";
import { Card, Disc, Group, Icon, Row } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht, dayLabel } from "../../../i18n/format";
import { cafe } from "./derive";
import { Bar, label, Notice, Section } from "./parts";
import type { useOwnerToday } from "./useOwnerData";

/** O05 · Café: total and items from Qashier, categories, top sellers, shake add-ons, orders from the app. */
export function CafeTab({ d }: { d: ReturnType<typeof useOwnerToday> }) {
  const { t, lang } = useI18n();
  if (!d.day) return d.dayLoaded ? <Notice>{t("owner.noImports")}</Notice> : null;
  const planMods = new Set(d.plans.map((p) => p.qashier_modifier).filter(Boolean) as string[]);
  const c = cafe(d.lines, planMods);
  const max = Math.max(1, ...c.cats.map((x) => x.till));
  return (
    <>
      <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={label}>{t("owner.cafeToday")}</span>
          <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>Qashier · {dayLabel(d.day.business_date, lang)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="s1-num" style={{ font: "700 44px/50px var(--font-sans)", letterSpacing: "-0.03em" }}>
            {baht(c.total)}
          </span>
          <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("owner.cafeItems", { n: c.items })}</span>
        </div>
        {c.cats.map((x) => (
          <div key={x.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: "500 15px/20px var(--font-sans)", gap: 10 }}>
              <span>
                {x.name} <span style={{ color: "var(--text-tertiary)" }}>· {x.qty}</span>
              </span>
              <span className="s1-num" style={{ fontWeight: 600 }}>
                {baht(x.till)}
              </span>
            </div>
            <Bar value={x.till} max={max} color="color-mix(in srgb, var(--s1-blue) 55%, white)" />
          </div>
        ))}
      </Card>
      <Section title={t("owner.topSellers")}>
        <Group>
          {c.top.map((x, i) => (
            <Row
              key={x.name}
              leading={<span className="s1-num" style={{ width: 20, color: "var(--text-tertiary)", font: "600 15px/1 var(--font-sans)" }}>{i + 1}</span>}
              title={x.name}
              meta={
                <span className="s1-num" style={{ display: "flex", gap: 14, font: "600 15px/20px var(--font-sans)" }}>
                  <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>{x.qty}×</span>
                  {baht(x.till)}
                </span>
              }
            />
          ))}
        </Group>
      </Section>
      {c.addOns.length > 0 && (
        <Section title={t("owner.addOns")}>
          <Group>
            {c.addOns.map((x) => (
              <Row key={x.name} title={x.name} meta={<span className="s1-num" style={{ display: "flex", gap: 14, font: "600 15px/20px var(--font-sans)" }}><span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>{x.qty}×</span>{baht(x.till)}</span>} />
            ))}
          </Group>
        </Section>
      )}
      <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <Disc tone="money">
          <Icon icon={Smartphone} />
        </Disc>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="s1-headline" style={{ fontSize: 16 }}>
            {t("owner.appOrders", { n: d.visits?.app_orders ?? 0 })}
          </span>
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("owner.appOrdersSub")}</span>
        </div>
      </Card>
    </>
  );
}
