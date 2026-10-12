// The two types access.ts needs from the old src/lib/membership/plans.ts (the rest reads pricing.json).
export type PlanKind = "membership" | "pt";
export type PlanDuration = { days: number } | { months: number };
