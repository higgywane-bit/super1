import { Button, Field } from "../../../components/kit";
import { useT } from "../../../i18n";
import { CodeStep } from "../../shared/CodeStep";
import { ErrorText } from "../../shared/ErrorText";
import { LangSwitch } from "../../shared/LangSwitch";
import { launchMotion } from "../../shared/motion";
import { useCodeSignIn } from "../../shared/useCodeSignIn";
import { Wordmark } from "../../../components/kit";

/** M01 splash + sign in, then M02 email code. */
export function MemberSignIn() {
  const t = useT();
  const s = useCodeSignIn();
  const motion = launchMotion();
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "64px 24px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
      {s.step === "email" ? (
        <form className="s1-tab-in" onSubmit={s.sendCode} style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Wordmark height={26} motion={motion} />
            <LangSwitch members short />
          </div>
          <div style={{ marginTop: 72, display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 className="s1-largetitle">{t("auth.signInTitle")}</h1>
            <p style={{ margin: 0, font: "500 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>{t("auth.memberSub")}</p>
          </div>
          <Field id="m-email" label={t("auth.email")} type="email" inputMode="email" autoComplete="email" required value={s.email} onChange={(e) => s.setEmail(e.target.value)} />
          <ErrorText k={s.error} />
          <Button type="submit" size="lg" block disabled={s.busy}>
            {t("auth.memberSend")}
          </Button>
          <p style={{ margin: "auto 0 0", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)", textAlign: "center" }}>{t("auth.memberNew")}</p>
        </form>
      ) : (
        <CodeStep s={s} />
      )}
    </main>
  );
}
