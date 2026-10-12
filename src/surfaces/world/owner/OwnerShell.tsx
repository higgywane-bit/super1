import { BarChart3, CalendarDays, Coffee, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Icon, TabBar } from "../../../components/kit";
import { formatDay, localDate } from "../../../lib/dates";
import { useT } from "../../../i18n";
import { useViewer } from "../../shared/Gate";
import { LangSwitch } from "../../shared/LangSwitch";

export type OwnerTab = "today" | "week" | "members" | "cafe";

/** Andy's app frame: date, centred greeting, language; floating tab bar (Owner board). Phone-first. */
export function OwnerShell({ children }: { children?: (tab: OwnerTab) => ReactNode }) {
  const t = useT();
  const viewer = useViewer();
  const [tab, setTab] = useState<OwnerTab>("today");
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "56px 20px 112px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{formatDay(localDate())}</span>
        <span style={{ font: "600 17px/22px var(--font-sans)" }}>{t("owner.hi", { name: viewer?.name || "Andy" })}</span>
        <span style={{ justifySelf: "end" }}>
          <LangSwitch short />
        </span>
      </header>
      <div key={tab} className="s1-tab-in">{children?.(tab)}</div>
      <TabBar
        label={t("role.name.owner")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "today", label: t("owner.today"), icon: <Icon icon={BarChart3} /> },
          { value: "week", label: t("owner.week"), icon: <Icon icon={CalendarDays} /> },
          { value: "members", label: t("owner.members"), icon: <Icon icon={Users} /> },
          { value: "cafe", label: t("owner.cafe"), icon: <Icon icon={Coffee} /> },
        ]}
      />
    </div>
  );
}
