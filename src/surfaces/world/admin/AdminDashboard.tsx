import { formatDay, localDate } from "../../../lib/dates";
import { useT } from "../../../i18n";
import { PageHeader } from "../StaffSidebar";

/** Admin dashboard. Phase 0: the empty shell; phase 3 fills KPIs and the inbox. */
export function AdminDashboard() {
  const t = useT();
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={t("admin.dashboard")} sub={formatDay(localDate())} />
      <p style={{ margin: 0, font: "500 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("admin.empty")}</p>
    </div>
  );
}
