import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { coach, type UseResult } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Button, Disc, Icon, Sheet, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { time } from "../../../i18n/format";

export type SessionTarget = { memberId: string; name: string; left: number; total: number; plan: string };

/**
 * −1 with one confirm: "6 → 5", then the done state with the big number, "Logged 21:15 · Emma
 * sees it now", Undo (the database allows it for 10 minutes) and Done.
 */
export function UseSessionSheet({ target, via, onClose }: { target: SessionTarget | null; via: "coach_portal"; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<(UseResult & { at: string }) | null>(null);
  const first = target?.name.split(" ")[0] ?? "";

  const close = () => {
    setDone(null);
    onClose();
  };
  const refresh = () => void qc.invalidateQueries({ queryKey: ["coach"] });
  const fail = (e: unknown) => {
    const u = toUiError(e);
    toast(t(u.key, u.vars), { tone: "stop" });
  };

  return (
    <Sheet open={!!target} onClose={close} title={target ? t("coach.useTitle", { name: target.name }) : ""} width={460}>
      {target && !done && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "8px 22px 28px", alignItems: "stretch" }}>
          <h2 className="s1-title2" style={{ margin: 0 }}>
            {t("coach.useTitle", { name: target.name })}
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18, padding: "10px 0" }} aria-hidden>
            <span className="s1-kpi" style={{ color: "var(--text-secondary)" }}>{target.left}</span>
            <span style={{ font: "600 22px/1 var(--font-sans)", color: "var(--text-tertiary)" }}>→</span>
            <span className="s1-kpi" style={{ color: "var(--s1-pink)", fontSize: 56, lineHeight: "60px" }}>
              {target.left - 1}
            </span>
          </div>
          <p style={{ margin: 0, textAlign: "center", font: "500 15px/21px var(--font-sans)", color: "var(--text-secondary)" }}>
            {t("coach.useBody", { plan: target.plan, left: target.left, after: target.left - 1, name: first })}
          </p>
          <button
            type="button"
            className="s1-btn s1-btn--lg s1-btn--block"
            disabled={busy}
            style={{ background: "var(--s1-pink)", color: "var(--background)" }}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await coach.useSession(target.memberId, via);
                setDone({ ...r, at: new Date().toISOString() });
                refresh();
              } catch (e) {
                fail(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("coach.use1")}
          </button>
          <Button variant="plain" style={{ color: "var(--foreground)" }} onClick={close}>
            {t("coach.cancel")}
          </Button>
        </div>
      )}
      {target && done && (
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 22px 28px", alignItems: "center", textAlign: "center" }} data-testid="session-done">
          <Disc tone="pt" style={{ width: 56, height: 56 }}>
            <Icon icon={Check} size={28} />
          </Disc>
          <span className="s1-kpi s1-pop" style={{ color: "var(--s1-pink)", fontSize: 72, lineHeight: "76px" }}>
            {done.left}
          </span>
          <span style={{ font: "600 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.ofLeft", { n: done.total })}</span>
          <span style={{ font: "500 15px/21px var(--font-sans)" }}>{t("coach.logged", { time: time(done.at), name: first })}</span>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await coach.undo(done.session_id);
                  toast(t("coach.undone", { name: first, n: done.left + 1 }));
                  refresh();
                  close();
                } catch (e) {
                  fail(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("coach.undo")}
            </Button>
            <Button style={{ flex: 1 }} onClick={close}>
              {t("coach.done")}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
