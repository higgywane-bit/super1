import { useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button, Icon, Wordmark } from "../../../components/kit";
import { translate, useI18n, type MessageKey } from "../../../i18n";

const STEPS = [1, 2, 3, 4, 5] as const;

/** The counter onboarding one-pager: the five desk tasks in English and Thai side by side. Print → PDF. */
export function StaffGuide() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const both = (k: MessageKey) => (
    <>
      <span>{translate("en", k)}</span>
      <span lang="th" style={{ color: "var(--text-secondary)" }}>
        {translate("th", k)}
      </span>
    </>
  );
  return (
    <main className="s1-poster-page" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "24px 16px", background: "var(--background)" }}>
      <div className="s1-no-print" style={{ display: "flex", gap: 10 }}>
        <Button variant="plain" style={{ color: "var(--foreground)" }} onClick={() => void navigate({ to: "/w/admin/settings" })}>
          {t("qr.back")}
        </Button>
        <Button onClick={() => window.print()}>
          <Icon icon={Printer} size={18} /> {t("qr.print")}
        </Button>
      </div>
      <article className="s1-poster" style={{ width: "min(760px, 100%)", display: "flex", flexDirection: "column", gap: 18, padding: "32px 28px", borderRadius: "var(--radius-sheet)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
        <Wordmark height={28} glow={false} />
        <h1 style={{ margin: 0, display: "flex", flexDirection: "column", gap: 2, font: "700 28px/34px var(--font-sans)" }}>{both("guide.title")}</h1>
        <p style={{ margin: 0, display: "flex", flexDirection: "column", font: "500 15px/21px var(--font-sans)" }}>{both("guide.sub")}</p>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {STEPS.map((n) => (
            <li key={n} style={{ display: "flex", gap: 16 }}>
              <span className="s1-num" style={{ flex: "none", width: 32, height: 32, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--s1-blue)", color: "var(--on-blue)", font: "700 16px/1 var(--font-sans)" }}>
                {n}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ display: "flex", flexDirection: "column", font: "700 17px/23px var(--font-sans)" }}>{both(`guide.${n}.h` as MessageKey)}</strong>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, font: "500 14px/20px var(--font-sans)" }}>{both(`guide.${n}.b` as MessageKey)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p style={{ margin: 0, display: "flex", flexDirection: "column", gap: 2, padding: "12px 16px", borderRadius: "var(--radius-tile)", background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)", font: "600 14px/20px var(--font-sans)" }}>{both("guide.help")}</p>
      </article>
    </main>
  );
}
