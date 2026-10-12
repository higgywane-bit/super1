import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** Plan tile. Selected: tinted + 2 px ring (pink for PT). */
export function Tile({
  name,
  price,
  selected,
  pt,
  className,
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "name"> & { name: ReactNode; price?: ReactNode; selected?: boolean; pt?: boolean }) {
  return (
    <button type="button" aria-pressed={!!selected} className={cx("s1-tile", "s1-tap", pt && "s1-tile--pt", className)} {...rest}>
      <span className="s1-tile__name">{name}</span>
      {children}
      {price != null && <span className="s1-tile__price">{price}</span>}
    </button>
  );
}
