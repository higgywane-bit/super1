import { Check } from "lucide-react";
import { useState } from "react";
import { admin, type MemberBrief, type MergeRequest } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { Button, Card, Icon, Sheet, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel, monthLabel } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { SheetHeader } from "../desk/sheets/SheetHeader";

const no = (n: number) => String(n).padStart(4, "0");

/** Review a merge request: both members side by side, what happens, Merge into #keep or Not a duplicate. */
export function MergeSheet({ req, onClose, onDone }: { req: MergeRequest | null; onClose: () => void; onDone: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!req) return null;
  const k = req.keep;
  const d = req.duplicate;
  const box = (m: MemberBrief, label: string, keep: boolean) => (
    <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-2)", boxShadow: keep ? "inset 0 0 0 2px var(--s1-blue)" : undefined }}>
      <span style={{ font: "600 12px/16px var(--font-sans)", color: keep ? "var(--s1-blue)" : "var(--text-secondary)" }}>{label}</span>
      <span className="s1-headline">{m.name}</span>
      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
        {t("admin.memberLine", { no: no(m.member_no), date: m.created_at.slice(0, 4) === localDate().slice(0, 4) ? dayLabel(m.created_at.slice(0, 10), lang) : monthLabel(m.created_at.slice(0, 10), lang), visits: m.visits })}
      </span>
      {m.phone && <span className="s1-num" style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{m.phone}</span>}
      {m.email && <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{m.email}</span>}
      <span className="s1-num" style={{ font: "600 13px/18px var(--font-sans)", letterSpacing: "0.08em" }}>{m.tags.join(" · ")}</span>
      {m.plans.slice(0, 3).map((p, i) => (
        <span key={i} style={{ font: "500 13px/18px var(--font-sans)" }}>
          {p.plan} · {dayLabel(p.starts_on, lang)} → {dayLabel(p.ends_on, lang)}
        </span>
      ))}
    </Card>
  );
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      onDone();
      onClose();
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} title={t("admin.reviewMerge")} side="right" closeLabel={t("common.close")}>
      <SheetHeader title={t("admin.mergeTitle", { name: d.name, dup: no(d.member_no), keep: no(k.member_no) })} sub={t("admin.mergeSub", { by: req.by ?? "—", time: dayLabel(req.requested_at.slice(0, 10), lang) })} onClose={onClose} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {box(k, `${t("admin.keep")} · #${no(k.member_no)}`, true)}
        {box(d, `${t("admin.duplicate")} · #${no(d.member_no)}`, false)}
      </div>
      <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-2)" }}>
        <span className="s1-headline" style={{ fontSize: 16 }}>
          {t("admin.mergeWhat")}
        </span>
        {[t("admin.mergeWhat1", { dup: no(d.member_no), keep: no(k.member_no) }), t("admin.mergeWhat2", { tags: d.tags.join(", ") || "—", keep: no(k.member_no) }), t("admin.mergeWhat3")].map((s) => (
          <span key={s} style={{ display: "flex", gap: 10, font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
            <Icon icon={Check} style={{ color: "var(--s1-green)", width: 18, height: 18 }} />
            {s}
          </span>
        ))}
      </Card>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button disabled={busy} onClick={() => void run(() => admin.merge(req.id), t("admin.merged", { dup: no(d.member_no), keep: no(k.member_no) }))}>
          {t("admin.mergeInto", { keep: no(k.member_no) })}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void run(() => admin.reject(req.id), t("admin.rejected"))}>
          {t("admin.notDuplicate")}
        </Button>
      </div>
    </Sheet>
  );
}
