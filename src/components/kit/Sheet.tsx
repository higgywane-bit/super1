import { useEffect, useRef, type ReactNode } from "react";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Sheet over a Glass dim (Motion #7): rises 360 ms from the bottom on a phone, slides in from the
 * right on a desk-sized screen. Tap outside, Escape (or swipe down on a phone) closes it. Focus is
 * trapped inside while open and returns to where it was.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  side,
  width = 600,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name (the visible title lives in children). */
  title: string;
  children: ReactNode;
  /** Force a side. Default: right on screens ≥ 768 px, bottom below. */
  side?: "right" | "bottom";
  width?: number;
  closeLabel?: string;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const where = side ?? (wide ? "right" : "bottom");
  const panel = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((n) => !n.hasAttribute("disabled"));
    (focusables()[0] ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const right = where === "right";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", justifyContent: right ? "flex-end" : "center", alignItems: right ? "stretch" : "flex-end" }}>
      <button type="button" aria-label={closeLabel} className="s1-glass" onClick={onClose} style={{ position: "absolute", inset: 0, border: 0, cursor: "default", animation: "s1-fade 200ms both" }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={right ? "s1-sheet" : "s1-sheet s1-sheet-up"}
        onTouchStart={right ? undefined : (e) => (startY.current = e.touches[0].clientY)}
        onTouchEnd={
          right
            ? undefined
            : (e) => {
                if (startY.current != null && e.changedTouches[0].clientY - startY.current > 90 && (panel.current?.scrollTop ?? 0) <= 0) onClose();
                startY.current = null;
              }
        }
        style={
          right
            ? { position: "relative", width: `min(${width}px, 100%)`, height: "100%", borderRadius: "28px 0 0 28px", padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 22, animation: "s1-rise 360ms var(--ease-ios) both", outline: "none" }
            : { position: "relative", width: "100%", maxWidth: 640, maxHeight: "92dvh", borderRadius: "28px 28px 0 0", padding: "0 20px calc(28px + env(safe-area-inset-bottom))", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, outline: "none" }
        }
      >
        {!right && <div className="s1-grabber" style={{ flex: "none", marginBottom: 4 }} />}
        {children}
      </div>
    </div>
  );
}
