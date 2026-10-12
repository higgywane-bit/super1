import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * The counter QR (super1.app/join, no login). Abuse protection (docs/01 §1): Cloudflare Turnstile
 * (invisible) + at most 5 sign-ups per IP per 10 minutes. The waiver signature PNG goes to the private
 * `signatures` bucket with the service role; create_signup validates everything again.
 * The work happens in joinCore.ts, loaded inside the handler so none of it reaches the browser.
 */
export const SignupInput = z
  .object({
    kind: z.enum(["new", "link"]),
    lang: z.enum(["en", "th", "ru"]),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).default(""),
    phone: z.string().trim().max(40).default(""),
    email: z.string().trim().toLowerCase().max(200).default(""),
    coachId: z.string().uuid().nullable().default(null),
    agreed: z.boolean().default(false),
    /** data:image/png;base64,… (new sign-ups only), at most ~300 KB */
    signature: z.string().max(400_000).nullable().default(null),
    linkTag: z.string().trim().max(32).default(""),
    turnstileToken: z.string().max(4096).nullable().default(null),
  })
  .refine((v) => !v.email || z.string().email().safeParse(v.email).success, { message: "email" })
  .refine((v) => v.kind === "link" || !!(v.phone || v.email), { message: "phone-or-email" })
  .refine((v) => v.kind === "link" || (v.agreed && !!v.signature), { message: "waiver" })
  .refine((v) => v.kind === "new" || (v.linkTag.length >= 3 && !!v.email), { message: "link" });

export type JoinError = "too-many" | "bot" | "invalid" | "failed";
export type JoinResult = { ok: true; id: string; firstName: string; coach: string | null } | { ok: false; error: JoinError };
export type SignupValues = z.output<typeof SignupInput>;

export const submitSignup = createServerFn({ method: "POST" })
  .validator((d: z.input<typeof SignupInput>) => d)
  .handler(async ({ data }): Promise<JoinResult> => {
    const parsed = SignupInput.safeParse(data);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const { handleSignup } = await import("./joinCore");
    return handleSignup(parsed.data);
  });
