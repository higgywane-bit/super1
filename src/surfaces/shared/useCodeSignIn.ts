import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { forgetSession } from "../../client/session";
import { supabaseBrowser } from "../../client/supabase";
import type { MessageKey } from "../../i18n";

export type CodeStep = "email" | "code";

function errorKey(e: { status?: number; code?: string; message?: string } | null): MessageKey | null {
  if (!e) return null;
  if (e.status === 429 || e.code === "over_email_send_rate_limit" || e.code === "over_request_rate_limit") return "auth.tooMany";
  if (e.code === "otp_disabled" || e.code === "signup_disabled" || /signups not allowed/i.test(e.message ?? "")) return "auth.unknownEmail";
  if (e.code === "otp_expired" || /expired|invalid/i.test(e.message ?? "")) return "auth.badCode";
  return "common.error";
}

/**
 * Email → 6-digit code → signed in. Logins exist only by invite, so an unknown email never creates
 * one (shouldCreateUser: false). Resend after 30 s.
 */
export function useCodeSignIn() {
  const router = useRouter();
  const [step, setStep] = useState<CodeStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  async function sendCode(e?: { preventDefault(): void }) {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({ email: addr, options: { shouldCreateUser: false } });
    setBusy(false);
    const k = errorKey(err);
    if (k) return setError(k);
    setEmail(addr);
    setCode("");
    setStep("code");
    setResendAt(Date.now() + 30_000);
    setNow(Date.now());
  }

  async function verify(token: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.verifyOtp({ email, token, type: "email" });
    if (err) {
      setBusy(false);
      setCode("");
      return setError(errorKey(err));
    }
    forgetSession();
    await router.invalidate();
    setBusy(false);
  }

  return {
    step,
    email,
    setEmail,
    code,
    setCode,
    busy,
    error,
    sendCode,
    verify,
    resendIn: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    back: () => {
      setStep("email");
      setError(null);
      setCode("");
    },
  };
}

export async function signOut(router: ReturnType<typeof useRouter>) {
  await supabaseBrowser().auth.signOut();
  forgetSession();
  await router.invalidate();
}
