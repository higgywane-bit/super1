import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { forgetSession } from "../../../client/session";
import { supabaseBrowser } from "../../../client/supabase";
import { Button, Field } from "../../../components/kit";
import { useT, type MessageKey } from "../../../i18n";
import { ErrorText } from "../../shared/ErrorText";
import { LangSwitch } from "../../shared/LangSwitch";
import { SignInFrame } from "../SignInFrame";

/** D01: the shared desk login signs in with email + passcode (the only password login in SUPER1). */
export function DeskSignIn() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (err) {
      setBusy(false);
      return setError(err.status === 429 ? "auth.tooMany" : "auth.badPasscode");
    }
    forgetSession();
    await router.invalidate();
    setBusy(false);
  }

  return (
    <SignInFrame caption={t("auth.deskTitle")} footer={<LangSwitch />}>
      <form className="s1-rise" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field id="d-email" label={t("auth.email")} type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="d-pass" label={t("auth.passcode")} type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} />
        <ErrorText k={error} />
        <Button type="submit" size="lg" block disabled={busy} style={{ marginTop: 6 }}>
          {t("auth.signIn")}
        </Button>
      </form>
    </SignInFrame>
  );
}
