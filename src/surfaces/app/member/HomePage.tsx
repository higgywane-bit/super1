import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, HeartPulse } from "lucide-react";
import type { MemberHome } from "../../../client/member";
import { Avatar, Card, Icon } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { time } from "../../../i18n/format";
import { dayStats } from "../../../lib/coach";
import { isAfter, withinHours } from "../../../lib/dates";
import { nextDay } from "../../../lib/workout";
import { useMemberHome } from "./useMember";

/** Which coach program to train today and which day of it. */
export function todaysWorkout(h: MemberHome) {
  const p = h.programs[0];
  if (!p) return null;
  const i = nextDay(p.body.days, h.last_workout?.day_name);
  return i < 0 ? null : { program: p, index: i, day: p.body.days[i] };
}

/** M03 · Home: greeting, coach news, today's workout, days left + PT left, check-in, today's targets. */
export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const h = useMemberHome().data!;
  const hour = Number(time(new Date()).slice(0, 2));
  const greet = hour < 12 ? t("m.morning") : hour < 18 ? t("m.afternoon") : t("m.evening");
  const today = todaysWorkout(h);
  const fresh = h.programs.find((p) => !p.own && p.coach && withinHours(p.sent_at, 72));
  const stats = today ? dayStats(today.day) : null;

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{greet}</span>
          <h1 className="s1-largetitle" style={{ margin: 0 }}>
            {h.member.first_name}
          </h1>
        </div>
        <button type="button" aria-label={t("app.me")} onClick={() => void navigate({ to: "/a/me" })} style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }}>
          <Avatar name={h.member.name} size={44} />
        </button>
      </header>

      {(h.note || fresh) && (
        <Card className="s1-slide-down" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "600 15px/20px var(--font-sans)" }}>{h.note && (!fresh || isAfter(h.note.at, fresh.sent_at)) ? t("m.noteFrom", { coach: h.note.coach }) : t("m.sentProgram", { coach: fresh!.coach! })}</span>
          <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{h.note && (!fresh || isAfter(h.note.at, fresh.sent_at)) ? h.note.body : fresh!.body.days.map((d) => d.name).join(" · ")}</span>
        </Card>
      )}

      {today && (
        <button
          type="button"
          data-testid="today-card"
          className="s1-tap"
          onClick={() => void navigate({ to: "/a/workout", search: { program: today.program.program_id, day: today.index } })}
          style={{ border: 0, cursor: "pointer", textAlign: "left", borderRadius: "var(--radius-card)", padding: "20px 22px", background: "var(--s1-blue)", color: "var(--on-blue)", display: "flex", flexDirection: "column", gap: 8 }}
        >
          <span style={{ font: "600 14px/18px var(--font-sans)", opacity: 0.75 }}>{t("m.today")}</span>
          <span style={{ font: "700 28px/32px var(--font-sans)", letterSpacing: "-0.02em" }}>{today.day.name}</span>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: "600 15px/20px var(--font-sans)" }}>
            <span style={{ opacity: 0.75 }}>{t("m.dayMeta", { n: stats!.exercises, min: stats!.minutes })}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t("m.workoutNow")} <Icon icon={ArrowRight} size={18} />
            </span>
          </span>
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: h.pt ? "1fr 1fr" : "1fr", gap: 12 }}>
        <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 2 }} data-testid="days-left">
          {h.card.days_left != null ? (
            <>
              <span className="s1-kpi">{h.card.days_left}</span>
              <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                {t("m.daysLeft")} · {h.card.plan}
              </span>
            </>
          ) : (
            <span style={{ font: "600 15px/21px var(--font-sans)", color: "var(--s1-yellow)" }}>{t("m.noPlan")}</span>
          )}
        </Card>
        {h.pt && (
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 2 }} data-testid="pt-left">
            <span className="s1-kpi" style={{ color: "var(--s1-pink)" }}>
              {h.pt.left}
              <span style={{ fontSize: 20, color: "var(--text-tertiary)" }}> / {h.pt.total}</span>
            </span>
            <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.ptLeft", { coach: h.pt.coach })}</span>
          </Card>
        )}
      </div>

      <button type="button" className="s1-tap" onClick={() => void navigate({ to: "/a/checkin" })} style={{ border: 0, cursor: "pointer", textAlign: "left", borderRadius: "var(--radius-card)", padding: "16px 18px", background: "var(--surface-2)", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 14 }}>
        <span className="s1-disc s1-disc--warn" style={{ width: 40, height: 40 }}>
          <Icon icon={HeartPulse} size={20} />
        </span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "600 16px/21px var(--font-sans)" }}>{t("m.checkin")}</span>
          <span style={{ font: "500 14px/19px var(--font-sans)", color: h.checkin ? "var(--s1-green)" : "var(--text-secondary)" }}>{h.checkin ? t("m.checkedIn", { n: h.streak.streak }) : t("m.checkinSub")}</span>
        </span>
        <Icon icon={ChevronRight} size={18} style={{ color: "var(--text-tertiary)" }} />
      </button>

      {h.targets && (
        <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", font: "600 14px/19px var(--font-sans)" }}>
            <span style={{ color: "var(--text-secondary)" }}>{t("m.targets")}</span>
            <span>{t("m.kcal", { n: h.targets.kcal.toLocaleString("en-US") })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {(
              [
                ["m.protein", h.targets.protein_g],
                ["m.carbs", h.targets.carbs_g],
                ["m.fat", h.targets.fat_g],
              ] as const
            ).map(([k, g]) => (
              <span key={k} style={{ display: "flex", flexDirection: "column" }}>
                <span className="s1-num" style={{ font: "700 22px/28px var(--font-sans)" }}>
                  {g} g
                </span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t(k)}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
