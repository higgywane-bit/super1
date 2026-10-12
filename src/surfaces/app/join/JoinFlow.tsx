import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Smartphone, Tag, UserPlus, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { supabaseBrowser } from "../../../client/supabase";
import { Button, Card, Checkbox, Disc, Field, Group, Icon, Label, Sheet, TheOne } from "../../../components/kit";
import { useI18n, type Lang, type MessageKey } from "../../../i18n";
import { submitSignup, type JoinError } from "../../../server/join";
import { ErrorText } from "../../shared/ErrorText";
import { JoinLanguage } from "./JoinLanguage";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { turnstileToken } from "./turnstile";

const root = getRouteApi("__root__");

type Screen = "lang" | "choice" | "form" | "waiver" | "welcome" | "done" | "link" | "linked";
type Options = { waiver: { id: string; version: number; texts: Partial<Record<Lang, string[]>> } | null; coaches: { id: string; name: string }[] };

const ERRORS: Record<JoinError, MessageKey> = { "too-many": "join.tooMany", bot: "join.botCheck", invalid: "common.error", failed: "common.error" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** super1.app/join: language → new or existing → details + coach → waiver + signature → welcome → done. */
export function JoinFlow() {
  const { t, lang } = useI18n();
  const { boot } = root.useRouteContext();
  const [screen, setScreen] = useState<Screen>("lang");
  const [f, setF] = useState({ first: "", last: "", phone: "", email: "", tag: "" });
  const [coach, setCoach] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [inked, setInked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [terms, setTerms] = useState(false);
  const [result, setResult] = useState<{ firstName: string; coach: string | null } | null>(null);
  const pad = useRef<SignaturePadHandle>(null);
  const ts = useRef<HTMLDivElement>(null);

  const opts = useQuery({
    queryKey: ["join", "options"],
    queryFn: async () => {
      const { data, error: e } = await supabaseBrowser().rpc("join_options");
      if (e) throw e;
      return data as unknown as Options;
    },
    staleTime: 300_000,
  });
  const rules = opts.data?.waiver?.texts[lang] ?? opts.data?.waiver?.texts.en ?? [];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const formOk = !!f.first.trim() && (f.phone.trim().length >= 6 || EMAIL.test(f.email.trim())) && (!f.email.trim() || EMAIL.test(f.email.trim()));
  const joinOk = agree && inked;
  const linkOk = !!f.first.trim() && f.tag.replace(/\W/g, "").length >= 3 && EMAIL.test(f.email.trim());

  async function send(kind: "new" | "link") {
    setBusy(true);
    setError(null);
    try {
      const token = ts.current ? await turnstileToken(boot.config.turnstileSiteKey, ts.current) : null;
      const r = await submitSignup({
        data: {
          kind,
          lang,
          firstName: f.first,
          lastName: f.last,
          phone: f.phone,
          email: f.email,
          coachId: kind === "new" ? coach : null,
          agreed: agree,
          signature: kind === "new" ? (pad.current?.toPng() ?? null) : null,
          linkTag: f.tag,
          turnstileToken: token,
        },
      });
      if (!r.ok) return setError(ERRORS[r.error]);
      setResult({ firstName: r.firstName, coach: r.coach });
      if (kind === "link") setScreen("linked");
      else {
        setScreen("welcome");
        setTimeout(() => setScreen("done"), 2200);
      }
    } catch {
      setError("common.error");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setF({ first: "", last: "", phone: "", email: "", tag: "" });
    setCoach(null);
    setAgree(false);
    setInked(false);
    setResult(null);
    setError(null);
    setScreen("lang");
  }

  const back = () => setScreen(({ choice: "lang", form: "choice", waiver: "form", link: "choice" } as Record<string, Screen>)[screen] ?? "lang");
  const showTop = screen === "choice" || screen === "form" || screen === "waiver" || screen === "link";

  if (screen === "lang") return <JoinLanguage onPick={() => setScreen("choice")} />;

  const fullName = `${f.first} ${f.last}`.trim();
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "56px 24px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div ref={ts} />
      {showTop && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, marginBottom: 20 }}>
          <Button variant="secondary" icon aria-label={t("join.back")} onClick={back}>
            <Icon icon={ChevronLeft} />
          </Button>
          <TheOne height={26} />
          <span className="s1-num" style={{ width: 44, font: "600 13px/1 var(--font-sans)", color: "var(--text-secondary)", textAlign: "right" }}>
            {screen === "form" ? t("join.step", { n: 1 }) : screen === "waiver" ? t("join.step", { n: 2 }) : ""}
          </span>
        </div>
      )}

      {screen === "choice" && (
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="s1-largetitle">{t("join.welcome")}</h1>
          <p style={{ margin: "0 0 12px", font: "500 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>{t("join.choose")}</p>
          {(
            [
              ["form", "join.newTitle", "join.newSub", UserPlus, "money"],
              ["link", "join.memberTitle", "join.memberSub", Tag, "neutral"],
            ] as const
          ).map(([to, title, sub, icon, tone]) => (
            <button
              key={to}
              className="s1-card s1-tap"
              type="button"
              onClick={() => setScreen(to)}
              style={{ border: 0, textAlign: "left", padding: 20, display: "flex", alignItems: "center", gap: 16, color: "var(--foreground)", cursor: "pointer", boxShadow: to === "form" ? "inset 0 0 0 2px var(--s1-blue)" : undefined }}
            >
              <Disc tone={tone}>
                <Icon icon={icon} />
              </Disc>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="s1-headline">{t(title)}</span>
                <span style={{ font: "400 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t(sub)}</span>
              </span>
              <Icon icon={ChevronRight} style={{ color: "var(--text-secondary)" }} />
            </button>
          ))}
        </div>
      )}

      {screen === "form" && (
        <form
          className="s1-rise"
          onSubmit={(e) => {
            e.preventDefault();
            if (formOk) setScreen("waiver");
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <h1 className="s1-largetitle">{t("join.details")}</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field id="j-first" label={t("join.first")} autoComplete="given-name" required value={f.first} onChange={set("first")} />
            <Field id="j-last" label={t("join.last")} autoComplete="family-name" value={f.last} onChange={set("last")} />
          </div>
          <Field id="j-phone" label={t("join.phone")} type="tel" inputMode="tel" autoComplete="tel" className="s1-num" value={f.phone} onChange={set("phone")} />
          <Field id="j-email" label={t("join.email")} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} hint={!f.phone && !f.email ? t("join.phoneOrEmail") : undefined} />
          <div>
            <p className="s1-label">{t("join.coachQ")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[{ id: null as string | null, name: t("join.noCoach") }, ...(opts.data?.coaches ?? [])].map((c) => {
                const on = coach === c.id;
                return (
                  <button
                    key={c.id ?? "none"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCoach(c.id)}
                    className={on ? (c.id ? "s1-chip-pt" : "s1-chip-on") : "s1-chip-off"}
                    style={{ height: 40, padding: "0 14px", border: 0, borderRadius: 999, font: "600 14px/1 var(--font-sans)", cursor: "pointer" }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" size="lg" block className={formOk ? undefined : "s1-off"} style={{ marginTop: 8 }}>
            {t("join.next")}
          </Button>
        </form>
      )}

      {screen === "waiver" && (
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 className="s1-largetitle">{t("join.waiverTitle")}</h1>
          <Group>
            {rules.map((r, i) => (
              <div key={i} className="s1-row" style={{ minHeight: 0, alignItems: "flex-start", padding: "14px 16px" }}>
                <Icon icon={Check} style={{ color: "var(--s1-green)", marginTop: 1 }} />
                <span style={{ font: "400 15px/21px var(--font-sans)" }}>{r}</span>
              </div>
            ))}
          </Group>
          <button className="s1-link" type="button" style={{ alignSelf: "flex-start", fontSize: 14 }} onClick={() => setTerms(true)}>
            {t("join.fullTerms")}
          </button>
          <Checkbox checked={agree} onChange={setAgree}>
            {t("join.agree")}
          </Checkbox>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Label style={{ marginBottom: 0 }}>{t("join.sign")}</Label>
              <button className="s1-link" type="button" onClick={() => pad.current?.clear()} style={{ fontSize: 14 }}>
                {t("join.clear")}
              </button>
            </div>
            <SignaturePad ref={pad} label={t("join.signatureLabel")} onChange={setInked} />
          </div>
          <ErrorText k={error} />
          <Button size="lg" block disabled={busy} className={joinOk ? undefined : "s1-off"} onClick={() => (joinOk ? void send("new") : setError("join.signFirst"))}>
            {t("join.join")}
          </Button>
          <Sheet open={terms} onClose={() => setTerms(false)} title={t("join.termsTitle")} side="bottom" closeLabel={t("common.close")}>
            <h2 className="s1-title2">{t("join.termsTitle")}</h2>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, font: "400 15px/22px var(--font-sans)" }}>
              {rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
            <p style={{ margin: 0, font: "400 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("join.termsBody")}</p>
            <Button block variant="secondary" onClick={() => setTerms(false)}>
              {t("common.close")}
            </Button>
          </Sheet>
        </div>
      )}

      {screen === "welcome" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, textAlign: "center", minHeight: "80dvh" }}>
          <div className="s1-pop" style={{ position: "relative", width: 168, height: 168, display: "grid", placeItems: "center" }}>
            <span className="s1-breathe" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,0.55) 0%, rgba(0,180,255,0) 70%)" }} />
            <TheOne height={92} />
          </div>
          <div className="s1-rise-2" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 className="s1-largetitle" style={{ fontSize: 36, lineHeight: "42px" }}>
              {t("join.welcomeName", { name: result?.firstName ?? f.first })}
            </h1>
            <p style={{ margin: 0, font: "500 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>{t("join.place")}</p>
          </div>
        </div>
      )}

      {screen === "done" && (
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 24 }}>
          <span className="s1-disc s1-disc--go" style={{ width: 64, height: 64 }}>
            <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 30, height: 30, strokeWidth: 2.6 }}>
              <path className="s1-draw" d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h1 className="s1-largetitle">{t("join.youre", { name: result?.firstName ?? f.first })}</h1>
          <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6, boxShadow: "inset 0 0 0 2px var(--s1-blue)" }}>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--s1-blue)" }}>{t("join.showDesk")}</span>
            <span style={{ font: "700 28px/34px var(--font-sans)", letterSpacing: "-0.02em" }}>{fullName}</span>
            <span className="s1-num" style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
              {[f.phone, f.email].filter(Boolean).join(" · ")}
            </span>
          </Card>
          {result?.coach && (
            <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <Disc tone="pt">
                <Icon icon={UserRound} />
              </Disc>
              <span style={{ font: "500 15px/20px var(--font-sans)" }}>{t("join.coachLine", { coach: result.coach })}</span>
            </Card>
          )}
          <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <Disc tone="neutral">
              <Icon icon={Smartphone} />
            </Disc>
            <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{f.email ? t("join.appSoon") : t("join.appNoEmail")}</span>
          </Card>
          <Button variant="secondary" block onClick={restart} style={{ marginTop: 8 }}>
            {t("join.restart")}
          </Button>
        </div>
      )}

      {screen === "link" && (
        <form
          className="s1-rise"
          onSubmit={(e) => {
            e.preventDefault();
            if (linkOk) void send("link");
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <h1 className="s1-largetitle">{t("join.linkTitle")}</h1>
          <p style={{ margin: 0, font: "500 15px/22px var(--font-sans)", color: "var(--text-secondary)" }}>{t("join.linkSub")}</p>
          <Field id="j-lname" label={t("join.linkName")} autoComplete="name" value={f.first} onChange={set("first")} />
          <Field id="j-tag" label={t("join.tag")} inputMode="numeric" className="s1-num" value={f.tag} onChange={set("tag")} style={{ fontSize: 22, letterSpacing: "0.12em", height: 56 }} />
          <Field id="j-lemail" label={t("join.email")} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} />
          <ErrorText k={error} />
          <Button type="submit" size="lg" block disabled={busy} className={linkOk ? undefined : "s1-off"} style={{ marginTop: 8 }}>
            {t("join.linkBtn")}
          </Button>
        </form>
      )}

      {screen === "linked" && (
        <div className="s1-rise" style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 24 }}>
          <span className="s1-disc s1-disc--go" style={{ width: 64, height: 64 }}>
            <svg className="s1-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 30, height: 30, strokeWidth: 2.6 }}>
              <path className="s1-draw" d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h1 className="s1-largetitle">{t("join.linkedTitle")}</h1>
          <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, boxShadow: "inset 0 0 0 2px var(--s1-blue)" }}>
            <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--s1-blue)" }}>{t("join.showDesk")}</span>
            <span className="s1-headline">{f.first}</span>
            <span className="s1-num" style={{ font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
              {t("join.tagWord", { tag: f.tag.toUpperCase() })}
            </span>
          </Card>
          <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <Disc tone="money">
              <Icon icon={Smartphone} />
            </Disc>
            <span style={{ font: "500 15px/20px var(--font-sans)" }}>{t("join.linkedBody", { email: f.email })}</span>
          </Card>
          <Button variant="secondary" block onClick={restart}>
            {t("join.restart")}
          </Button>
        </div>
      )}

      {screen !== "waiver" && screen !== "link" && error && <ErrorText k={error} />}
    </main>
  );
}
