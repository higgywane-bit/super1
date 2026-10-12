import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffDays, formatDay, localDate } from "../src/lib/dates";
import {
  applyPause,
  canUsePtSession,
  coverageEnd,
  decideCheckIn,
  endPauseEarly,
  memberStanding,
  nextStartDate,
  planEndDate,
  type Membership,
} from "../src/lib/membership";

const m = (over: Partial<Membership> & Pick<Membership, "id" | "startsOn" | "endsOn">): Membership => ({
  kind: "membership",
  planName: "1 Month",
  ...over,
});

describe("dates", () => {
  it("uses Bangkok time for today", () => {
    expect(localDate(new Date("2026-10-12T17:30:00Z"))).toBe("2026-10-13"); // 00:30 in Bangkok
    expect(localDate(new Date("2026-10-12T16:59:00Z"))).toBe("2026-10-12");
  });
  it("adds months and clamps to month end", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-10-01", 1)).toBe("2026-11-01");
  });
  it("formats like the mock-up", () => {
    expect(formatDay("2026-10-31")).toBe("Sat 31 Oct");
    expect(formatDay("2027-01-31", "2026-10-12")).toBe("Sun 31 Jan 2027");
  });
});

describe("plan end dates (inclusive)", () => {
  it("day plans", () => {
    expect(planEndDate("2026-10-12", { days: 1 })).toBe("2026-10-12"); // Day Pass
    expect(planEndDate("2026-10-03", { days: 7 })).toBe("2026-10-09"); // Natalia's 1 Week
  });
  it("month plans", () => {
    expect(planEndDate("2026-10-01", { months: 1 })).toBe("2026-10-31"); // Emma
    expect(planEndDate("2026-10-12", { months: 1 })).toBe("2026-11-11"); // Ivan
    expect(planEndDate("2026-10-01", { months: 4 })).toBe("2027-01-31"); // Emma's 10 PT pack
    expect(planEndDate("2026-09-01", { months: 6 })).toBe("2027-02-28"); // Sarah's 20 PT pack
  });
  it("month-end starts end on the shorter month's last day, not a day early", () => {
    expect(planEndDate("2026-01-31", { months: 1 })).toBe("2026-02-28");
    expect(planEndDate("2026-03-31", { months: 1 })).toBe("2026-04-30");
    expect(planEndDate("2026-01-28", { months: 1 })).toBe("2026-02-27");
  });
});

describe("days left and queueing", () => {
  const emma = [m({ id: "a", startsOn: "2026-10-01", endsOn: "2026-10-31" })];
  it("Emma has 19 days left on Mon 12 Oct", () => {
    const s = memberStanding(emma, [], "2026-10-12");
    expect(s.status).toBe("active");
    expect(s.daysLeft).toBe(19);
    expect(diffDays("2026-10-12", "2026-10-31")).toBe(19);
  });
  it("a renewal sold early starts the day after cover ends", () => {
    expect(nextStartDate(emma, "membership", "2026-10-12")).toBe("2026-11-01");
    expect(nextStartDate(emma, "pt", "2026-10-12")).toBe("2026-10-12");
    expect(nextStartDate(emma, "visits", "2026-10-12")).toBe("2026-10-12");
  });
  it("cover follows back-to-back plans", () => {
    const two = [...emma, m({ id: "b", startsOn: "2026-11-01", endsOn: "2026-11-30" })];
    expect(coverageEnd(two, two[0])).toBe("2026-11-30");
    expect(memberStanding(two, [], "2026-10-12").daysLeft).toBe(49);
    expect(nextStartDate(two, "membership", "2026-10-12")).toBe("2026-12-01");
  });
  it("a plan bought before it starts still queues the next one", () => {
    const future = [m({ id: "k", planName: "2 Weeks", startsOn: "2026-10-17", endsOn: "2026-10-30" })];
    expect(memberStanding(future, [], "2026-10-12").status).toBe("upcoming");
    expect(nextStartDate(future, "membership", "2026-10-12")).toBe("2026-10-31");
  });
  it("expiring at 7 days left or fewer", () => {
    expect(memberStanding(emma, [], "2026-10-24").status).toBe("expiring"); // 7 left
    expect(memberStanding(emma, [], "2026-10-23").status).toBe("active"); // 8 left
  });
});

