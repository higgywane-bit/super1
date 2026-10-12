import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** Sidebar item. Selected: blue tint and blue icon. */
export function NavItem({ icon, label, selected, badge, badgeTone = "blue", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string; selected?: boolean; badge?: number | null; badgeTone?: "blue" | "pink" | "yellow" }) {
  return (
    <button type="button" aria-pressed={!!selected} aria-current={selected ? "page" : undefined} className={cx("s1-navitem", className)} {...rest}>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span
          className="s1-num"
          style={{
            minWidth: 24,
            height: 24,
            padding: "0 7px",
            borderRadius: 999,
            display: "inline-grid",
            placeItems: "center",
            font: "700 13px/1 var(--font-sans)",
            background: `var(--s1-${badgeTone})`,
            color: "var(--on-blue)",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
