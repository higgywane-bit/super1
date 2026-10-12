import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { desk } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Card, Field, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { dayLabel, monthLabel } from "../../../../i18n/format";
import { localDate } from "../../../../lib/dates";
import { useDesk } from "../DeskContext";
import { SheetHeader } from "./SheetHeader";

/**
 * D10 · Archive or merge. Archive keeps everything and stops the tag; restore any time. The desk can't
 * merge: it asks Pete about a likely duplicate (same phone or email). The older record is kept.
 */
export function ArchiveSheet({ memberId }: { memberId: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { shift, close, refresh } = useDesk();
  const q = useQuery({ queryKey: ["desk", "detail", memberId], queryFn: () => desk.detail(memberId) });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const d = q.data;
  if (!d || !shift) return null;
  const m = d.member;
  const first = m.first_name;

  const run = async (fn: () => Promise<unknown>, done: () => void) => {
    setBusy(true);
    try {
      await fn();
      refresh();
      done();
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={`${m.name} #${String(m.member_no).padStart(4, "0")}`} onClose={close} />
      <Card style={{ padding: 18, background: "var(--surface-2)", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="s1-headline">{m.archived_at ? t("desk.restore") : t("desk.archive")}</span>
        {m.archived_at ? (
          <Button
            disabled={busy}
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              void run(
                () => desk.restore(m.id, shift.staffId),
                () => {
                  close();
                  toast(t("desk.restoredToast", { name: m.name }));
                },
              )
            }
          >
            {t("desk.restore")}
          </Button>
        ) : (
          <>
            <span style={{ font: "400 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.archiveBody")}</span>
            <Field id="d-archive-reason" label={t("desk.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              variant="danger"
              disabled={busy}
              style={{ alignSelf: "flex-start" }}
              onClick={() =>
                void run(
                  () => desk.archive(m.id, shift.staffId, reason.trim() || null),
                  () => {
                    close();
                    toast(t("desk.archivedToast", { name: m.name }));
                    void navigate({ to: "/w/members" });
                  },
                )
              }
            >
              {t("desk.archiveBtn", { name: first })}
            </Button>
          </>
        )}
      </Card>
      <Card style={{ padding: 18, background: "var(--surface-2)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "inset 0 0 0 1px rgba(0,180,255,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="s1-headline">{t("desk.merge")}</span>
          <span className="s1-pill" style={{ height: 22, color: "var(--on-blue)", background: "var(--s1-blue)", fontSize: 11 }}>
            Pete
          </span>
        </div>
        {d.duplicates.length === 0 && <span style={{ font: "400 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.noDuplicates")}</span>}
        {d.duplicates.map((o) => {
          const keepOther = o.member_no < m.member_no;
          const keep = keepOther ? { id: o.id, no: o.member_no, joined: o.created_at, visits: o.visits } : { id: m.id, no: m.member_no, joined: m.created_at, visits: d.visits_total };
          const dup = keepOther ? { id: m.id, no: m.member_no, joined: m.created_at, visits: d.visits_total } : { id: o.id, no: o.member_no, joined: o.created_at, visits: o.visits };
          const samePhone = !!m.phone;
          const pending = !!d.open_merge || sent === o.id;
          return (
            <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ font: "400 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>
                {t("desk.mergeBody", { what: t(samePhone ? "desk.mergeWhat.phone" : "desk.mergeWhat.email"), no: String(o.member_no).padStart(4, "0"), name: o.name })}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {[
                  [t("desk.mergeKeep", { no: String(keep.no).padStart(4, "0") }), keep],
                  [t("desk.mergeDup", { no: String(dup.no).padStart(4, "0") }), dup],
                ].map(([label, x]) => {
                  const v = x as typeof keep;
                  return (
                    <div key={String(label)} style={{ padding: 12, borderRadius: 14, background: "var(--surface-3)", display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "600 14px/19px var(--font-sans)" }}>{String(label)}</span>
                      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                        {t("desk.joinedVisits", { date: v.joined.slice(0, 4) === localDate().slice(0, 4) ? dayLabel(v.joined.slice(0, 10), lang) : monthLabel(v.joined.slice(0, 10), lang), n: v.visits })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="tinted"
                style={{ alignSelf: "flex-start" }}
                disabled={busy || pending}
                onClick={() =>
                  void run(
                    () => desk.requestMerge(keep.id, dup.id, shift.staffId, null),
                    () => setSent(o.id),
                  )
                }
              >
                {pending ? t("desk.mergeSent") : t("desk.askMerge")}
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
