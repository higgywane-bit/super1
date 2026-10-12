// Verify a migrated database before cutover (docs/08-MIGRATION.md, "Verify before cutover").
//
//   TARGET_DB_URL=postgres://… node scripts/verify-migration.ts [--today 2026-10-12] [--out migration-report.md]
//
// 1. Counts per table: legacy vs SUPER1 (rows deliberately left behind are listed with the reason).
// 2. Every member's standing today: the OLD rules (old memberStanding, copied verbatim into
//    scripts/legacy-rules) on the old rows vs the NEW member_card() on the migrated rows.
// 3. Every active credential: OLD evaluateAccess vs NEW desk_check_in, inside a transaction that is
//    rolled back (nothing is written).
// 4. Money: old membership prices vs the imported sales rows.
// Differences caused by rules SUPER1 deliberately changed are marked "explained" with the reason.
// Writes migration-report.md and exits 1 when anything is unexplained. Reads only; writes nothing.
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { evaluateAccess, memberStanding, type MembershipLike } from "./legacy-rules/access.ts";
import { localDate } from "./legacy-rules/dates.ts";

type Row = Record<string, unknown>;
const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const today = arg("--today") ?? localDate();
const out = arg("--out") ?? "migration-report.md";
const url = process.env.TARGET_DB_URL;
if (!url) {
  console.error("Set TARGET_DB_URL to the migrated SUPER1 database.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

const d = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

type Diff = { what: string; member: string; old: string; now: string; explained: string | null };
const diffs: Diff[] = [];

async function main() {
  const report: string[] = [];
  report.push(`# Migration report`, ``, `- Database: \`${new URL(url!).host}\``, `- Business date checked: **${today}**`, `- Generated: ${new Date().toISOString()}`);
  const loads = await sql`select source, sha256, loaded_at from legacy._loads order by id`;
  for (const l of loads) report.push(`- Export: \`${l.source}\` (sha256 \`${String(l.sha256).slice(0, 16)}…\`, loaded ${(l.loaded_at as Date).toISOString()})`);

  // ---------------------------------------------------------------- 1. counts
  const demo = await sql`select id from legacy.members where source = 'demo'`;
  const demoIds = new Set(demo.map((r) => String(r.id)));
  const issues = await sql`select legacy_table, legacy_id, kind, detail, explained from legacy._issues order by explained, legacy_table, kind`;
  const notMigrated = (table: string) => new Set(issues.filter((i) => i.legacy_table === table && /not migrated/.test(String(i.detail))).map((i) => String(i.legacy_id)));

  const counts: [string, number, number, number][] = [];
  const pair = async (label: string, legacyQ: Promise<Row[]>, newQ: Promise<Row[]>, skipped: number) => {
    const [[a], [b]] = await Promise.all([legacyQ, newQ]);
    counts.push([label, Number(a.n), Number(b.n), skipped]);
  };
  await pair("members", sql`select count(*) n from legacy.members`, sql`select count(*) n from public.members where legacy_id is not null`, new Set([...demoIds, ...notMigrated("members")]).size);
  await pair(
    "credentials",
    sql`select count(*) n from legacy.credentials`,
    sql`select count(*) n from public.credentials c where exists (select 1 from legacy.credentials l where l.id = c.id)`,
    (await sql`select count(*) n from legacy.credentials where member_id in (select id from legacy.members where source = 'demo')`)[0].n * 1 + notMigrated("credentials").size,
  );
  await pair(
    "memberships",
    sql`select count(*) n from legacy.memberships`,
    sql`select count(*) n from public.memberships where legacy_id is not null`,
    (await sql`select count(*) n from legacy.memberships where member_id in (select id from legacy.members where source = 'demo')`)[0].n * 1 + notMigrated("memberships").size,
  );
  await pair(
    "check_ins → checkins",
    sql`select count(*) n from legacy.check_ins`,
    sql`select count(*) n from public.checkins where legacy_id is not null`,
    (await sql`select count(*) n from legacy.check_ins where member_id in (select id from legacy.members where source = 'demo')`)[0].n * 1,
  );
  await pair(
    "activity",
    sql`select count(*) n from legacy.activity`,
    sql`select count(*) n from public.activity where legacy_id is not null`,
    (await sql`select count(*) n from legacy.activity where member_id in (select id from legacy.members where source = 'demo')`)[0].n * 1,
  );
  await pair("pt_clients → won leads", sql`select count(*) n from legacy.pt_clients`, sql`select count(*) n from public.leads where legacy_id is not null`, issues.filter((i) => i.legacy_table === "pt_clients").length);
  await pair("workout_logs", sql`select count(*) n from legacy.workout_logs`, sql`select count(*) n from public.workout_logs where legacy_id is not null`, 0);
  await pair("daily_feedback → daily_checkins", sql`select count(*) n from legacy.daily_feedback`, sql`select count(*) n from public.daily_checkins where legacy_id is not null`, 0);

  report.push(``, `## 1. Counts`, ``, `| Table | Old | Moved | Left behind on purpose | Unexplained |`, `|---|---:|---:|---:|---:|`);
  let countProblems = 0;
  for (const [label, a, b, s] of counts) {
    const gap = a - s - b;
    if (gap !== 0) countProblems++;
    report.push(`| ${label} | ${a} | ${b} | ${s} | ${gap === 0 ? "0" : `**${gap}**`} |`);
  }

  // ---------------------------------------------------------------- 2 + 3. standings and scans
  const members = await sql`select id, member_no, first_name, last_name, archived_at from legacy.members where source is distinct from 'demo' order by member_no`;
  const ms = await sql`select * from legacy.memberships`;
  const byMember = new Map<string, Row[]>();
  for (const m of ms) byMember.set(String(m.member_id), [...(byMember.get(String(m.member_id)) ?? []), m]);
  const like = (m: Row): MembershipLike => ({
    id: String(m.id),
    kind: m.kind === "pt" ? "pt" : "membership",
    planName: String(m.plan_name),
    startsOn: d(m.starts_on)!,
    endsOn: d(m.ends_on)!,
    frozenFrom: d(m.frozen_from),
    frozenUntil: d(m.frozen_until),
    cancelledAt: m.cancelled_at as Date | null,
    sessionsTotal: m.sessions_total as number | null,
    sessionsUsed: m.sessions_used as number | null,
  });
  const why = (memberId: string, archived: boolean): string | null => {
    const rows = byMember.get(memberId) ?? [];
    if (archived) return "Archived member: the old rules ignored the archive flag; SUPER1 declines archived tags.";
    if (rows.some((r) => r.plan_id === "10-visits" && !r.cancelled_at)) return "10 Visits is a pack in SUPER1 (counted in visits, one a day), not days of cover.";
    if (rows.some((r) => r.frozen_from && !r.cancelled_at)) return "Pauses are member-level in SUPER1; the old freeze applied to one plan (a queued renewal overlapping a freeze was the bug SUPER1 fixes).";
    if (rows.some((r) => r.ends_on && r.starts_on && d(r.ends_on)! < d(r.starts_on)!)) return "A plan that ends before it starts wasn't migrated (see Issues).";
    return null;
  };

  const creds = await sql`select l.code, l.member_id from legacy.credentials l join legacy.members m on m.id = l.member_id
    where l.revoked_at is null and m.source is distinct from 'demo' order by l.code`;

  // The new side runs as a temporary admin inside a transaction that is always rolled back.
  const newCards = new Map<string, Row>();
  const newScans = new Map<string, Row>();
  const verifier = "00000000-0000-4000-8000-00000000fe00";
  await sql
    .begin(async (tx) => {
      await tx`insert into auth.users (id, email) values (${verifier}, 'migration-verifier@super1.invalid') on conflict do nothing`;
      await tx`insert into public.profiles (id, role, display_name) values (${verifier}, 'admin', 'Migration check') on conflict (id) do nothing`;
      await tx`select set_config('super1.test_today', ${today}, true), set_config('request.jwt.claim.sub', ${verifier}, true)`;
      await tx`set local role authenticated`;
      for (const r of await tx`select id, public.member_card(id) as card from public.members where legacy_id is not null and root_id = id`) newCards.set(String(r.id), r.card as Row);
      for (const c of creds) {
        const [r] = await tx`select public.desk_check_in(${String(c.code)}) as r`;
        newScans.set(String(c.code), r.r as Row);
      }
      throw new Error("rollback");
    })
    .catch((e) => {
      if ((e as Error).message !== "rollback") throw e;
    });

  const name = (m: Row) => `#${String(m.member_no).padStart(4, "0")} ${m.first_name} ${m.last_name}`.trim();
  let checked = 0;
  for (const m of members) {
    const id = String(m.id);
    const card = newCards.get(id);
    if (!card) {
      diffs.push({ what: "standing", member: name(m), old: "member", now: "not migrated", explained: notMigrated("members").has(id) ? "Left behind (see Issues)" : null });
      continue;
    }
    checked++;
    const old = memberStanding((byMember.get(id) ?? []).map(like), today);
    const oldStatus = old.status === "frozen" ? "paused" : old.status;
    const newStatus = String(card.status);
    const archived = !!m.archived_at;
    const oldText = `${oldStatus}${old.coverEnds ? ` to ${old.coverEnds}` : ""}${old.daysLeft != null ? ` (${old.daysLeft} days)` : ""}${old.endedOn ? ` ended ${old.endedOn}` : ""}${old.startsOn ? ` starts ${old.startsOn}` : ""}`;
    const newText = `${newStatus}${card.cover_ends ? ` to ${card.cover_ends}` : ""}${card.days_left != null ? ` (${card.days_left} days)` : ""}${card.ended_on ? ` ended ${card.ended_on}` : ""}${card.starts_on ? ` starts ${card.starts_on}` : ""}`;
    let same = oldStatus === newStatus;
    if (same && (newStatus === "active" || newStatus === "expiring")) same = (old.coverEnds ?? null) === (card.cover_ends ?? null);
    if (same && newStatus === "expired") same = (old.endedOn ?? null) === d(card.ended_on);
    if (same && newStatus === "upcoming") same = (old.startsOn ?? null) === d(card.starts_on);
    if (!same) diffs.push({ what: "standing", member: name(m), old: oldText, now: newText, explained: why(id, archived) });
  }

  const memberById = new Map(members.map((m) => [String(m.id), m]));
  let scans = 0;
  for (const c of creds) {
    const m = memberById.get(String(c.member_id));
    const r = newScans.get(String(c.code));
    if (!m || !r) continue;
    scans++;
    const oldA = evaluateAccess((byMember.get(String(c.member_id)) ?? []).map(like), today);
    const oldReason = oldA.allowed ? "allowed" : oldA.reason === "no-membership" ? "no-plan" : oldA.reason === "frozen" ? "paused" : oldA.reason;
    const newReason = r.allowed ? "allowed" : String(r.reason);
    if (oldReason !== newReason) diffs.push({ what: `scan ${c.code}`, member: name(m), old: oldReason, now: newReason, explained: why(String(c.member_id), !!m.archived_at) });
  }

  // ---------------------------------------------------------------- 4. money
  const [oldMoney] = await sql`select coalesce(sum(price), 0)::bigint s, count(*) n from legacy.memberships l
    where member_id not in (select id from legacy.members where source = 'demo') and ends_on >= starts_on`;
  const [newMoney] = await sql`select coalesce(sum(price_thb), 0)::bigint s, count(*) n from public.sales where source = 'import'`;
  const [demoMoney] = await sql`select coalesce(sum(price), 0)::bigint s from legacy.memberships where member_id in (select id from legacy.members where source = 'demo')`;
  const moneyOk = Number(oldMoney.s) === Number(newMoney.s);

  // ---------------------------------------------------------------- write
  const unexplained = diffs.filter((x) => !x.explained);
  report.push(
    ``,
    `## 2. Standing today (${checked} members) and 3. scans (${scans} active codes)`,
    ``,
    unexplained.length ? `**${unexplained.length} unexplained difference(s).** Fix before cutover.` : `No unexplained differences.`,
    ``,
  );
  if (diffs.length) {
    report.push(`| Check | Member | Old app | SUPER1 | Explained |`, `|---|---|---|---|---|`);
    for (const x of diffs.sort((a, b) => Number(!!a.explained) - Number(!!b.explained)))
      report.push(`| ${x.what} | ${x.member} | ${x.old} | ${x.now} | ${x.explained ?? "**no**"} |`);
  }
  report.push(
    ``,
    `## 4. Money`,
    ``,
    `| | Plans | Total |`,
    `|---|---:|---:|`,
    `| Old memberships (migrated members) | ${oldMoney.n} | ฿${Number(oldMoney.s).toLocaleString("en-US")} |`,
    `| SUPER1 sales, source = import | ${newMoney.n} | ฿${Number(newMoney.s).toLocaleString("en-US")} |`,
    `| Demo member, not migrated | | ฿${Number(demoMoney.s).toLocaleString("en-US")} |`,
    ``,
    moneyOk ? `Totals match.` : `**Totals differ by ฿${(Number(oldMoney.s) - Number(newMoney.s)).toLocaleString("en-US")}.**`,
    ``,
    `## Issues found while migrating`,
    ``,
    issues.length ? `| Old table | Old id | Kind | What happened | Needs Pete |` : `None.`,
  );
  if (issues.length) {
    report.push(`|---|---|---|---|---|`);
    for (const i of issues) report.push(`| ${i.legacy_table} | \`${String(i.legacy_id).slice(0, 13)}\` | ${i.kind} | ${i.detail} | ${i.explained ? "no" : "**yes**"} |`);
  }
  report.push(``, `## Spot check with the desk team`, ``, `Scan 10 real members at the new desk on cutover morning and tick them here:`, ``, ...Array.from({ length: 10 }, (_, i) => `- [ ] ${i + 1}. ________________  tag ______  ✓ same as the old desk`));
  writeFileSync(out, report.join("\n") + "\n");

  const ok = unexplained.length === 0 && countProblems === 0 && moneyOk;
  console.log(`${ok ? "✓" : "✗"} ${checked} members, ${scans} codes, ${diffs.length} differences (${unexplained.length} unexplained), count gaps ${countProblems}, money ${moneyOk ? "matches" : "differs"} → ${out}`);
  await sql.end();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
