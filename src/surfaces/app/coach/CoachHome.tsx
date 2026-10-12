import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { coach, type Client, type Lead, type LeadStage } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Avatar, Button, Card, Icon, Segmented, Sheet, useToast } from "../../../components/kit";
import { translate, useI18n } from "../../../i18n";
import { LANG_NAMES, dayLabel, monthLabel, whenLabel } from "../../../i18n/format";
import { checkinIsLate, whatsappUrl } from "../../../lib/coach";
import { PageHeader } from "../../world/StaffSidebar";
import { useCoachHome } from "./useCoach";

export const STAGE_TONE: Record<LeadStage, { color: string; background: string }> = {
  new: { color: "var(--s1-blue)", background: "var(--s1-blue-tint)" },
  contacted: { color: "var(--s1-yellow)", background: "var(--s1-yellow-tint)" },
  trial: { color: "var(--s1-pink)", background: "var(--s1-pink-tint)" },
  won: { color: "var(--s1-green)", background: "var(--s1-green-tint)" },
  not_now: { color: "var(--text-secondary)", background: "var(--surface-3)" },
};

const rowStyle = { width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer", minHeight: 64 } as const;

/** C02 · Your people: new leads (tap for stage, WhatsApp, Call), then clients (tap to open). */
export function CoachHome() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const home = useCoachHome();
  const [showNotNow, setShowNotNow] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const d = home.data;
  if (!d) return null;
  const open = d.leads.filter((l) => l.stage !== "not_now");
  const parked = d.leads.filter((l) => l.stage === "not_now");
  const leads = showNotNow ? [...open, ...parked] : open;

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
      <PageHeader
        title={t("coach.clientsLeads")}
        sub={`${dayLabel(d.today, lang)} · ${t("coach.summary", { clients: d.clients.length, sessions: d.sessions_month, month: monthLabel(d.today, lang).split(" ")[0] })}`}
      />

      {(leads.length > 0 || parked.length > 0) && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
            <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
              {t("coach.newLeads")}
            </h2>
            {parked.length > 0 && (
              <button type="button" onClick={() => setShowNotNow((v) => !v)} style={{ marginLeft: "auto", background: "none", border: 0, color: "var(--text-secondary)", font: "500 14px/19px var(--font-sans)", cursor: "pointer", minHeight: 44 }}>
                {showNotNow ? t("coach.hideNotNow") : t("coach.showNotNow", { n: parked.length })}
              </button>
            )}
          </div>
          {leads.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {leads.map((l, i) => (
                <button key={l.id} type="button" data-testid="lead-card" className={`s1-tap ${l.stage === "new" ? "s1-slide-down" : ""}`} onClick={() => setLead(l)} style={{ ...rowStyle, boxShadow: i ? "inset 0 1px 0 var(--hairline)" : undefined, opacity: l.stage === "not_now" ? 0.6 : 1 }}>
                  <Avatar name={l.name} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "600 16px/21px var(--font-sans)" }}>{l.name}</span>
                    <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                      {LANG_NAMES[l.lang]} · {whenLabel(l.created_at, lang, d.today)}
                    </span>
                  </span>
                  <span className="s1-pill" style={STAGE_TONE[l.stage]}>
                    {t(`coach.stage.${l.stage}`)}
                  </span>
                </button>
              ))}
            </Card>
          )}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
          {t("coach.clients")}
        </h2>
        {d.clients.length === 0 ? (
          <Card style={{ padding: 18, color: "var(--text-secondary)", font: "500 15px/22px var(--font-sans)" }}>{t("coach.noClients")}</Card>
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {d.clients.map((c, i) => (
              <ClientRow key={c.member_id} c={c} today={d.today} first={i === 0} onOpen={() => void navigate({ to: "/a/coach/clients/$memberId", params: { memberId: c.member_id }, search: { tab: "program" } })} />
            ))}
          </Card>
        )}
      </section>
      <LeadSheet lead={lead} today={d.today} coachName={d.coach.name} onClose={() => setLead(null)} />
    </div>
  );
}

