import { Dumbbell, House, Salad, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Icon, TabBar } from "../../../components/kit";
import { useT } from "../../../i18n";

export type MemberTab = "home" | "train" | "fuel" | "me";

/** Member app frame: 390-wide phone layout, glass tab bar Home / Train / Fuel / Me (App board). */
export function MemberShell({ children }: { children?: (tab: MemberTab) => ReactNode }) {
  const t = useT();
  const [tab, setTab] = useState<MemberTab>("home");
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "56px 20px 112px", boxSizing: "border-box" }}>
      <div key={tab} className="s1-tab-in">{children?.(tab)}</div>
      <TabBar
        label="SUPER1"
        value={tab}
        onChange={setTab}
        items={[
          { value: "home", label: t("app.home"), icon: <Icon icon={House} /> },
          { value: "train", label: t("app.train"), icon: <Icon icon={Dumbbell} /> },
          { value: "fuel", label: t("app.fuel"), icon: <Icon icon={Salad} /> },
          { value: "me", label: t("app.me"), icon: <Icon icon={UserRound} /> },
        ]}
      />
    </div>
  );
}
