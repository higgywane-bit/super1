import { createServerFn } from "@tanstack/react-start";
import { supabaseServer } from "./supabase";

/**
 * Called by the desk right after an action that queued an email, so the invite doesn't wait for the
 * next cron minute. Desk or admin logins only; the cron is the backstop.
 * (Server-function modules stay thin: the worker is loaded inside the handler, never in the browser.)
 */
export const kickOutbox = createServerFn({ method: "POST" }).handler(async () => {
  const { data: ok } = await supabaseServer().rpc("is_desk_or_admin");
  if (!ok) return { sent: 0, failed: 0 };
  const { runOutbox } = await import("./outbox");
  return runOutbox();
});
