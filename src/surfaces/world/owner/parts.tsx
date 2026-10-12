import type { CSSProperties, ReactNode } from "react";
import { Card } from "../../../components/kit";

export const label: CSSProperties = { font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)" };
export const sub: CSSProperties = { font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" };

export function Kpi({ title, value, foot, footColor, delay = 0, valueColor }: { title: string; value: ReactNode; foot?: ReactNode; footColor?: string; delay?: number; valueColor?: string }) {
  return (
    <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={label}>{title}</span>
      <span className="s1-kpi s1-pop s1-num" style={{ animationDelay: `${delay}ms`, color: valueColor }}>
        {value}
      </span>
      {foot != null && <span style={{ ...sub, color: footColor ?? "var(--text-secondary)" }}>{foot}</span>}
    </Card>
  );
}

export function Bar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ height, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
      <div className="s1-width-grow" style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 999 }} />
    </div>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 4px" }}>
        <h2 className="s1-section" style={{ margin: 0 }}>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <Card style={{ padding: "14px 16px", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
      {children}
    </Card>
  );
}
