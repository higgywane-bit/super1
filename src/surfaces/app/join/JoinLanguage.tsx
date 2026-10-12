import { ChevronRight } from "lucide-react";
import { Icon, Wordmark } from "../../../components/kit";
import { useI18n, type Lang } from "../../../i18n";
import { launchMotion } from "../../shared/motion";

const LANGS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "th", label: "ภาษาไทย" },
  { lang: "ru", label: "Русский" },
];

/** Join · first screen: the counter QR language picker (EN / ไทย / Русский, big targets). */
export function JoinLanguage({ onPick }: { onPick: (l: Lang) => void }) {
  const { t, lang, setLang } = useI18n();
  const motion = launchMotion();
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "56px 24px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 40 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <Wordmark height={30} motion={motion} glow={false} />
          </div>
          <h1 className="s1-largetitle" style={{ fontSize: 38, lineHeight: "44px" }}>
            {t("join.welcome")}
          </h1>
          <p style={{ margin: 0, font: "500 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>
            <span lang="th">ยินดีต้อนรับ</span> · <span lang="ru">Добро пожаловать</span>
          </p>
        </div>
        <div className="s1-rise-2" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
          <p className="s1-section">{t("join.pickLang")}</p>
          {LANGS.map((l) => (
            <button
              key={l.lang}
              className="s1-tile s1-tap"
              type="button"
              aria-pressed={lang === l.lang}
              onClick={() => {
                setLang(l.lang);
                onPick(l.lang);
              }}
              style={{ minHeight: 64, flexDirection: "row", alignItems: "center" }}
            >
              <span className="s1-tile__name" lang={l.lang}>
                {l.label}
              </span>
              <Icon icon={ChevronRight} style={{ color: "var(--text-secondary)" }} />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
