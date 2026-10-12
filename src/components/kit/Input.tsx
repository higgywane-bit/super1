import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

/** .s1-label: 13/18 semibold, secondary. */
export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("s1-label", className)} {...rest} />;
}

/** .s1-input: 48 px, blue focus ring. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx("s1-input", className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, style, ...rest }, ref) {
  return <textarea ref={ref} className={cx("s1-input", className)} style={{ height: "auto", minHeight: 96, padding: "12px 16px", lineHeight: "22px", resize: "vertical", ...style }} {...rest} />;
});

/** Label + input stacked, with an optional hint or error under it. */
export function Field({ id, label, hint, error, ...input }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-hint` : undefined} {...input} />
      {(hint || error) && (
        <p id={`${id}-hint`} style={{ margin: "8px 4px 0", font: "500 13px/18px var(--font-sans)", color: error ? "var(--s1-red)" : "var(--text-secondary)" }}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Small keyboard hint (.s1-kbd). */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="s1-kbd">{children}</span>;
}
