import type { ReactNode } from "react";

/** Checkbox (.s1-check) with its label as one 44 px target. */
export function Checkbox({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id?: string }) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ appearance: "none", border: 0, background: "transparent", color: "inherit", display: "flex", alignItems: "flex-start", gap: 12, minHeight: 44, padding: "10px 0", textAlign: "left", cursor: "pointer", font: "500 15px/21px var(--font-sans)" }}
    >
      <span className="s1-check" aria-checked={checked}>
        {checked && (
          <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 14, height: 14, strokeWidth: 3 }}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </button>
  );
}
