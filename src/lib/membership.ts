import { addDays, addMonths, diffDays, lastDayOfMonth, type ISODate } from "./dates";

/**
 * The membership rules, as pure functions. The desk, the member app, the coach portal,
 * Andy's dashboard and the SQL functions in supabase/migrations must all agree with these.
 * docs/04-BUSINESS-RULES.md explains each rule; tests/membership.test.ts pins them down.
 */

export type PlanKind = "membership" | "visits" | "pt" | "extra";
export type Duration = { days: number } | { months: number };

export const RULES = {
  /** "Expiring" pill when this many days or fewer are left. */
  expiringSoonDays: 7,
  /** The allowed popup nudges a renewal at this many days left. */
  renewNudgeDays: 3,
  /** A second scan of the same code within this window is the same visit (no new check-in row). */
  duplicateScanSeconds: 120,
} as const;

export type Membership = {
  id: string;
  kind: PlanKind;
  planName: string;
  /** Inclusive dates in Bangkok time. They already include any pause days. */
  startsOn: ISODate;
  endsOn: ISODate;
  /** Visit packs and PT packs only. */
  sessionsTotal?: number | null;
  sessionsUsed?: number | null;
  coachId?: string | null;
  /** Set only when a sale was a mistake. Voided plans never count. Nothing is deleted. */
  voidedAt?: string | null;
};

/** A member-level pause. Both dates inclusive. */
export type Pause = { from: ISODate; until: ISODate };

/* ------------------------------------------------------------------ dates */

/**
 * Last day of a plan that starts on `start`. Day plans: start + days - 1.
 * Month plans: same date n months later, minus a day. When the start day doesn't exist in
 * the target month (31 Jan + 1 month), the plan ends on that month's last day (28 Feb), not a day early.
 */
export function planEndDate(start: ISODate, duration: Duration): ISODate {
  if ("days" in duration) return addDays(start, duration.days - 1);
  const [y, m, d] = start.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + duration.months, 1));
  const last = lastDayOfMonth(target.getUTCFullYear(), target.getUTCMonth());
  if (d > last) return addMonths(start, duration.months);
  return addDays(addMonths(start, duration.months), -1);
}

export function sessionsLeft(m: Membership): number | null {
  return m.sessionsTotal == null ? null : Math.max(0, m.sessionsTotal - (m.sessionsUsed ?? 0));
}

