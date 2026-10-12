/**
 * Motion #1 plays once per launch, never on resume or on a later visit to a sign-in screen in the
 * same tab. The first render (server and hydration) animates; anything rendered after that doesn't.
 */
let launched = false;

export function launchMotion(): boolean {
  return !launched;
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => setTimeout(() => (launched = true), 1600), { once: true });
}