describe("pauses push queued plans back (the old overlap bug)", () => {
  const ms = [m({ id: "cur", startsOn: "2026-10-01", endsOn: "2026-10-31" }), m({ id: "next", startsOn: "2026-11-01", endsOn: "2026-11-30" })];
  const pause = { from: "2026-10-15", until: "2026-10-21" }; // 7 days

  it("extends the running plan and moves the queued one", () => {
    const after = applyPause(ms, pause);
    expect(after[0]).toMatchObject({ startsOn: "2026-10-01", endsOn: "2026-11-07" });
    expect(after[1]).toMatchObject({ startsOn: "2026-11-08", endsOn: "2026-12-07" });
    expect(addDays(after[0].endsOn, 1)).toBe(after[1].startsOn); // no gap, no overlap
  });
  it("leaves plans that ended before the pause alone", () => {
    const old = m({ id: "old", startsOn: "2026-09-01", endsOn: "2026-09-30" });
    expect(applyPause([old], pause)[0]).toEqual(old);
  });
  it("declines at the door while paused", () => {
    const d = decideCheckIn({ member: {}, memberships: applyPause(ms, pause), pauses: [pause], today: "2026-10-16", checkedInToday: false });
    expect(d).toMatchObject({ allowed: false, reason: "paused" });
  });
  it("ending early gives the unused days back", () => {
    const paused = applyPause(ms, pause);
    const { memberships, pause: p } = endPauseEarly(paused, pause, "2026-10-18"); // back 4 days early
    expect(p).toEqual({ from: "2026-10-15", until: "2026-10-17" });
    expect(memberships[0].endsOn).toBe("2026-11-03");
    expect(memberships[1]).toMatchObject({ startsOn: "2026-11-04", endsOn: "2026-12-03" });
  });
  it("a PT pack bought during the pause is not touched when the pause ends early", () => {
    const pt: Membership = { id: "pt", kind: "pt", planName: "10 PT", startsOn: "2026-10-17", endsOn: "2027-02-16", sessionsTotal: 10, sessionsUsed: 0 };
    const paused = [...applyPause(ms, pause), pt];
    const { memberships } = endPauseEarly(paused, pause, "2026-10-18");
    expect(memberships[2]).toEqual(pt);
  });
  it("a plan sold during the pause, queued after it, moves back when the pause ends early", () => {
    const paused = applyPause([ms[0]], pause); // cover to 7 Nov
    const sold = m({ id: "sold", startsOn: nextStartDate(paused, "membership", "2026-10-16"), endsOn: "" });
    sold.endsOn = planEndDate(sold.startsOn, { months: 1 });
    expect(sold.startsOn).toBe("2026-11-08");
    const { memberships } = endPauseEarly([...paused, sold], pause, "2026-10-18");
    expect(memberships[1].startsOn).toBe("2026-11-04");
    expect(addDays(memberships[0].endsOn, 1)).toBe(memberships[1].startsOn);
  });
  it("cancelling a future pause restores the original dates", () => {
    const { memberships, pause: p } = endPauseEarly(applyPause(ms, pause), pause, "2026-10-10");
    expect(p).toBeNull();
    expect(memberships).toEqual(ms);
  });
});

