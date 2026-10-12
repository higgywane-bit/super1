/**
 * The outbox worker (docs/02-CONNECTIONS.md, "Outbox events"). Runs every minute from the Cron
 * Trigger, and right after a desk action that queued something (so invites arrive in seconds).
 * Rows are claimed with SKIP LOCKED, sent once (Resend idempotency key = outbox id), stamped sent_at;
 * failures keep last_error and are retried, up to 8 attempts.
 */
import { isLang, translate, type Lang } from "../i18n";
import { dayLabel } from "../i18n/format";
import { localDate } from "../lib/dates";
import type { Json } from "./db.types";
import { sendEmail } from "./email";
import { inviteEmail } from "./emails/invite";
import { coachInviteEmail, nudgeEmail, programEmail, removedEmail, renewalEmail, leadEmail, mergeEmail, supportEmail } from "./emails/staff";
import { env } from "./env";
import { pushToMember } from "./push";
import { supabaseAdmin, type DB } from "./supabase";

type Row = { id: number; kind: string; payload: Json; attempts: number };

function origins() {
  const e = env();
  return { world: (e.APP_ORIGIN_WORLD || "https://super1.world").replace(/\/$/, ""), app: (e.APP_ORIGIN_APP || "https://super1.app").replace(/\/$/, "") };
}

async function adminEmails(db: DB): Promise<string[]> {
  const { data } = await db.from("profiles").select("email").eq("role", "admin");
  return (data ?? []).map((r) => r.email).filter((x): x is string => !!x);
}

/** Make sure the member has an app login (role member) and return a fresh 6-digit sign-in code. */
async function memberLoginCode(db: DB, email: string, lang: Lang, name: string): Promise<string | null> {
  const { data: prof } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (!prof) {
    const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { lang } });
    let id = created.user?.id;
    if (error) {
      // The login may exist without a profile (e.g. made by hand): find it.
      for (let page = 1; page < 50 && !id; page++) {
        const { data: users } = await db.auth.admin.listUsers({ page, perPage: 200 });
        id = users.users.find((u) => u.email?.toLowerCase() === email)?.id;
        if (users.users.length < 200) break;
      }
    }
    if (!id) throw new Error(`Could not create a login for ${email}`);
    const { error: pe } = await db.from("profiles").upsert({ id, role: "member", email, display_name: name, lang }, { onConflict: "id" });
    if (pe) throw new Error(pe.message);
  }
  const { data: link, error: le } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (le) throw new Error(le.message);
  return link.properties?.email_otp ?? null;
}

async function handleInvite(db: DB, p: { member_id: string; email: string; lang?: string }) {
  const { data: m } = await db.from("members").select("id, root_id, first_name, last_name, lang").eq("id", p.member_id).single();
  if (!m) throw new Error("member not found");
  const lang: Lang = isLang(p.lang) ? p.lang : isLang(m.lang) ? m.lang : "en";
  const today = localDate();
  const { data: group } = await db.from("members").select("id").eq("root_id", m.root_id);
  const ids = (group ?? []).map((g) => g.id);
  const { data: plans } = await db
    .from("memberships")
    .select("plan_name, kind, starts_on, ends_on, created_at")
    .in("member_id", ids)
    .is("voided_at", null)
    .order("created_at", { ascending: false });
  const plan = (plans ?? []).find((x) => x.ends_on >= today && x.kind !== "pt") ?? (plans ?? [])[0];
  const { data: cred } = await db.from("credentials").select("code").in("member_id", ids).is("revoked_at", null).eq("kind", "tag").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: lead } = await db.from("leads").select("coaches(name)").in("member_id", ids).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const coach = (lead?.coaches as { name: string } | null)?.name ?? null;

  const code = await memberLoginCode(db, p.email, lang, `${m.first_name} ${m.last_name}`.trim());
  const mail = inviteEmail({
    lang,
    firstName: m.first_name,
    email: p.email,
    code,
    plan: plan ? { name: plan.plan_name, startsOn: plan.starts_on, endsOn: plan.ends_on } : null,
    tag: cred?.code ?? null,
    coach,
    appOrigin: origins().app,
  });
  return { to: p.email, ...mail, after: async () => void (await db.from("invites").update({ sent_at: new Date().toISOString() }).eq("member_id", m.root_id).eq("email", p.email).is("sent_at", null)) };
}

