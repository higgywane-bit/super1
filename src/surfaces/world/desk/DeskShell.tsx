import { useRouter } from "@tanstack/react-router";
import { ScanLine, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Icon, NavItem } from "../../../components/kit";
import { useT } from "../../../i18n";
import { LangSwitch } from "../../shared/LangSwitch";
import { signOut } from "../../shared/useCodeSignIn";
import { StaffLayout, StaffSidebar } from "../StaffSidebar";

/** Desk frame (phase 0 skeleton; phase 1 adds the shift chip, badges, Message Pete and mute). */
export function DeskShell({ children }: { children?: ReactNode }) {
  const t = useT();
  const router = useRouter();
  return (
    <StaffLayout
      sidebar={
        <StaffSidebar
          footer={
            <>
              <LangSwitch />
              <button className="s1-btn s1-btn--plain" type="button" style={{ alignSelf: "flex-start", color: "var(--text-secondary)" }} onClick={() => void signOut(router)}>
                {t("common.logOut")}
              </button>
            </>
          }
        >
          <NavItem icon={<Icon icon={ScanLine} />} label={t("desk.checkIn")} selected />
          <NavItem icon={<Icon icon={Users} />} label={t("desk.members")} />
        </StaffSidebar>
      }
    >
      {children}
    </StaffLayout>
  );
}
