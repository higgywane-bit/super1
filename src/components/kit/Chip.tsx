import type { ButtonHTMLAttributes } from "react";
import { Avatar } from "./Avatar";
import { cx } from "./cx";

/** Staff chip on the shift picker: avatar + name, selected with a blue ring. */
export function Chip({ name, selected, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { name: string; selected?: boolean }) {
  return (
    <button type="button" aria-pressed={!!selected} className={cx("s1-chip", "s1-tap", className)} {...rest}>
      <Avatar name={name} />
      {name}
    </button>
  );
}
