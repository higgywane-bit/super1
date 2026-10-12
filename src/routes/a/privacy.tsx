import { createFileRoute } from "@tanstack/react-router";
import { Wordmark } from "../../components/kit";
import { useT, type MessageKey } from "../../i18n";
import { LangSwitch } from "../../surfaces/shared/LangSwitch";

const SECTIONS = ["who", "what", "why", "who2", "keep", "rights", "contact"] as const;

/** super1.app/privacy · the privacy policy (PDPA) in EN/TH/RU, public, linked from the app and the store listings. */
function Privacy() {
  const t = useT();
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 64px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Wordmark height={26} glow={false} />
        <LangSwitch members short />
      </div>
      <div>
        <h1 className="s1-largetitle" style={{ margin: 0 }}>
          {t("privacy.title")}
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", font: "500 14px/20px var(--font-sans)" }}>{t("privacy.updated")}</p>
      </div>
      {SECTIONS.map((s) => (
        <section key={s} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 className="s1-headline" style={{ margin: 0 }}>
            {t(`privacy.${s}.h` as MessageKey)}
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", font: "500 15px/23px var(--font-sans)" }}>{t(`privacy.${s}.b` as MessageKey)}</p>
        </section>
      ))}
    </main>
  );
}

export const Route = createFileRoute("/a/privacy")({ head: () => ({ meta: [{ title: "SUPER1 · Privacy" }] }), component: Privacy });
