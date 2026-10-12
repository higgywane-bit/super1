import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { coach, type Exercise } from "../../../client/coach";
import { toUiError } from "../../../client/errors";
import { Button, Card, Field, Icon, Input, Label, Segmented, Sheet, Stepper, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { ExerciseMedia } from "../../shared/ExerciseMedia";
import { PageHeader } from "../../world/StaffSidebar";
import { useCoachHome } from "./useCoach";

const GROUPS: Exercise["muscle_group"][] = ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio"];
type Filter = "all" | "yours" | Exercise["muscle_group"];

/** C06 · Exercise library: SUPER1's exercises + the coach's own; search, group chips with counts, Add your own. */
export function LibraryPage() {
  const { t } = useI18n();
  const list = useQuery({ queryKey: ["coach", "exercises"], queryFn: coach.exercises, staleTime: 300_000 });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const all = list.data ?? [];
  const own = all.filter((e) => e.coach_id);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((e) => filter === "all" || (filter === "yours" ? !!e.coach_id : e.muscle_group === filter))
      .filter((e) => !s || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(s))
      .sort((a, b) => Number(!!b.coach_id) - Number(!!a.coach_id) || a.name.localeCompare(b.name));
  }, [all, q, filter]);
  const chips: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: t("coach.all"), n: all.length },
    ...GROUPS.map((g) => ({ id: g as Filter, label: t(`coach.group.${g}`), n: all.filter((e) => e.muscle_group === g).length })),
    { id: "yours", label: t("coach.yours"), n: own.length },
  ];

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <PageHeader
        title={t("coach.library")}
        sub={t("coach.libSub", { n: all.length - own.length, m: own.length })}
        actions={
          <button type="button" aria-label={t("coach.addOwn")} className="s1-btn s1-btn--primary s1-btn--icon" style={{ width: 48, height: 48, borderRadius: 24 }} onClick={() => setAdding(true)}>
            <Icon icon={Plus} size={20} />
          </button>
        }
      />
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 16, top: 14, color: "var(--text-secondary)" }}>
          <Icon icon={Search} size={18} />
        </span>
        <Input aria-label={t("coach.searchEx")} placeholder={t("coach.searchEx")} value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 44 }} />
      </div>
      <div role="tablist" aria-label={t("coach.library")} className="s1-hscroll" style={{ gap: 8 }}>
        {chips.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={filter === c.id}
            type="button"
            className={`s1-pill s1-pill--plain s1-tap ${filter === c.id ? "s1-chip-on" : "s1-chip-off"}`}
            onClick={() => setFilter(c.id)}
            style={{ height: 36, padding: "0 14px", font: "600 14px/18px var(--font-sans)", border: 0, cursor: "pointer" }}
          >
            {c.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{c.n}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 && list.isFetched && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{t("coach.noResults")}</p>}
      {shown.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {shown.map((e, i) => (
            <div key={e.id} data-testid="exercise-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", boxShadow: i ? "inset 0 1px 0 var(--hairline)" : undefined }}>
              {e.media_path && <span style={{ width: 48, flex: "none" }}><ExerciseMedia path={e.media_path} height={48} radius="var(--radius-sm)" /></span>}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "600 15px/20px var(--font-sans)" }}>{e.name}</span>
                <span style={{ font: "500 13px/18px var(--font-sans)", color: e.coach_id ? "var(--s1-pink)" : "var(--text-secondary)" }}>
                  {[e.muscle || t(`coach.group.${e.muscle_group}`), e.equipment, e.coach_id ? t("coach.yours") : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="s1-num" style={{ font: "600 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                {e.default_sets} × {e.log_type === "time" ? `${e.default_seconds ?? 30} s` : e.default_reps ?? 10}
              </span>
            </div>
          ))}
        </Card>
      )}
      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const home = useCoachHome();
  const blank = { name: "", muscle_group: "chest" as Exercise["muscle_group"], muscle: "", equipment: "", log_type: "weight_reps" as Exercise["log_type"], default_sets: 3, default_reps: 10, default_seconds: 30, cue: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={t("coach.addTitle")} width={520}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 22px 28px" }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!home.data || !f.name.trim() || !f.equipment.trim()) return;
          setBusy(true);
          try {
            await coach.addExercise(home.data.coach.id, {
              name: f.name.trim(),
              muscle_group: f.muscle_group,
              muscle: f.muscle.trim(),
              equipment: f.equipment.trim(),
              log_type: f.log_type,
              default_sets: f.default_sets,
              default_reps: f.log_type === "time" ? null : f.default_reps,
              default_seconds: f.log_type === "time" ? f.default_seconds : null,
              cue: f.cue.trim() || null,
            });
            toast(t("coach.exAdded", { name: f.name.trim() }), { tone: "go" });
            setF(blank);
            void qc.invalidateQueries({ queryKey: ["coach", "exercises"] });
            onClose();
          } catch (err) {
            const u = toUiError(err);
            toast(t(u.key, u.vars), { tone: "stop" });
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="s1-title2" style={{ margin: 0 }}>
          {t("coach.addTitle")}
        </h2>
        <Field id="ex-name" label={t("coach.exName")} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div>
          <Label>{t("coach.exGroup")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GROUPS.map((g) => (
              <button key={g} type="button" aria-pressed={f.muscle_group === g} className={`s1-pill s1-pill--plain s1-tap ${f.muscle_group === g ? "s1-chip-blue" : "s1-chip-off"}`} style={{ height: 36, padding: "0 14px", border: 0, cursor: "pointer", font: "600 14px/18px var(--font-sans)" }} onClick={() => setF({ ...f, muscle_group: g })}>
                {t(`coach.group.${g}`)}
              </button>
            ))}
          </div>
        </div>
        <Field id="ex-muscle" label={t("coach.exMuscle")} value={f.muscle} onChange={(e) => setF({ ...f, muscle: e.target.value })} />
        <Field id="ex-equipment" label={t("coach.exEquipment")} required value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} />
        <div>
          <Label>{t("coach.exLog")}</Label>
          <Segmented block label={t("coach.exLog")} value={f.log_type} onChange={(v) => setF({ ...f, log_type: v })} options={(["weight_reps", "reps", "time"] as const).map((v) => ({ value: v, label: t(`coach.log.${v}`) }))} />
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <Label>{t("coach.exSets")}</Label>
            <Stepper value={f.default_sets} min={1} max={10} label={t("coach.exSets")} lessLabel={t("coach.less", { what: t("coach.sets") })} moreLabel={t("coach.more", { what: t("coach.sets") })} onChange={(v) => setF({ ...f, default_sets: v })} />
          </div>
          {f.log_type === "time" ? (
            <div>
              <Label>{t("coach.exSeconds")}</Label>
              <Stepper value={f.default_seconds} step={5} min={5} max={600} label={t("coach.exSeconds")} lessLabel={t("coach.less", { what: t("coach.secs") })} moreLabel={t("coach.more", { what: t("coach.secs") })} onChange={(v) => setF({ ...f, default_seconds: v })} />
            </div>
          ) : (
            <div>
              <Label>{t("coach.exReps")}</Label>
              <Stepper value={f.default_reps} min={1} max={50} label={t("coach.exReps")} lessLabel={t("coach.less", { what: t("coach.reps") })} moreLabel={t("coach.more", { what: t("coach.reps") })} onChange={(v) => setF({ ...f, default_reps: v })} />
            </div>
          )}
        </div>
        <Field id="ex-cue" label={t("coach.exCue")} value={f.cue} onChange={(e) => setF({ ...f, cue: e.target.value })} />
        <Button type="submit" disabled={busy || !f.name.trim() || !f.equipment.trim()}>
          {t("coach.exAdd")}
        </Button>
      </form>
    </Sheet>
  );
}
