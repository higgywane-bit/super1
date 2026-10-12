import { translate, type Lang } from "../../i18n";
import { button, h1, layout, p } from "./layout";

const FOOTER = "SUPER1 · Superfit, Chalong, Phuket";

export function leadEmail(lang: Lang, name: string, appOrigin: string) {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string>) => translate(lang, k, v);
  const html = layout(lang, h1(t("email.lead.subject", { name })) + p(t("email.lead.body", { name })) + button(t("email.lead.button"), `${appOrigin}/coach`), FOOTER, `${appOrigin}/brand/super1-wordmark.png`);
  return { subject: t("email.lead.subject", { name }), html, text: `${t("email.lead.body", { name })}\n\n${appOrigin}/coach` };
}

export function supportEmail(staff: string, body: string, worldOrigin: string) {
  const subject = translate("en", "email.support.subject", { name: staff });
  const html = layout("en", h1(subject) + p(body) + button(translate("en", "email.support.button"), `${worldOrigin}/admin`), FOOTER, `${worldOrigin}/brand/super1-wordmark.png`);
  return { subject, html, text: `${body}\n\n${worldOrigin}/admin` };
}

export function mergeEmail(v: { by: string; keep: number; keepName: string; dup: number; dupName: string }, worldOrigin: string) {
  const vars = { by: v.by, keep: String(v.keep).padStart(4, "0"), keepName: v.keepName, dup: String(v.dup).padStart(4, "0"), dupName: v.dupName };
  const subject = translate("en", "email.merge.subject", vars);
  const line = translate("en", "email.merge.body", vars);
  const html = layout("en", h1(subject) + p(line) + button(translate("en", "email.merge.button"), `${worldOrigin}/admin`), FOOTER, `${worldOrigin}/brand/super1-wordmark.png`);
  return { subject, html, text: `${line}\n\n${worldOrigin}/admin` };
}

export function coachInviteEmail(lang: Lang, name: string, code: string | null, appOrigin: string) {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string>) => translate(lang, k, v);
  const codeBlock = code
    ? `<tr><td style="padding-bottom:24px;"><div style="font:600 13px/18px Inter,sans-serif;color:#9ca3af;">${t("email.invite.codeLine")}</div><div style="font:700 34px/44px Inter,sans-serif;letter-spacing:0.18em;">${code.slice(0, 3)} ${code.slice(3)}</div><div style="font:500 13px/18px Inter,sans-serif;color:#7c838f;">${t("email.invite.codeNote")}</div></td></tr>`
    : "";
  const html = layout(lang, h1(t("email.coach.greet", { name })) + p(t("email.coach.body")) + button(t("email.coach.button"), `${appOrigin}/coach`) + codeBlock, FOOTER, `${appOrigin}/brand/super1-wordmark.png`);
  return { subject: t("email.coach.subject"), html, text: `${t("email.coach.greet", { name })}\n\n${t("email.coach.body")}\n\n${appOrigin}/coach${code ? `\n${t("email.invite.codeLine")}: ${code}` : ""}` };
}

/** To a member: their coach sent a new program version (outbox `program_push`). */
export function programEmail(lang: Lang, name: string, coach: string, appOrigin: string) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k, { name, coach });
  const html = layout(lang, h1(t("email.program.subject")) + p(t("email.program.body")) + button(t("email.program.button"), `${appOrigin}/`), FOOTER, `${appOrigin}/brand/super1-wordmark.png`);
  return { subject: t("email.program.subject"), html, text: `${t("email.program.body")}\n\n${appOrigin}/` };
}

/** To a member: their coach's nudge after days without a daily check-in (outbox `coach_nudge`). */
export function nudgeEmail(lang: Lang, name: string, coach: string, appOrigin: string) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k, { name, coach });
  const html = layout(lang, h1(t("email.nudge.subject")) + p(t("email.nudge.body")) + button(t("email.nudge.button"), `${appOrigin}/`), FOOTER, `${appOrigin}/brand/super1-wordmark.png`);
  return { subject: t("email.nudge.subject"), html, text: `${t("email.nudge.body")}\n\n${appOrigin}/` };
}
