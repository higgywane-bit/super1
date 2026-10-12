import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Coffee, FileUp, LayoutDashboard, Settings, Tags, UserCog, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { supabaseBrowser } from "../../../client/supabase";
import { Card, Icon, NavItem } from "../../../components/kit";
import { useT, type MessageKey } from "../../../i18n";
import { useViewer } from "../../shared/Gate";
import { LangSwitch } from "../../shared/LangSwitch";
import { signOut } from "../../shared/useCodeSignIn";
import { StaffLayout, StaffSidebar } from "../StaffSidebar";
import { useRouter } from "@tanstack/react-router";
import { useInbox } from "./useAdminData";

const NAV: { to: string; key: MessageKey; icon: typeof LayoutDashboard }[] = [
  { to: "/w/admin", key: "admin.dashboard", icon: LayoutDashboard },
  { to: "/w/admin/import", key: "admin.import", icon: FileUp },
  { to: "/w/admin/plans", key: "admin.plans", icon: Tags },
  { to: "/w/admin/menu", key: "admin.menu", icon: Coffee },
  { to: "/w/admin/people", key: "admin.people", icon: Users },
  { to: "/w/admin/logins", key: "admin.logins", icon: UserCog },
  { to: "/w/admin/settings", key: "admin.settings", icon: Settings },
];

/** Pete's admin: sidebar (Dashboard … Settings, Pete card, Log out) + page (Admin board). */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useT();
  const inbox = useInbox();
  const qc = useQueryClient();
  // The inbox stays live on every admin page: merge requests and desk messages arrive by realtime.
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel("admin-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void qc.invalidateQueries({ queryKey: ["admin", "messages"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "merge_requests" }, () => void qc.invalidateQueries({ queryKey: ["admin", "merges"] }))
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [qc]);

  const badges: Partial<Record<string, number>> = { "/w/admin": inbox.count || undefined, "/w/admin/menu": inbox.drafts || undefined };
  const viewer = useViewer();
  const router = useRouter();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <StaffLayout
      maxWidth={1120}
      sidebar={
        <StaffSidebar
          pill={
            <span className="s1-pill" style={{ height: 22, fontSize: 11, color: "var(--s1-blue)", background: "var(--s1-blue-tint)" }}>
              {t("role.name.admin")}
            </span>
          }
          footer={
            <>
              <LangSwitch />
              <Card style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span className="s1-avatar" style={{ background: "var(--s1-blue-tint)", color: "var(--s1-blue)" }}>
                  {(viewer?.name || viewer?.email || "?").slice(0, 1).toUpperCase()}
                </span>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "600 15px/20px var(--font-sans)" }}>{viewer?.name || t("role.name.admin")}</span>
                  <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewer?.email}</span>
                </div>
              </Card>
              <button className="s1-btn s1-btn--plain" type="button" style={{ alignSelf: "flex-start", color: "var(--text-secondary)" }} onClick={() => void signOut(router)}>
                {t("common.logOut")}
              </button>
            </>
          }
        >
          {NAV.map((n) => {
            const selected = n.to === "/w/admin" ? path === "/w/admin" || path === "/w/admin/" : path.startsWith(n.to);
            return (
              <NavItem key={n.to} icon={<Icon icon={n.icon} />} label={t(n.key)} selected={selected} badge={badges[n.to] ?? null} onClick={() => void navigate({ to: n.to })} />
            );
          })}
        </StaffSidebar>
      }
    >
      {children}
    </StaffLayout>
  );
}
