import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { forgetSession } from "../../../client/session";
import { toUiError } from "../../../client/errors";
import { Button, Card, Icon, Sheet, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { removeMyLogin } from "../../../server/member";
import { LangSwitch } from "../../shared/LangSwitch";
import { signOut } from "../../shared/useCodeSignIn";

/** M13 · Settings: language, sign out, Delete my app login (the gym's records stay; Pete is told). */
export function SettingsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button type="button" className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", paddingLeft: 0, color: "var(--text-secondary)" }} onClick={() => void navigate({ to: "/a/me" })}>
        <Icon icon={ChevronLeft} size={20} /> {t("app.me")}
      </button>
      <h1 className="s1-largetitle" style={{ margin: 0 }}>
        {t("m.settings")}
      </h1>
      <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ font: "600 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.language")}</span>
        <LangSwitch members block />
      </Card>
      <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 16px/21px var(--font-sans)" }}>{t("m.notifications")}</span>
        <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("m.notificationsSub")}</span>
      </Card>
      <a href="/privacy" className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", paddingLeft: 0, color: "var(--text-secondary)", textDecoration: "none" }}>
        {t("privacy.link")}
      </a>
      <Button variant="secondary" size="lg" block onClick={() => void signOut(router)}>
        {t("m.signOut")}
      </Button>
      <Button variant="plain" style={{ color: "var(--s1-red)" }} onClick={() => setConfirm(true)}>
        {t("m.deleteLogin")}
      </Button>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t("m.deleteLogin")} width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 22px 28px" }}>
          <h2 className="s1-title2" style={{ margin: 0 }}>
            {t("m.deleteLogin")}
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", font: "500 15px/22px var(--font-sans)" }}>{t("m.deleteBody")}</p>
          <button
            type="button"
            className="s1-btn s1-btn--lg s1-btn--block s1-btn--danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await removeMyLogin();
                forgetSession();
                await router.invalidate();
              } catch (e) {
                const u = toUiError(e);
                toast(t(u.key, u.vars), { tone: "stop" });
                setBusy(false);
              }
            }}
          >
            {t("m.deleteConfirm")}
          </button>
          <Button variant="plain" style={{ color: "var(--foreground)" }} onClick={() => setConfirm(false)}>
            {t("coach.cancel")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
