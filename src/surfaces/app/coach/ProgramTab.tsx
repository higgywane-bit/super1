import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { coach, type ClientDetail, type Exercise } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Button, Card, Field, Icon, Input, Label, Sheet, Stepper, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { dayLabel, localDayOf } from "../../../i18n/format";
import { minutesBetween } from "../../../lib/dates";
import { dayStats, nextDayName, sameProgram, type ProgramBody, type ProgramItem } from "../../../lib/coach";
import { SendBar } from "./SendBar";

const EMPTY: ProgramBody = { days: [{ name: "Day A", items: [] }] };
const chip = () => ({ height: 38, padding: "0 16px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)" }) as const;

/** C03 · Workouts: day chips, plain exercise rows (tap to edit), Send only when something changed. */
export function ProgramTab({ d, today }: { d: ClientDetail; today: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const sent = d.program?.body ?? null;
  const [body, setBody] = useState<ProgramBody>(() => structuredClone(sent ?? EMPTY));
  const [sel, setSel] = useState(0);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [dayEdit, setDayEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const di = Math.min(sel, body.days.length - 1);
  const day = body.days[di];
  const dirty = !sent ? body.days.some((x) => x.items.length > 0) : !sameProgram(body, sent);
  const first = d.member.first_name;
  const stats = dayStats(day);

  const setDay = (f: (items: ProgramItem[]) => ProgramItem[], name?: string) => setBody((b) => ({ days: b.days.map((x, i) => (i === di ? { name: name ?? x.name, items: f(x.items) } : x)) }));

  async function send() {
    setBusy(true);
    try {
      const r = await coach.sendProgram(d.member.id, { days: body.days.map((x) => ({ ...x, name: x.name.trim() || "Day" })) });
      toast(t("coach.sent", { name: first, v: r.version }), { tone: "go" });
      await qc.invalidateQueries({ queryKey: ["coach", "client", d.member.id] });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    } finally {
      setBusy(false);
    }
  }

  const lastOf = (it: ProgramItem) => {
    const l = d.last[it.exercise_id ?? ""] ?? d.last[it.name.toLowerCase()];
    if (!l) return null;
    return { text: l.seconds ? `${l.seconds} s` : `${l.kg != null ? `${Number(l.kg)} × ` : ""}${l.reps ?? ""}`, pr: l.pr };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="s1-hscroll" style={{ gap: 8 }}>
        {body.days.map((x, i) => (
          <button key={i} type="button" aria-pressed={i === di} className={`s1-pill s1-pill--plain s1-tap ${i === di ? "s1-chip-on" : "s1-chip-off"}`} style={chip()} onClick={() => setSel(i)}>
            {x.name || "—"}
          </button>
        ))}
        <button
          type="button"
          aria-label={t("coach.addDay")}
          className="s1-pill s1-pill--plain s1-tap s1-chip-off"
          style={{ ...chip(), width: 38, padding: 0, justifyContent: "center" }}
          onClick={() => {
            setBody((b) => ({ days: [...b.days, { name: nextDayName(b.days), items: [] }] }));
            setSel(body.days.length);
          }}
        >
          <Icon icon={Plus} size={16} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="s1-title2" style={{ margin: 0 }}>
            {day.name}
          </h2>
          <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("coach.dayStats", { n: stats.exercises, sets: stats.sets, min: stats.minutes })}</span>
        </div>
        <button type="button" aria-label={t("coach.editDay")} className="s1-btn s1-btn--plain s1-btn--icon" style={{ color: "var(--text-secondary)" }} onClick={() => setDayEdit(true)}>
          <Icon icon={Pencil} size={18} />
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {day.items.map((it, n) => {
          const last = lastOf(it);
          return (
            <button key={n} type="button" data-testid="program-row" className="s1-tap" onClick={() => setEditing(n)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer", boxShadow: n ? "inset 0 1px 0 var(--hairline)" : undefined }}>
              <span style={{ width: 20, font: "600 14px/1 var(--font-sans)", color: "var(--text-tertiary)" }}>{n + 1}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "600 16px/21px var(--font-sans)" }}>{it.name}</span>
                {it.cue && <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.cue}</span>}
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span className="s1-num" style={{ font: "700 16px/21px var(--font-sans)" }}>
                  {it.sets} × {it.log_type === "time" ? `${it.seconds ?? 30} s` : it.reps}
                </span>
                {last && <span className="s1-num" style={{ font: "500 12px/16px var(--font-sans)", color: last.pr ? "var(--s1-yellow)" : "var(--text-secondary)" }}>{t("coach.lastShort", { v: last.text + (last.pr ? ` ${t("coach.pr")}` : "") })}</span>}
              </span>
            </button>
          );
        })}
        <button type="button" className="s1-tap" onClick={() => setPicking(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "16px", border: 0, background: "transparent", color: "var(--s1-blue)", font: "600 15px/20px var(--font-sans)", cursor: "pointer", boxShadow: day.items.length ? "inset 0 1px 0 var(--hairline)" : undefined }}>
          <Icon icon={Plus} size={18} /> {t("coach.addExercise")}
        </button>
      </Card>

      <SendBar
        dirty={dirty}
        busy={busy}
        onSend={() => void send()}
        label={t("coach.sendTo", { name: first })}
        note={t("coach.unsent")}
        synced={d.program ? t("coach.inApp", { name: first, v: d.program.version, date: dayLabel(localDayOf(d.program.sent_at), lang, today) }) : null}
      />

      {d.workouts.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <h3 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("coach.recent")}
          </h3>
          {d.workouts.slice(0, 4).map((w) => (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0 4px", font: "500 14px/20px var(--font-sans)" }}>
              <span>
                {dayLabel(localDayOf(w.started_at), lang, today)} · {w.day_name}
              </span>
              <span style={{ color: w.pr ? "var(--s1-yellow)" : "var(--text-secondary)" }}>
                {w.pr ? t("coach.prLine", { name: w.pr.name, kg: Number(w.pr.kg ?? 0), reps: w.pr.reps ?? 0 }) : w.finished_at ? t("coach.workoutLine", { min: Math.max(1, minutesBetween(w.started_at, w.finished_at)), sets: w.sets }) : ""}
              </span>
            </div>
          ))}
        </section>
      )}

      <ExerciseSheet
        item={editing == null ? null : day.items[editing] ?? null}
        onClose={() => setEditing(null)}
        onSave={(it) => {
          setDay((items) => items.map((x, i) => (i === editing ? it : x)));
          setEditing(null);
        }}
        onRemove={() => {
          setDay((items) => items.filter((_, i) => i !== editing));
          setEditing(null);
        }}
      />
      <DaySheet
        open={dayEdit}
        name={day.name}
        canRemove={body.days.length > 1}
        onClose={() => setDayEdit(false)}
        onSave={(name) => {
          setDay((items) => items, name);
          setDayEdit(false);
        }}
        onRemove={() => {
          setBody((b) => ({ days: b.days.filter((_, i) => i !== di) }));
          setSel(Math.max(0, di - 1));
          setDayEdit(false);
        }}
      />
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(e) => {
          setDay((items) => [
            ...items,
            {
              exercise_id: e.id,
              name: e.name,
              muscle: e.muscle || undefined,
              equipment: e.equipment,
              log_type: e.log_type,
              sets: e.default_sets,
              reps: e.log_type === "time" ? null : e.default_reps ?? 10,
              seconds: e.log_type === "time" ? e.default_seconds ?? 30 : null,
              rest_s: e.log_type === "weight_reps" ? 90 : 60,
              cue: e.cue,
            },
          ]);
          setPicking(false);
        }}
      />
    </div>
  );
}

