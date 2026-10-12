import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Icon } from "../../../../components/kit";
import { useT } from "../../../../i18n";

export function SheetHeader({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  const t = useT();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <h2 className="s1-title2">{title}</h2>
        {sub && <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{sub}</span>}
      </div>
      <Button variant="secondary" icon aria-label={t("common.close")} onClick={onClose}>
        <Icon icon={X} />
      </Button>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="s1-card" style={{ padding: "14px 16px", background: "var(--surface-2)", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{children}</div>;
}
