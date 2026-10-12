import type { ReactNode } from "react";

export type TabItem<T extends string> = { value: T; label: string; icon: ReactNode; badge?: number };

/** Phone tab bar: floating glass pill (.s1-tabbar). Position it inside a relative phone frame or fixed to the viewport. */
export function TabBar<T extends string>({ items, value, onChange, label, fixed = true }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; fixed?: boolean }) {
  return (
    <nav aria-label={label} className="s1-tabbar" style={fixed ? { position: "fixed", maxWidth: 520, margin: "0 auto", bottom: "calc(20px + env(safe-area-inset-bottom))" } : undefined}>
      {items.map((t) => (
        <button key={t.value} type="button" className="s1-tab" aria-pressed={t.value === value} aria-label={t.label} onClick={() => onChange(t.value)}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
