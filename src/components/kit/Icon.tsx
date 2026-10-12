import type { LucideIcon, LucideProps } from "lucide-react";
import { cx } from "./cx";

/** Lucide at the kit size: 20 px, stroke 1.9 (.s1-icon). Decorative unless given a label. */
export function Icon({ icon: I, label, className, ...rest }: LucideProps & { icon: LucideIcon; label?: string }) {
  return <I className={cx("s1-icon", className)} strokeWidth={1.9} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} {...rest} />;
}
