import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** − value + (C03 sets/reps, C04 macros). The buttons carry the label; the value is announced politely. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  lessLabel,
  moreLabel,
  display,
  width = 44,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  lessLabel: string;
  moreLabel: string;
  display?: ReactNode;
  width?: number;
}) {
  const btn = { width: 36, height: 36, borderRadius: "var(--radius-sm)", border: 0, background: "var(--surface-3)", color: "var(--foreground)", display: "grid", placeItems: "center", cursor: "pointer" } as const;
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="s1-tap" aria-label={lessLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} style={{ ...btn, opacity: value <= min ? 0.4 : 1 }}>
        <Icon icon={Minus} size={16} />
      </button>
      <span className="s1-num" aria-live="polite" style={{ minWidth: width, textAlign: "center", font: "700 18px/22px var(--font-sans)" }}>
        {display ?? value}
      </span>
      <button type="button" className="s1-tap" aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} style={{ ...btn, opacity: value >= max ? 0.4 : 1 }}>
        <Icon icon={Plus} size={16} />
      </button>
    </div>
  );
}
