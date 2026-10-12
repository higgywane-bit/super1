import { translate, type Lang } from "../../i18n";
import { dayLabel } from "../../i18n/format";
import { button, esc, h1, layout, p } from "./layout";

export type InviteData = {
  lang: Lang;
  firstName: string;
  email: string;
  code: string | null;
  plan: { name: string; startsOn: string; endsOn: string } | null;
  tag: string | null;
  coach: string | null;
  appOrigin: string;
};

/** The app invite (Invite board): in the member's language, with plan, tag, coach and a sign-in code. */
export function inviteEmail(d: InviteData): { subject: string; html: string; text: string } {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(d.lang, k, v);
  const link = `${d.appOrigin}/?email=${encodeURIComponent(d.email)}`;
  const planLine = d.plan ? `${d.plan.name} · ${dayLabel(d.plan.startsOn, d.lang)} → ${dayLabel(d.plan.endsOn, d.lang)}` : null;
  const code = d.code ? `${d.code.slice(0, 3)} ${d.code.slice(3)}` : null;
  const card = `
<tr><td style="background:#1e2228;border-radius:20px;padding:20px;">
  <div style="font:600 13px/18px Inter,sans-serif;color:#9ca3af;padding-bottom:10px;">${esc(t("email.invite.planTitle"))}</div>
  ${planLine ? `<div style="font:600 17px/22px Inter,'Noto Sans Thai',sans-serif;padding-bottom:12px;">${esc(planLine)} <span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:999px;background:rgba(43,212,106,0.14);color:#2bd46a;font:600 13px/18px Inter,sans-serif;">${esc(t("email.invite.active"))}</span></div>` : ""}
  ${d.tag ? `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;font:500 15px/20px Inter,sans-serif;color:#9ca3af;">${esc(t("email.invite.tag"))} <span style="float:right;color:#ffffff;font-weight:700;letter-spacing:0.12em;">${esc(d.tag)}</span></div>` : ""}
  ${d.coach ? `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:12px;padding-top:12px;font:500 15px/20px Inter,'Noto Sans Thai',sans-serif;"><span style="color:#ff4edb;">●</span> ${esc(t("email.invite.coach", { coach: d.coach }))}</div>` : ""}
</td></tr>`;
  const codeBlock = code
    ? `<tr><td style="padding-bottom:24px;">
  <div style="font:600 13px/18px Inter,sans-serif;color:#9ca3af;">${esc(t("email.invite.codeLine"))}</div>
  <div style="font:700 34px/44px Inter,sans-serif;letter-spacing:0.18em;">${esc(code)}</div>
  <div style="font:500 13px/18px Inter,sans-serif;color:#7c838f;">${esc(t("email.invite.codeNote"))}</div>
</td></tr>`
    : "";
  const body = h1(t("email.invite.greet", { name: d.firstName })) + p(t("email.invite.body")) + button(t("email.invite.button"), link) + codeBlock + card;
  const text = [
    t("email.invite.greet", { name: d.firstName }),
    "",
    t("email.invite.body"),
    "",
    `${t("email.invite.button")}: ${link}`,
    code ? `${t("email.invite.codeLine")}: ${code} (${t("email.invite.codeNote")})` : "",
    planLine ? `${t("email.invite.planTitle")}: ${planLine}` : "",
    d.tag ? `${t("email.invite.tag")}: ${d.tag}` : "",
    d.coach ? t("email.invite.coach", { coach: d.coach }) : "",
    "",
    t("email.invite.footer"),
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
  return { subject: t("email.invite.subject"), html: layout(d.lang, body, t("email.invite.footer"), `${d.appOrigin}/brand/super1-wordmark.png`), text };
}
