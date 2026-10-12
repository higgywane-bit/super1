import { createFileRoute } from "@tanstack/react-router";
import { LivePage } from "../../../surfaces/app/member/LivePage";

export const Route = createFileRoute("/a/_m/workout")({
  validateSearch: (s: Record<string, unknown>): { program?: string; day?: number } => ({
    program: typeof s.program === "string" ? s.program : undefined,
    day: s.day == null ? undefined : Number(s.day),
  }),
  component: function Workout() {
    const { program, day } = Route.useSearch();
    return <LivePage programId={program} day={day} />;
  },
});
