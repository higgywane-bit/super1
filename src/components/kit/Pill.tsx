import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Status pill: dot + label. Status is never colour alone, so always pass words. */
export type PillTone = "active" | "expiring" | "expired" | "pt" | "none";

export function Pill({ tone = "none", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return <span className={cx("s1-pill", `s1-pill--${tone}`, className)} {...rest} />;
}

/** Pill tone for a member status (docs/05-DESIGN.md: Active green, Expiring yellow, Expired red, others grey). */
export function toneForStatus(status: string): PillTone {
  if (status === "active") return "active";
  if (status === "expiring") return "expiring";
  if (status === "expired") return "expired";
  return "none";
}