async function render(db: DB, row: Row): Promise<{ to: string; subject: string; html: string; text: string; after?: () => Promise<void> }[] | null> {
  const p = (row.payload ?? {}) as Record<string, string>;
  switch (row.kind) {
    case "invite_email":
      return [await handleInvite(db, p as unknown as { member_id: string; email: string; lang?: string })];
    case "lead_push": {
      const { data: c } = await db.from("coaches").select("name, email, user_id").eq("id", p.coach_id).single();
      const { data: m } = await db.from("members").select("first_name, last_name").eq("id", p.member_id).single();
      if (!c?.email || !m) return [];
      const { data: prof } = c.user_id ? await db.from("profiles").select("lang").eq("id", c.user_id).maybeSingle() : { data: null };
      const lang: Lang = isLang(prof?.lang) ? prof.lang : "en";
      return [{ to: c.email, ...leadEmail(lang, `${m.first_name} ${m.last_name}`.trim(), origins().app) }];
    }
    case "support_email": {
      const { data: msg } = await db.from("messages").select("body, staff(name)").eq("id", p.message_id).single();
      if (!msg) return [];
      const staff = (msg.staff as { name: string } | null)?.name ?? "Desk";
      const mail = supportEmail(staff, msg.body, origins().world);
      return (await adminEmails(db)).map((to) => ({ to, ...mail }));
    }
    case "merge_request_email": {
      const { data: r } = await db.from("merge_requests").select("keep_member_id, duplicate_member_id, staff(name)").eq("id", p.request_id).single();
      if (!r) return [];
      const { data: ms } = await db.from("members").select("id, member_no, first_name, last_name").in("id", [r.keep_member_id, r.duplicate_member_id]);
      const k = ms?.find((x) => x.id === r.keep_member_id);
      const d = ms?.find((x) => x.id === r.duplicate_member_id);
      if (!k || !d) return [];
      const mail = mergeEmail(
        { by: (r.staff as { name: string } | null)?.name ?? "The desk", keep: k.member_no, keepName: `${k.first_name} ${k.last_name}`.trim(), dup: d.member_no, dupName: `${d.first_name} ${d.last_name}`.trim() },
        origins().world,
      );
      return (await adminEmails(db)).map((to) => ({ to, ...mail }));
    }
    case "coach_invite": {
      const { data: c } = await db.from("coaches").select("name, full_name").eq("id", p.coach_id).single();
      if (!c) return [];
      const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email: p.email });
      const lang: Lang = isLang(p.lang) ? p.lang : "en";
      return [{ to: p.email, ...coachInviteEmail(lang, c.full_name || c.name, link?.properties?.email_otp ?? null, origins().app) }];
    }
    case "program_push":
    case "coach_nudge": {
      const { data: m } = await db.from("members").select("first_name, email, lang").eq("id", p.member_id).single();
      if (!m) return [];
      const coachId = p.coach_id ?? (await db.from("programs").select("coach_id").eq("member_id", p.member_id).not("coach_id", "is", null).limit(1).maybeSingle()).data?.coach_id;
      const { data: c } = coachId ? await db.from("coaches").select("name").eq("id", coachId).maybeSingle() : { data: null };
      const lang: Lang = isLang(m.lang) ? m.lang : "en";
      const coach = c?.name ?? "Your coach";
      const program = row.kind === "program_push";
      await pushToMember(p.member_id, translate(lang, program ? "push.program" : "push.nudge", { coach }), translate(lang, program ? "push.programBody" : "push.nudgeBody"), program ? "/train" : "/checkin").catch(() => 0);
      if (!m.email) return []; // no email yet: the app shows it when they sign in
      const make = program ? programEmail : nudgeEmail;
      return [{ to: m.email, ...make(lang, m.first_name, coach, origins().app) }];
    }
    case "pt_push": {
      const { data: s } = await db.from("pt_sessions").select("member_id, undone_at, memberships(sessions_total, sessions_used), coaches(name)").eq("id", p.session_id).maybeSingle();
      if (!s || s.undone_at) return [];
      const { data: m } = await db.from("members").select("lang").eq("id", s.member_id).single();
      const lang: Lang = isLang(m?.lang) ? m.lang : "en";
      const pack = s.memberships as unknown as { sessions_total: number; sessions_used: number } | null;
      const coach = (s.coaches as unknown as { name: string } | null)?.name ?? "";
      if (pack) await pushToMember(s.member_id, translate(lang, "push.pt"), translate(lang, "push.ptBody", { left: pack.sessions_total - pack.sessions_used, total: pack.sessions_total, coach }), "/me").catch(() => 0);
      return [];
    }
    case "renewal_reminder": {
      const { data: m } = await db.from("members").select("first_name, email, lang").eq("id", p.member_id).single();
      if (!m?.email) return [];
      const lang: Lang = isLang(p.lang) ? p.lang : isLang(m.lang) ? m.lang : "en";
      const { data: plan } = await db.from("memberships").select("plan_name").eq("kind", "membership").eq("ends_on", p.ends_on).is("voided_at", null).in("member_id", (await db.from("members").select("id").eq("root_id", p.member_id)).data?.map((x) => x.id) ?? []).limit(1).maybeSingle();
      const when = (["before_7", "before_1", "after_3"] as const).find((w) => w === p.when) ?? "before_7";
      const mail = renewalEmail(lang, when, { name: m.first_name, plan: plan?.plan_name ?? "", date: dayLabel(p.ends_on, lang) }, origins().app);
      await pushToMember(p.member_id, mail.subject, mail.text.split("\n")[0], "/me").catch(() => 0);
      return [{ to: m.email, ...mail }];
    }
    case "login_removed": {
      const { data: m } = await db.from("members").select("member_no, first_name, last_name").eq("id", p.member_id).single();
      if (!m) return [];
      const mail = removedEmail(m.member_no, `${m.first_name} ${m.last_name}`.trim(), origins().world);
      return (await adminEmails(db)).map((to) => ({ to, ...mail }));
    }
    default:
      return null; // handled by a later phase
  }
}

export async function runOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("outbox_claim", { p_limit: limit });
  if (error) throw new Error(error.message);
  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as Row[]) {
    try {
      const mails = await render(db, row);
      if (mails === null) {
        await db.rpc("outbox_failed", { p_id: row.id, p_error: `No sender for ${row.kind} yet` });
        failed++;
        continue;
      }
      let i = 0;
      for (const m of mails) {
        await sendEmail({ to: m.to, subject: m.subject, html: m.html, text: m.text, idempotencyKey: `outbox-${row.id}-${i++}` });
        await m.after?.();
      }
      await db.rpc("outbox_done", { p_id: row.id });
      sent++;
    } catch (e) {
      await db.rpc("outbox_failed", { p_id: row.id, p_error: e instanceof Error ? e.message : String(e) });
      failed++;
    }
  }
  return { sent, failed };
}
