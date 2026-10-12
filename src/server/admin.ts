import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Pete's admin actions that need the service role (A04, A05). Each one checks that the caller is an
 * admin first. Thin module: the work is in adminCore.ts, loaded inside the handlers.
 */
export type LoginRow = { id: string; email: string | null; role: string | null; name: string; lang: string; last_sign_in_at: string | null; created_at: string };

export const listLogins = createServerFn({ method: "GET" }).handler(async (): Promise<LoginRow[]> => {
  const core = await import("./adminCore");
  await core.assertAdmin();
  return core.listLogins();
});

export const changeDeskPasscode = createServerFn({ method: "POST" })
  .validator((d: { passcode: string }) => z.object({ passcode: z.string().min(6).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const core = await import("./adminCore");
    await core.assertAdmin();
    return core.changeDeskPasscode(data.passcode);
  });

export const inviteCoach = createServerFn({ method: "POST" })
  .validator((d: { coachId: string; email: string; lang?: "en" | "th" | "ru" }) =>
    z.object({ coachId: z.string().uuid(), email: z.string().trim().toLowerCase().email(), lang: z.enum(["en", "th", "ru"]).default("en") }).parse(d),
  )
  .handler(async ({ data }) => {
    const core = await import("./adminCore");
    await core.assertAdmin();
    return core.inviteCoach(data.coachId, data.email, data.lang);
  });
