import type { MessageKey, Vars } from "../i18n";

/**
 * Database functions raise plain English sentences (supabase/migrations). The screens show them in
 * the person's language: map the known ones to dictionary keys, anything else to "Something went wrong".
 */
const PATTERNS: [RegExp, MessageKey, (m: RegExpMatchArray) => Vars][] = [
  [/^Tag (\S+) is already in use/, "err.tagInUse", (m) => ({ tag: m[1] })],
  [/^Pick who is on shift first/, "err.noShift", () => ({})],
  [/^This member has no tag yet/, "err.noTag", () => ({})],
  [/^No PT sessions left/, "err.noPt", () => ({})],
  [/^Too late to undo/, "err.tooLate", () => ({})],
  [/^This sign-up is already done|^This link request is already done/, "err.signupDone", () => ({})],
  [/^Restore this member before selling/, "err.restoreFirst", () => ({})],
  [/^This overlaps another pause/, "err.pauseOverlap", () => ({})],
  [/^No member has tag (\S+?)\.?$/, "err.noTagMember", (m) => ({ tag: m[1] })],
  [/^Pick the coach/, "desk.pickCoach", () => ({})],
];

export type UiError = { key: MessageKey; vars?: Vars };

export function toUiError(e: unknown): UiError {
  const msg = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e ?? "");
  for (const [re, key, vars] of PATTERNS) {
    const m = msg.match(re);
    if (m) return { key, vars: vars(m) };
  }
  if (/fetch|network|Failed to fetch|NetworkError/i.test(msg)) return { key: "common.offline" };
  return { key: "common.error" };
}
