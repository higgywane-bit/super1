import { BarChart3, CalendarDays, Coffee, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Icon, TabBar } from "../../../components/kit";
import { localDate } from "../../../lib/dates";
import { useI18n, type MessageKey } from "../../../i18n";
import { dayLabel } from "../../../i18n/format";
import { useViewer } from "../../shared/Gate";

export type OwnerTab = "today" | "week" | "members" | "cafe";

/**
 * Andy's app frame (Owner board): date, centred title ("Hi Andy" on Today), a round language button,
 * floating glass tab bar. Phone-first; read-only.
 */
export function OwnerShell({ children }: { children: (tab: OwnerTab) => ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const viewer = useViewer();
  const [tab, setTab] = useState<OwnerTab>("today");
  const titles: Record<OwnerTab, MessageKey> = { today: "owner.today", week: "owner.week", members: "owner.members", cafe: "owner.cafe" };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "56px 20px 112px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
      <header style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 52px" }}>
        <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)", textAlign: "center" }}>{t("owner.place", { day: dayLabel(localDate(), lang) })}</span>
        <h1 className="s1-largetitle" style={{ textAlign: "center" }}>
          {tab === "today" ? t("owner.hi", { name: viewer?.name || "Andy" }) : t(titles[tab])}
        </h1>
        <button
          type="button"
          className="s1-avatar s1-tap"
          aria-label={t("owner.switchLang")}
          onClick={() => setLang(lang === "en" ? "th" : "en")}
          style={{ position: "absolute", right: 0, top: 6, border: 0, cursor: "pointer", width: 44, height: 44, background: "var(--s1-blue-tint)", color: "var(--s1-blue)", font: "700 13px/1 var(--font-sans)" }}
        >
          {lang === "th" ? "ไทย" : "EN"}
        </button>
      </header>
      <main key={tab} className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {children(tab)}
      </main>
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
