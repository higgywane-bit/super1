import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** .s1-card: surface-2, radius 20. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("s1-card", className)} {...rest} />;
}

/** .s1-group: an inset grouped list; put Rows inside. */
export function Group({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("s1-group", className)} {...rest} />;
}

/** Section label above a group. */
export function SectionLabel({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx("s1-section", className)} {...rest} />;
}

type RowContent = {
  /** Disc or Avatar on the left. */
  leading?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** Right side: time, count, pill. Strings render as .s1-row__meta. */
  meta?: ReactNode;
  trailing?: ReactNode;
};

function RowInner({ leading, title, sub, meta, trailing }: RowContent) {
  return (
    <>
      {leading}
      <div className="s1-row__main">
        <div className="s1-row__title">{title}</div>
        {sub != null && sub !== "" && <div className="s1-row__sub">{sub}</div>}
      </div>
      {typeof meta === "string" || typeof meta === "number" ? <span className="s1-row__meta">{meta}</span> : meta}
      {trailing}
    </>
  );
}

/** .s1-row: 68 px min, hairline from 72 px between rows. */
export function Row({ leading, title, sub, meta, trailing, className, ...rest }: RowContent & Omit<HTMLAttributes<HTMLDivElement>, "title">) {
  return (
    <div className={cx("s1-row", className)} {...rest}>
      <RowInner leading={leading} title={title} sub={sub} meta={meta} trailing={trailing} />
    </div>
  );
}

/** A Row that is a button (opens a member, a sheet...). */
export function RowButton({ leading, title, sub, meta, trailing, className, style, ...rest }: RowContent & Omit<HTMLAttributes<HTMLButtonElement>, "title"> & { disabled?: boolean }) {
  return (
    <button
      type="button"
      className={cx("s1-row s1-tap", className)}
      style={{ appearance: "none", border: 0, background: "transparent", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", ...style }}
      {...rest}
    >
      <RowInner leading={leading} title={title} sub={sub} meta={meta} trailing={trailing} />
    </button>
  );
}

export function RowLink({ leading, title, sub, meta, trailing, className, ...rest }: RowContent & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "title">) {
  return (
    <a className={cx("s1-row", className)} {...rest}>
      <RowInner leading={leading} title={title} sub={sub} meta={meta} trailing={trailing} />
    </a>
  );
}

/** "Joy" with an initial: who did it, on feed rows. */
export function By({ name }: { name: string }) {
  return (
    <span className="s1-by">
      <i>{name.slice(0, 1)}</i>
      {name}
    </span>
  );
}
