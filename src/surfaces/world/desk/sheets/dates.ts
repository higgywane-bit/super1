import type { MembershipRow, Plan } from "../../../../client/desk";
import { localDate, type ISODate } from "../../../../lib/dates";
import { nextStartDate, planEndDate, type Membership } from "../../../../lib/membership";

/** The dates a sale will get, from the same rules the database uses (src/lib/membership.ts). */
export function saleDates(plan: Plan, ms: MembershipRow[], today: ISODate = localDate()): { start: ISODate; end: ISODate; queued: boolean } {
  const rules: Membership[] = ms.map((m) => ({
    id: m.id,
    kind: m.kind,
    planName: m.plan,
    startsOn: m.starts_on,
    endsOn: m.ends_on,
    sessionsTotal: m.sessions_total,
    sessionsUsed: m.sessions_used,
    coachId: m.coach_id,
    voidedAt: m.voided ? "voided" : null,
  }));
  const start = nextStartDate(rules, plan.kind, today);
  const end = planEndDate(start, plan.duration_days ? { days: plan.duration_days } : { months: plan.duration_months ?? 1 });
  return { start, end, queued: start > today };
}
