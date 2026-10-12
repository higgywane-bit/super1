import { createServerFn } from "@tanstack/react-start";

/**
 * M13 · "Delete my app login": unlink the login from the member (the gym's visits, plans and payments
 * stay), then close the login with the service role so it can't sign in again, and tell Pete.
 * Thin module: the work is in memberCore.ts, loaded inside the handler.
 */
export const removeMyLogin = createServerFn({ method: "POST" }).handler(async () => {
  const core = await import("./memberCore");
  return core.removeMyLogin();
});
