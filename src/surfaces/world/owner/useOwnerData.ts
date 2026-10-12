import { useQuery } from "@tanstack/react-query";
import { owner } from "../../../client/owner";
import { localDate } from "../../../lib/dates";

/** Everything Today needs: the latest Qashier day (today or the last import), its lines, live visits, desk sales. */
export function useOwnerToday() {
  const today = localDate();
  const day = useQuery({ queryKey: ["owner", "day", today], queryFn: () => owner.latestDay(today), refetchInterval: 120_000 });
  const lines = useQuery({ queryKey: ["owner", "lines", day.data?.id], queryFn: () => owner.lines(day.data!.id), enabled: !!day.data });
  const visits = useQuery({ queryKey: ["owner", "visits", today], queryFn: () => owner.visits(today), refetchInterval: 60_000 });
  const desk = useQuery({ queryKey: ["owner", "desk", day.data?.business_date], queryFn: () => owner.deskSales(day.data!.business_date), enabled: !!day.data });
  const plans = useQuery({ queryKey: ["owner", "plans"], queryFn: owner.plans, staleTime: 300_000 });
  const staff = useQuery({ queryKey: ["owner", "staff"], queryFn: owner.staff, staleTime: 300_000 });
  return {
    today,
    day: day.data ?? null,
    dayLoaded: day.isFetched,
    lines: lines.data ?? [],
    visits: visits.data ?? null,
    desk: desk.data ?? [],
    plans: plans.data ?? [],
    staff: staff.data ?? [],
  };
}
