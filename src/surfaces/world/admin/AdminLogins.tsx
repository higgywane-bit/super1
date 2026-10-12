import { useState } from "react";
import { Button, Card, Field, Label, Segmented, useToast } from "../../../components/kit";
import { useT, type MessageKey } from "../../../i18n";
import { inviteLogin } from "../../../server/logins";
import type { Role } from "../../../server/roles";
import { PageHeader } from "../StaffSidebar";
import { ErrorText } from "../../shared/ErrorText";

const ROLE_OPTIONS: Role[] = ["admin", "owner", "desk", "coach", "member"];

/** A05 (phase 0 part): add a login with a role. The full logins list, devices and passcode arrive in phase 3. */
export function AdminLogins() {
  const t = useT();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={t("admin.logins")} />
      <Card style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
        <h2 className="s1-headline" style={{ margin: 0 }}>
          {t("admin.inviteTitle")}
        </h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await inviteLogin({ data: { email, role } });
              toast(t("admin.inviteDone", { email, role: t(`role.name.${role}`) }));
              setEmail("");
            } catch {
              setError("common.error");
            } finally {
              setBusy(false);
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <Field id="invite-email" label={t("admin.inviteEmail")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Label>{t("admin.inviteRole")}</Label>
            <Segmented label={t("admin.inviteRole")} value={role} onChange={setRole} options={ROLE_OPTIONS.map((r) => ({ value: r, label: t(`role.name.${r}`) }))} />
            <p style={{ margin: "10px 4px 0", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t(`admin.roleNote.${role}`)}</p>
          </div>
          <ErrorText k={error} />
          <Button type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
            {t("admin.inviteBtn")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
