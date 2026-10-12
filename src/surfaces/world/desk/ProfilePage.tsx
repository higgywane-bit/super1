import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Dumbbell } from "lucide-react";
import { desk, type MemberDetail, type MembershipRow } from "../../../client/desk";
import { toUiError } from "../../../client/errors";
import { Avatar, Button, Card, Disc, Group, Icon, Pill, useToast } from "../../../components/kit";
import { useI18n, type T } from "../../../i18n";
import { baht, dayLabel, LANG_NAMES, time } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { useDesk } from "./DeskContext";
import { methodText, statusOf } from "./words";

/** The plan that matters today: the one covering today, else the next, else the latest. */
export function currentPlan(ms: MembershipRow[], kind: "membership" | "visits", today = localDate()): MembershipRow | undefined {
  const live = ms.filter((m) => !m.voided && m.kind === kind);
  return live.find((m) => m.starts_on <= today && today <= m.ends_on) ?? live.filter((m) => m.starts_on > today).at(-1) ?? live[0];
}

export function validPt(ms: MembershipRow[], today = localDate()): MembershipRow | undefined {
  return ms.find((m) => !m.voided && m.kind === "pt" && m.starts_on <= today && today <= m.ends_on && (m.sessions_total ?? 0) > m.sessions_used);
}

function historyText(t: T, d: MemberDetail, h: MemberDetail["history"][number]): string {
  if (h.kind === "membership.sold") {
    const m = d.memberships.find((x) => x.id === h.data.membership_id);
    if (m) return t("desk.feed.sold", { plan: m.plan, price: baht(m.price), method: methodText(t, m.method) }) + (h.by ? ` · ${h.by}` : "");
  }
  return h.message + (h.by ? ` · ${h.by}` : "");
}

