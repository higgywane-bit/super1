import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Avatar, Icon, Segmented } from "../../../components/kit";
import { translate, useI18n } from "../../../i18n";
import { dayLabel } from "../../../i18n/format";
import { whatsappUrl } from "../../../lib/coach";
import { CheckinsTab } from "./CheckinsTab";
import { NutritionTab } from "./NutritionTab";
import { ProgramTab } from "./ProgramTab";
import { UseSessionSheet, type SessionTarget } from "./UseSessionSheet";
import { useCoachClient, useCoachHome } from "./useCoach";

export type ClientTab = "program" | "nutrition" | "checkins";

/** C03–C05 · One client: name, PT left, WhatsApp, −1; tabs Workouts / Food / Check-ins. */
export function ClientPage({ memberId, tab }: { memberId: string; tab: ClientTab }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const home = useCoachHome();
  const client = useCoachClient(memberId);
  const [use, setUse] = useState<SessionTarget | null>(null);
  const d = client.data;
  const today = home.data?.today ?? "";
  const pack = home.data?.clients.find((c) => c.member_id === memberId)?.pt ?? null;
  const wa = d ? whatsappUrl(d.member.phone, translate(d.member.lang, "coach.hello", { name: d.member.first_name, coach: home.data?.coach.name ?? "" })) : null;

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <button type="button" aria-label={t("coach.clientsLeads")} className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", color: "var(--text-secondary)", paddingLeft: 0 }} onClick={() => void navigate({ to: "/a/coach" })}>
        <Icon icon={ChevronLeft} size={20} /> {t("coach.clients")}
      </button>

      {d && (
        <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={d.member.name} size={56} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <h1 className="s1-title2" style={{ margin: 0, fontSize: 28, lineHeight: "34px" }}>
              {d.member.name}
            </h1>
            {pack && (
              <span data-testid="pt-pill" style={{ font: "600 14px/19px var(--font-sans)", color: "var(--s1-pink)" }}>
                {t("coach.ptLeftLine", { left: pack.left, total: pack.total, date: dayLabel(pack.ends_on, lang, today) })}
              </span>
            )}
          </div>
          {wa && (
            <a className="s1-btn s1-btn--secondary s1-btn--icon" href={wa} target="_blank" rel="noreferrer" aria-label={t("coach.whatsapp")} style={{ width: 48, height: 48, borderRadius: 24 }}>
              <Icon icon={MessageCircle} size={20} />
            </a>
          )}
          {pack && pack.left > 0 && (
            <button
              type="button"
              aria-label={t("coach.use1")}
              className="s1-btn s1-tap"
              style={{ height: 48, minWidth: 64, borderRadius: 24, background: "var(--s1-pink)", color: "var(--background)", font: "700 18px/1 var(--font-sans)" }}
              onClick={() => setUse({ memberId: d.member.id, name: d.member.name, left: pack.left, total: pack.total, plan: pack.plan })}
            >
              −1
            </button>
          )}
        </header>
      )}

      <Segmented label={d?.member.name ?? ""} value={tab} onChange={(v) => void navigate({ to: "/a/coach/clients/$memberId", params: { memberId }, search: { tab: v } })} options={(["program", "nutrition", "checkins"] as const).map((v) => ({ value: v, label: t(`coach.tab.${v}`) }))} />
      {d && tab === "program" && <ProgramTab key={memberId} d={d} today={today} />}
      {d && tab === "nutrition" && <NutritionTab key={memberId} d={d} today={today} />}
      {d && tab === "checkins" && <CheckinsTab key={memberId} d={d} today={today} coachId={home.data?.coach.id ?? ""} />}
      <UseSessionSheet target={use} via="coach_portal" onClose={() => setUse(null)} />
    </div>
  );
}
