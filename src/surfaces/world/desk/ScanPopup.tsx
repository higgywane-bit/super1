import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CheckInResult } from "../../../client/desk";
import { Button } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel } from "../../../i18n/format";
import { reasonText } from "./words";

export type PopupState = { kind: "result"; result: CheckInResult } | { kind: "offline"; code: string };

/**
 * D03 / D04. Allowed: green tick draws (Motion #3), name, big days-left number, plan, PT pill,
 * visits this month; closes itself after 4 s while a green line drains. Declined: red cross, shake
 * (Motion #4); stays until the desk taps Close or Renew now. Offline: "Can't check" (never allowed).
 */
export function ScanPopup({ state, onClose, onRenew }: { state: PopupState; onClose: () => void; onRenew: (memberId: string) => void }) {
  const { t, lang } = useI18n();
  const allowed = state.kind === "result" && state.result.allowed;
  useEffect(() => {
    if (!allowed) return;
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [allowed, onClose, state]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const frame = (children: React.ReactNode, tone: "go" | "stop" | "warn") => createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "grid", placeItems: "center", padding: 24 }}>
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="s1-glass" style={{ position: "absolute", inset: 0, border: 0, cursor: "default" }} />
      <div
        className={tone === "go" ? "s1-sheet s1-pop" : tone === "stop" ? "s1-sheet s1-shake" : "s1-sheet s1-pop"}
        role={tone === "go" ? "status" : "alert"}
        style={{
          position: "relative",
          width: "min(440px, 100%)",
          padding: tone === "go" ? "32px 28px 0" : "32px 28px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: tone === "go" ? 8 : 10,
          textAlign: "center",
          overflow: "hidden",
          boxShadow:
            tone === "go"
              ? "var(--shadow-sheet), inset 0 0 0 1px rgba(43,212,106,0.35), 0 0 90px -20px rgba(43,212,106,0.55)"
              : tone === "stop"
                ? "var(--shadow-sheet), inset 0 0 0 1px rgba(255,77,94,0.4), 0 0 90px -20px rgba(255,77,94,0.55)"
                : "var(--shadow-sheet), inset 0 0 0 1px rgba(255,230,0,0.35)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );

  if (state.kind === "offline") {
    return frame(
      <>
        <span className="s1-disc s1-disc--warn" style={{ width: 72, height: 72 }}>
          <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 34, height: 34, strokeWidth: 2.6 }}>
            <path d="M12 8v5M12 17h.01" />
          </svg>
        </span>
        <span style={{ marginTop: 6, font: "700 24px/30px var(--font-sans)" }}>{t("desk.cantCheck")}</span>
        <span className="s1-num" style={{ font: "600 15px/20px var(--font-sans)", color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
          {state.code}
        </span>
        <p style={{ margin: 0, font: "500 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.cantCheckBody")}</p>
        <Button variant="secondary" block onClick={onClose} style={{ marginTop: 14 }}>
          {t("common.close")}
        </Button>
      </>,
      "warn",
    );
  }

  const r = state.result;
  const c = r.card;
  if (r.allowed && c) {
    const byVisits = r.reason === "visits";
    const big = byVisits ? (c.visits_left ?? 0) : (c.days_left ?? 0);
    const label = byVisits ? t("desk.visitsLeftOn", { plan: c.plan ?? "" }) : big <= 0 ? t("desk.lastDayOn", { plan: c.plan ?? "" }) : t("desk.daysLeftOn", { plan: c.plan ?? "" });
    const nudge = !byVisits && (c.days_left ?? 99) <= 3;
    return frame(
      <>
        <span className="s1-disc s1-disc--go" style={{ width: 72, height: 72 }}>
          <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 34, height: 34, strokeWidth: 2.6 }}>
            <path className="s1-draw" d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="s1-rise-2" style={{ marginTop: 6, font: "700 13px/18px var(--font-sans)", color: "var(--s1-green)" }}>
          {t("desk.welcomeIn")}
        </span>
        <span className="s1-rise-2" style={{ font: "700 28px/34px var(--font-sans)", letterSpacing: "-0.02em" }}>
          {c.name}
        </span>
        <span className="s1-num s1-rise-2" style={{ font: "700 88px/88px var(--font-sans)", letterSpacing: "-0.04em", color: nudge ? "var(--s1-yellow)" : undefined }}>
          {big}
        </span>
        <span className="s1-rise-3" style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
          {label}
        </span>
        <div className="s1-rise-3" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, margin: "10px 0 24px" }}>
          {nudge && <span className="s1-pill s1-pill--expiring">{t("desk.renewSoon")}</span>}
          {c.pt_left != null && <span className="s1-pill s1-pill--pt">{t("desk.ptPill", { n: c.pt_left, coach: c.pt_coach ?? "" })}</span>}
          <span className="s1-pill s1-pill--none">{c.visits_this_month === 1 ? t("desk.visitsMonthOne") : t("desk.visitsMonth", { n: c.visits_this_month })}</span>
        </div>
        <span className="s1-autoclose" style={{ alignSelf: "stretch", height: 3, margin: "0 -28px", background: "var(--s1-green)" }} />
      </>,
      "go",
    );
  }

  return frame(
    <>
      <span className="s1-disc s1-disc--stop" style={{ width: 72, height: 72 }}>
        <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 34, height: 34, strokeWidth: 2.6 }}>
          <path className="s1-draw" d="M18 6 6 18" />
          <path className="s1-draw" d="m6 6 12 12" />
        </svg>
      </span>
      <span style={{ marginTop: 6, font: "700 28px/34px var(--font-sans)", letterSpacing: "-0.02em" }}>{c?.name ?? t("desk.feed.unknown", { code: r.code ?? "" })}</span>
      <span className="s1-pill s1-pill--expired">{reasonText(t, lang, r.reason, c)}</span>
      {c && (
        <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
          {c.plan ? t("desk.tagLine", { plan: c.plan, code: r.code ?? "" }) : r.code}
          {c.status === "paused" && c.paused_until ? ` · ${dayLabel(c.paused_until, lang)}` : ""}
        </span>
      )}
      <div style={{ display: "grid", gridTemplateColumns: c && !c.archived ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 10, alignSelf: "stretch", marginTop: 14 }}>
        <Button variant="secondary" onClick={onClose} autoFocus>
          {t("common.close")}
        </Button>
        {c && !c.archived && r.reason !== "paused" && (
          <Button
            onClick={() => {
              onClose();
              onRenew(c.member_id);
            }}
          >
            {t("desk.renewNow")}
          </Button>
        )}
      </div>
    </>,
    "stop",
  );
}
