import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { desk } from "../../../client/desk";
import { toUiError } from "../../../client/errors";
import { Button, Chip } from "../../../components/kit";
import { useT } from "../../../i18n";
import { LangSwitch } from "../../shared/LangSwitch";
import { SignInFrame } from "../SignInFrame";
import { useDesk } from "./DeskContext";

/** D01 step 2: Who's on shift? The choice sticks on this device until someone taps Change. */
export function ShiftPicker() {
  const t = useT();
  const { startShift } = useDesk();
  const staff = useQuery({ queryKey: ["desk", "staff"], queryFn: desk.staff });
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = staff.data ?? [];
  const sel = picked ?? (list[0] ? { id: list[0].id, name: list[0].name } : null);
  return (
    <SignInFrame caption={t("auth.deskTitle")} footer={<LangSwitch />}>
      <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 className="s1-title2" style={{ textAlign: "center" }}>
          {t("desk.whoOnShift")}
        </h1>
        <p style={{ margin: 0, textAlign: "center", font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.shiftNote")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {list.map((s) => (
            <Chip key={s.id} name={s.name} selected={sel?.id === s.id} onClick={() => setPicked({ id: s.id, name: s.name })} style={{ justifyContent: "center", padding: "0 12px" }} />
          ))}
        </div>
        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--s1-red)", font: "500 14px/20px var(--font-sans)" }}>
            {error}
          </p>
        )}
        <Button
          size="lg"
          block
          disabled={!sel || busy}
          onClick={async () => {
            if (!sel) return;
            setBusy(true);
            setError(null);
            try {
              await startShift(sel.id, sel.name);
            } catch (e) {
              const u = toUiError(e);
              setError(t(u.key, u.vars));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("desk.startShift", { name: sel?.name ?? "" })}
        </Button>
      </div>
    </SignInFrame>
  );
}