/** Edit one exercise: sets, reps (or seconds), rest, cue; or remove it. */
function ExerciseSheet({ item, onClose, onSave, onRemove }: { item: ProgramItem | null; onClose: () => void; onSave: (it: ProgramItem) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState<ProgramItem | null>(null);
  const [of, setOf] = useState<ProgramItem | null>(null);
  if (item !== of) {
    setOf(item);
    setV(item ? { ...item } : null);
  }
  const timed = v?.log_type === "time";
  const row = (label: string, el: ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 52 }}>
      <span style={{ font: "600 16px/21px var(--font-sans)" }}>{label}</span>
      {el}
    </div>
  );
  return (
    <Sheet open={!!item} onClose={onClose} title={item?.name ?? ""} width={460}>
      {v && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 22px 28px" }}>
          <h2 className="s1-title2" style={{ margin: "0 0 2px" }}>
            {v.name}
          </h2>
          <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)", marginBottom: 6 }}>{[v.muscle, v.equipment].filter(Boolean).join(" · ")}</span>
          {row(t("coach.sets"), <Stepper value={v.sets} min={1} max={10} label={t("coach.sets")} lessLabel={t("coach.less", { what: t("coach.sets") })} moreLabel={t("coach.more", { what: t("coach.sets") })} onChange={(n) => setV({ ...v, sets: n })} />)}
          {timed
            ? row(t("coach.secs"), <Stepper value={v.seconds ?? 30} step={5} min={5} max={600} label={t("coach.secs")} lessLabel={t("coach.less", { what: t("coach.secs") })} moreLabel={t("coach.more", { what: t("coach.secs") })} onChange={(n) => setV({ ...v, seconds: n })} />)
            : row(t("coach.reps"), <Stepper value={v.reps ?? 10} min={1} max={50} label={t("coach.reps")} lessLabel={t("coach.less", { what: t("coach.reps") })} moreLabel={t("coach.more", { what: t("coach.reps") })} onChange={(n) => setV({ ...v, reps: n })} />)}
          {row(t("coach.restS"), <Stepper value={v.rest_s} step={15} min={0} max={600} label={t("coach.restS")} lessLabel={t("coach.less", { what: t("coach.restS") })} moreLabel={t("coach.more", { what: t("coach.restS") })} onChange={(n) => setV({ ...v, rest_s: n })} />)}
          <div style={{ marginTop: 8 }}>
            <Label htmlFor="ex-cue-edit">{t("coach.exCue")}</Label>
            <Input id="ex-cue-edit" placeholder={t("coach.cuePh")} value={v.cue ?? ""} onChange={(e) => setV({ ...v, cue: e.target.value })} />
          </div>
          <Button size="lg" block style={{ marginTop: 12 }} onClick={() => onSave({ ...v, cue: v.cue?.trim() || null })}>
            {t("coach.save")}
          </Button>
          <Button variant="plain" style={{ color: "var(--s1-red)" }} onClick={onRemove}>
            {t("coach.remove", { name: v.name })}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function DaySheet({ open, name, canRemove, onClose, onSave, onRemove }: { open: boolean; name: string; canRemove: boolean; onClose: () => void; onSave: (n: string) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState(name);
  const [was, setWas] = useState(open);
  if (open !== was) {
    setWas(open);
    if (open) setV(name);
  }
  return (
    <Sheet open={open} onClose={onClose} title={t("coach.editDay")} width={420}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 22px 28px" }}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(v.trim() || name);
        }}
      >
        <h2 className="s1-title2" style={{ margin: 0 }}>
          {t("coach.editDay")}
        </h2>
        <Field id="day-name" label={t("coach.dayName")} value={v} onChange={(e) => setV(e.target.value)} />
        <Button type="submit" size="lg" block>
          {t("coach.save")}
        </Button>
        {canRemove && (
          <Button variant="plain" style={{ color: "var(--s1-red)" }} onClick={onRemove}>
            {t("coach.removeDay")}
          </Button>
        )}
      </form>
    </Sheet>
  );
}

