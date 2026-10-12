import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Library, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Icon, NavItem } from "../../../components/kit";
import { useT } from "../../../i18n";
import { LangSwitch } from "../../shared/LangSwitch";
import { signOut } from "../../shared/useCodeSignIn";
import { StaffLayout, StaffSidebar } from "../../world/StaffSidebar";
import { useCoachHome, useCoachLive } from "./useCoach";

/** Coach portal frame: wordmark + Coach pill, Clients (new-lead badge), Library. */
export function CoachShell({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const home = useCoachHome();
  useCoachLive();
  const fresh = (home.data?.leads ?? []).filter((l) => l.stage === "new").length;
  const nav = [
    { to: "/a/coach", label: t("coach.clientsLeads"), icon: Users, badge: fresh, selected: path === "/a/coach" || path === "/a/coach/" || path.startsWith("/a/coach/clients") },
    { to: "/a/coach/library", label: t("coach.library"), icon: Library, badge: 0, selected: path.startsWith("/a/coach/library") },
  ] as const;
  return (
    <StaffLayout
      maxWidth={1160}
      sidebar={
        <StaffSidebar
          pill={<span className="s1-pill s1-pill--pt" style={{ height: 22, fontSize: 11 }}>{t("coach.coach")}</span>}
          footer={
            <>
              <LangSwitch />
              <button className="s1-btn s1-btn--plain" type="button" style={{ alignSelf: "flex-start", color: "var(--text-secondary)" }} onClick={() => void signOut(router)}>
                {t("common.logOut")}
              </button>
            </>
          }
        >
          {nav.map((n) => (
            <NavItem key={n.to} icon={<Icon icon={n.icon} />} label={n.label} selected={n.selected} badge={n.badge || null} onClick={() => void navigate({ to: n.to })} />
          ))}
        </StaffSidebar>
      }
    >
      {children}
    </StaffLayout>
  );
}
