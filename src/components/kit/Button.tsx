import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "tinted" | "danger" | "plain";
export type ButtonSize = "md" | "lg" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Round 44 px icon button. Give it an aria-label. */
  icon?: boolean;
};

/** .s1-btn: 48 px (56 lg, 36 sm), radius 12, press scales to 0.97. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, icon, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("s1-btn", `s1-btn--${variant}`, size !== "md" && `s1-btn--${size}`, block && "s1-btn--block", icon && "s1-btn--icon", className)}
      {...rest}
    />
  );
});
