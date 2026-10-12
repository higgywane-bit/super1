import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { admin } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { owner } from "../../../client/owner";
import { storageUrl } from "../../../client/supabase";
import { Avatar, Button, Card, Field, Input, Label, Segmented, Sheet, Switch, useToast } from "../../../components/kit";
import { MEMBER_LANGS, useI18n, type Lang } from "../../../i18n";
import { inviteCoach } from "../../../server/admin";
import { useOwnerToday } from "../owner/useOwnerData";
import { PageHeader } from "../StaffSidebar";

type Coach = Awaited<ReturnType<typeof admin.coaches>>[number];

/** A04 · Staff and coaches: shift-picker names, Qashier login matching, coach portal invites. */
export function AdminPeople() {
  const { t } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const today = useOwnerToday();
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: admin.staff });
  const coaches = useQuery({ queryKey: ["admin", "coaches"], queryFn: admin.coaches });
  const members = useQuery({ queryKey: ["owner", "members", today.today], queryFn: () => owner.members(today.today) });
  const packs = useQuery({ queryKey: ["admin", "packs", today.today], queryFn: () => admin.ptPacks(today.today) });
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState<Coach | null>(null);

  const fail = (e: unknown) => {
    const u = toUiError(e);
    toast(t(u.key, u.vars), { tone: "stop" });
  };
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin"] });

  const list = staff.data ?? [];
  const known = new Set(list.map((s) => s.qashier_name?.trim().toLowerCase()).filter(Boolean));
  const unmatched = today.lines.filter((l) => l.section === "staff" && !known.has(l.name.trim().toLowerCase()));
  const candidates = list.filter((s) => !s.archived_at && !s.qashier_name);

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title={t("admin.people")} sub={t("people.sub")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("people.desk")} · <span style={{ fontWeight: 500 }}>{t("people.deskSub")}</span>
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {list.map((s, n) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: n ? "1px solid var(--hairline)" : undefined, opacity: s.archived_at ? 0.55 : 1 }}>
                <Avatar name={s.name} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ font: "600 16px/21px var(--font-sans)" }}>{s.name}</span>
                  <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                    {s.archived_at ? t("people.archived") : s.qashier_name ? t("people.qashierIs", { name: s.qashier_name }) : t("people.noLogin")}
                  </span>
                </div>
                <Switch checked={!s.archived_at} label={t("people.onShiftFor", { name: s.name })} onChange={(on) => void admin.setStaff(s.id, { archived_at: on ? null : new Date().toISOString(), active: on }).then(refresh, fail)} />
              </div>
            ))}
          </Card>
          <form
            style={{ display: "flex", gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              void admin.addStaff(name.trim()).then(() => {
                setName("");
                refresh();
              }, fail);
            }}
          >
            <Input aria-label={t("people.addName")} placeholder={t("people.addName")} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
            <Button type="submit" variant="tinted" disabled={!name.trim()}>
              {t("people.add")}
            </Button>
          </form>
          {unmatched.map((u) => (
            <Card key={u.name} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "inset 0 0 0 1px rgba(255,230,0,0.35)" }} data-testid="unmatched-staff">
              <span className="s1-headline">{t("people.unmatched", { name: u.name })}</span>
              <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("people.unmatchedSub", { name: u.name })}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {candidates.map((s) => (
                  <Button key={s.id} size="sm" variant="plain" style={{ color: "var(--foreground)", background: "var(--surface-3)" }} aria-label={t("people.matchTo", { name: s.name })} onClick={() => void admin.setStaff(s.id, { qashier_name: u.name.trim() }).then(refresh, fail)}>
                    {s.name}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("people.coaches")}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {(coaches.data ?? [])
              .filter((c) => !c.archived_at)
              .map((c, n) => {
                const clients = new Set((packs.data ?? []).filter((p) => p.coach_id === c.id).map((p) => p.member_id)).size;
                const sessions = members.data?.pt_by_coach.find((x) => x.coach === c.name)?.sessions ?? 0;
                const portal = (c.user_id ? "active" : c.portal) as "none" | "invited" | "active" | "house";
                const tone = portal === "active" ? { color: "var(--s1-pink)", background: "var(--s1-pink-tint)" } : undefined;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: n ? "1px solid var(--hairline)" : undefined, flexWrap: "wrap" }}>
                    <Avatar name={c.full_name || c.name} src={storageUrl(c.photo_path)} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 180px" }}>
                      <span style={{ font: "600 16px/21px var(--font-sans)" }}>{c.full_name || c.name}</span>
                      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("people.clients", { n: clients, s: sessions })}</span>
                    </div>
                    <span className="s1-pill" style={tone}>
                      {t(`people.portal.${portal}`)}
                    </span>
                    {portal !== "house" && portal !== "active" && (
                      <Button size="sm" variant="tinted" onClick={() => setInviting(c)}>
                        {portal === "invited" ? t("people.resend") : t("people.invite")}
                      </Button>
                    )}
                    <Switch checked={c.on_qr} label={`${c.name} · ${t("people.onQr")}`} onChange={(on) => void admin.setCoach(c.id, { on_qr: on }).then(refresh, fail)} />
                  </div>
                );
              })}
          </Card>
          <p style={{ margin: "0 4px", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("people.coachNote")}</p>
        </section>
      </div>
      <InviteSheet coach={inviting} onClose={() => setInviting(null)} onDone={refresh} />
    </div>
  );
}

function InviteSheet({ coach, onClose, onDone }: { coach: Coach | null; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const name = coach ? coach.full_name || coach.name : "";
  return (
    <Sheet open={!!coach} onClose={onClose} title={t("people.inviteTitle", { name })} width={480}>
      {coach && (
        <form
          style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 22px 28px" }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await inviteCoach({ data: { coachId: coach.id, email: email || coach.email || "", lang } });
              toast(t("people.invited", { name, email }), { tone: "go" });
              setEmail("");
              onDone();
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
            {t("people.inviteTitle", { name })}
          </h2>
          <Field id="coach-email" type="email" required label={t("people.coachEmail")} value={email || coach.email || ""} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Label>{t("people.inviteLang")}</Label>
            <Segmented label={t("people.inviteLang")} value={lang} onChange={setLang} options={MEMBER_LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
          </div>
          <Button type="submit" disabled={busy}>
            {t("people.inviteBtn")}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
