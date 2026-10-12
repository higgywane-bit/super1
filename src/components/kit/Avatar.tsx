import type { CSSProperties } from "react";
import { cx } from "./cx";

/** Two initials from a name: "Emma Wilson" → "EW". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** .s1-avatar: initials or a photo. */
export function Avatar({ name, src, size, className, style }: { name: string; src?: string | null; size?: number; className?: string; style?: CSSProperties }) {
  const dim: CSSProperties = size ? { width: size, height: size, fontSize: Math.round(size * 0.35) } : {};
  return (
    <span className={cx("s1-avatar", className)} style={{ ...dim, overflow: "hidden", ...style }} aria-hidden={src ? undefined : true}>
      {src ? <img src={src} alt={name} className="s1-photo" /> : initials(name)}
    </span>
  );
}
