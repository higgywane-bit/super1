/** Email HTML shell in the SUPER1 look (dark, Inter, blue button). Inline styles only: email clients. */
export function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function layout(lang: string, body: string, footer: string, logoUrl: string): string {
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#000000;color:#ffffff;font-family:Inter,'Noto Sans Thai',-apple-system,BlinkMacSystemFont,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding-bottom:24px;"><img src="${esc(logoUrl)}" alt="SUPER1" height="30" style="height:30px;width:auto;display:block;border:0;"></td></tr>
${body}
<tr><td style="padding-top:28px;font:500 12px/18px Inter,sans-serif;color:#7c838f;">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function h1(s: string) {
  return `<tr><td style="font:700 30px/38px Inter,'Noto Sans Thai',sans-serif;letter-spacing:-0.02em;padding-bottom:14px;">${esc(s)}</td></tr>`;
}
export function p(s: string) {
  return `<tr><td style="font:400 17px/26px Inter,'Noto Sans Thai',sans-serif;color:#9ca3af;padding-bottom:22px;">${esc(s)}</td></tr>`;
}
export function button(label: string, href: string) {
  return `<tr><td style="padding-bottom:24px;"><a href="${esc(href)}" style="display:inline-block;background:#00b4ff;color:#000000;font:600 17px/56px Inter,sans-serif;padding:0 28px;border-radius:14px;text-decoration:none;">${esc(label)}</a></td></tr>`;
}
