import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, QrCode } from "lucide-react";
import { useState } from "react";
import { desk, type PayMethod } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Field, Group, Icon, Row, TextArea, useToast, Avatar } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { ago, baht, dayLabel, LANG_NAMES, time } from "../../../../i18n/format";
import { useDesk, useStaticData } from "../DeskContext";
import { MethodPicker } from "./PlanPicker";
import { Note, SheetHeader } from "./SheetHeader";

/** Message Pete: the desk's support chat (writes messages; the outbox emails Pete). */
export function MessageSheet() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, close } = useDesk();
  const msgs = useQuery({ queryKey: ["desk", "messages"], queryFn: desk.messages });
  const staff = useQuery({ queryKey: ["desk", "staff"], queryFn: desk.staff });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string | null) => staff.data?.find((s) => s.id === id)?.name ?? "";
  const list = [...(msgs.data ?? [])].reverse();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.msgTitle")} sub={t("desk.msgNote")} onClose={close} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.length === 0 && <span style={{ color: "var(--text-secondary)", font: "500 14px/20px var(--font-sans)" }}>{t("desk.msgEmpty")}</span>}
        {list.map((m) => {
          const mine = m.from_side === "desk";
          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: 16,
                background: mine ? "var(--s1-blue-tint)" : "var(--surface-2)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ font: "500 15px/21px var(--font-sans)", whiteSpace: "pre-wrap" }}>{m.body}</span>
              <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>
                {mine ? nameOf(m.staff_id) : "Pete"} · {dayLabel(m.created_at.slice(0, 10), lang)} {time(m.created_at)}
              </span>
            </div>
          );
        })}
      </div>
      <TextArea aria-label={t("desk.msgTitle")} placeholder={t("desk.msgPh")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
      <Button
        disabled={!body.trim() || busy || !shift}
        onClick={async () => {
          if (!shift) return;
          setBusy(true);
          try {
            await desk.messagePete(body, shift.staffId);
            setBody("");
            void msgs.refetch();
            toast(t("desk.msgSent"));
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("desk.msgSend")}
      </Button>
    </div>
  );
}

/** Walk-in day pass without a member record: desk_day_pass logs the sale and the visit. */
export function DayPassSheet() {
  const { t } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const { plans } = useStaticData();
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const price = plans.find((p) => p.id === "day")?.price_thb ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.dayPassTitle")} sub={t("desk.dayPassBody")} onClose={close} />
      <div>
        <p className="s1-label">{t("desk.howMany")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Button variant="secondary" icon aria-label={t("desk.less")} onClick={() => setQty((n) => Math.max(1, n - 1))}>
            <Icon icon={Minus} />
          </Button>
          <span className="s1-num" style={{ font: "700 34px/40px var(--font-sans)", minWidth: 40, textAlign: "center" }}>
            {qty}
          </span>
          <Button variant="secondary" icon aria-label={t("desk.more")} onClick={() => setQty((n) => Math.min(20, n + 1))}>
            <Icon icon={Plus} />
          </Button>
        </div>
      </div>
      <MethodPicker value={method} onChange={setMethod} label={t("desk.paidBy")} />
      <Button
        size="lg"
        block
        disabled={!method || busy || !shift}
        onClick={async () => {
          if (!shift || !method) return;
          setBusy(true);
          try {
            const r = await desk.dayPass(method, shift.staffId, qty);
            refresh();
            close();
            toast(t("desk.soldToast", { plan: `${qty} × ${t("desk.dayPass")}`, price: baht(r.total) }), { ms: 6000 });
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("desk.dayPassBtn", { n: qty, price: baht(price * qty) })}
      </Button>
      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-tertiary)", textAlign: "center" }}>{t("desk.ringQashier", { name: shift?.name ?? "" })}</span>
    </div>
  );
}

/** Attach a tag to an existing member (lost tag, or none yet). */
export function AddTagSheet({ memberId }: { memberId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = tag.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.addTag")} onClose={close} />
      <Field id="d-newtag" label={t("desk.scanTag")} placeholder={t("desk.scanTagPh")} autoFocus inputMode="numeric" autoComplete="off" value={tag} onChange={(e) => setTag(e.target.value)} className="s1-input s1-num" style={{ height: 56, fontSize: 22, letterSpacing: "0.12em" }} />
      <Button
        size="lg"
        block
        disabled={clean.length < 3 || busy || !shift}
        onClick={async () => {
          if (!shift) return;
          setBusy(true);
          try {
            const r = await desk.addTag(memberId, clean, shift.staffId);
            refresh();
            close();
            toast(t("desk.tagAdded", { tag: r.code }));
          } catch (e) {
            const u = toUiError(e);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("desk.addTag")}
      </Button>
    </div>
  );
}

/**
 * New member: every new member signs the waiver on the counter QR first, so this sheet points the
 * customer at the QR and lists who's waiting.
 */
export function NewMemberSheet() {
  const { t, lang } = useI18n();
  const { close, open } = useDesk();
  const waiting = useQuery({ queryKey: ["desk", "waiting"], queryFn: desk.waiting });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.newMember")} onClose={close} />
      <Note>
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Icon icon={QrCode} style={{ color: "var(--s1-blue)", flex: "none" }} />
          {t("desk.newMemberNote")}
        </span>
      </Note>
      <p className="s1-section">{t("desk.waiting")}</p>
      <Group>
        {(waiting.data ?? []).map((s) => {
          const name = `${s.first_name} ${s.last_name}`.trim();
          return (
            <Row
              key={s.id}
              leading={<Avatar name={name} />}
              title={name}
              sub={`${LANG_NAMES[s.lang]} · ${ago(s.created_at, lang)}`}
              meta={
                <Button size="sm" onClick={() => open(s.kind === "link" ? { type: "link", signup: s } : { type: "signup", signup: s })}>
                  {s.kind === "link" ? t("desk.linkRequest") : t("desk.finishSignup")}
                </Button>
              }
            />
          );
        })}
        {waiting.isFetched && !waiting.data?.length && <Row title={t("desk.noWaiting")} />}
      </Group>
    </div>
  );
}
