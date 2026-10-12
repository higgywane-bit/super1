import type { ReactNode } from "react";
import { Wordmark } from "../../components/kit";
import { launchMotion } from "../shared/motion";

/** Centred sign-in column with the wordmark and Motion #1 (D01 layout, also used by Pete's sign-in). */
export function SignInFrame({ caption, pill, children, footer }: { caption?: ReactNode; pill?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const motion = launchMotion();
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "40px 16px", boxSizing: "border-box" }}>
      <div style={{ width: "min(440px, 100%)", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ alignSelf: "center", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <Wordmark height={44} motion={motion} />
          {pill}
        </div>
        {caption && <p style={{ margin: 0, textAlign: "center", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{caption}</p>}
        {children}
        {footer && <div style={{ alignSelf: "center", marginTop: 8 }}>{footer}</div>}
      </div>
    </main>
  );
}
