import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, TrendingUp } from "lucide-react";
import { Card, Icon } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayStats } from "../../../lib/coach";
import { useMemberHome } from "./useMember";

/** M04 · Train: each program's days with last-time weights; start any day; or start your own; progress. */
export function TrainPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const h = useMemberHome().data!;
  const last = (id: string | null, name: string) => h.last[id ?? ""] ?? h.last[name.toLowerCase()];

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 className="s1-largetitle" style={{ margin: 0 }}>
        {t("app.train")}
      </h1>
      {h.programs.length === 0 && <p style={{ margin: 0, color: "var(--text-secondary)", font: "500 15px/22px var(--font-sans)" }}>{t("m.noProgram")}</p>}
      {h.programs.map((p) => (
        <section key={p.program_id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {p.own ? t("m.yourOwn") : t("m.fromCoach", { coach: p.coach ?? "" })}
          </h2>
          {p.body.days.map((d, i) => {
            const s = dayStats(d);
            return (
              <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
                <button type="button" className="s1-tap" onClick={() => void navigate({ to: "/a/workout", search: { program: p.program_id, day: i } })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer" }}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "700 18px/23px var(--font-sans)" }}>{d.name}</span>
                    <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.dayMeta", { n: s.exercises, min: s.minutes })}</span>
                  </span>
                  <Icon icon={ChevronRight} size={18} style={{ color: "var(--text-tertiary)" }} />
                </button>
                {d.items.map((it, n) => {
                  const l = last(it.exercise_id, it.name);
                  return (
                    <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 18px", boxShadow: "inset 0 1px 0 var(--hairline)", font: "500 14px/19px var(--font-sans)" }}>
                      <span>{it.name}</span>
                      <span className="s1-num" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {it.sets} × {it.log_type === "time" ? `${it.seconds ?? 30} s` : it.reps}
                        {l?.kg != null ? ` · ${t("m.lastTime", { v: `${Number(l.kg)} kg` })}` : ""}
                      </span>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </section>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="button" className="s1-btn s1-btn--secondary" style={{ flex: 1 }} onClick={() => void navigate({ to: "/a/workout", search: {} })}>
          <Icon icon={Plus} size={18} /> {t("m.startOwn")}
        </button>
        <button type="button" className="s1-btn s1-btn--secondary" style={{ flex: 1 }} onClick={() => void navigate({ to: "/a/progress" })}>
          <Icon icon={TrendingUp} size={18} /> {t("m.progress")}
        </button>
      </div>
    </div>
  );
}
