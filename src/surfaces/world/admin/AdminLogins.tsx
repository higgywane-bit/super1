import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { admin } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { Avatar, Button, Card, Field, Icon, Label, Segmented, Sheet, useToast } from "../../../components/kit";
import { useI18n, type MessageKey } from "../../../i18n";
import { dayLabel, time } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { changeDeskPasscode, listLogins } from "../../../server/admin";
import { inviteLogin } from "../../../server/logins";
import type { Role } from "../../../server/roles";
import { ErrorText } from "../../shared/ErrorText";
import { PageHeader } from "../StaffSidebar";

const ROLE_OPTIONS: Role[] = ["admin", "owner", "desk", "coach", "member"];

type Cell = "yes" | "no" | "own" | "ask" | "qr";
const MATRIX: [string, Cell, Cell, Cell, Cell, Cell][] = [
  ["checkin", "yes", "no", "yes", "no", "qr"],
  ["sell", "yes", "no", "yes", "no", "no"],
  ["pt", "yes", "no", "yes", "own", "no"],
  ["archive", "yes", "no", "yes", "no", "no"],
  ["merge", "yes", "no", "ask", "no", "no"],
  ["sales", "yes", "yes", "no", "no", "no"],
  ["import", "yes", "no", "no", "no", "no"],
  ["prices", "yes", "no", "no", "no", "no"],
  ["program", "yes", "no", "no", "own", "no"],
  ["log", "no", "no", "no", "no", "own"],
  ["logins", "yes", "no", "no", "no", "no"],
];