describe("check-in decisions", () => {
  const today = "2026-10-12";
  it("allows Emma and nudges nobody with 19 days left", () => {
    const d = decideCheckIn({ member: {}, memberships: [m({ id: "a", startsOn: "2026-10-01", endsOn: "2026-10-31" })], pauses: [], today, checkedInToday: false });
    expect(d).toMatchObject({ allowed: true, via: "membership", consumeVisit: false, nudge: null });
  });
  it("declines Natalia: 1 Week ended Fri 9 Oct", () => {
    const d = decideCheckIn({ member: {}, memberships: [m({ id: "n", planName: "1 Week", startsOn: "2026-10-03", endsOn: "2026-10-09" })], pauses: [], today, checkedInToday: false });
    expect(d).toMatchObject({ allowed: false, reason: "expired" });
    if (!d.allowed) expect(d.standing?.endedOn).toBe("2026-10-09");
  });
  it("unknown codes and archived members", () => {
    expect(decideCheckIn({ member: null, memberships: [], pauses: [], today, checkedInToday: false })).toMatchObject({ reason: "unknown-code" });
    expect(decideCheckIn({ member: { archivedAt: "2026-10-12T14:00:00Z" }, memberships: [], pauses: [], today, checkedInToday: false })).toMatchObject({ reason: "archived" });
  });
  it("10 Visits: one visit per day, never two", () => {
    const pack: Membership = { id: "v", kind: "visits", planName: "10 Visits", startsOn: "2026-09-01", endsOn: "2027-02-28", sessionsTotal: 10, sessionsUsed: 6 };
    expect(decideCheckIn({ member: {}, memberships: [pack], pauses: [], today, checkedInToday: false })).toMatchObject({ allowed: true, via: "visits", consumeVisit: true });
    expect(decideCheckIn({ member: {}, memberships: [pack], pauses: [], today, checkedInToday: true })).toMatchObject({ allowed: true, consumeVisit: false });
  });
  it("10 Visits never burns a visit while a time plan covers today", () => {
    const pack: Membership = { id: "v", kind: "visits", planName: "10 Visits", startsOn: "2026-09-01", endsOn: "2027-02-28", sessionsTotal: 10, sessionsUsed: 6 };
    const d = decideCheckIn({ member: {}, memberships: [pack, m({ id: "a", startsOn: "2026-10-01", endsOn: "2026-10-31" })], pauses: [], today, checkedInToday: false });
    expect(d).toMatchObject({ allowed: true, via: "membership", consumeVisit: false });
  });
  it("used-up pack is declined", () => {
    const pack: Membership = { id: "v", kind: "visits", planName: "10 Visits", startsOn: "2026-09-01", endsOn: "2027-02-28", sessionsTotal: 10, sessionsUsed: 10 };
    expect(decideCheckIn({ member: {}, memberships: [pack], pauses: [], today, checkedInToday: false })).toMatchObject({ allowed: false, reason: "used-up" });
  });
  it("queued-only member is not started yet", () => {
    const d = decideCheckIn({ member: {}, memberships: [m({ id: "k", startsOn: "2026-10-17", endsOn: "2026-10-30" })], pauses: [], today, checkedInToday: false });
    expect(d).toMatchObject({ allowed: false, reason: "not-started" });
  });
  it("last day and renew-soon nudges", () => {
    const one = [m({ id: "a", startsOn: "2026-10-01", endsOn: "2026-10-31" })];
    expect(decideCheckIn({ member: {}, memberships: one, pauses: [], today: "2026-10-31", checkedInToday: false })).toMatchObject({ nudge: "last-day" });
    expect(decideCheckIn({ member: {}, memberships: one, pauses: [], today: "2026-10-28", checkedInToday: false })).toMatchObject({ nudge: "renew-soon" });
  });
});

describe("PT sessions", () => {
  const pack: Membership = { id: "pt", kind: "pt", planName: "10 PT", startsOn: "2026-10-01", endsOn: "2027-01-31", sessionsTotal: 10, sessionsUsed: 4, coachId: "sunman" };
  it("Emma's 10 PT: 6 left, one more makes 5", () => {
    expect(canUsePtSession(pack, "2026-10-12")).toEqual({ ok: true, left: 5 });
    expect(memberStanding([pack], [], "2026-10-12").pt).toMatchObject({ left: 6, coachId: "sunman" });
  });
  it("refuses expired, used-up and missing packs", () => {
    expect(canUsePtSession(pack, "2027-02-01")).toEqual({ ok: false, reason: "expired" });
    expect(canUsePtSession({ ...pack, sessionsUsed: 10 }, "2026-10-12")).toEqual({ ok: false, reason: "used-up" });
    expect(canUsePtSession(undefined, "2026-10-12")).toEqual({ ok: false, reason: "no-pack" });
  });
});
