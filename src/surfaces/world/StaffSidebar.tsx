import type { ReactNode } from "react";
import { Wordmark } from "../../components/kit";

/** Desk and admin sidebar frame: 248 px, surface-1, hairline on the right (Desk/Admin boards). */
export function StaffSidebar({ pill, children, footer }: { pill?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <aside
      style={{ flex: "1 0 248px", maxWidth: "100%", boxSizing: "border-box", background: "var(--surface-1)", boxShadow: "inset -1px 0 0 var(--hairline)", padding: "28px 14px", display: "flex", flexDirection: "column", gap: 22 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12 }}>
        <Wordmark height={22} glow={false} />
        {pill}
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</nav>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>{footer}</div>
    </aside>
  );
}

/** Sidebar + main, wrapping on narrow screens (no horizontal scroll at 390 px). */
export function StaffLayout({ sidebar, children, maxWidth = 1140 }: { sidebar: ReactNode; children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", minHeight: "100dvh" }}>
      {sidebar}
      <main style={{ flex: "999 1 560px", minWidth: 0, boxSizing: "border-box", padding: "36px clamp(16px, 4vw, 44px) 56px", display: "flex", flexDirection: "column", gap: 24, maxWidth }}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <h1 className="s1-largetitle">{title}</h1>
        {sub && <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{sub}</span>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}
