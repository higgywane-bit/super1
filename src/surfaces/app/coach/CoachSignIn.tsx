import heroCoaches from "../../../../design/photos/hero-coaches.jpg";
import { Button, Field, Wordmark } from "../../../components/kit";
import { useT } from "../../../i18n";
import { CodeStep } from "../../shared/CodeStep";
import { ErrorText } from "../../shared/ErrorText";
import { LangSwitch } from "../../shared/LangSwitch";
import { launchMotion } from "../../shared/motion";
import { useCodeSignIn } from "../../shared/useCodeSignIn";

/** C01: photo half + form, email code. "Pete sets up your login." */
export function CoachSignIn() {
  const t = useT();
  const s = useCodeSignIn();
  const motion = launchMotion();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 560px", position: "relative", minHeight: 420, overflow: "hidden" }}>
        <img className="s1-photo" src={heroCoaches} alt="" style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 62%, #000000 100%)" }} />
        <div className="s1-rise-2" style={{ position: "absolute", left: "clamp(20px, 4vw, 48px)", right: "clamp(20px, 4vw, 48px)", bottom: 56, display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="s1-pill s1-pill--pt" style={{ alignSelf: "flex-start" }}>
            super1.app/coach
          </span>
          <span style={{ maxWidth: 520, font: "700 clamp(28px, 4vw, 40px)/1.15 var(--font-sans)", letterSpacing: "-0.02em", textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}>{t("auth.coachHero")}</span>
        </div>
      </div>
      <div style={{ flex: "1 1 440px", display: "grid", placeItems: "center", padding: "48px 24px", boxSizing: "border-box" }}>
        <div style={{ width: "min(400px, 100%)", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Wordmark height={34} motion={motion} glow={false} />
            <span className="s1-pill s1-pill--pt">{t("coach.coach")}</span>
          </div>
          {s.step === "email" ? (
            <form className="s1-rise" onSubmit={s.sendCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h1 className="s1-title2" style={{ fontSize: 28, lineHeight: "34px" }}>
                {t("auth.signInTitle")}
              </h1>
              <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("auth.coachNote")}</p>
              <Field id="c-email" label={t("auth.email")} type="email" inputMode="email" autoComplete="email" required value={s.email} onChange={(e) => s.setEmail(e.target.value)} />
              <ErrorText k={s.error} />
              <Button type="submit" size="lg" block disabled={s.busy}>
                {t("auth.sendCode")}
              </Button>
            </form>
          ) : (
            <CodeStep s={s} compact />
          )}
          <div style={{ alignSelf: "flex-start" }}>
            <LangSwitch />
          </div>
        </div>
      </div>
    </div>
  );
}
