import { Segmented } from "../../components/kit";
import { MEMBER_LANGS, STAFF_LANGS, useI18n, type Lang } from "../../i18n";

const LONG: Record<Lang, string> = { en: "English", th: "ไทย", ru: "Русский" };
const SHORT: Record<Lang, string> = { en: "EN", th: "ไทย", ru: "RU" };

/** EN / ไทย (staff) or EN / ไทย / RU (members, coaches' clients, the QR). Each label in its own language. */
export function LangSwitch({ members = false, short = false, block = false, className }: { members?: boolean; short?: boolean; block?: boolean; className?: string }) {
  const { lang, setLang, t } = useI18n();
  const langs = members ? MEMBER_LANGS : STAFF_LANGS;
  const labels = short ? SHORT : LONG;
  return (
    <Segmented
      label={t("lang.switch")}
      className={className}
      block={block}
      value={langs.includes(lang) ? lang : "en"}
      onChange={(l) => setLang(l)}
      options={langs.map((l) => ({ value: l, label: labels[l], lang: l }))}
    />
  );
}
