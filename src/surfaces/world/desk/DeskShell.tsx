import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { MessageCircle, ScanLine, Users, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import { desk } from "../../../client/desk";
import { Avatar, Icon, NavItem } from "../../../components/kit";
import { useT } from "../../../i18n";
import { LangSwitch } from "../../shared/LangSwitch";
import { signOut } from "../../shared/useCodeSignIn";
import { StaffLayout } from "../StaffSidebar";
import { Wordmark } from "../../../components/kit";
import { useDesk } from "./DeskContext";

/**
 * Desk frame (Desk board): wordmark; On shift chip with Change; Check-in with the counter-queue badge;
 * Members; yellow Message Pete; EN/ไทย; sound; Log out.
 */
export function DeskShell({ children }: { children?: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { shift, changeShift, open, muted, setMuted } = useDesk();
  const waiting = useQuery({ queryKey: ["desk", "waiting"], queryFn: desk.waiting });
  const queue = waiting.data?.length ?? 0;
  const onMembers = path.startsWith("/w/members");
  return (
    <StaffLayout
      sidebar={
        <aside
          style={{ flex: "1 0 248px", maxWidth: "100%", boxSizing: "border-box", background: "var(--surface-1)", boxShadow: "inset -1px 0 0 var(--hairline)", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 22 }}
        >
          <div style={{ marginLeft: 12 }}>
            <Wordmark height={24} glow={false} />
          </div>
          <button
            type="button"
            onClick={changeShift}
            className="s1-card s1-tap"
            style={{ border: 0, cursor: "pointer", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, color: "var(--foreground)", textAlign: "left" }}
          >
            <Avatar name={shift?.name ?? "?"} size={36} style={{ background: "var(--s1-blue-tint)", color: "var(--s1-blue)" }} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.onShift")}</span>
              <span style={{ font: "600 15px/20px var(--font-sans)" }}>{shift?.name}</span>
            </span>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--s1-blue)" }}>{t("desk.change")}</span>
          </button>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <NavItem icon={<Icon icon={ScanLine} />} label={t("desk.checkIn")} selected={!onMembers} badge={queue || null} onClick={() => void navigate({ to: "/w" })} />
            <NavItem icon={<Icon icon={Users} />} label={t("desk.members")} selected={onMembers} onClick={() => void navigate({ to: "/w/members" })} />
          </nav>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="s1-btn s1-btn--block" type="button" onClick={() => open({ type: "message" })} style={{ background: "var(--s1-yellow)", color: "#000" }}>
              <Icon icon={MessageCircle} />
              {t("desk.messagePete")}
            </button>
            <LangSwitch block />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="s1-btn s1-btn--plain" type="button" onClick={() => void signOut(router)} style={{ color: "var(--text-secondary)" }}>
                {t("common.logOut")}
              </button>
              <button
                type="button"
                className="s1-btn s1-btn--secondary s1-btn--icon"
                aria-pressed={!muted}
                aria-label={muted ? t("desk.soundOff") : t("desk.soundOn")}
                title={muted ? t("desk.soundOff") : t("desk.soundOn")}
                onClick={() => setMuted(!muted)}
              >
                <Icon icon={muted ? VolumeX : Volume2} />
              </button>
            </div>
          </div>
        </aside>
      }
    >
      {children}
    </StaffLayout>
  );
}
