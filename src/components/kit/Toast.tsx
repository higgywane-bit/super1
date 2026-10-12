import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Disc } from "./Disc";

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; tone: "go" | "stop" | "warn"; action?: ToastAction };
type ToastApi = (message: string, opts?: { tone?: ToastItem["tone"]; ms?: number; action?: ToastAction }) => void;

const ToastContext = createContext<ToastApi>(() => {});

/** Toast at the top centre (slides down). "Invite sent… Ring ฿2,200 on Qashier." */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const show = useCallback<ToastApi>((message, opts) => {
    const id = next.current++;
    setItems((xs) => [...xs, { id, message, tone: opts?.tone ?? "go", action: opts?.action }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts?.ms ?? 4200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" style={{ position: "fixed", left: 0, right: 0, top: "calc(24px + env(safe-area-inset-top))", zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none", padding: "0 16px" }}>
        {items.map((t) => (
          <div
            key={t.id}
            className="s1-slide-down"
            role="status"
            style={{ maxWidth: 560, padding: "14px 18px", borderRadius: 16, background: "var(--surface-2)", boxShadow: "var(--shadow-sheet), inset 0 0 0 1px var(--hairline)", display: "flex", alignItems: "center", gap: 12, font: "600 15px/20px var(--font-sans)", pointerEvents: "auto" }}
          >
            <Disc tone={t.tone} style={{ width: 28, height: 28 }}>
              <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 15, height: 15, strokeWidth: 3 }}>
                {t.tone === "go" ? <path d="M20 6 9 17l-5-5" /> : t.tone === "stop" ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M12 8v5M12 17h.01" />}
              </svg>
            </Disc>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="s1-btn s1-btn--sm s1-btn--tinted"
                onClick={() => {
                  t.action?.onClick();
                  setItems((xs) => xs.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
