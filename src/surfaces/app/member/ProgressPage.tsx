import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { member } from "../../../client/member";
import { Card, Icon } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel, localDayOf } from "../../../i18n/format";
import { useMemberHome } from "./useMember";

/** M07 · Progress: top set per exercise over time, personal bests, recent workouts. */
export function ProgressPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const today = useMemberHome().data!.today;
  const p = useQuery({ queryKey: ["member", "progress"], queryFn: member.progress }).data;
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <button type="button" className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", paddingLeft: 0, color: "var(--text-secondary)" }} onClick={() => void navigate({ to: "/a/train" })}>
        <Icon icon={ChevronLeft} size={20} /> {t("app.train")}
      </button>
      <h1 className="s1-largetitle" style={{ margin: 0 }}>
        {t("m.progress")}
      </h1>
      {p && p.recent.length === 0 && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{t("m.noWorkouts")}</p>}
      {p && p.bests.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("m.bests")}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {p.bests.map((b, i) => {
              const pts = p.series[b.name] ?? [];
              const max = Math.max(1, ...pts.map((x) => Number(x.kg)));
              const min = Math.min(...pts.map((x) => Number(x.kg)));
              return (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", boxShadow: i ? "inset 0 1px 0 var(--hairline)" : undefined }}>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "600 15px/20px var(--font-sans)" }}>{b.name}</span>
                    <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{dayLabel(localDayOf(b.at), lang, today)}</span>
                  </span>
                  <span aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
                    {pts.map((x, j) => (
                      <span key={j} style={{ width: 5, borderRadius: 2, height: 6 + ((Number(x.kg) - min) / Math.max(1, max - min)) * 22, background: Number(x.kg) === max ? "var(--s1-yellow)" : "var(--surface-4)" }} />
                    ))}
                  </span>
                  <span className="s1-num" style={{ font: "700 16px/21px var(--font-sans)", minWidth: 76, textAlign: "right" }}>
                    {Number(b.kg)} × {b.reps}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}
      {p && p.recent.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("m.recent")}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {p.recent.map((w, i) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", boxShadow: i ? "inset 0 1px 0 var(--hairline)" : undefined, font: "500 14px/19px var(--font-sans)" }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{w.day_name}</span>
                  <span style={{ color: "var(--text-secondary)" }}> · {dayLabel(localDayOf(w.started_at), lang, today)}</span>
                </span>
                <span className="s1-num" style={{ color: w.prs ? "var(--s1-yellow)" : "var(--text-secondary)" }}>
                  {t("m.setsLine", { sets: w.sets, kg: Math.round(Number(w.volume_kg)).toLocaleString("en-US") })}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
