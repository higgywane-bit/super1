import { useQueryClient } from "@tanstack/react-query";
import { Droplet, Footprints, Moon, Scale, Send, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { coach, type ClientDetail } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Button, Card, Icon, Input, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel, whenLabel } from "../../../i18n/format";
import { checkinIsLate } from "../../../lib/coach";
import { addDays } from "../../../lib/dates";

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const one = (n: number | null) => (n == null ? "—" : (Math.round(n * 10) / 10).toString());

/** C05 · Check-ins: four numbers, a nudge when they've gone quiet, the last 10 days, a note to their Home. */
export function CheckinsTab({ d, today, coachId }: { d: ClientDetail; today: string; coachId: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const first = d.member.first_name;
  const byDate = new Map(d.checkins.map((c) => [c.date, c]));
  const days = Array.from({ length: 10 }, (_, i) => addDays(today, -i));
  const rows = d.checkins;
  const latestW = rows.find((r) => r.weight_kg != null);
  const delta = latestW && d.weight_first && latestW.date !== d.weight_first.date ? Number(latestW.weight_kg) - Number(d.weight_first.kg) : null;
  const late = checkinIsLate(d.streak.last ? d.streak.days_since ?? 0 : null);
  const fail = (e: unknown) => {
    const u = toUiError(e);
    toast(t(u.key, u.vars), { tone: "stop" });
  };

  const stats: [string, string][] = [
    [t("coach.sleep"), avg(rows.map((r) => r.sleep_h)) == null ? "—" : `${one(avg(rows.map((r) => r.sleep_h)))} h`],
    [t("coach.energy"), avg(rows.map((r) => r.energy)) == null ? "—" : `${one(avg(rows.map((r) => r.energy)))} / 5`],
    [t("coach.water"), avg(rows.map((r) => r.water_l)) == null ? "—" : `${one(avg(rows.map((r) => r.water_l)))} L`],
    [t("coach.weight"), latestW ? `${Number(latestW.weight_kg)} kg${delta != null ? ` (${delta > 0 ? "+" : delta < 0 ? "−" : ""}${one(Math.abs(delta))})` : ""}` : "—"],
  ];
  const val = (icon: typeof Moon, text: string | null, label: string): ReactNode =>
    text == null ? null : (
      <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon icon={icon} size={14} style={{ color: "var(--text-tertiary)" }} label={label} />
        {text}
      </span>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {late && (
        <div data-testid="late-banner" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 18px", borderRadius: 999, background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)" }}>
          <span style={{ flex: 1, font: "600 14px/19px var(--font-sans)" }}>{d.streak.last ? t("coach.lateBanner", { name: first, n: d.streak.days_since ?? 0 }) : t("coach.lateNever", { name: first })}</span>
          <Button
            size="sm"
            disabled={busy || d.nudged_today}
            style={{ borderRadius: 999, background: "var(--s1-yellow)", color: "var(--background)" }}
            onClick={async () => {
              setBusy(true);
              try {
                await coach.nudge(d.member.id);
                toast(t("coach.nudged", { name: first }), { tone: "go" });
                void qc.invalidateQueries({ queryKey: ["coach", "client", d.member.id] });
              } catch (e) {
                fail(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {d.nudged_today ? t("coach.nudgedToday") : t("coach.nudge")}
          </Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {stats.map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 4px" }}>
            <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{k}</span>
            <span className="s1-num" style={{ font: "700 22px/28px var(--font-sans)" }}>
              {v}
            </span>
          </div>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }} data-testid="checkins-table">
        {days.map((day, i) => {
          const r = byDate.get(day);
          return (
            <div key={day} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 16px", boxShadow: i ? "inset 0 1px 0 var(--hairline)" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ width: 92, font: "600 15px/20px var(--font-sans)", color: r ? "var(--foreground)" : "var(--text-tertiary)" }}>{dayLabel(day, lang, today)}</span>
                {r ? (
                  <span style={{ display: "flex", gap: 14, flexWrap: "wrap", font: "500 14px/19px var(--font-sans)" }} className="s1-num">
                    {val(Moon, r.sleep_h != null ? `${r.sleep_h} h` : null, t("coach.sleep"))}
                    {val(Zap, r.energy != null ? `${r.energy}/5` : null, t("coach.energy"))}
                    {val(Droplet, r.water_l != null ? `${r.water_l} L` : null, t("coach.water"))}
                    {val(Footprints, r.steps != null ? r.steps.toLocaleString("en-US") : null, t("coach.steps"))}
                    {val(Scale, r.weight_kg != null ? `${r.weight_kg} kg` : null, t("coach.weight"))}
                  </span>
                ) : (
                  <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--s1-yellow)" }}>{t("coach.noCheckin")}</span>
                )}
              </div>
              {r?.note && <span style={{ marginLeft: 106, font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>“{r.note}”</span>}
            </div>
          );
        })}
      </Card>

      <form
        style={{ display: "flex", gap: 8 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!note.trim() || !coachId) return;
          setBusy(true);
          try {
            await coach.addNote(d.member.id, coachId, note.trim());
            setNote("");
            toast(t("coach.noteSent", { name: first }), { tone: "go" });
            void qc.invalidateQueries({ queryKey: ["coach", "client", d.member.id] });
          } catch (err) {
            fail(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input aria-label={t("coach.notePh", { name: first })} placeholder={t("coach.notePh", { name: first })} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, borderRadius: 999 }} />
        <button type="submit" aria-label={t("coach.send")} disabled={busy || !note.trim()} className="s1-btn s1-btn--primary s1-btn--icon" style={{ width: 48, height: 48, borderRadius: 24, opacity: note.trim() ? 1 : 0.4 }}>
          <Icon icon={Send} size={18} />
        </button>
      </form>
      {d.notes.map((n) => (
        <div key={n.id} style={{ display: "flex", gap: 12, justifyContent: "space-between", padding: "0 6px", font: "500 14px/20px var(--font-sans)" }}>
          <span style={{ whiteSpace: "pre-wrap" }}>{n.body}</span>
          <span style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{whenLabel(n.at, lang, today)}</span>
        </div>
      ))}
    </div>
  );
}
