import type { MessageKey } from "../../i18n";
import { useT } from "../../i18n";

export function ErrorText({ k }: { k: MessageKey | null }) {
  const t = useT();
  if (!k) return null;
  return (
    <p role="alert" style={{ margin: 0, font: "500 14px/20px var(--font-sans)", color: "var(--s1-red)" }}>
      {t(k)}
    </p>
  );
}
