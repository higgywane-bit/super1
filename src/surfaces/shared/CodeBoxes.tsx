import { useEffect, useRef } from "react";
import { useT } from "../../i18n";

/**
 * Six code boxes over one real input (M02): typing auto-advances, paste fills all six, and iOS/Android
 * offer the code from the email (autocomplete="one-time-code"). Calls onComplete with 6 digits.
 */
export function CodeBoxes({ value, onChange, onComplete, disabled, label, autoFocus = true }: { value: string; onChange: (v: string) => void; onComplete: (code: string) => void; disabled?: boolean; label: string; autoFocus?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const t = useT();
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  const set = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    onChange(v);
    if (v.length === 6) onComplete(v);
  };
  return (
    <label style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, cursor: "text" }}>
      {Array.from({ length: 6 }, (_, i) => {
        const active = !disabled && (i === value.length || (i === 5 && value.length === 6));
        return (
          <span
            key={i}
            aria-hidden="true"
            className="s1-num"
            style={{ height: 60, borderRadius: 14, background: "var(--surface-2)", boxShadow: active ? "inset 0 0 0 2px var(--s1-blue)" : "inset 0 0 0 1px var(--hairline)", display: "grid", placeItems: "center", font: "700 26px/1 var(--font-sans)" }}
          >
            {value[i] ?? ""}
          </span>
        );
      })}
      <input
        ref={input}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        aria-label={label}
        aria-description={t("auth.codeLabel")}
        disabled={disabled}
        value={value}
        onChange={(e) => set(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          set(e.clipboardData.getData("text"));
        }}
        style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 16 }}
      />
    </label>
  );
}

/** Read a code from the clipboard ("Paste code from email"). */
export async function readCodeFromClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return (text.match(/\d{6}/)?.[0] ?? text.replace(/\D/g, "")).slice(0, 6);
  } catch {
    return "";
  }
}
