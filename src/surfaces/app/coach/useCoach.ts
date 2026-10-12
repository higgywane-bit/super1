import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { coach } from "../../../client/coach";
import { supabaseBrowser } from "../../../client/supabase";

/** The coach's home read (C02 and the sidebar badge). */
export function useCoachHome() {
  return useQuery({ queryKey: ["coach", "home"], queryFn: coach.home, refetchInterval: 60_000 });
}

export function useCoachClient(member: string) {
  return useQuery({ queryKey: ["coach", "client", member], queryFn: () => coach.client(member) });
}

/**
 * Live updates (docs/02-CONNECTIONS.md): new leads, sessions, and clients' workouts and daily
 * check-ins. RLS filters what each coach receives; any change refreshes the coach's reads.
 */
export function useCoachLive() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = supabaseBrowser();
    const refresh = () => void qc.invalidateQueries({ queryKey: ["coach"] });
    const ch = sb.channel("coach-live");
    for (const table of ["leads", "pt_sessions", "daily_checkins", "workout_logs"]) ch.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    ch.subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [qc]);
}
