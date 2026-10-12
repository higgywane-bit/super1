import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Archive, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { admin } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { Button, Card, Field, Icon, Label, TextArea, Segmented, useToast } from "../../../components/kit";
import { MEMBER_LANGS, STAFF_LANGS, useI18n, type Lang } from "../../../i18n";
import { LANG_NAMES, dayLabel } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { useViewer } from "../../shared/Gate";
import { QrCode, joinUrl } from "../../shared/QrCode";
import { PageHeader } from "../StaffSidebar";

type Gym = { name?: string; area?: string; address?: string; phone?: string; hours?: string; timezone?: string; currency?: string; sender?: string };
type Texts = Record<Lang, string[]>;

/** A06 · Settings: waiver versions (EN/TH/RU, publish = new version), counter QR + poster, gym details. */
export function AdminSettings() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const viewer = useViewer();
  const navigate = useNavigate();
  const waiver = useQuery({ queryKey: ["admin", "waiver"], queryFn: admin.waiver });
  const gym = useQuery({ queryKey: ["admin", "setting", "gym"], queryFn: () => admin.setting("gym") as Promise<Gym | undefined> });
  const [wl, setWl] = useState<Lang>("en");
  const [texts, setTexts] = useState<Texts | null>(null);
  const [details, setDetails] = useState<Gym | null>(null);
  const live = waiver.data as { version: number; texts: Texts; published_at: string } | null | undefined;
  const current: Texts = texts ?? live?.texts ?? { en: [], th: [], ru: [] };
  const changed = !!texts && JSON.stringify(texts) !== JSON.stringify(live?.texts);
  const nextV = (live?.version ?? 0) + 1;
  const url = joinUrl();
  const g = details ?? gym.data ?? {};

  const fail = (e: unknown) => {
    const u = toUiError(e);
    toast(t(u.key, u.vars), { tone: "stop" });
  };

  const facts: [string, string][] = [
    [t("settings.gymName"), [g.name, g.area].filter(Boolean).join(" · ")],
    [t("settings.prices"), t("settings.pricesVat")],
    [t("settings.currencyTime"), `${g.currency ?? "THB"} · ${g.timezone ?? "Asia/Bangkok"}`],
    [t("settings.memberLangs"), MEMBER_LANGS.map((l) => LANG_NAMES[l]).join(" · ")],
    [t("settings.staffLangs"), STAFF_LANGS.map((l) => LANG_NAMES[l]).join(" · ")],
    [t("settings.sender"), g.sender || t("settings.toConfirm")],
  ];

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title={t("admin.settings")} sub={t("settings.sub")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h2 className="s1-headline" style={{ margin: 0 }}>
              {t("settings.waiverTitle")}
            </h2>
            {live && (
              <span className="s1-pill" style={{ color: "var(--s1-green)", background: "var(--s1-green-tint)" }}>
                {t("settings.live", { v: live.version })}
              </span>
            )}
          </div>
          <Segmented label={t("settings.waiver")} value={wl} onChange={setWl} options={MEMBER_LANGS.map((l) => ({ value: l, label: LANG_NAMES[l], lang: l }))} />
          {(current[wl] ?? []).map((line, i) => (
            <div key={i}>
              <Label htmlFor={`waiver-${wl}-${i}`}>{t("settings.line", { n: i + 1 })}</Label>
              <TextArea
                id={`waiver-${wl}-${i}`}
                style={{ minHeight: 56 }}
                lang={wl}
                value={line}
                onChange={(e) => {
                  const next = structuredClone(current);
                  next[wl][i] = e.target.value;
                  setTexts(next);
                }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: "var(--radius-control)", background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)", font: "500 14px/19px var(--font-sans)" }}>
            <Icon icon={TriangleAlert} size={18} />
            {t("settings.lawyer")}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", flex: "1 1 200px" }}>
              {live ? t("settings.inUse", { v: live.version, date: dayLabel(localDate(new Date(live.published_at)), lang) }) : ""}
            </span>
            <Button
              size="sm"
              variant="tinted"
              disabled={!changed || !viewer}
              onClick={async () => {
                try {
                  const clean = Object.fromEntries(MEMBER_LANGS.map((l) => [l, (current[l] ?? []).map((s) => s.trim()).filter(Boolean)])) as Texts;
                  await admin.publishWaiver(nextV, clean, viewer!.id);
                  setTexts(null);
                  toast(t("settings.published", { v: nextV }), { tone: "go" });
                  void qc.invalidateQueries({ queryKey: ["admin", "waiver"] });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              {t("settings.publish", { v: nextV })}
            </Button>
          </div>
        </Card>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ borderRadius: "var(--radius-tile)", overflow: "hidden", flex: "none" }}>
              <QrCode value={url} size={112} label={t("qr.scan")} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span className="s1-headline">{t("settings.qr")}</span>
              <a href={url} style={{ color: "var(--s1-blue)", font: "500 14px/19px var(--font-sans)", textDecoration: "none" }}>
                {url.replace(/^https?:\/\//, "")}
              </a>
              <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("settings.qrSub")}</span>
              <Button size="sm" variant="plain" style={{ alignSelf: "flex-start", color: "var(--foreground)", paddingLeft: 0 }} onClick={() => void navigate({ to: "/w/admin/poster" })}>
                {t("settings.poster")}
              </Button>
              <Button size="sm" variant="plain" style={{ alignSelf: "flex-start", color: "var(--foreground)", paddingLeft: 0 }} onClick={() => void navigate({ to: "/w/admin/guide" })}>
                {t("guide.download")}
              </Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {facts.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "13px 18px", borderTop: i ? "1px solid var(--hairline)" : undefined, font: "500 15px/20px var(--font-sans)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="s1-headline" style={{ margin: 0 }}>
              {t("settings.gym")}
            </h2>
            {(["name", "area", "address", "phone", "hours", "sender"] as const).map((k) => (
              <Field
                key={k}
                id={`gym-${k}`}
                label={k === "sender" ? t("settings.sender") : t(`settings.gym${k[0].toUpperCase()}${k.slice(1)}` as "settings.gymName")}
                value={g[k] ?? ""}
                onChange={(e) => setDetails({ ...g, [k]: e.target.value })}
              />
            ))}
            <Button
              size="sm"
              style={{ alignSelf: "flex-start" }}
              disabled={!details || !viewer}
              onClick={async () => {
                try {
                  await admin.saveSetting("gym", { ...(gym.data ?? {}), ...details }, viewer!.id);
                  setDetails(null);
                  toast(t("settings.saved"), { tone: "go" });
                  void qc.invalidateQueries({ queryKey: ["admin", "setting", "gym"] });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              {t("settings.save")}
            </Button>
          </Card>
          <Card style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span className="s1-disc" style={{ width: 32, height: 32 }}>
              <Icon icon={Archive} size={16} />
            </span>
            <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("settings.nothingDeleted")}</span>
          </Card>
        </section>
      </div>
    </div>
  );
}
