import { Send } from "lucide-react";
import { Button, Icon } from "../../../components/kit";

/** Shows only when there's something to send: "Unsent changes" + one button. Otherwise a quiet synced line. */
export function SendBar({ dirty, label, note, synced, busy, onSend }: { dirty: boolean; label: string; note: string; synced: string | null; busy?: boolean; onSend: () => void }) {
  if (!dirty) {
    return synced ? (
      <span data-testid="sync-pill" style={{ display: "flex", alignItems: "center", gap: 8, font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 4, background: "var(--s1-green)" }} />
        {synced}
      </span>
    ) : null;
  }
  return (
    <div className="s1-rise" style={{ position: "sticky", bottom: 16, zIndex: 5, display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 18px", borderRadius: 999, background: "var(--surface-3)", boxShadow: "var(--shadow-sheet)" }}>
      <span data-testid="sync-pill" style={{ flex: 1, font: "600 14px/19px var(--font-sans)", color: "var(--s1-yellow)" }}>
        {note}
      </span>
      <Button onClick={onSend} disabled={busy} style={{ borderRadius: 999 }}>
        <Icon icon={Send} size={16} /> {label}
      </Button>
    </div>
  );
}
