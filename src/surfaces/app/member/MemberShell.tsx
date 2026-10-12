import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Dumbbell, House, Salad, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Card, Icon, TabBar } from "../../../components/kit";
import { useT } from "../../../i18n";
import { useMemberHome, useMemberLink, useMemberLive } from "./useMember";

export type MemberTab = "home" | "train" | "fuel" | "me";
const TABS: Record<MemberTab, string> = { home: "/a", train: "/a/train", fuel: "/a/fuel", me: "/a/me" };

/** Member app frame: phone layout; the glass tab bar Home / Train / Fuel / Me on the four main screens. */
export function MemberShell({ children }: { children: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "") || "/a";
  const link = useMemberLink();
  const home = useMemberHome();
  useMemberLive();
  const tab = (Object.entries(TABS).find(([, p]) => p === path)?.[0] ?? null) as MemberTab | null;

  if (link.isFetched && !link.data?.member_id) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "96px 20px", boxSizing: "border-box" }}>
        <Card style={{ padding: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 className="s1-title2" style={{ margin: 0 }}>
            {t("m.notLinked")}
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", font: "500 15px/22px var(--font-sans)" }}>{t("m.notLinkedSub")}</p>
        </Card>
      </main>
    );
  }
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: tab ? "48px 20px 120px" : "24px 20px 40px", boxSizing: "border-box" }}>
      {home.data ? children : null}
      {tab && (
        <TabBar
          label="SUPER1"
          value={tab}
          onChange={(v) => void navigate({ to: TABS[v] })}
          items={[
            { value: "home", label: t("app.home"), icon: <Icon icon={House} /> },
            { value: "train", label: t("app.train"), icon: <Icon icon={Dumbbell} /> },
            { value: "fuel", label: t("app.fuel"), icon: <Icon icon={Salad} /> },
            { value: "me", label: t("app.me"), icon: <Icon icon={UserRound} /> },
          ]}
        />
      )}
    </div>
  );
}