function ClientRow({ c, today, first, onOpen }: { c: Client; today: string; first: boolean; onOpen: () => void }) {
  const { t, lang } = useI18n();
  const late = checkinIsLate(c.checkin.last ? c.checkin.days_since ?? 0 : null);
  const status = [
    c.last_workout ? t("coach.workedOut", { when: whenLabel(c.last_workout.at, lang, today) }) : null,
    late ? (c.checkin.last ? t("coach.lateShort", { n: c.checkin.days_since ?? 0 }) : t("coach.checkinNever")) : null,
  ].filter(Boolean);
  return (
    <button type="button" data-testid="client-card" className="s1-tap" onClick={onOpen} style={{ ...rowStyle, boxShadow: first ? undefined : "inset 0 1px 0 var(--hairline)" }}>
      <Avatar name={c.name} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 16px/21px var(--font-sans)" }}>{c.name}</span>
        <span style={{ font: "500 13px/18px var(--font-sans)", color: late ? "var(--s1-yellow)" : "var(--text-secondary)" }}>{status.join(" · ") || t("coach.noWorkout")}</span>
      </span>
      {c.pt ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span className="s1-num" data-testid="pt-left" style={{ font: "700 24px/28px var(--font-sans)", color: "var(--s1-pink)" }}>
            {c.pt.left}
          </span>
          <span style={{ font: "500 11px/14px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.ofLeft", { n: c.pt.total })}</span>
        </span>
      ) : (
        <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.noPt")}</span>
      )}
      <Icon icon={ChevronRight} size={18} style={{ color: "var(--text-tertiary)" }} />
    </button>
  );
}

/** One lead: what they bought, contact, stage, and Not now / Restore. */
function LeadSheet({ lead: l, today, coachName, onClose }: { lead: Lead | null; today: string; coachName: string; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [stage, setStage] = useState<LeadStage | null>(null);
  const cur = stage ?? l?.stage ?? "new";
  const set = async (s: LeadStage) => {
    if (!l) return;
    setStage(s);
    try {
      await coach.setStage(l.id, s);
      await qc.invalidateQueries({ queryKey: ["coach", "home"] });
      if (s === "not_now") close();
    } catch (e) {
      setStage(null);
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    }
  };
  const close = () => {
    setStage(null);
    onClose();
  };
  const wa = l ? whatsappUrl(l.phone, translate(l.lang, "coach.hello", { name: l.name.split(" ")[0], coach: coachName })) : null;
  const detail = l ? [l.bought ? t("coach.bought", { plan: l.bought }) : null, l.tag ? t("coach.tag", { tag: l.tag }) : null, l.note].filter(Boolean).join(" · ") : "";
  return (
    <Sheet open={!!l} onClose={close} title={l?.name ?? t("coach.lead")} width={480}>
      {l && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "8px 22px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={l.name} size={52} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 className="s1-title2" style={{ margin: 0 }}>
                {l.name}
              </h2>
              <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                {LANG_NAMES[l.lang]} · {t(`coach.source.${l.source}`)} · {whenLabel(l.created_at, lang, today)}
              </span>
            </div>
          </div>
          {detail && <p style={{ margin: 0, font: "500 15px/21px var(--font-sans)" }}>{detail}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            {wa && (
              <a className="s1-btn" href={wa} target="_blank" rel="noreferrer" style={{ flex: 1, background: "var(--s1-green-tint)", color: "var(--s1-green)", textDecoration: "none" }}>
                <Icon icon={MessageCircle} size={18} /> {t("coach.whatsapp")}
              </a>
            )}
            {l.phone && (
              <a className="s1-btn s1-btn--secondary" href={`tel:${l.phone.replace(/\s/g, "")}`} style={{ flex: 1, textDecoration: "none" }}>
                <Icon icon={Phone} size={18} /> {t("coach.call")}
              </a>
            )}
          </div>
          {cur !== "not_now" && (
            <Segmented block label={t("coach.stageFor", { name: l.name })} value={cur === "won" ? "trial" : cur} onChange={(v) => void set(v)} options={(["new", "contacted", "trial"] as const).map((s) => ({ value: s, label: t(`coach.stage.${s}`) }))} />
          )}
          <Button variant="plain" style={{ color: "var(--text-secondary)" }} onClick={() => void set(cur === "not_now" ? "new" : "not_now")}>
            {cur === "not_now" ? t("coach.restore") : t("coach.notNow")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
