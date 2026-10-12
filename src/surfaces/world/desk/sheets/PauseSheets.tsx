import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { desk } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Field, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { dayLabel } from "../../../../i18n/format";
import { addDays, diffDays, isISODate, localDate } from "../../../../lib/dates";
import { useDesk } from "../DeskContext";
import { Note, SheetHeader } from "./SheetHeader";

/** Pause a member: everything running or queued moves back by the pause length (docs/04 §5). */
export function PauseSheet({ memberId }: { memberId: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const q = useQuery({ queryKey: ["desk", "detail", memberId], queryFn: () => desk.detail(memberId) });
  const today = localDate();
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(addDays(today, 6));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = isISODate(from) && isISODate(until) && until >= from;
  const n = valid ? diffDays(from, until) + 1 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.pauseTitle", { name: q.data?.member.name ?? "" })} onClose={close} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Field id="p-from" type="date" label={t("desk.pauseFrom")} value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field id="p-until" type="date" label={t("desk.pauseUntil")} value={until} min={from} onChange={(e) => setUntil(e.target.value)} />
      </div>
      <Field id="p-reason" label={t("desk.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
      <Note>{t("desk.pauseNote")}</Note>
      <Button
        size="lg"
        block
        disabled={!valid || busy || !shift}
        onClick={async () => {
          if (!shift) return;
          setBusy(true);
          try {
            await desk.pause(memberId, from, until, shift.staffId, reason.trim() || null);
            refresh();
            close();
            toast(t("desk.pausedToast", { date: dayLabel(until, lang) }));
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("desk.pauseBtn", { n })}
      </Button>
    </div>
  );
}

/** End a pause early: they're back today, unused days are given back. */
export function EndPauseSheet({ pauseId, from, until }: { memberId: string; pauseId: string; from: string; until: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.endPauseTitle")} onClose={close} />
      <Note>{t("desk.endPauseBody", { from: dayLabel(from, lang), until: dayLabel(until, lang) })}</Note>
      <Button
        size="lg"
        block
        disabled={busy || !shift}
        onClick={async () => {
          if (!shift) return;
          setBusy(true);
          try {
            const r = await desk.endPause(pauseId, localDate(), shift.staffId);
            refresh();
            close();
            toast(t("desk.endPausedToast", { n: r.days_given_back ?? 0 }));
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("desk.endPauseBtn")}
      </Button>
    </div>
  );
}
