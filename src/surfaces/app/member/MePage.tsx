import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { member } from "../../../client/member";
import { Avatar, Card, Icon } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel } from "../../../i18n/format";
import { QrCode } from "../../shared/QrCode";
import { useMemberHome } from "./useMember";

/** M12 · Me: days left, plan and end date, tag, the member QR (backup check-in), PT pack, visits. */
export function MePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const h = useMemberHome().data!;
  const qr = useQuery({ queryKey: ["member", "qr"], queryFn: member.qr, staleTime: Infinity });
  const c = h.card;
  const active = c.status === "active" || c.status === "expiring";
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <Avatar name={h.member.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="s1-title2" style={{ margin: 0 }}>
            {h.member.name}
          </h1>
          <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.memberNo", { no: String(h.member.member_no).padStart(4, "0") })}</span>
        </div>
        <button type="button" aria-label={t("m.settings")} className="s1-btn s1-btn--secondary s1-btn--icon" style={{ width: 44, height: 44, borderRadius: 22 }} onClick={() => void navigate({ to: "/a/settings" })}>
          <Icon icon={Settings} size={20} />
        </button>
      </header>

      <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }} data-testid="membership">
        <span className={`s1-pill ${active ? "s1-pill--active" : "s1-pill--expired"}`} style={{ alignSelf: "flex-start" }}>
          {t(`status.${c.status}` as "status.active")}
        </span>
        {c.days_left != null ? (
          <>
            <span className="s1-num" style={{ font: "700 72px/76px var(--font-sans)", letterSpacing: "-0.03em" }}>
              {c.days_left}
            </span>
            <span style={{ font: "500 15px/21px var(--font-sans)", color: "var(--text-secondary)" }}>
              {t("m.daysLeft")} · {t("m.endsLine", { plan: c.plan ?? "", date: dayLabel(c.cover_ends, lang, h.today) })}
            </span>
          </>
        ) : (
          <span style={{ font: "600 16px/22px var(--font-sans)", color: "var(--s1-yellow)" }}>{t("m.noPlan")}</span>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 12, boxShadow: "inset 0 1px 0 var(--hairline)", font: "500 15px/20px var(--font-sans)" }}>
          {h.tag && (
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("m.tag")}</span>
              <span className="s1-num" style={{ fontWeight: 700, letterSpacing: "0.12em" }}>
                {h.tag}
              </span>
            </span>
          )}
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>{t("m.visits")}</span>
            <span className="s1-num" style={{ fontWeight: 700 }}>
              {c.visits_this_month}
            </span>
          </span>
        </div>
      </Card>

      {qr.data && (
        <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ borderRadius: "var(--radius-tile)", overflow: "hidden", flex: "none" }} data-testid="member-qr" data-code={qr.data}>
            <QrCode value={qr.data} size={96} label={t("m.qrLabel")} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: "600 16px/21px var(--font-sans)" }}>{t("m.qrTitle")}</span>
            <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.qrSub")}</span>
          </span>
        </Card>
      )}

      {h.pt && (
        <Card style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: "600 16px/21px var(--font-sans)" }}>{t("m.ptPack", { plan: h.pt.plan, left: h.pt.left })}</span>
            <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{h.pt.coach}</span>
          </span>
          <span className="s1-num" style={{ font: "700 28px/32px var(--font-sans)", color: "var(--s1-pink)" }}>
            {h.pt.left}
          </span>
        </Card>
      )}
      <p style={{ margin: "4px 4px 0", font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>{t("m.renew")}</p>
    </div>
  );
}