/** D06 · Member profile. */
export function ProfilePage({ memberId }: { memberId: string }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { open, shift, refresh } = useDesk();
  const q = useQuery({ queryKey: ["desk", "detail", memberId], queryFn: () => desk.detail(memberId) });
  const d = q.data;
  if (!d) return <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>;

  const today = localDate();
  const m = d.member;
  const c = d.card;
  const st = statusOf(c, !!m.archived_at);
  const plan = currentPlan(d.memberships, "membership") ?? currentPlan(d.memberships, "visits");
  const pt = validPt(d.memberships);
  const activePause = d.pauses.find((p) => p.until >= today);
  const tag = d.credentials.find((x) => !x.revoked && x.kind === "tag") ?? d.credentials.find((x) => !x.revoked);

  let big = "—";
  let bigLabel = "";
  let bigColor = "var(--foreground)";
  if ((c.status === "active" || c.status === "expiring") && c.days_left != null) {
    big = String(c.days_left);
    bigLabel = t("desk.daysLeft");
  } else if (c.status === "active" && c.visits_left != null) {
    big = String(c.visits_left);
    bigLabel = t("desk.visitsLeft");
  } else if (c.status === "expired") {
    big = "0";
    bigLabel = t("desk.endedOn", { date: dayLabel(c.ended_on, lang) });
    bigColor = "var(--s1-red)";
  } else if (c.status === "paused") {
    big = "—";
    bigLabel = t("desk.pausedUntil", { date: dayLabel(c.paused_until, lang) });
  } else if (c.status === "upcoming") {
    bigLabel = t("desk.startsOn", { date: dayLabel(c.starts_on, lang) });
  }

  const via = { qr: t("via.qr"), desk: t("via.desk"), import: t("via.import"), admin: t("via.admin") }[m.created_via];
  const appText = m.has_login ? t("desk.app.signedIn") : d.invite ? t("desk.app.invited", { date: dayLabel(d.invite.created_at.slice(0, 10), lang) }) : t("desk.app.none");

  async function useOne() {
    if (!shift) return;
    try {
      const r = await desk.useSession(m.id, shift.staffId);
      refresh();
      toast(t("desk.ptToast", { name: m.name, left: r.left, total: r.total }), {
        tone: "go",
        ms: 10_000,
        action: {
          label: t("desk.undo"),
          onClick: () =>
            void desk.undoSession(r.session_id, shift.staffId).then(() => {
              refresh();
              toast(t("desk.undone", { left: r.left + 1 }));
            }),
        },
      });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    }
  }

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button className="s1-btn s1-btn--plain" type="button" onClick={() => void navigate({ to: "/w/members" })} style={{ padding: 0, color: "var(--text-secondary)" }}>
          <Icon icon={ChevronLeft} />
          {t("desk.members")}
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!m.archived_at &&
            (activePause ? (
              <Button variant="secondary" size="sm" onClick={() => open({ type: "endPause", memberId: m.id, pauseId: activePause.id, from: activePause.from, until: activePause.until })}>
                {t("desk.endPause")}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => open({ type: "pause", memberId: m.id })}>
                {t("desk.pause")}
              </Button>
            ))}
          <Button variant="secondary" size="sm" onClick={() => open({ type: "archive", memberId: m.id })}>
            {m.archived_at ? t("desk.restore") : t("desk.archiveOrMerge")}
          </Button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={m.name} size={56} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <h1 className="s1-title2" style={{ fontSize: 26 }}>
                  {m.name}
                </h1>
                <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                  {t("desk.memberMeta", { no: String(m.member_no).padStart(4, "0"), date: dayLabel(m.created_at.slice(0, 10), lang, today), via })}
                </span>
              </div>
            </div>
            <Pill tone={st.tone} style={{ alignSelf: "flex-start" }}>
              {t(st.key)}
            </Pill>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span className="s1-num" style={{ font: "700 72px/72px var(--font-sans)", letterSpacing: "-0.04em", color: bigColor }}>
                {big}
              </span>
              <span style={{ font: "600 17px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{bigLabel}</span>
            </div>
            {plan && (
              <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
                {[
                  t("desk.planLineShort", { plan: plan.plan, from: dayLabel(plan.starts_on, lang), to: dayLabel(plan.ends_on, lang, today) }),
                  baht(plan.price),
                  methodText(t, plan.method),
                  plan.sold_by ? t("desk.soldBy", { name: plan.sold_by }) : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {d.memberships
              .filter((x) => !x.voided && x.kind === "membership" && x.starts_on > today && x.id !== plan?.id)
              .map((x) => (
                <span key={x.id} style={{ font: "500 14px/19px var(--font-sans)", color: "var(--s1-blue)" }}>
                  {t("desk.queuedPlan", { plan: x.plan, from: dayLabel(x.starts_on, lang), to: dayLabel(x.ends_on, lang) })}
                </span>
              ))}
            <Button size="lg" block onClick={() => open({ type: "sell", memberId: m.id })} disabled={!!m.archived_at}>
              {t("desk.sellRenew")}
            </Button>
          </Card>
          {pt && (
            <Card style={{ padding: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Disc tone="pt">
                <Icon icon={Dumbbell} />
              </Disc>
              <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="s1-headline" style={{ fontSize: 16 }}>
                  {t("desk.ptCard", { plan: pt.plan, left: (pt.sessions_total ?? 0) - pt.sessions_used, total: pt.sessions_total ?? 0 })}
                </span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                  {t("desk.ptMeta", { coach: pt.coach ?? "", bought: dayLabel(pt.sold_at.slice(0, 10), lang), date: dayLabel(pt.ends_on, lang, today) })}
                </span>
              </div>
              <button className="s1-btn s1-btn--sm" type="button" onClick={() => void useOne()} style={{ background: "var(--s1-pink)", color: "#000" }}>
                {t("desk.useSession")}
              </button>
            </Card>
          )}
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.history")}</span>
            {d.history.slice(0, 8).map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, font: "500 14px/20px var(--font-sans)" }}>
                <span>{historyText(t, d, h)}</span>
                <span className="s1-num" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {dayLabel(h.at.slice(0, 10), lang)} {time(h.at)}
                </span>
              </div>
            ))}
          </Card>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.tag")}</span>
            {tag ? (
              <span className="s1-num" style={{ font: "700 26px/32px var(--font-sans)", letterSpacing: "0.12em" }}>
                {tag.code}
              </span>
            ) : (
              <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.noTag")}</span>
            )}
            <button className="s1-link" type="button" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => open({ type: "addTag", memberId: m.id })}>
              {t("desk.addTag")}
            </button>
          </Card>
          <Group>
            {[
              [t("desk.app"), appText, m.has_login ? "var(--s1-green)" : "var(--text-secondary)"],
              [t("desk.waiver"), d.waiver ? t("desk.waiver.signed", { date: dayLabel(d.waiver.signed_at.slice(0, 10), lang, today) }) : t("desk.waiver.none"), "var(--text-secondary)"],
              [t("desk.phone"), m.phone ?? "—", "var(--text-secondary)"],
              [t("desk.email"), m.email ?? "—", "var(--text-secondary)"],
              [t("desk.language"), LANG_NAMES[m.lang], "var(--text-secondary)"],
            ].map(([k, v, color]) => (
              <div key={k} className="s1-row" style={{ minHeight: 56 }}>
                <span className="s1-row__main">
                  <span style={{ font: "500 15px/20px var(--font-sans)" }}>{k}</span>
                </span>
                <span className="s1-num" style={{ font: "500 14px/19px var(--font-sans)", color, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>
                  {v}
                </span>
              </div>
            ))}
          </Group>
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.visits")}</span>
            {d.visits.length === 0 && <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.noVisits")}</span>}
            {d.visits.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", font: "500 14px/20px var(--font-sans)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.result === "allowed" ? "var(--s1-green)" : "var(--s1-red)" }} />
                  {v.day === today ? t("desk.today") : dayLabel(v.day, lang)}
                </span>
                <span className="s1-num" style={{ color: "var(--text-secondary)" }}>
                  {time(v.at)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
