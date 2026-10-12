import { cx } from "./cx";

export type SegmentedOption<T extends string> = { value: T; label: string; lang?: string };

/** .s1-seg: tabs inside a page, the language switch. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  block,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
  block?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className={cx("s1-seg", className)} style={block ? { display: "flex", width: "100%" } : undefined}>
      {options.map((o) => (
        <button key={o.value} type="button" lang={o.lang} aria-pressed={o.value === value} onClick={() => onChange(o.value)} style={block ? { flex: 1 } : undefined}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
