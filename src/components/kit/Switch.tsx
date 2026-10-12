import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

/** iOS switch (.s1-switch). Always give it a label. */
export function Switch({ checked, onChange, label, className, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cx("s1-switch", className)} onClick={() => onChange(!checked)} {...rest} />;
}
