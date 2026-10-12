import { Button, Field } from "../../components/kit";
import { useT } from "../../i18n";
import { CodeStep } from "../shared/CodeStep";
import { ErrorText } from "../shared/ErrorText";
import { LangSwitch } from "../shared/LangSwitch";
import { launchMotion } from "../shared/motion";
import { useCodeSignIn } from "../shared/useCodeSignIn";
import { Wordmark } from "../../components/kit";

/**
 * Email-code sign-in for Andy (O01, phone layout) and Pete (same layout, Admin pill).
 */
export function CodeSignInStaff({ who }: { who: "owner" | "admin" }) {
  const t = useT();
  const s = useCodeSignIn();
  const motion = launchMotion();
  return (
    <main style={{ minHeight: "100dvh", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "min(440px, 100%)", padding: "96px 24px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ position: "relative", alignSelf: "flex-start" }}>
          <Wordmark height={34} motion={motion} />
        </div>
        <span className="s1-pill" style={{ alignSelf: "flex-start", color: "var(--s1-blue)", background: "var(--s1-blue-tint)" }}>
          {t(who === "owner" ? "role.name.owner" : "role.name.admin")}
        </span>
        {s.step === "email" ? (
          <form className="s1-rise" onSubmit={s.sendCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h1 className="s1-largetitle" style={{ fontSize: 30, lineHeight: "36px" }}>
              {t("auth.signInTitle")}
            </h1>
            <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t(who === "owner" ? "auth.ownerNote" : "auth.adminNote")}</p>
            <Field id={`${who}-email`} label={t("auth.email")} type="email" inputMode="email" autoComplete="email" required value={s.email} onChange={(e) => s.setEmail(e.target.value)} />
            <ErrorText k={s.error} />
            <Button type="submit" size="lg" block disabled={s.busy}>
              {t("auth.sendCode")}
            </Button>
          </form>
        ) : (
          <CodeStep s={s} compact />
        )}
        <div style={{ alignSelf: "flex-start", marginTop: "auto" }}>
          <LangSwitch />
        </div>
      </div>
    </main>
  );
}
