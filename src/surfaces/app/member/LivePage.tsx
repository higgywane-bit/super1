import { useQuery, useQueryClient } from "@tanstack/react-query";
import { coach } from "../../../client/coach";
import { useNavigate } from "@tanstack/react-router";
import { Check, Plus, Timer, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flushWorkouts, queueWorkout, queuedWorkouts, type SavedWorkout } from "../../../client/member";
import { Button, Icon, Input, Stepper } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { buildSession, gainText, REST_CHOICES, setsToSave, type LiveExercise } from "../../../lib/workout";
import { ExerciseMedia } from "../../shared/ExerciseMedia";
import { ExercisePicker } from "../coach/ProgramTab";
import { useMemberHome } from "./useMember";

type Live = { id: string; key: string; started_at: string; i: number; ex: LiveExercise[]; note: string };
const STORE = "s1_live";

function load(key: string): Live | null {
  try {
    const l = JSON.parse(localStorage.getItem(STORE) ?? "null") as Live | null;
    return l && l.key === key ? l : null;
  } catch {
    return null;
  }
}
function save(l: Live | null) {
  try {
    if (l) localStorage.setItem(STORE, JSON.stringify(l));
    else localStorage.removeItem(STORE);
  } catch {
    /* no storage: the workout still works, it just won't survive a reload */
  }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** M05 · Live workout (kept on the phone as you go, so it survives going offline) and M06 · done. */
export function LivePage({ programId, day }: { programId?: string; day?: number }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const h = useMemberHome().data!;
  const program = h.programs.find((p) => p.program_id === programId);
  const pday = program && day != null ? program.body.days[day] : undefined;
  const key = pday ? `${program!.version_id}:${day}` : "own";
  const title = pday?.name ?? t("m.yourOwn");
  const fresh = useMemo<Live>(() => ({ id: crypto.randomUUID(), key, started_at: new Date().toISOString(), i: 0, ex: pday ? buildSession(pday, h.last) : [], note: "" }), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [live, setLive] = useState<Live>(() => load(key) ?? fresh);
  const [rest, setRest] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState<{ saved: SavedWorkout | null; sets: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => save(done ? null : live), [live, done]);
  useEffect(() => {
    if (rest == null) return;
    if (rest <= 0) {
      setRest(null);
      return;
    }
    const id = window.setTimeout(() => setRest((r) => (r == null ? null : r - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [rest]);

  const ex = live.ex[live.i];
  const library = useQuery({ queryKey: ["coach", "exercises"], queryFn: coach.exercises, staleTime: 300_000 });
  const media = new Map((library.data ?? []).filter((e) => e.media_path).map((e) => [e.id, e.media_path!]));
  const update = (f: (l: Live) => Live) => setLive((l) => f(structuredClone(l)));
  const last = ex ? h.last[ex.exercise_id ?? ""] ?? h.last[ex.name.toLowerCase()] : undefined;

  async function finish() {
    setBusy(true);
    const sets = setsToSave(live.ex);
    queueWorkout({ id: live.id, day_name: title, started_at: live.started_at, finished_at: new Date().toISOString(), program_version_id: pday ? program!.version_id : null, note: live.note || null, sets });
    const r = await flushWorkouts();
    const saved = r.find((x) => x.id === live.id) ?? null;
    setDone({ saved, sets: sets.length });
    save(null);
    if (saved) void qc.invalidateQueries({ queryKey: ["member"] });
    setBusy(false);
  }

  if (done) {
    const offline = !done.saved && queuedWorkouts().some((w) => w.id === live.id);
    const len = 2 * Math.PI * 54;
    return (
      <main className="s1-tab-in" data-testid="workout-done" style={{ minHeight: "80dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
        <svg width={132} height={132} viewBox="0 0 132 132" aria-hidden>
          <circle cx={66} cy={66} r={54} fill="none" stroke="var(--surface-3)" strokeWidth={10} />
          <circle className="s1-ring-fill" cx={66} cy={66} r={54} fill="none" stroke="var(--s1-blue)" strokeWidth={10} strokeLinecap="round" strokeDasharray={len} transform="rotate(-90 66 66)" style={{ ["--len" as string]: len, ["--to" as string]: 0 }} />
          <text x={66} y={74} textAnchor="middle" fill="var(--foreground)" style={{ font: "700 26px var(--font-sans)" }}>
            {done.sets}
          </text>
        </svg>
        <h1 className="s1-title2" style={{ margin: 0 }}>
          {t("m.done")}
        </h1>
        <span style={{ color: "var(--text-secondary)", font: "500 15px/20px var(--font-sans)" }}>
          {title} · {t("m.doneSets", { n: done.sets })}
        </span>
        {done.saved?.prs.map((p) => (
          <span key={p.name} className="s1-pop" data-testid="pr-badge" style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 18px", borderRadius: "var(--radius-tile)", background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)" }}>
            <span style={{ font: "700 15px/20px var(--font-sans)" }}>{t("m.pr")}</span>
            <span style={{ font: "500 14px/19px var(--font-sans)" }}>{t("m.prLine", { name: p.name, kg: Number(p.kg), reps: p.reps, gain: p.prev != null ? gainText(Number(p.kg), Number(p.prev)) : "" })}</span>
          </span>
        ))}
        <p style={{ margin: 0, maxWidth: 320, color: "var(--text-secondary)", font: "500 14px/20px var(--font-sans)" }}>{offline ? t("m.offline") : h.pt?.coach ? t("m.saved", { coach: h.pt.coach }) : t("m.savedSolo")}</p>
        <Button size="lg" style={{ minWidth: 200 }} onClick={() => void navigate({ to: "/a" })}>
          {t("m.newOrder")}
        </Button>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: rest != null ? 80 : 0 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button type="button" aria-label={t("m.close")} className="s1-btn s1-btn--secondary s1-btn--icon" style={{ width: 44, height: 44, borderRadius: 22 }} onClick={() => void navigate({ to: "/a/train" })}>
          <Icon icon={X} size={20} />
        </button>
        <span style={{ font: "600 15px/20px var(--font-sans)" }}>{title}</span>
        {ex ? (
          <button
            type="button"
            aria-label={t("m.restFor", { n: ex.rest_s })}
            className="s1-pill s1-pill--plain s1-chip-blue"
            style={{ height: 36, padding: "0 12px", border: 0, cursor: "pointer", gap: 6, font: "600 14px/18px var(--font-sans)" }}
            onClick={() => update((l) => ({ ...l, ex: l.ex.map((e, i) => (i === l.i ? { ...e, rest_s: REST_CHOICES[(REST_CHOICES.indexOf(e.rest_s as (typeof REST_CHOICES)[number]) + 1) % REST_CHOICES.length] } : e)) }))}
          >
            <Icon icon={Timer} size={16} /> {mmss(ex.rest_s)}
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </header>

      {live.ex.length > 0 && (
        <div aria-hidden style={{ display: "flex", gap: 4 }}>
          {live.ex.map((_, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= live.i ? "var(--foreground)" : "var(--surface-3)" }} />
          ))}
        </div>
      )}

      {ex && (
        <>
          <ExerciseMedia path={media.get(ex.exercise_id ?? "")} height={180} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
              {live.i + 1} / {live.ex.length} · {ex.target}
            </span>
            <h1 className="s1-title2" style={{ margin: 0, fontSize: 28, lineHeight: "34px" }} data-testid="live-exercise">
              {ex.name}
            </h1>
            {last && (last.kg != null || last.seconds != null) && (
              <span style={{ font: "600 14px/19px var(--font-sans)", color: "var(--s1-blue)" }}>{t("m.lastTime", { v: last.seconds ? `${last.seconds} s` : `${Number(last.kg)} kg × ${last.reps}` })}</span>
            )}
            {ex.cue && <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{ex.cue}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: "var(--radius-card)", background: "var(--surface-2)", overflow: "hidden" }}>
            {ex.sets.map((s, si) => (
              <div key={si} data-testid="live-set" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", boxShadow: si ? "inset 0 1px 0 var(--hairline)" : undefined, opacity: s.done ? 0.6 : 1 }}>
                <span style={{ width: 18, font: "600 14px/1 var(--font-sans)", color: "var(--text-tertiary)" }}>{si + 1}</span>
                <span style={{ flex: 1, display: "flex", justifyContent: "space-around", gap: 4, flexWrap: "wrap" }}>
                  {ex.log_type === "weight_reps" && (
                    <Stepper value={s.kg ?? 0} step={2.5} max={500} width={56} display={`${s.kg ?? 0} ${t("m.kg")}`} label={`${t("m.setN", { n: si + 1 })} · ${t("m.kg")}`} lessLabel={t("m.less", { what: t("m.kg") })} moreLabel={t("m.more", { what: t("m.kg") })} onChange={(v) => update((l) => (l.ex[l.i].sets[si].kg = v, l))} />
                  )}
                  {ex.log_type === "time" ? (
                    <Stepper value={s.seconds ?? 30} step={5} max={600} width={48} display={`${s.seconds ?? 30} ${t("m.secs")}`} label={`${t("m.setN", { n: si + 1 })} · ${t("m.secs")}`} lessLabel={t("m.less", { what: t("m.secs") })} moreLabel={t("m.more", { what: t("m.secs") })} onChange={(v) => update((l) => (l.ex[l.i].sets[si].seconds = v, l))} />
                  ) : (
                    <Stepper value={s.reps ?? 10} max={100} width={32} label={`${t("m.setN", { n: si + 1 })} · ${t("m.reps")}`} lessLabel={t("m.less", { what: t("m.reps") })} moreLabel={t("m.more", { what: t("m.reps") })} onChange={(v) => update((l) => (l.ex[l.i].sets[si].reps = v, l))} />
                  )}
                </span>
                <button
                  type="button"
                  aria-pressed={s.done}
                  aria-label={t("m.setDone", { n: si + 1 })}
                  onClick={() => {
                    update((l) => (l.ex[l.i].sets[si].done = !s.done, l));
                    if (!s.done) setRest(ex.rest_s);
                  }}
                  style={{ width: 44, height: 44, borderRadius: 12, border: 0, cursor: "pointer", display: "grid", placeItems: "center", background: s.done ? "var(--s1-green)" : "var(--surface-3)", color: s.done ? "var(--background)" : "var(--text-secondary)" }}
                >
                  <Icon icon={Check} size={20} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {(!ex || live.i === live.ex.length - 1) && (
        <button type="button" className="s1-btn s1-btn--plain" style={{ alignSelf: "flex-start", color: "var(--s1-blue)", paddingLeft: 0 }} onClick={() => setPicking(true)}>
          <Icon icon={Plus} size={18} /> {t("m.addExercise")}
        </button>
      )}
      {live.ex.length > 0 && live.i === live.ex.length - 1 && <Input aria-label={t("m.notePh")} placeholder={t("m.notePh")} value={live.note} onChange={(e) => update((l) => ({ ...l, note: e.target.value }))} />}

      {live.ex.length > 0 && (
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" size="lg" style={{ flex: 1 }} disabled={live.i === 0} onClick={() => update((l) => ({ ...l, i: l.i - 1 }))}>
            {t("m.previous")}
          </Button>
          {live.i < live.ex.length - 1 ? (
            <Button size="lg" style={{ flex: 2 }} onClick={() => update((l) => ({ ...l, i: l.i + 1 }))}>
              {t("m.next")}
            </Button>
          ) : (
            <Button size="lg" style={{ flex: 2 }} disabled={busy || setsToSave(live.ex).length === 0} onClick={() => void finish()}>
              {t("m.finish")}
            </Button>
          )}
        </div>
      )}

      {rest != null && (
        <div className="s1-rise" role="timer" aria-live="polite" style={{ position: "fixed", left: 16, right: 16, bottom: 20, maxWidth: 488, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 20px", borderRadius: 999, background: "var(--surface-3)", boxShadow: "var(--shadow-sheet)" }}>
          <span style={{ flex: 1, font: "600 15px/20px var(--font-sans)" }}>
            {t("m.rest")} <span className="s1-num">{mmss(rest)}</span>
          </span>
          <Button size="sm" variant="tinted" style={{ borderRadius: 999 }} onClick={() => setRest(null)}>
            {t("m.skip")}
          </Button>
        </div>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(e) => {
          const [built] = buildSession({ name: "", items: [{ exercise_id: e.id, name: e.name, sets: e.default_sets, reps: e.log_type === "time" ? null : e.default_reps ?? 10, seconds: e.log_type === "time" ? e.default_seconds ?? 30 : null, rest_s: 90, log_type: e.log_type, cue: e.cue }] }, h.last);
          update((l) => ({ ...l, ex: [...l.ex, built], i: l.ex.length }));
          setPicking(false);
        }}
      />
    </main>
  );
}
