import { useState } from "react";
import { member, type CartLine, type MenuItem, type Order } from "../../../client/member";
import { toUiError } from "../../../client/errors";
import { Photo } from "../../shared/Photo";
import { Button, Card, Icon, Sheet, Stepper, useToast } from "../../../components/kit";
import { useI18n, type Lang } from "../../../i18n";
import { baht } from "../../../i18n/format";
import { lineTotal } from "../../../lib/workout";
import { useMemberHome, useMenu } from "./useMember";

const nameOf = (i: { name_en: string; name_th: string | null; name_ru?: string | null }, lang: Lang) => (lang === "th" && i.name_th) || (lang === "ru" && i.name_ru) || i.name_en;

/** M08 · Fuel: targets, the coach's picks, the café menu by category; M09 item sheet; M10 order card. */
export function FuelPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const h = useMemberHome().data!;
  const menu = useMenu().data;
  const [cat, setCat] = useState<string | null>(null);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const cats = (menu?.cats ?? []).filter((c) => menu?.items.some((i) => i.category_id === c.id));
  const current = cat ?? cats[0]?.id ?? null;
  const priceOf = (l: CartLine) => {
    const it = menu?.items.find((i) => i.id === l.item_id);
    return it ? lineTotal(it.price_thb, l.options.map((o) => menu!.options.find((x) => x.id === o)?.price_thb ?? 0), l.qty) : 0;
  };
  const total = cart.reduce((a, l) => a + priceOf(l), 0);
  const picks = h.picks.map((p) => ({ ...p, item: menu?.items.find((i) => i.id === p.item_id) })).filter((p) => p.item);

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: cart.length ? 72 : 0 }}>
      <h1 className="s1-largetitle" style={{ margin: 0 }}>
        {t("m.fuel")}
      </h1>
      {h.targets && (
        <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ font: "600 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.targetsFrom", { coach: h.targets.coach })}</span>
            <span style={{ font: "700 17px/22px var(--font-sans)" }}>{t("m.kcal", { n: h.targets.kcal.toLocaleString("en-US") })}</span>
          </div>
          {(
            [
              ["m.protein", h.targets.protein_g, "var(--s1-blue)", 250],
              ["m.carbs", h.targets.carbs_g, "color-mix(in srgb, var(--s1-blue) 55%, white)", 400],
              ["m.fat", h.targets.fat_g, "var(--surface-4)", 150],
            ] as const
          ).map(([k, g, color, scale]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", justifyContent: "space-between", font: "600 15px/20px var(--font-sans)" }}>
                <span>{t(k)}</span>
                <span className="s1-num">{g} g</span>
              </span>
              <span aria-hidden style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
                <span className="s1-width-grow" style={{ display: "block", height: "100%", width: `${Math.min(100, (g / scale) * 100)}%`, background: color }} />
              </span>
            </div>
          ))}
        </Card>
      )}

      {picks.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px", color: "var(--s1-pink)" }}>
            {t("m.picksFrom", { coach: picks[0].coach })}
          </h2>
          <div className="s1-hscroll">
            {picks.map((p) => (
              <button key={p.item_id} type="button" className="s1-tap" onClick={() => setItem(p.item!)} style={{ width: 160, textAlign: "left", padding: 14, borderRadius: "var(--radius-tile)", border: 0, cursor: "pointer", background: "var(--surface-2)", color: "var(--foreground)", boxShadow: "inset 0 0 0 1px var(--s1-pink-tint)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "600 15px/20px var(--font-sans)" }}>{nameOf(p.item!, lang)}</span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{baht(p.item!.price_thb)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="s1-title2" style={{ margin: 0 }}>
            {t("m.cafe")}
          </h2>
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.payCounter")}</span>
        </div>
        <div className="s1-hscroll" style={{ gap: 8 }}>
          {cats.map((c) => (
            <button key={c.id} type="button" aria-pressed={current === c.id} className={`s1-pill s1-pill--plain s1-tap ${current === c.id ? "s1-chip-on" : "s1-chip-off"}`} style={{ height: 36, padding: "0 14px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)" }} onClick={() => setCat(c.id)}>
              {nameOf(c, lang)}
            </button>
          ))}
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {(menu?.items ?? [])
            .filter((i) => i.category_id === current)
            .map((i, n) => {
              return (
                <button key={i.id} type="button" data-testid="menu-item" className="s1-tap" onClick={() => setItem(i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer", boxShadow: n ? "inset 0 1px 0 var(--hairline)" : undefined }}>
                  <Photo path={i.photo_path} size={52} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "600 16px/21px var(--font-sans)" }}>{nameOf(i, lang)}</span>
                    {i.desc_en && <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(lang === "th" && i.desc_th) || (lang === "ru" && i.desc_ru) || i.desc_en}</span>}
                  </span>
                  <span className="s1-num" style={{ font: "700 16px/21px var(--font-sans)" }}>
                    {baht(i.price_thb)}
                  </span>
                </button>
              );
            })}
        </Card>
      </section>

      {cart.length > 0 && (
        <div className="s1-rise" style={{ position: "fixed", left: 16, right: 16, bottom: 100, maxWidth: 488, margin: "0 auto", zIndex: 5 }}>
          <Button
            size="lg"
            block
            disabled={busy}
            style={{ borderRadius: 999, boxShadow: "var(--shadow-sheet)" }}
            onClick={async () => {
              setBusy(true);
              try {
                setOrder(await member.order(cart));
                setCart([]);
              } catch (e) {
                const u = toUiError(e);
                toast(t(u.key, u.vars), { tone: "stop" });
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("m.showCounter", { price: baht(total) })}
          </Button>
        </div>
      )}

      <ItemSheet item={item} onClose={() => setItem(null)} onAdd={(l) => (setCart((c) => [...c, l]), setItem(null))} />
      <Sheet open={!!order} onClose={() => setOrder(null)} title={t("m.counterTitle")} width={460}>
        {order && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 22px 28px" }} data-testid="counter-card">
            <div style={{ background: "#ffffff", color: "#000000", borderRadius: "var(--radius-card)", padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ font: "700 13px/18px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55 }}>
                {h.member.name} · #{String(h.member.member_no).padStart(4, "0")}
              </span>
              {order.items.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "700 18px/23px var(--font-sans)" }}>
                      {l.qty > 1 ? `${l.qty} × ` : ""}
                      {l.name}
                    </span>
                    {l.name_th && <span style={{ font: "500 14px/19px var(--font-sans)", opacity: 0.6 }}>{l.name_th}</span>}
                    {l.options.map((o) => (
                      <span key={o.id} style={{ font: "500 14px/19px var(--font-sans)", opacity: 0.7 }}>
                        + {o.label}
                      </span>
                    ))}
                  </span>
                  <span className="s1-num" style={{ font: "700 17px/23px var(--font-sans)" }}>
                    {baht(l.unit * l.qty)}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.12)", paddingTop: 12, font: "800 22px/28px var(--font-sans)" }}>
                <span>{t("m.total")}</span>
                <span className="s1-num">{baht(order.total)}</span>
              </div>
            </div>
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-secondary)", font: "500 14px/20px var(--font-sans)" }}>{t("m.counterNote")}</p>
            <Button size="lg" block onClick={() => setOrder(null)}>
              {t("m.newOrder")}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** M09 · One item: photo, names, price, ingredients, add-ons, macros (only when checked), quantity, Add. */
function ItemSheet({ item, onClose, onAdd }: { item: MenuItem | null; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const { t, lang } = useI18n();
  const menu = useMenu().data;
  const [opts, setOpts] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [of, setOf] = useState<string | null>(null);
  if ((item?.id ?? null) !== of) {
    setOf(item?.id ?? null);
    setOpts([]);
    setQty(1);
  }
  if (!item) return <Sheet open={false} onClose={onClose} title="" children={null} />;
  const groups = (menu?.groups ?? []).filter((g) => g.item_ids.includes(item.id) || g.category_ids.includes(item.category_id));
  const price = lineTotal(item.price_thb, opts.map((o) => menu?.options.find((x) => x.id === o)?.price_thb ?? 0), qty);
  const toggle = (groupId: string, id: string, max: number | null) =>
    setOpts((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      const inGroup = cur.filter((x) => menu?.options.find((o) => o.id === x)?.group_id === groupId);
      const keep = max != null && inGroup.length >= max ? cur.filter((x) => x !== inGroup[0]) : cur;
      return [...keep, id];
    });
  return (
    <Sheet open onClose={onClose} title={item.name_en} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 22px 28px" }}>
        {item.photo_path && <Photo path={item.photo_path} size="100%" radius="var(--radius-card)" style={{ aspectRatio: "4 / 3", height: "auto" }} />}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 className="s1-title2" style={{ margin: 0 }}>
              {nameOf(item, lang)}
            </h2>
            {lang !== "th" && item.name_th && <span style={{ color: "var(--text-secondary)", font: "500 15px/20px var(--font-sans)" }}>{item.name_th}</span>}
          </div>
          <span className="s1-num" style={{ font: "700 20px/26px var(--font-sans)" }}>
            {baht(item.price_thb)}
          </span>
        </div>
        {item.desc_en && <p style={{ margin: 0, color: "var(--text-secondary)", font: "500 15px/21px var(--font-sans)" }}>{(lang === "th" && item.desc_th) || (lang === "ru" && item.desc_ru) || item.desc_en}</p>}
        {item.macros_verified_at && item.kcal != null ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: "var(--radius-tile)", background: "var(--surface-2)" }} data-testid="macros">
            {(
              [
                [`${item.kcal}`, "kcal"],
                [`${Number(item.protein_g ?? 0)} g`, t("m.protein")],
                [`${Number(item.carbs_g ?? 0)} g`, t("m.carbs")],
                [`${Number(item.fat_g ?? 0)} g`, t("m.fat")],
              ] as const
            ).map(([v, k]) => (
              <span key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span className="s1-num" style={{ font: "700 17px/22px var(--font-sans)" }}>
                  {v}
                </span>
                <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{k}</span>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>{t("m.beingVerified")}</span>
        )}
        {groups.map((g) => (
          <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "600 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{(lang === "th" && g.label_th) || (lang === "ru" && g.label_ru) || g.label_en}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(menu?.options ?? [])
                .filter((o) => o.group_id === g.id)
                .map((o) => {
                  const on = opts.includes(o.id);
                  return (
                    <button key={o.id} type="button" aria-pressed={on} className={`s1-pill s1-pill--plain s1-tap ${on ? "s1-chip-blue" : "s1-chip-off"}`} style={{ height: 38, padding: "0 14px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)" }} onClick={() => toggle(g.id, o.id, g.max_choices)}>
                      {(lang === "th" && o.label_th) || o.label_en}
                      {o.price_thb ? ` +${baht(o.price_thb)}` : ""}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Stepper value={qty} min={1} max={20} label={t("m.qty")} lessLabel={t("m.less", { what: t("m.qty") })} moreLabel={t("m.more", { what: t("m.qty") })} onChange={setQty} />
          <Button size="lg" style={{ flex: 1 }} onClick={() => onAdd({ item_id: item.id, qty, options: opts })}>
            {t("m.addToOrder", { price: baht(price) })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