/** The library picker: search + list; tap to add. */
export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const { t } = useI18n();
  const list = useQuery({ queryKey: ["coach", "exercises"], queryFn: coach.exercises, staleTime: 300_000, enabled: open });
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list.data ?? []).filter((e) => !s || `${e.name} ${e.muscle} ${e.equipment} ${e.muscle_group}`.toLowerCase().includes(s)).slice(0, 60);
  }, [list.data, q]);
  return (
    <Sheet open={open} onClose={onClose} title={t("coach.pickTitle")} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 22px 28px" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 14, color: "var(--text-secondary)" }}>
            <Icon icon={Search} size={18} />
          </span>
          <Input aria-label={t("coach.searchEx")} placeholder={t("coach.searchEx")} value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 42 }} autoFocus />
        </div>
        {shown.length === 0 && list.isFetched && <span style={{ color: "var(--text-secondary)" }}>{t("coach.noResults")}</span>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {shown.map((e) => (
            <button key={e.id} type="button" className="s1-tap" onClick={() => onPick(e)} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 2px", border: 0, background: "transparent", color: "var(--foreground)", textAlign: "left", cursor: "pointer", boxShadow: "inset 0 -1px 0 var(--hairline)", minHeight: 56 }}>
              <span style={{ font: "600 15px/20px var(--font-sans)" }}>{e.name}</span>
              <span style={{ font: "500 13px/18px var(--font-sans)", color: e.coach_id ? "var(--s1-pink)" : "var(--text-secondary)" }}>{[e.muscle || t(`coach.group.${e.muscle_group}`), e.equipment, e.coach_id ? t("coach.yours") : null].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
