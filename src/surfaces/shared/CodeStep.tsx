import { ChevronLeft } from "lucide-react";
import { Button, Icon } from "../../components/kit";
import { useT } from "../../i18n";
import { CodeBoxes, readCodeFromClipboard } from "./CodeBoxes";
import { ErrorText } from "./ErrorText";
import type { useCodeSignIn } from "./useCodeSignIn";

/** The "Enter your code" step shared by every code sign-in (M02 layout). */
export function CodeStep({ s, compact = false }: { s: ReturnType<typeof useCodeSignIn>; compact?: boolean }) {
  const t = useT();
  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Button variant="secondary" icon aria-label={t("common.back")} onClick={s.back}>
        <Icon icon={ChevronLeft} />
      </Button>
      <div style={{ marginTop: compact ? 8 : 32, display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 className="s1-largetitle" style={compact ? { fontSize: 30, lineHeight: "36px" } : undefined}>
          {t("auth.checkEmail")}
        </h1>
        <p style={{ margin: 0, font: "500 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>
          {t("auth.codeSent", { email: "" })}
          <span style={{ color: "var(--foreground)" }}>{s.email}</span>
        </p>
      </div>
      <CodeBoxes value={s.code} onChange={s.setCode} onComplete={(c) => void s.verify(c)} disabled={s.busy} label={t("auth.codeLabel")} />
      <ErrorText k={s.error} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="s1-link"
          type="button"
          onClick={async () => {
            const c = await readCodeFromClipboard();
            if (c) {
              s.setCode(c);
              if (c.length === 6) void s.verify(c);
            }
          }}
        >
          {t("auth.pasteCode")}
        </button>
        {s.resendIn > 0 ? (
          <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-tertiary)" }}>{t("auth.resendIn", { s: s.resendIn })}</span>
        ) : (
          <button className="s1-link" type="button" onClick={() => void s.sendCode()} disabled={s.busy}>
            {t("auth.resend")}
          </button>
        )}
      </div>
      <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-tertiary)" }}>{t("auth.codeNote")}</span>
    </div>
  );
}