function live(ms: Membership[], kind: PlanKind): Membership[] {
  return ms.filter((m) => m.kind === kind && !m.voidedAt).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

/**
 * Last day of unbroken cover starting from `from`, following plans that start on or before
 * the day after the previous one ends. A member on 1 Month who already bought the next month
 * has about 60 days left, not 30.
 */
export function coverageEnd(ms: Membership[], from: Membership): ISODate {
  let end = from.endsOn;
  for (const m of live(ms, from.kind)) {
    if (sessionsLeft(m) === 0) continue;
    if (m.startsOn <= addDays(end, 1) && m.endsOn > end) end = m.endsOn;
  }
  return end;
}

/**
 * Where a newly sold plan starts. Time-based memberships queue after the current unbroken cover
 * (selling 1 Month on Mon 12 Oct to someone covered until Sat 31 Oct starts it on Sun 1 Nov).
 * Visit packs, PT packs and extras start today.
 */
export function nextStartDate(ms: Membership[], kind: PlanKind, today: ISODate): ISODate {
  if (kind !== "membership") return today;
  const current = live(ms, "membership").find((m) => m.startsOn <= today && today <= m.endsOn);
  if (!current) {
    // A plan that is already queued (bought early, starts later) also pushes the new one back.
    const queued = live(ms, "membership").filter((m) => m.startsOn > today);
    if (!queued.length) return today;
    return addDays(coverageEnd(ms, queued[0]), 1);
  }
  return addDays(coverageEnd(ms, current), 1);
}

/* ------------------------------------------------------------------ pauses */

function pauseLength(p: Pause): number {
  return diffDays(p.from, p.until) + 1;
}

/**
 * Pausing a member moves every running or queued plan back by the pause length:
 * - plans that ended before the pause starts: untouched
 * - plans that had not started when the pause starts: start and end both move back
 * - plans running when the pause starts: end moves back
 * This is the fix for the old bug where a queued renewal overlapped a paused plan.
 */
export function applyPause(ms: Membership[], pause: Pause): Membership[] {
  const len = pauseLength(pause);
  return ms.map((m) => {
    if (m.voidedAt || m.endsOn < pause.from) return m;
    if (m.startsOn >= pause.from) return { ...m, startsOn: addDays(m.startsOn, len), endsOn: addDays(m.endsOn, len) };
    return { ...m, endsOn: addDays(m.endsOn, len) };
  });
}

/**
 * The member comes back on `resumeOn` instead of the day after `pause.until`. The unused days are
 * given back: queued plans move earlier, running plans end earlier. Plans that started during the
 * pause (a PT pack bought while paused) are untouched. Returns `pause: null` when the whole pause
 * is cancelled (resumeOn on or before pause.from).
 */
export function endPauseEarly(ms: Membership[], pause: Pause, resumeOn: ISODate): { memberships: Membership[]; pause: Pause | null } {
  if (resumeOn > pause.until) return { memberships: ms, pause };
  const cancelled = resumeOn <= pause.from;
  const unused = cancelled ? pauseLength(pause) : diffDays(resumeOn, pause.until) + 1;
  const memberships = ms.map((m) => {
    if (m.voidedAt || m.endsOn < pause.from) return m;
    if (m.startsOn > pause.until) return { ...m, startsOn: addDays(m.startsOn, -unused), endsOn: addDays(m.endsOn, -unused) };
    if (m.startsOn < pause.from) return { ...m, endsOn: addDays(m.endsOn, -unused) };
    return m;
  });
  return { memberships, pause: cancelled ? null : { from: pause.from, until: addDays(resumeOn, -1) } };
}

export function pausedOn(pauses: Pause[], day: ISODate): Pause | undefined {
  return pauses.find((p) => p.from <= day && day <= p.until);
}

/* ------------------------------------------------------------------ standing */

export type MemberStatus = "active" | "expiring" | "paused" | "upcoming" | "expired" | "none";

export type Standing = {
  status: MemberStatus;
  /** The time-based plan covering today, or the one that matters most. */
  current?: Membership;
  coverEnds?: ISODate;
  /** 0 = today is the last day. Emma on Mon 12 Oct with cover to Sat 31 Oct = 19. */
  daysLeft?: number;
  startsOn?: ISODate;
  endedOn?: ISODate;
  daysSinceExpiry?: number;
  pausedUntil?: ISODate;
  /** A visit pack valid today with visits left. */
  visits?: { membership: Membership; left: number; endsOn: ISODate };
  /** The PT pack valid today, if any. */
  pt?: { membership: Membership; left: number; endsOn: ISODate; coachId: string | null };
};

export function memberStanding(ms: Membership[], pauses: Pause[], today: ISODate): Standing {
  const gym = live(ms, "membership");
  const pack = live(ms, "visits").find((m) => m.startsOn <= today && today <= m.endsOn && (sessionsLeft(m) ?? 0) > 0);
  const ptPack = live(ms, "pt").find((m) => m.startsOn <= today && today <= m.endsOn && (sessionsLeft(m) ?? 0) > 0);
  const extras: Pick<Standing, "visits" | "pt"> = {
    visits: pack ? { membership: pack, left: sessionsLeft(pack) ?? 0, endsOn: pack.endsOn } : undefined,
    pt: ptPack ? { membership: ptPack, left: sessionsLeft(ptPack) ?? 0, endsOn: ptPack.endsOn, coachId: ptPack.coachId ?? null } : undefined,
  };
  const pause = pausedOn(pauses, today);
  const current = gym.find((m) => m.startsOn <= today && today <= m.endsOn);

  if (pause) {
    const base = current ?? gym.find((m) => m.startsOn > today);
    return { status: "paused", current: base, pausedUntil: pause.until, coverEnds: base ? coverageEnd(ms, base) : undefined, ...extras };
  }
  if (current) {
    const coverEnds = coverageEnd(ms, current);
    const daysLeft = diffDays(today, coverEnds);
    return { status: daysLeft <= RULES.expiringSoonDays ? "expiring" : "active", current, coverEnds, daysLeft, ...extras };
  }
  if (pack) return { status: "active", ...extras };

  const upcoming = gym.find((m) => m.startsOn > today);
  if (upcoming) return { status: "upcoming", current: upcoming, startsOn: upcoming.startsOn, ...extras };

  const past = [...gym, ...live(ms, "visits")].filter((m) => m.startsOn <= today).sort((a, b) => a.endsOn.localeCompare(b.endsOn)).at(-1);
  if (past) return { status: "expired", current: past, endedOn: past.endsOn, daysSinceExpiry: diffDays(past.endsOn, today), ...extras };
  return { status: "none", ...extras };
}

/* ------------------------------------------------------------------ check-in */

export type DenyReason = "unknown-code" | "archived" | "paused" | "not-started" | "expired" | "used-up" | "no-plan";

export type CheckInDecision =
  | { allowed: true; via: "membership" | "visits"; membership: Membership; consumeVisit: boolean; standing: Standing; nudge: "last-day" | "renew-soon" | null }
  | { allowed: false; reason: DenyReason; standing?: Standing };

/**
 * The one question the door asks: can this person train today?
 * Visit packs use at most one visit per calendar day, and only when no time-based plan covers today.
 */
export function decideCheckIn(input: {
  member: { archivedAt?: string | null } | null;
  memberships: Membership[];
  pauses: Pause[];
  today: ISODate;
  /** Has this member already had an allowed check-in today? */
  checkedInToday: boolean;
}): CheckInDecision {
  if (!input.member) return { allowed: false, reason: "unknown-code" };
  if (input.member.archivedAt) return { allowed: false, reason: "archived" };
  const standing = memberStanding(input.memberships, input.pauses, input.today);
  if (standing.status === "paused") return { allowed: false, reason: "paused", standing };
  if ((standing.status === "active" || standing.status === "expiring") && standing.current) {
    const d = standing.daysLeft ?? 0;
    const nudge = d === 0 ? "last-day" : d <= RULES.renewNudgeDays ? "renew-soon" : null;
    return { allowed: true, via: "membership", membership: standing.current, consumeVisit: false, standing, nudge };
  }
  if (standing.visits) {
    return { allowed: true, via: "visits", membership: standing.visits.membership, consumeVisit: !input.checkedInToday, standing, nudge: standing.visits.left <= 1 ? "renew-soon" : null };
  }
  const usedUpPack = live(input.memberships, "visits").find((m) => m.startsOn <= input.today && input.today <= m.endsOn && sessionsLeft(m) === 0);
  if (usedUpPack) return { allowed: false, reason: "used-up", standing };
  if (standing.status === "upcoming") return { allowed: false, reason: "not-started", standing };
  if (standing.status === "expired") return { allowed: false, reason: "expired", standing };
  return { allowed: false, reason: "no-plan", standing };
}

/* ------------------------------------------------------------------ PT */

export type PtUse = { ok: true; left: number } | { ok: false; reason: "no-pack" | "used-up" | "expired" | "not-started" };

/** Can one PT session come off this pack today? The caller writes a pt_sessions row; it never edits counts by hand. */
export function canUsePtSession(pack: Membership | undefined, today: ISODate): PtUse {
  if (!pack || pack.kind !== "pt" || pack.voidedAt) return { ok: false, reason: "no-pack" };
  if (today < pack.startsOn) return { ok: false, reason: "not-started" };
  if (today > pack.endsOn) return { ok: false, reason: "expired" };
  const left = sessionsLeft(pack) ?? 0;
  if (left <= 0) return { ok: false, reason: "used-up" };
  return { ok: true, left: left - 1 };
}

/* ------------------------------------------------------------------ labels */

/** "Last day today", "Ends tomorrow", "19 days left" */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "Last day today";
  if (daysLeft === 1) return "Ends tomorrow";
  return `${daysLeft} days left`;
}
