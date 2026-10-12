import { useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button, Icon, Wordmark } from "../../../components/kit";
import { translate, useI18n } from "../../../i18n";
import { QrCode, joinUrl } from "../../shared/QrCode";

/** QRStand board: the A5 counter stand. Print → "Save as PDF" gives the poster file. Welcome line in EN/TH/RU. */
export function QrPoster() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const url = joinUrl();
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
      <article
        className="s1-poster"
        style={{ width: "min(560px, 100%)", aspectRatio: "560 / 780", background: "var(--background)", borderRadius: "var(--radius-sheet)", boxShadow: "inset 0 0 0 1px var(--hairline)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 28px 28px", gap: 12, textAlign: "center" }}
      >
        <Wordmark height={40} glow={false} />
        <h1 style={{ margin: "8px 0 0", font: "700 36px/42px var(--font-sans)", letterSpacing: "-0.02em" }}>{translate("en", "qr.welcome")}</h1>
        <p lang="th" style={{ margin: 0, font: "500 17px/24px var(--font-sans)", color: "var(--text-secondary)" }}>
          {translate("th", "qr.welcome")}
        </p>
        <p lang="ru" style={{ margin: 0, font: "500 17px/24px var(--font-sans)", color: "var(--text-secondary)" }}>
          {translate("ru", "qr.welcome")}
        </p>
        <span style={{ margin: "12px 0", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <QrCode value={url} size={260} label={t("qr.scan")} />
        </span>
        <span style={{ font: "700 24px/30px var(--font-sans)" }}>{translate("en", "qr.scan")}</span>
        <span style={{ color: "var(--s1-blue)", font: "600 15px/20px var(--font-sans)" }}>{url.replace(/^https?:\/\//, "")}</span>
        <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
          {(["qr.step1", "qr.step2", "qr.step3"] as const).map((k, i) => (
            <li key={k} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-tile)", padding: "14px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--s1-blue)", font: "700 13px/16px var(--font-sans)" }}>{i + 1}</span>
              <span style={{ font: "600 15px/20px var(--font-sans)" }}>{translate("en", k)}</span>
            </li>
          ))}
        </ol>
        <p style={{ margin: "auto 0 0", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{translate("en", "qr.already")}</p>
      </article>
    </main>
  );
}
