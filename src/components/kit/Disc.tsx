import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Icon disc: the colour carries the event type; the row text stays neutral. */
export type DiscTone = "go" | "stop" | "money" | "pt" | "warn" | "neutral";

export function Disc({ tone = "neutral", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: DiscTone }) {
  return <span className={cx("s1-disc", `s1-disc--${tone}`, className)} {...rest} />;
}
