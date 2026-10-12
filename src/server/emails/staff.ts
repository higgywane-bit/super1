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