/** A05 · Logins and roles: every staff login, desk devices (sign out, change passcode), role matrix, add a login. */
export function AdminLogins() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const logins = useQuery({ queryKey: ["admin", "logins"], queryFn: () => listLogins() });
  const devices = useQuery({ queryKey: ["admin", "devices"], queryFn: admin.devices });
  const [adding, setAdding] = useState(false);
  const [passcode, setPasscode] = useState(false);
  const live = (devices.data ?? []).filter((d) => !d.signed_out_at);
  const when = (at: string) => (localDate(new Date(at)) === localDate() ? `${t("owner.today").toLowerCase()} ${time(at)}` : `${dayLabel(localDate(new Date(at)), lang)} ${time(at)}`);

  const cell = (c: Cell) =>
    c === "yes" ? (
      <span style={{ color: "var(--s1-green)" }}>
        <Icon icon={Check} size={16} />
      </span>
    ) : c === "no" ? (
      <span style={{ color: "var(--text-tertiary)" }}>
        <Icon icon={Minus} size={16} />
      </span>
    ) : (
      <span style={{ font: "700 13px/18px var(--font-sans)", color: c === "own" ? "var(--s1-pink)" : "var(--s1-blue)" }}>{c === "own" ? t("logins.own") : c === "ask" ? t("logins.ask") : "QR"}</span>
    );

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title={t("admin.logins")}
        sub={t("logins.sub")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Icon icon={Plus} size={18} /> {t("admin.inviteTitle")}
          </Button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 0, overflow: "hidden" }} data-testid="logins-list">
            {(logins.data ?? []).map((l, n) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: n ? "1px solid var(--hairline)" : undefined }}>
                <Avatar name={l.name || l.email || "?"} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ font: "600 16px/21px var(--font-sans)" }}>
                    {l.name || l.email} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>· {l.role ? t(`role.name.${l.role}` as MessageKey) : "—"}</span>
                  </span>
                  <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>{l.email}</span>
                </div>
                <span style={{ font: "600 13px/18px var(--font-sans)", textAlign: "right", maxWidth: 170, color: l.role === "desk" || l.last_sign_in_at ? "var(--s1-green)" : "var(--s1-yellow)" }}>
                  {l.role === "desk" ? t("logins.devicesIn", { n: live.length }) : l.last_sign_in_at ? t("logins.signedInAt", { when: when(l.last_sign_in_at) }) : t("logins.notYet")}
                </span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 className="s1-headline" style={{ margin: 0 }}>
                {t("logins.devices")}
              </h2>
              <Button size="sm" variant="plain" style={{ color: "var(--foreground)" }} onClick={() => setPasscode(true)}>
                {t("logins.passcode")}
              </Button>
            </div>
            {(devices.data ?? []).length === 0 && <span style={{ color: "var(--text-secondary)", font: "500 14px/19px var(--font-sans)" }}>{t("logins.noDevices")}</span>}
            {(devices.data ?? []).map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: d.signed_out_at ? "var(--text-tertiary)" : "var(--s1-green)" }} />
                <span style={{ flex: 1, font: "500 15px/20px var(--font-sans)" }}>
                  {d.label}
                  {d.last_seen_at && <span style={{ color: "var(--text-secondary)" }}> · {t("logins.lastSeenAt", { when: when(d.last_seen_at) })}</span>}
                </span>
                {d.signed_out_at ? (
                  <span style={{ color: "var(--text-secondary)", font: "500 14px/19px var(--font-sans)" }}>{t("logins.signedOut")}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="plain"
                    style={{ color: "var(--s1-red)" }}
                    onClick={async () => {
                      try {
                        await admin.signOutDevice(d.id);
                        toast(t("logins.deviceSignedOut", { name: d.label }));
                        void qc.invalidateQueries({ queryKey: ["admin", "devices"] });
                      } catch (e) {
                        const u = toUiError(e);
                        toast(t(u.key, u.vars), { tone: "stop" });
                      }
                    }}
                  >
                    {t("logins.signOut")}
                  </Button>
                )}
              </div>
            ))}
          </Card>
          <p style={{ margin: "0 4px", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("logins.membersNote")}</p>
        </section>
        <Card style={{ padding: 0, overflowX: "auto" }}>
          <table className="s1-adm-table" aria-label={t("logins.matrix")}>
            <thead>
              <tr>
                <th>{t("logins.can")}</th>
                {(["admin", "owner", "desk", "coach", "member"] as const).map((r) => (
                  <th key={r}>{t(`role.name.${r}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([cap, ...cells]) => (
                <tr key={cap}>
                  <td style={{ fontSize: 14 }}>{t(`logins.cap.${cap}` as MessageKey)}</td>
                  {cells.map((c, i) => (
                    <td key={i}>{cell(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <AddLoginSheet open={adding} onClose={() => setAdding(false)} onDone={() => void qc.invalidateQueries({ queryKey: ["admin", "logins"] })} />
      <PasscodeSheet open={passcode} onClose={() => setPasscode(false)} onDone={() => void qc.invalidateQueries({ queryKey: ["admin", "devices"] })} />
    </div>
  );
}

function AddLoginSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useI18n().t;
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title={t("admin.inviteTitle")} width={520}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await inviteLogin({ data: { email, role } });
            toast(t("admin.inviteDone", { email, role: t(`role.name.${role}`) }));
            setEmail("");
            onDone();
            onClose();
          } catch {
            setError("common.error");
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 22px 28px" }}
      >
        <h2 className="s1-title2" style={{ margin: 0 }}>
          {t("admin.inviteTitle")}
        </h2>
        <Field id="invite-email" label={t("admin.inviteEmail")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Label>{t("admin.inviteRole")}</Label>
          <Segmented label={t("admin.inviteRole")} value={role} onChange={setRole} options={ROLE_OPTIONS.map((r) => ({ value: r, label: t(`role.name.${r}`) }))} />
          <p style={{ margin: "10px 4px 0", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t(`admin.roleNote.${role}`)}</p>
        </div>
        <ErrorText k={error} />
        <Button type="submit" disabled={busy}>
          {t("admin.inviteBtn")}
        </Button>
      </form>
    </Sheet>
  );
}

function PasscodeSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useI18n().t;
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={t("logins.passcode")} width={480}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 22px 28px" }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (code.length < 6) return;
          setBusy(true);
          try {
            await changeDeskPasscode({ data: { passcode: code } });
            toast(t("logins.passcodeDone"), { tone: "go" });
            setCode("");
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
          {t("logins.passcode")}
        </h2>
        <p style={{ margin: 0, font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("logins.passcodeNote")}</p>
        <Field id="desk-passcode" label={t("logins.passcodeNew")} type="password" autoComplete="new-password" minLength={6} required value={code} onChange={(e) => setCode(e.target.value)} hint={t("logins.passcodeShort")} />
        <Button type="submit" disabled={busy || code.length < 6}>
          {t("logins.passcode")}
        </Button>
      </form>
    </Sheet>
  );
}
